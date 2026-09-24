package storage

import (
	"context"
	"io"
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
