package storage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type PutResult struct {
	Path         string
	SizeBytes    int64
	SHA256Digest string
}

type LocalStore struct {
	root string
}

func NewLocalStore(root string) (*LocalStore, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create storage root: %w", err)
	}
	return &LocalStore{root: root}, nil
}

func (s *LocalStore) Put(ctx context.Context, bucketID, objectKey string, reader io.Reader) (PutResult, error) {
	cleanKey, err := sanitizeObjectKey(objectKey)
	if err != nil {
		return PutResult{}, err
	}
	dir := filepath.Join(s.root, bucketID)
	if err := os.MkdirAll(filepath.Dir(filepath.Join(dir, cleanKey)), 0o755); err != nil {
		return PutResult{}, fmt.Errorf("create object directory: %w", err)
	}
	path := filepath.Join(dir, cleanKey)
	tmpPath := path + ".tmp"
	file, err := os.Create(tmpPath)
	if err != nil {
		return PutResult{}, fmt.Errorf("create temp object: %w", err)
	}
	defer file.Close()

	hasher := sha256.New()
	writer := io.MultiWriter(file, hasher)
	written, err := copyWithContext(ctx, writer, reader)
	if err != nil {
		_ = os.Remove(tmpPath)
		return PutResult{}, err
	}
	if err := file.Close(); err != nil {
		return PutResult{}, fmt.Errorf("close temp object: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return PutResult{}, fmt.Errorf("rename object: %w", err)
	}
	return PutResult{
		Path:         path,
		SizeBytes:    written,
		SHA256Digest: hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}

func (s *LocalStore) Open(bucketID, objectKey string) (*os.File, string, error) {
	cleanKey, err := sanitizeObjectKey(objectKey)
	if err != nil {
		return nil, "", err
	}
	path := filepath.Join(s.root, bucketID, cleanKey)
	file, err := os.Open(path)
	if err != nil {
		return nil, "", fmt.Errorf("open object: %w", err)
	}
	return file, path, nil
}

func (s *LocalStore) Delete(bucketID, objectKey string) error {
	cleanKey, err := sanitizeObjectKey(objectKey)
	if err != nil {
		return err
	}
	if err := os.Remove(filepath.Join(s.root, bucketID, cleanKey)); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

func (s *LocalStore) Move(bucketID, fromKey, toKey string) (string, error) {
	return s.MoveBetweenBuckets(bucketID, bucketID, fromKey, toKey)
}

func (s *LocalStore) MoveBetweenBuckets(sourceBucketID, destinationBucketID, fromKey, toKey string) (string, error) {
	cleanFrom, err := sanitizeObjectKey(fromKey)
	if err != nil {
		return "", err
	}
	cleanTo, err := sanitizeObjectKey(toKey)
	if err != nil {
		return "", err
	}
	fromPath := filepath.Join(s.root, strings.TrimSpace(sourceBucketID), cleanFrom)
	toPath := filepath.Join(s.root, strings.TrimSpace(destinationBucketID), cleanTo)
	if err := os.MkdirAll(filepath.Dir(toPath), 0o755); err != nil {
		return "", fmt.Errorf("create destination directory: %w", err)
	}
	if err := os.Rename(fromPath, toPath); err != nil {
		return "", fmt.Errorf("move object: %w", err)
	}
	return toPath, nil
}

func (s *LocalStore) DeleteBucket(bucketID string) error {
	bucketPath := filepath.Join(s.root, strings.TrimSpace(bucketID))
	if err := os.RemoveAll(bucketPath); err != nil {
		return fmt.Errorf("delete bucket directory: %w", err)
	}
	return nil
}

func sanitizeObjectKey(key string) (string, error) {
	clean := filepath.Clean(strings.TrimSpace(key))
	if clean == "." || clean == "" || strings.HasPrefix(clean, "../") || strings.Contains(clean, "/../") || strings.HasPrefix(clean, "/") {
		return "", fmt.Errorf("invalid object key")
	}
	return clean, nil
}

func copyWithContext(ctx context.Context, dst io.Writer, src io.Reader) (int64, error) {
	buffer := make([]byte, 32*1024)
	var written int64
	for {
		select {
		case <-ctx.Done():
			return written, ctx.Err()
		default:
		}
		nr, er := src.Read(buffer)
		if nr > 0 {
			nw, ew := dst.Write(buffer[:nr])
			written += int64(nw)
			if ew != nil {
				return written, ew
			}
			if nr != nw {
				return written, io.ErrShortWrite
			}
		}
		if er != nil {
			if er == io.EOF {
				return written, nil
			}
			return written, er
		}
	}
}
