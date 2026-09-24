-- name: ListScheduledJobs :many
SELECT * FROM core.scheduled_jobs
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetScheduledJobByID :one
SELECT * FROM core.scheduled_jobs
WHERE id = $1;

-- name: CreateScheduledJob :one
INSERT INTO core.scheduled_jobs (
  project_id,
  name,
  schedule,
  url,
  secret,
  payload,
  enabled,
  next_run_at,
  created_by_user_id,
  function_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: UpdateScheduledJob :one
UPDATE core.scheduled_jobs
SET name = $3,
    schedule = $4,
    url = $5,
    enabled = $6,
    next_run_at = $7,
    secret = CASE WHEN $8::boolean THEN $9 ELSE secret END,
    payload = CASE WHEN $10::boolean THEN $11 ELSE payload END,
    function_id = CASE WHEN $12::boolean THEN $13 ELSE function_id END,
    updated_at = NOW()
WHERE id = $1
  AND project_id = $2
RETURNING *;

-- name: DeleteScheduledJob :one
DELETE FROM core.scheduled_jobs
WHERE id = $1
  AND project_id = $2
RETURNING id;

-- name: ListDueScheduledJobs :many
SELECT * FROM core.scheduled_jobs
WHERE enabled
  AND next_run_at IS NOT NULL
  AND next_run_at <= $1;

-- name: MarkScheduledJobRan :one
UPDATE core.scheduled_jobs
SET last_run_at = $2,
    last_status = $3,
    next_run_at = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: InsertScheduledJobRun :one
INSERT INTO core.scheduled_job_runs (job_id, triggered_by)
VALUES ($1, $2)
RETURNING *;

-- name: FinishScheduledJobRun :one
UPDATE core.scheduled_job_runs
SET status = $2,
    status_code = $3,
    error = $4,
    duration_ms = $5,
    finished_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListScheduledJobRuns :many
SELECT * FROM core.scheduled_job_runs
WHERE job_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- name: PruneScheduledJobRuns :exec
DELETE FROM core.scheduled_job_runs r
WHERE r.job_id = $1
  AND r.id NOT IN (
    SELECT k.id FROM core.scheduled_job_runs k
    WHERE k.job_id = $1
    ORDER BY k.created_at DESC
    LIMIT $2
  );
