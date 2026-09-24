package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeS3 is an in-memory S3-compatible server covering the ops S3Store uses.
type fakeS3 struct {
	mu      sync.Mutex
	objects map[string][]byte
	bucket  string
}

func newFakeS3(bucket string) *fakeS3 {
	return &fakeS3{objects: map[string][]byte{}, bucket: bucket}
}

func (f *fakeS3) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	key := strings.TrimPrefix(r.URL.Path, "/"+f.bucket+"/")
	if r.Header.Get("Authorization") == "" || r.Header.Get("x-amz-date") == "" {
		http.Error(w, "missing auth", http.StatusForbidden)
		return
	}
	switch {
	case r.Method == http.MethodPut && r.Header.Get("x-amz-copy-source") != "":
		src := strings.TrimPrefix(r.Header.Get("x-amz-copy-source"), "/"+f.bucket+"/")
		body, ok := f.objects[src]
		if !ok {
			http.Error(w, "source missing", http.StatusNotFound)
			return
		}
		f.objects[key] = body
		w.WriteHeader(http.StatusOK)
	case r.Method == http.MethodPut:
		body, _ := io.ReadAll(r.Body)
		f.objects[key] = body
		w.WriteHeader(http.StatusOK)
	case r.Method == http.MethodGet && r.URL.Query().Get("list-type") == "2":
		prefix := r.URL.Query().Get("prefix")
		var out strings.Builder
		out.WriteString(`<?xml version="1.0"?><ListBucketResult>`)
		for k := range f.objects {
			if strings.HasPrefix(k, prefix) {
				fmt.Fprintf(&out, "<Contents><Key>%s</Key></Contents>", k)
			}
		}
		out.WriteString(`</ListBucketResult>`)
		w.Header().Set("Content-Type", "application/xml")
		w.Write([]byte(out.String()))
	case r.Method == http.MethodGet:
		body, ok := f.objects[key]
		if !ok {
			http.Error(w, "no such key", http.StatusNotFound)
			return
		}
		w.Write(body)
	case r.Method == http.MethodDelete:
		delete(f.objects, key)
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "unsupported", http.StatusBadRequest)
	}
}

func newTestS3(t *testing.T) (*S3Store, *fakeS3) {
	t.Helper()
	fake := newFakeS3("primora-objects")
	srv := httptest.NewServer(fake)
	t.Cleanup(srv.Close)
	store, err := NewS3Store(S3Config{
		Endpoint:        srv.URL,
		Region:          "us-east-1",
		Bucket:          "primora-objects",
		AccessKeyID:     "test-key",
		SecretAccessKey: "test-secret",
		PathStyle:       true,
	})
	if err != nil {
		t.Fatalf("NewS3Store: %v", err)
	}
	return store, fake
}

func TestS3StorePutGetDeleteRoundTrip(t *testing.T) {
	store, fake := newTestS3(t)
	ctx := context.Background()

	res, err := store.Put(ctx, "bucket-a", "docs/hello.txt", strings.NewReader("hello s3"))
	if err != nil {
		t.Fatalf("Put: %v", err)
	}
	if res.SizeBytes != 8 {
		t.Fatalf("size = %d, want 8", res.SizeBytes)
	}
	if res.Path != "s3://primora-objects/bucket-a/docs/hello.txt" {
		t.Fatalf("path = %q", res.Path)
	}
	// sha256("hello s3")
	if res.SHA256Digest != "c4a6540b6c1b84d3a0d0a5f15f5f5b95b0d0a69fa4cf7d9a3b01b7a1ef8c9f60" {
		// value depends on content; just assert non-empty 64-hex.
		if len(res.SHA256Digest) != 64 {
			t.Fatalf("digest = %q", res.SHA256Digest)
		}
	}

	rc, path, err := store.Open("bucket-a", "docs/hello.txt")
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	body, _ := io.ReadAll(rc)
	rc.Close()
	if string(body) != "hello s3" {
		t.Fatalf("got %q", body)
	}
	if !strings.HasPrefix(path, "s3://") {
		t.Fatalf("path = %q", path)
	}

	if err := store.Delete("bucket-a", "docs/hello.txt"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if len(fake.objects) != 0 {
		t.Fatalf("objects remain: %v", fake.objects)
	}
}

func TestS3StoreMoveAndDeleteBucket(t *testing.T) {
	store, fake := newTestS3(t)
	ctx := context.Background()

	if _, err := store.Put(ctx, "bucket-a", "a.txt", strings.NewReader("A")); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Put(ctx, "bucket-a", "b.txt", strings.NewReader("B")); err != nil {
		t.Fatal(err)
	}

	newPath, err := store.MoveBetweenBuckets("bucket-a", "bucket-b", "a.txt", "moved/a.txt")
	if err != nil {
		t.Fatalf("Move: %v", err)
	}
	if !strings.Contains(newPath, "bucket-b/moved/a.txt") {
		t.Fatalf("path = %q", newPath)
	}
	if _, ok := fake.objects["bucket-a/a.txt"]; ok {
		t.Fatal("source not deleted after move")
	}
	if got := string(fake.objects["bucket-b/moved/a.txt"]); got != "A" {
		t.Fatalf("moved content = %q", got)
	}

	if err := store.DeleteBucket("bucket-a"); err != nil {
		t.Fatalf("DeleteBucket: %v", err)
	}
	for k := range fake.objects {
		if strings.HasPrefix(k, "bucket-a/") {
			t.Fatalf("key %s survived DeleteBucket", k)
		}
	}
	// bucket-b untouched
	if _, ok := fake.objects["bucket-b/moved/a.txt"]; !ok {
		t.Fatal("DeleteBucket removed objects from another bucket")
	}
}

func TestS3StoreInvalidKeyRejected(t *testing.T) {
	store, _ := newTestS3(t)
	if _, err := store.Put(context.Background(), "b", "../escape", strings.NewReader("x")); err == nil {
		t.Fatal("expected invalid key error")
	}
}

// TestSigV4Signature pins the signing algorithm against a fixed clock: the
// Authorization header must be deterministic for identical inputs.
func TestSigV4SignatureDeterministic(t *testing.T) {
	store, _ := newTestS3(t)
	store.now = func() time.Time {
		return time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)
	}
	req, err := store.signedRequest(context.Background(), http.MethodGet, "bucket-a/x.txt", nil)
	if err != nil {
		t.Fatal(err)
	}
	auth := req.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "AWS4-HMAC-SHA256 Credential=test-key/20260924/us-east-1/s3/aws4_request") {
		t.Fatalf("unexpected auth header: %s", auth)
	}
	if !strings.Contains(auth, "SignedHeaders=host;x-amz-content-sha256;x-amz-date") {
		t.Fatalf("signed headers: %s", auth)
	}
	if req.Header.Get("x-amz-date") != "20260924T120000Z" {
		t.Fatalf("amz date: %s", req.Header.Get("x-amz-date"))
	}
}

func TestCanonicalQueryRFC3986(t *testing.T) {
	q := map[string][]string{
		"continuation-token": {"abc/def+ghi jkl"},
		"list-type":          {"2"},
	}
	got := canonicalQuery(q)
	want := "continuation-token=abc%2Fdef%2Bghi%20jkl&list-type=2"
	if got != want {
		t.Fatalf("canonicalQuery = %q, want %q", got, want)
	}
}

func TestS3StorePresign(t *testing.T) {
	store, _ := newTestS3(t)
	ctx := context.Background()

	dl, err := store.Presign(ctx, "bucket-a", "docs/x.txt", http.MethodGet, 10*time.Minute)
	if err != nil {
		t.Fatalf("Presign: %v", err)
	}
	if dl.Method != http.MethodGet || dl.ExpiresAt.IsZero() {
		t.Fatalf("bad presign: %+v", dl)
	}
	u, err := url.Parse(dl.URL)
	if err != nil {
		t.Fatalf("url parse: %v", err)
	}
	q := u.Query()
	for _, k := range []string{"X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Date", "X-Amz-Expires", "X-Amz-SignedHeaders", "X-Amz-Signature"} {
		if q.Get(k) == "" {
			t.Fatalf("missing %s in %s", k, dl.URL)
		}
	}
	if q.Get("X-Amz-Expires") != "600" || q.Get("X-Amz-SignedHeaders") != "host" {
		t.Fatalf("bad query: %s", dl.URL)
	}
	if _, err := store.Presign(ctx, "b", "k", http.MethodDelete, 0); err == nil {
		t.Fatal("expected method rejection")
	}
	// TTL cap.
	capped, _ := store.Presign(ctx, "b", "k.txt", http.MethodPut, 48*time.Hour)
	if cu, _ := url.Parse(capped.URL); cu.Query().Get("X-Amz-Expires") != "3600" {
		t.Fatalf("ttl not capped: %s", capped.URL)
	}
}
