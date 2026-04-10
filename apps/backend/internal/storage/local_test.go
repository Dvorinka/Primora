package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestSanitizeObjectKey(t *testing.T) {
	t.Parallel()

	valid, err := sanitizeObjectKey(" docs/readme.txt ")
	if err != nil {
		t.Fatalf("expected valid key, got error: %v", err)
	}
	if valid != "docs/readme.txt" {
		t.Fatalf("unexpected sanitized key: %s", valid)
	}

	invalidKeys := []string{"", ".", "../secret", "/absolute/path", " /../../etc "}
	for _, key := range invalidKeys {
		if _, err := sanitizeObjectKey(key); err == nil {
			t.Fatalf("expected key %q to be invalid", key)
		}
	}
}

func TestLocalStorePutOpenDeleteRoundTrip(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	store, err := NewLocalStore(root)
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}

	content := []byte("hello primora")
	put, err := store.Put(context.Background(), "bucket-a", "docs/hello.txt", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("put object: %v", err)
	}
	if put.SizeBytes != int64(len(content)) {
		t.Fatalf("unexpected size: %d", put.SizeBytes)
	}
	expectedDigest := sha256.Sum256(content)
	if put.SHA256Digest != hex.EncodeToString(expectedDigest[:]) {
		t.Fatalf("unexpected digest: %s", put.SHA256Digest)
	}

	file, path, err := store.Open("bucket-a", "docs/hello.txt")
	if err != nil {
		t.Fatalf("open object: %v", err)
	}
	defer file.Close()
	if filepath.Clean(path) != filepath.Clean(put.Path) {
		t.Fatalf("path mismatch: got %s, want %s", path, put.Path)
	}
	data, err := io.ReadAll(file)
	if err != nil {
		t.Fatalf("read object: %v", err)
	}
	if !bytes.Equal(data, content) {
		t.Fatalf("content mismatch: got %q, want %q", string(data), string(content))
	}

	if err := store.Delete("bucket-a", "docs/hello.txt"); err != nil {
		t.Fatalf("delete object: %v", err)
	}
	if _, _, err := store.Open("bucket-a", "docs/hello.txt"); err == nil {
		t.Fatalf("expected open to fail after delete")
	}
}

func TestLocalStoreDeleteBucketRemovesAllFiles(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	store, err := NewLocalStore(root)
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}

	if _, err := store.Put(context.Background(), "bucket-z", "a.txt", bytes.NewReader([]byte("a"))); err != nil {
		t.Fatalf("put a.txt: %v", err)
	}
	if _, err := store.Put(context.Background(), "bucket-z", "nested/b.txt", bytes.NewReader([]byte("b"))); err != nil {
		t.Fatalf("put b.txt: %v", err)
	}

	if err := store.DeleteBucket("bucket-z"); err != nil {
		t.Fatalf("delete bucket: %v", err)
	}

	_, err = os.Stat(filepath.Join(root, "bucket-z"))
	if !os.IsNotExist(err) {
		t.Fatalf("expected bucket path to be removed, stat err: %v", err)
	}
}

func TestLocalStoreMoveObject(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	store, err := NewLocalStore(root)
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}

	content := []byte("rename me")
	if _, err := store.Put(context.Background(), "bucket-r", "source/name.txt", bytes.NewReader(content)); err != nil {
		t.Fatalf("put source object: %v", err)
	}

	newPath, err := store.Move("bucket-r", "source/name.txt", "dest/renamed.txt")
	if err != nil {
		t.Fatalf("move object: %v", err)
	}
	if filepath.Clean(newPath) != filepath.Clean(filepath.Join(root, "bucket-r", "dest/renamed.txt")) {
		t.Fatalf("unexpected moved path: %s", newPath)
	}

	if _, _, err := store.Open("bucket-r", "source/name.txt"); err == nil {
		t.Fatalf("expected old key open to fail after move")
	}
	file, _, err := store.Open("bucket-r", "dest/renamed.txt")
	if err != nil {
		t.Fatalf("open moved object: %v", err)
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		t.Fatalf("read moved object: %v", err)
	}
	if !bytes.Equal(data, content) {
		t.Fatalf("moved content mismatch: got %q, want %q", string(data), string(content))
	}
}

func TestLocalStoreMoveObjectAcrossBuckets(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	store, err := NewLocalStore(root)
	if err != nil {
		t.Fatalf("new local store: %v", err)
	}

	content := []byte("cross bucket")
	if _, err := store.Put(context.Background(), "bucket-src", "folder/source.txt", bytes.NewReader(content)); err != nil {
		t.Fatalf("put source object: %v", err)
	}

	newPath, err := store.MoveBetweenBuckets("bucket-src", "bucket-dst", "folder/source.txt", "archive/destination.txt")
	if err != nil {
		t.Fatalf("move across buckets: %v", err)
	}
	if filepath.Clean(newPath) != filepath.Clean(filepath.Join(root, "bucket-dst", "archive/destination.txt")) {
		t.Fatalf("unexpected moved path: %s", newPath)
	}

	if _, _, err := store.Open("bucket-src", "folder/source.txt"); err == nil {
		t.Fatalf("expected source key open to fail after move")
	}
	file, _, err := store.Open("bucket-dst", "archive/destination.txt")
	if err != nil {
		t.Fatalf("open moved object: %v", err)
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		t.Fatalf("read moved object: %v", err)
	}
	if !bytes.Equal(data, content) {
		t.Fatalf("moved content mismatch: got %q, want %q", string(data), string(content))
	}
}
