-- name: ListProjectLogins :many
SELECT id, project_id, app, username, origin, notes, created_at, updated_at
FROM core.project_logins
WHERE project_id = $1
ORDER BY app ASC;

-- name: GetProjectLogin :one
SELECT * FROM core.project_logins
WHERE project_id = $1
  AND app = $2;

-- name: UpsertProjectLogin :one
INSERT INTO core.project_logins (
  project_id,
  app,
  username,
  ciphertext,
  origin,
  notes
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (project_id, app) DO UPDATE SET
  username = EXCLUDED.username,
  ciphertext = EXCLUDED.ciphertext,
  origin = EXCLUDED.origin,
  notes = EXCLUDED.notes,
  updated_at = NOW()
RETURNING *;

-- name: DeleteProjectLogin :one
DELETE FROM core.project_logins
WHERE project_id = $1
  AND app = $2
RETURNING id;
