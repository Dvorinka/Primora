-- name: ListProjectSecrets :many
SELECT id, project_id, name, url, notes, created_at, updated_at
FROM core.project_secrets
WHERE project_id = $1
ORDER BY name ASC;

-- name: GetProjectSecret :one
SELECT * FROM core.project_secrets
WHERE project_id = $1
  AND name = $2;

-- name: UpsertProjectSecret :one
INSERT INTO core.project_secrets (
  project_id,
  name,
  ciphertext,
  url,
  notes
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (project_id, name) DO UPDATE SET
  ciphertext = EXCLUDED.ciphertext,
  url = EXCLUDED.url,
  notes = EXCLUDED.notes,
  updated_at = NOW()
RETURNING *;

-- name: DeleteProjectSecret :one
DELETE FROM core.project_secrets
WHERE project_id = $1
  AND name = $2
RETURNING id;

-- name: ListProjectSecretValues :many
SELECT name, ciphertext
FROM core.project_secrets
WHERE project_id = $1;
