-- name: ListProjectsForOrganization :many
SELECT
  p.*,
  pm.role AS membership_role
FROM core.projects p
LEFT JOIN core.project_members pm
  ON pm.project_id = p.id
  AND pm.user_id = $2
WHERE p.organization_id = $1
  AND (
    btrim($3) = ''
    OR p.slug ILIKE '%' || btrim($3) || '%'
    OR p.name ILIKE '%' || btrim($3) || '%'
    OR COALESCE(p.description, '') ILIKE '%' || btrim($3) || '%'
  )
ORDER BY p.created_at ASC;

-- name: CreateProject :one
INSERT INTO core.projects (
  organization_id,
  slug,
  name,
  description
) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateProjectByID :one
UPDATE core.projects
SET slug = $2,
    name = $3,
    description = $4,
    retention_events_days = COALESCE(sqlc.narg('retention_events_days'), retention_events_days),
    retention_audit_days = COALESCE(sqlc.narg('retention_audit_days'), retention_audit_days),
    retention_webhook_days = COALESCE(sqlc.narg('retention_webhook_days'), retention_webhook_days)
WHERE id = $1
RETURNING *;

-- name: AddProjectMember :one
INSERT INTO core.project_members (project_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, user_id) DO UPDATE
SET role = EXCLUDED.role
RETURNING *;

-- name: GetProjectMembership :one
SELECT
  pm.*,
  p.organization_id
FROM core.project_members pm
JOIN core.projects p ON p.id = pm.project_id
WHERE pm.project_id = $1
  AND pm.user_id = $2;

-- name: ListProjectMembers :many
SELECT
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.created_at,
  u.email,
  u.name,
  u.email_verified
FROM core.project_members pm
JOIN core.users u ON u.id = pm.user_id
WHERE pm.project_id = $1
ORDER BY pm.created_at ASC;

-- name: UpdateProjectMemberRole :one
UPDATE core.project_members
SET role = $3
WHERE project_id = $1
  AND user_id = $2
RETURNING *;

-- name: RemoveProjectMember :one
DELETE FROM core.project_members
WHERE project_id = $1
  AND user_id = $2
RETURNING *;

-- name: CountProjectAdmins :one
SELECT COUNT(*)::BIGINT FROM core.project_members
WHERE project_id = $1
  AND role = 'admin';

-- name: GetProjectByID :one
SELECT * FROM core.projects
WHERE id = $1;

-- name: GetProjectOverview :one
SELECT
  p.id AS project_id,
  p.organization_id,
  p.slug AS project_slug,
  p.name AS project_name,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.project_members pm
    WHERE pm.project_id = p.id
  ) AS member_count,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.api_keys ak
    WHERE ak.project_id = p.id
      AND ak.revoked_at IS NULL
  ) AS active_api_key_count,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.buckets b
    WHERE b.project_id = p.id
  ) AS bucket_count,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.bucket_objects bo
    JOIN core.buckets b ON b.id = bo.bucket_id
    WHERE b.project_id = p.id
  ) AS object_count,
  (
    SELECT COALESCE(SUM(bo.size_bytes), 0)::BIGINT
    FROM core.bucket_objects bo
    JOIN core.buckets b ON b.id = bo.bucket_id
    WHERE b.project_id = p.id
  ) AS object_bytes_total,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.project_invitations pi
    WHERE pi.organization_id = p.organization_id
      AND (pi.project_id IS NULL OR pi.project_id = p.id)
      AND pi.accepted_at IS NULL
      AND pi.expires_at > NOW()
  ) AS pending_invitation_count,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.audit_logs al
    WHERE al.project_id = p.id
      AND al.created_at >= NOW() - INTERVAL '24 hours'
  ) AS audit_events_24h,
  (
    SELECT MAX(al.created_at)::TIMESTAMPTZ
    FROM core.audit_logs al
    WHERE al.project_id = p.id
  ) AS last_audit_at,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.integrations i
    WHERE i.project_id = p.id
  ) AS integration_count,
  (
    SELECT COUNT(*)::BIGINT
    FROM core.webhooks w
    WHERE w.project_id = p.id
      AND w.enabled
  ) AS webhook_count
FROM core.projects p
WHERE p.id = $1;

-- name: DeleteProjectByID :one
DELETE FROM core.projects
WHERE id = $1
RETURNING *;
