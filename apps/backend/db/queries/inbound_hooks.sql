-- name: CreateInboundHook :one
INSERT INTO core.inbound_hooks (project_id, name, token, mode, job_id, function_id, secret, enabled)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListInboundHooks :many
SELECT * FROM core.inbound_hooks
WHERE project_id = $1
ORDER BY name;

-- name: GetInboundHookByToken :one
SELECT * FROM core.inbound_hooks
WHERE token = $1;

-- name: GetInboundHook :one
SELECT * FROM core.inbound_hooks
WHERE id = $1 AND project_id = $2;

-- name: TouchInboundHook :exec
UPDATE core.inbound_hooks
SET last_received_at = NOW()
WHERE id = $1;

-- name: DeleteInboundHook :exec
DELETE FROM core.inbound_hooks
WHERE id = $1 AND project_id = $2;
