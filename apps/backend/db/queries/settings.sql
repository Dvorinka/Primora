-- name: GetSetting :one
SELECT key, value, secret, updated_at FROM core.settings WHERE key = $1;

-- name: ListSettings :many
SELECT key, value, secret, updated_at FROM core.settings ORDER BY key;

-- name: UpsertSetting :one
INSERT INTO core.settings (key, value, secret, updated_by)
VALUES ($1, $2::jsonb, $3, $4)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    secret = EXCLUDED.secret,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
RETURNING *;

-- name: DeleteSetting :exec
DELETE FROM core.settings WHERE key = $1;
