-- name: CreateAuditLog :one
INSERT INTO core.audit_logs (
  organization_id,
  project_id,
  actor_user_id,
  actor_api_key_id,
  action,
  resource_type,
  resource_id,
  metadata,
  request_id
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9
)
RETURNING *;

-- name: ListAuditLogsForProject :many
SELECT * FROM core.audit_logs
WHERE project_id = $1
  AND (
    NULLIF(TRIM($2), '') IS NULL
    OR action ILIKE '%' || TRIM($2) || '%'
    OR resource_type ILIKE '%' || TRIM($2) || '%'
    OR resource_id ILIKE '%' || TRIM($2) || '%'
    OR request_id ILIKE '%' || TRIM($2) || '%'
    OR metadata::text ILIKE '%' || TRIM($2) || '%'
  )
  AND (
    NULLIF(TRIM($3), '') IS NULL
    OR action ILIKE TRIM($3) || '%'
  )
ORDER BY created_at DESC
LIMIT $4
OFFSET $5;

-- name: CountAuditLogsForProject :one
SELECT COUNT(*)::BIGINT
FROM core.audit_logs
WHERE project_id = $1
  AND (
    NULLIF(TRIM($2), '') IS NULL
    OR action ILIKE '%' || TRIM($2) || '%'
    OR resource_type ILIKE '%' || TRIM($2) || '%'
    OR resource_id ILIKE '%' || TRIM($2) || '%'
    OR request_id ILIKE '%' || TRIM($2) || '%'
    OR metadata::text ILIKE '%' || TRIM($2) || '%'
  )
  AND (
    NULLIF(TRIM($3), '') IS NULL
    OR action ILIKE TRIM($3) || '%'
  );
