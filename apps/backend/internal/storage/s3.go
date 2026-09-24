package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"sort"
	"strings"
	"time"
)

// S3Config configures an S3-compatible object store (AWS S3, MinIO,
// Cloudflare R2, Garage, …). Endpoint may be empty for AWS, in which case
// the standard regional endpoint is derived from Region + Bucket.
type S3Config struct {
	Endpoint        string // e.g. http://localhost:9000 or https://s3.eu-central-1.amazonaws.com
	Region          string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	Prefix          string // optional key prefix, e.g. "primora/"
	PathStyle       bool   // bucket/key path style (MinIO, Garage) vs virtual-hosted
	// PublicEndpoint rewrites presigned-URL hosts for clients that can't
	// reach Endpoint (e.g. minio:9000 inside compose). Signature binds the
	// public host — the URL is only valid there.
	PublicEndpoint string
	HTTPClient     *http.Client
}

// S3Store implements Store against an S3-compatible API using stdlib-only
// SigV4 signing — no AWS SDK dependency. Payloads are sent with
// x-amz-content-sha256=UNSIGNED-PAYLOAD so bodies stream without buffering;
// the SHA-256 for PutResult is computed on a hashing tee instead.
// jarvis: ceiling UNSIGNED-PAYLOAD needs TLS on AWS proper; over plain
// http:// it relies on the server accepting it (MinIO/Garage/LocalStack do).
// Upgrade to aws-chunked streaming signatures if a backend rejects it.
type S3Store struct {
	cfg    S3Config
	client *http.Client
	now    func() time.Time // injectable for tests
}

func NewS3Store(cfg S3Config) (*S3Store, error) {
	if cfg.Bucket == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("s3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY")
	}
	if cfg.Region == "" {
		cfg.Region = "us-east-1"
	}
	if cfg.Endpoint == "" {
		cfg.Endpoint = fmt.Sprintf("https://s3.%s.amazonaws.com", cfg.Region)
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Minute}
	}
	return &S3Store{cfg: cfg, client: client, now: time.Now}, nil
}

func escapeKey(key string) string {
	parts := strings.Split(key, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

func (s *S3Store) Put(ctx context.Context, bucketID, objectKey string, reader io.Reader) (PutResult, error) {
	key, err := s.objectKey(bucketID, objectKey)
	if err != nil {
		return PutResult{}, err
	}

	// S3 requires a Content-Length — chunked transfer encoding is rejected.
	// Seekable readers (uploaded *os.File) give the length for free;
	// anything else is spooled to a temp file, same cost the local driver
	// pays on every write anyway.
	body, length, cleanup, err := bodyWithLength(reader)
	if err != nil {
		return PutResult{}, err
	}
	defer cleanup()

	hasher := sha256.New()
	counter := &countingReader{r: io.TeeReader(body, hasher)}

	req, err := s.signedRequest(ctx, http.MethodPut, key, counter)
	if err != nil {
		return PutResult{}, err
	}
	req.ContentLength = length
	resp, err := s.client.Do(req)
	if err != nil {
		return PutResult{}, fmt.Errorf("s3 put: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return PutResult{}, fmt.Errorf("s3 put: %s: %s", resp.Status, readErrBody(resp))
	}
	return PutResult{
		Path:         fmt.Sprintf("s3://%s/%s", s.cfg.Bucket, key),
		SizeBytes:    counter.n,
		SHA256Digest: hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}

// bodyWithLength returns a reader plus its total length. The cleanup func
// removes any temp file it created.
func bodyWithLength(r io.Reader) (io.Reader, int64, func(), error) {
	nop := func() {}
	if seeker, ok := r.(io.Seeker); ok {
		size, err := seeker.Seek(0, io.SeekEnd)
		if err != nil {
			return nil, 0, nil, fmt.Errorf("seek object body: %w", err)
		}
		if _, err := seeker.Seek(0, io.SeekStart); err != nil {
			return nil, 0, nil, fmt.Errorf("rewind object body: %w", err)
		}
		return r, size, nop, nil
	}
	tmp, err := os.CreateTemp("", "primora-s3-put-*")
	if err != nil {
		return nil, 0, nil, fmt.Errorf("spool object body: %w", err)
	}
	size, err := io.Copy(tmp, r)
	if err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return nil, 0, nil, fmt.Errorf("spool object body: %w", err)
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return nil, 0, nil, err
	}
	cleanup := func() {
		tmp.Close()
		os.Remove(tmp.Name())
	}
	return tmp, size, cleanup, nil
}

type countingReader struct {
	r io.Reader
	n int64
}

func (c *countingReader) Read(p []byte) (int, error) {
	n, err := c.r.Read(p)
	c.n += int64(n)
	return n, err
}

func (s *S3Store) Open(bucketID, objectKey string) (io.ReadCloser, string, error) {
	key, err := s.objectKey(bucketID, objectKey)
	if err != nil {
		return nil, "", err
	}
	req, err := s.signedRequest(context.Background(), http.MethodGet, key, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("s3 get: %w", err)
	}
	if resp.StatusCode/100 != 2 {
		defer resp.Body.Close()
		return nil, "", fmt.Errorf("s3 get: %s: %s", resp.Status, readErrBody(resp))
	}
	return resp.Body, fmt.Sprintf("s3://%s/%s", s.cfg.Bucket, key), nil
}

func (s *S3Store) Delete(bucketID, objectKey string) error {
	key, err := s.objectKey(bucketID, objectKey)
	if err != nil {
		return err
	}
	req, err := s.signedRequest(context.Background(), http.MethodDelete, key, nil)
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("s3 delete: %w", err)
	}
	defer resp.Body.Close()
	// S3 delete is idempotent: 204 on success, 404 is fine too.
	if resp.StatusCode/100 != 2 && resp.StatusCode != http.StatusNotFound {
		return fmt.Errorf("s3 delete: %s: %s", resp.Status, readErrBody(resp))
	}
	return nil
}

func (s *S3Store) MoveBetweenBuckets(sourceBucketID, destinationBucketID, fromKey, toKey string) (string, error) {
	src, err := s.objectKey(sourceBucketID, fromKey)
	if err != nil {
		return "", err
	}
	dst, err := s.objectKey(destinationBucketID, toKey)
	if err != nil {
		return "", err
	}
	// x-amz-copy-source must be set before signing — strict S3
	// implementations require all x-amz-* headers to be signed.
	key := dst
	u := strings.TrimSuffix(s.cfg.Endpoint, "/") + "/" + s.cfg.Bucket + "/" + escapeKey(key)
	if !s.cfg.PathStyle {
		parsed, perr := url.Parse(strings.TrimSuffix(s.cfg.Endpoint, "/"))
		if perr != nil {
			return "", perr
		}
		parsed.Host = s.cfg.Bucket + "." + parsed.Host
		parsed.Path = "/" + escapeKey(key)
		u = parsed.String()
	}
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPut, u, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("x-amz-content-sha256", "UNSIGNED-PAYLOAD")
	req.Header.Set("x-amz-copy-source", "/"+s.cfg.Bucket+"/"+escapeKey(src))
	s.sign(req)
	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("s3 copy: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("s3 copy: %s: %s", resp.Status, readErrBody(resp))
	}
	if err := s.Delete(sourceBucketID, fromKey); err != nil {
		return "", fmt.Errorf("s3 move: delete source: %w", err)
	}
	return fmt.Sprintf("s3://%s/%s", s.cfg.Bucket, dst), nil
}

// DeleteBucket lists every object under the bucket prefix and deletes them
// one by one — DeleteObjects batching is an optimization not worth the code
// at this scale.
func (s *S3Store) DeleteBucket(bucketID string) error {
	prefix := path.Join(s.cfg.Prefix, bucketID) + "/"
	continuation := ""
	for {
		keys, next, err := s.listPage(prefix, continuation)
		if err != nil {
			return err
		}
		for _, k := range keys {
			req, err := s.signedRequest(context.Background(), http.MethodDelete, k, nil)
			if err != nil {
				return err
			}
			resp, err := s.client.Do(req)
			if err != nil {
				return fmt.Errorf("s3 delete %s: %w", k, err)
			}
			resp.Body.Close()
			if resp.StatusCode/100 != 2 && resp.StatusCode != http.StatusNotFound {
				return fmt.Errorf("s3 delete %s: %s", k, resp.Status)
			}
		}
		if next == "" {
			return nil
		}
		continuation = next
	}
}

// Presign mints a SigV4 query-signed URL for a single GET/PUT on the
// object — clients talk to S3 directly instead of proxying bytes through
// the backend. TTL is capped at one hour.
func (s *S3Store) Presign(ctx context.Context, bucketID, objectKey, method string, ttl time.Duration) (*PresignedURL, error) {
	if method != http.MethodGet && method != http.MethodPut {
		return nil, fmt.Errorf("s3 presign: unsupported method %q", method)
	}
	key, err := s.objectKey(bucketID, objectKey)
	if err != nil {
		return nil, err
	}
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	if ttl > time.Hour {
		ttl = time.Hour
	}

	now := s.now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	scope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, s.cfg.Region)

	// Build the unsigned URL — same path/vhost logic as signedRequest, but
	// on the client-facing endpoint when one is configured.
	var base *url.URL
	endpoint := strings.TrimSuffix(s.cfg.PublicEndpoint, "/")
	if endpoint == "" {
		endpoint = strings.TrimSuffix(s.cfg.Endpoint, "/")
	}
	if s.cfg.PathStyle {
		u, err := url.Parse(endpoint + "/" + s.cfg.Bucket + "/" + escapeKey(key))
		if err != nil {
			return nil, fmt.Errorf("s3 presign url: %w", err)
		}
		base = u
	} else {
		u, err := url.Parse(endpoint)
		if err != nil {
			return nil, fmt.Errorf("s3 presign url: %w", err)
		}
		u.Host = s.cfg.Bucket + "." + u.Host
		u.Path = "/" + escapeKey(key)
		base = u
	}

	q := base.Query()
	q.Set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
	q.Set("X-Amz-Credential", s.cfg.AccessKeyID+"/"+scope)
	q.Set("X-Amz-Date", amzDate)
	q.Set("X-Amz-Expires", fmt.Sprintf("%d", int64(ttl.Seconds())))
	q.Set("X-Amz-SignedHeaders", "host")

	canonicalURI := base.EscapedPath()
	if canonicalURI == "" {
		canonicalURI = "/"
	}
	canonicalRequest := strings.Join([]string{
		method,
		canonicalURI,
		canonicalQuery(q),
		"host:" + base.Host + "\n",
		"host",
		"UNSIGNED-PAYLOAD",
	}, "\n")
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		hexSHA256(canonicalRequest),
	}, "\n")

	kDate := hmacSHA256([]byte("AWS4"+s.cfg.SecretAccessKey), dateStamp)
	kRegion := hmacSHA256(kDate, s.cfg.Region)
	kService := hmacSHA256(kRegion, "s3")
	kSigning := hmacSHA256(kService, "aws4_request")
	q.Set("X-Amz-Signature", hex.EncodeToString(hmacSHA256(kSigning, stringToSign)))
	base.RawQuery = q.Encode()

	return &PresignedURL{URL: base.String(), Method: method, ExpiresAt: now.Add(ttl)}, nil
}

type listResult struct {
	Contents              []struct{ Key string `xml:"Key"` } `xml:"Contents"`
	NextContinuationToken string `xml:"NextContinuationToken"`
	IsTruncated           bool   `xml:"IsTruncated"`
}

func (s *S3Store) listPage(prefix, continuation string) ([]string, string, error) {
	query := url.Values{
		"list-type":   {"2"},
		"prefix":      {prefix},
		"max-keys":    {"1000"},
	}
	if continuation != "" {
		query.Set("continuation-token", continuation)
	}
	req, err := s.signedRequestWithQuery(context.Background(), http.MethodGet, "", query)
	if err != nil {
		return nil, "", err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("s3 list: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return nil, "", fmt.Errorf("s3 list: %s: %s", resp.Status, readErrBody(resp))
	}
	var out listResult
	if err := xml.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, "", fmt.Errorf("s3 list decode: %w", err)
	}
	keys := make([]string, len(out.Contents))
	for i, c := range out.Contents {
		keys[i] = c.Key
	}
	next := out.NextContinuationToken
	if next == "" && out.IsTruncated && len(keys) > 0 {
		next = keys[len(keys)-1] // S3 uses last key as marker when no token
	}
	return keys, next, nil
}

// --- SigV4 signing -------------------------------------------------------

func (s *S3Store) signedRequest(ctx context.Context, method, key string, body io.Reader) (*http.Request, error) {
	return s.signed(ctx, method, key, nil, body)
}

func (s *S3Store) signedRequestWithQuery(ctx context.Context, method, key string, query url.Values) (*http.Request, error) {
	return s.signed(ctx, method, key, query, nil)
}

func (s *S3Store) signed(ctx context.Context, method, key string, query url.Values, body io.Reader) (*http.Request, error) {
	var reqURL string
	endpoint := strings.TrimSuffix(s.cfg.Endpoint, "/")
	if s.cfg.PathStyle {
		reqURL = endpoint + "/" + s.cfg.Bucket
		if key != "" {
			reqURL += "/" + escapeKey(key)
		}
	} else {
		u, err := url.Parse(endpoint)
		if err != nil {
			return nil, fmt.Errorf("s3 endpoint: %w", err)
		}
		u.Host = s.cfg.Bucket + "." + u.Host
		u.Path = "/" + escapeKey(key)
		reqURL = u.String()
	}
	if len(query) > 0 {
		reqURL += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, reqURL, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-amz-content-sha256", "UNSIGNED-PAYLOAD")
	s.sign(req)
	return req, nil
}

// sign applies AWS Signature Version 4 to req in place.
func (s *S3Store) sign(req *http.Request) {
	now := s.now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	req.Header.Set("x-amz-date", amzDate)

	// Canonical request: method, path, sorted query, headers, signed list,
	// payload hash. Signed headers are host + every x-amz-* header present —
	// required for x-amz-copy-source on CopyObject and future metadata
	// headers.
	signedHeaders := []string{"host"}
	for h := range req.Header {
		lh := strings.ToLower(h)
		if strings.HasPrefix(lh, "x-amz-") {
			signedHeaders = append(signedHeaders, lh)
		}
	}
	sort.Strings(signedHeaders)
	var canonicalHeaders strings.Builder
	for _, h := range signedHeaders {
		v := req.Host
		if h != "host" {
			v = strings.TrimSpace(req.Header.Get(h))
		}
		canonicalHeaders.WriteString(h + ":" + v + "\n")
	}
	canonicalURI := req.URL.EscapedPath()
	if canonicalURI == "" {
		canonicalURI = "/"
	}
	canonicalRequest := strings.Join([]string{
		req.Method,
		canonicalURI,
		canonicalQuery(req.URL.Query()),
		canonicalHeaders.String(),
		strings.Join(signedHeaders, ";"),
		"UNSIGNED-PAYLOAD",
	}, "\n")

	scope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, s.cfg.Region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		hexSHA256(canonicalRequest),
	}, "\n")

	kDate := hmacSHA256([]byte("AWS4"+s.cfg.SecretAccessKey), dateStamp)
	kRegion := hmacSHA256(kDate, s.cfg.Region)
	kService := hmacSHA256(kRegion, "s3")
	kSigning := hmacSHA256(kService, "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(kSigning, stringToSign))

	req.Header.Set("Authorization", fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.cfg.AccessKeyID, scope, strings.Join(signedHeaders, ";"), signature))
}

// canonicalQuery re-encodes the query per SigV4: sorted keys, each name and
// value URI-encoded per RFC 3986 (url.Values.Encode's "+" for space is not
// acceptable here).
func canonicalQuery(q url.Values) string {
	type pair struct{ k, v string }
	pairs := make([]pair, 0, len(q))
	for k, vs := range q {
		for _, v := range vs {
			pairs = append(pairs, pair{sigV4Escape(k), sigV4Escape(v)})
		}
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].k == pairs[j].k {
			return pairs[i].v < pairs[j].v
		}
		return pairs[i].k < pairs[j].k
	})
	var b strings.Builder
	for i, p := range pairs {
		if i > 0 {
			b.WriteByte('&')
		}
		b.WriteString(p.k + "=" + p.v)
	}
	return b.String()
}

func sigV4Escape(s string) string {
	return strings.ReplaceAll(url.QueryEscape(s), "+", "%20")
}

func hexSHA256(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func hmacSHA256(key []byte, data string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(data))
	return m.Sum(nil)
}

// EnsureBucket creates the configured bucket if it does not exist. Called
// once at startup when the s3 driver is selected; a pre-existing bucket is
// a no-op.
func (s *S3Store) EnsureBucket(ctx context.Context) error {
	req, err := s.signedRequest(ctx, http.MethodPut, "", nil)
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("s3 create bucket: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 && resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("s3 create bucket: %s: %s", resp.Status, readErrBody(resp))
	}
	return nil
}

func (s *S3Store) objectKey(bucketID, objectKey string) (string, error) {
	clean, err := sanitizeObjectKey(objectKey)
	if err != nil {
		return "", err
	}
	return path.Join(s.cfg.Prefix, bucketID, clean), nil
}

func readErrBody(resp *http.Response) string {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	return strings.TrimSpace(string(body))
}
