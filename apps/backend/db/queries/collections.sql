-- name: ListCollections :many
SELECT * FROM core.collections
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetCollectionBySlug :one
SELECT * FROM core.collections
WHERE project_id = $1 AND slug = $2;

-- name: GetCollectionByID :one
SELECT * FROM core.collections
WHERE id = $1;

-- name: CreateCollection :one
INSERT INTO core.collections (
  project_id, slug, name, description, schema, created_by_user_id
) VALUES (
  $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: UpdateCollection :one
UPDATE core.collections
SET 
  name = $3,
  description = $4,
  schema = $5,
  updated_at = NOW()
WHERE id = $1 AND project_id = $2
RETURNING *;

-- name: DeleteCollection :exec
DELETE FROM core.collections
WHERE id = $1 AND project_id = $2;

-- name: ListDocuments :many
SELECT * FROM core.documents
WHERE collection_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountDocuments :one
SELECT COUNT(*) FROM core.documents
WHERE collection_id = $1;

-- name: GetDocumentByID :one
SELECT * FROM core.documents
WHERE id = $1 AND collection_id = $2;

-- name: CreateDocument :one
INSERT INTO core.documents (
  collection_id, data, created_by_user_id
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: UpdateDocument :one
UPDATE core.documents
SET 
  data = $3,
  updated_at = NOW()
WHERE id = $1 AND collection_id = $2
RETURNING *;

-- name: DeleteDocument :exec
DELETE FROM core.documents
WHERE id = $1 AND collection_id = $2;
