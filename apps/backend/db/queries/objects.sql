-- name: CreateBucketObject :one
INSERT INTO core.bucket_objects (
  bucket_id,
  object_key,
  content_type,
  size_bytes,
  checksum_sha256,
  storage_path,
  uploaded_by_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListBucketObjects :many
SELECT * FROM core.bucket_objects
WHERE bucket_id = $1
  AND (btrim($2) = '' OR object_key ILIKE '%' || btrim($2) || '%')
ORDER BY created_at DESC
LIMIT $3
OFFSET $4;

-- name: CountBucketObjects :one
SELECT COUNT(*)::BIGINT
FROM core.bucket_objects
WHERE bucket_id = $1
  AND (btrim($2) = '' OR object_key ILIKE '%' || btrim($2) || '%');

-- name: GetBucketObjectByKey :one
SELECT * FROM core.bucket_objects
WHERE bucket_id = $1
  AND object_key = $2;

-- name: MoveBucketObject :one
UPDATE core.bucket_objects
SET bucket_id = $3,
    object_key = $4,
    storage_path = $5
WHERE bucket_id = $1
  AND object_key = $2
RETURNING *;

-- name: DeleteBucketObjectByKey :one
DELETE FROM core.bucket_objects
WHERE bucket_id = $1
  AND object_key = $2
RETURNING *;
