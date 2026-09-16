-- name: ListIntegrations :many
SELECT * FROM core.integrations
WHERE project_id = $1
ORDER BY name ASC;

-- name: GetIntegrationByID :one
SELECT * FROM core.integrations
WHERE id = $1;

-- name: CreateIntegration :one
INSERT INTO core.integrations (
  project_id,
  type,
  name,
  base_url,
  config,
  credentials,
  created_by_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: DeleteIntegration :one
DELETE FROM core.integrations
WHERE id = $1
  AND project_id = $2
RETURNING *;

-- name: UpdateIntegrationHealth :exec
UPDATE core.integrations
SET status = $2,
    last_health_at = NOW(),
    updated_at = NOW()
WHERE id = $1;
