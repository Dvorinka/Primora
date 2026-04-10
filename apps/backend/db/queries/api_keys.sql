-- name: CreateAPIKey :one
INSERT INTO core.api_keys (
  project_id,
  name,
  prefix,
  secret_hash,
  created_by_user_id
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListAPIKeysForProject :many
SELECT * FROM core.api_keys
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetAPIKeyByIDForProject :one
SELECT * FROM core.api_keys
WHERE project_id = $1
  AND id = $2;

-- name: GetAPIKeyByPrefix :one
SELECT
  ak.*,
  p.organization_id
FROM core.api_keys ak
JOIN core.projects p ON p.id = ak.project_id
WHERE ak.prefix = $1;

-- name: RevokeAPIKey :one
UPDATE core.api_keys
SET revoked_at = NOW()
WHERE project_id = $1
  AND id = $2
  AND revoked_at IS NULL
RETURNING *;

-- name: TouchAPIKey :exec
UPDATE core.api_keys
SET last_used_at = NOW()
WHERE id = $1;
