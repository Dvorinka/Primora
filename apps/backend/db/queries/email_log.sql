-- name: InsertEmailLog :one
INSERT INTO core.email_log (project_id, template, to_email, subject, status, error)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListEmailLog :many
SELECT * FROM core.email_log
WHERE project_id = $1
ORDER BY created_at DESC
LIMIT $2;
