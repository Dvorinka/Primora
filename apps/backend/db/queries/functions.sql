-- name: CreateFunction :one
INSERT INTO core.functions (project_id, name, code, runtime)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetFunction :one
SELECT * FROM core.functions WHERE id = $1;

-- name: GetFunctionByName :one
SELECT * FROM core.functions WHERE project_id = $1 AND name = $2;

-- name: ListFunctions :many
SELECT * FROM core.functions
WHERE project_id = $1
ORDER BY name;

-- name: UpdateFunction :one
UPDATE core.functions
SET code = COALESCE(sqlc.narg('code'), code),
    enabled = COALESCE(sqlc.narg('enabled'), enabled),
    updated_at = NOW()
WHERE id = $1 AND project_id = $2
RETURNING *;

-- name: DeleteFunction :exec
DELETE FROM core.functions WHERE id = $1 AND project_id = $2;

-- name: InsertFunctionRun :one
INSERT INTO core.function_runs (function_id, trigger, status, exit_code, stdout, stderr, duration_ms)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListFunctionRuns :many
SELECT * FROM core.function_runs
WHERE function_id = $1
ORDER BY created_at DESC
LIMIT $2;
