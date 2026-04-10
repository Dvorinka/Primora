-- name: CreateBucket :one
INSERT INTO core.buckets (
  project_id,
  slug,
  name,
  visibility,
  created_by_user_id
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListBucketsForProject :many
SELECT * FROM core.buckets
WHERE project_id = $1
  AND (
    btrim($2) = ''
    OR slug ILIKE '%' || btrim($2) || '%'
    OR name ILIKE '%' || btrim($2) || '%'
  )
ORDER BY created_at ASC;

-- name: GetBucketByID :one
SELECT
  b.*,
  p.organization_id
FROM core.buckets b
JOIN core.projects p ON p.id = b.project_id
WHERE b.id = $1;

-- name: UpdateBucketByID :one
UPDATE core.buckets
SET slug = $2,
    name = $3,
    visibility = $4
WHERE id = $1
RETURNING *;

-- name: DeleteBucketByID :one
DELETE FROM core.buckets
WHERE id = $1
RETURNING *;
