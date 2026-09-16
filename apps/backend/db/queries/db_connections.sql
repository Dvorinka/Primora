-- name: ListDBConnections :many
SELECT * FROM core.db_connections
WHERE project_id = $1
ORDER BY is_managed DESC, name ASC;

-- name: GetDBConnectionByID :one
SELECT * FROM core.db_connections
WHERE id = $1;

-- name: GetDBConnectionByName :one
SELECT * FROM core.db_connections
WHERE project_id = $1
  AND name = $2;

-- name: CreateDBConnection :one
INSERT INTO core.db_connections (
  project_id,
  name,
  db_type,
  config,
  is_managed,
  created_by_user_id
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: DeleteDBConnection :one
DELETE FROM core.db_connections
WHERE id = $1
  AND project_id = $2
RETURNING *;
