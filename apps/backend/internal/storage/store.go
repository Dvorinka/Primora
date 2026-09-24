package storage

import (
	"context"
	"io"
	"time"
)

// Store is the object-storage contract the platform service depends on.
// LocalStore keeps objects on disk; S3Store targets S3-compatible APIs.
type Store interface {
	Put(ctx context.Context, bucketID, objectKey string, reader io.Reader) (PutResult, error)
	Open(bucketID, objectKey string) (io.ReadCloser, string, error)
	Delete(bucketID, objectKey string) error
	MoveBetweenBuckets(sourceBucketID, destinationBucketID, fromKey, toKey string) (string, error)
	DeleteBucket(bucketID string) error
}

// PresignedURL is a short-lived direct-to-storage URL for one operation.
type PresignedURL struct {
	URL       string    `json:"url"`
	Method    string    `json:"method"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Presigner is an optional capability: stores backed by a real object API
// (S3) can mint URLs clients call directly. The local driver can't — its
// "URL" would have to be served by this backend anyway.
type Presigner interface {
	Presign(ctx context.Context, bucketID, objectKey, method string, ttl time.Duration) (*PresignedURL, error)
}
