-- name: CreateFunction :one
INSERT INTO core.functions (project_id, name, code, runtime, event_pattern)
VALUES ($1, $2, $3, $4, $5)
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
    event_pattern = COALESCE(sqlc.narg('event_pattern'), event_pattern),
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

-- name: ListFunctionsForEvent :many
SELECT * FROM core.functions
WHERE project_id = $1
  AND enabled = TRUE
  AND event_pattern <> ''
  AND ($2 LIKE REPLACE(event_pattern, '*', '%') OR event_pattern = '*');
