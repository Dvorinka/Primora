-- name: CreateOrganization :one
INSERT INTO core.organizations (slug, name)
VALUES ($1, $2)
RETURNING *;

-- name: UpdateOrganizationByID :one
UPDATE core.organizations
SET slug = $2,
    name = $3
WHERE id = $1
RETURNING *;

-- name: ListOrganizationsForUser :many
SELECT
  o.*,
  om.role AS membership_role
FROM core.organizations o
JOIN core.organization_members om ON om.organization_id = o.id
WHERE om.user_id = $1
ORDER BY o.created_at ASC;

-- name: GetOrganizationMembership :one
SELECT
  om.*,
  o.name AS organization_name,
  o.slug AS organization_slug
FROM core.organization_members om
JOIN core.organizations o ON o.id = om.organization_id
WHERE om.organization_id = $1
  AND om.user_id = $2;

-- name: ListOrganizationMembers :many
SELECT
  om.organization_id,
  om.user_id,
  om.role,
  om.created_at,
  u.email,
  u.name,
  u.email_verified
FROM core.organization_members om
JOIN core.users u ON u.id = om.user_id
WHERE om.organization_id = $1
ORDER BY om.created_at ASC;

-- name: UpdateOrganizationMemberRole :one
UPDATE core.organization_members
SET role = $3
WHERE organization_id = $1
  AND user_id = $2
RETURNING *;

-- name: RemoveOrganizationMember :one
DELETE FROM core.organization_members
WHERE organization_id = $1
  AND user_id = $2
RETURNING *;

-- name: RemoveProjectMembershipsForOrganizationUser :exec
DELETE FROM core.project_members pm
USING core.projects p
WHERE pm.project_id = p.id
  AND p.organization_id = $1
  AND pm.user_id = $2;

-- name: CountOrganizationOwners :one
SELECT COUNT(*)::BIGINT FROM core.organization_members
WHERE organization_id = $1
  AND role = 'owner';

-- name: CreateInvitation :one
INSERT INTO core.project_invitations (
  organization_id,
  project_id,
  email,
  org_role,
  project_role,
  token_hash,
  expires_at,
  invited_by_user_id
) VALUES (
  $1,
  $2,
  LOWER($3),
  $4,
  $5,
  $6,
  $7,
  $8
)
RETURNING *;

-- name: GetInvitationByTokenHash :one
SELECT * FROM core.project_invitations
WHERE token_hash = $1;

-- name: GetInvitationByIDForOrganization :one
SELECT * FROM core.project_invitations
WHERE organization_id = $1
  AND id = $2;

-- name: ListInvitationsForOrganization :many
SELECT
  i.id,
  i.organization_id,
  i.project_id,
  p.name AS project_name,
  i.email,
  i.org_role,
  i.project_role,
  i.expires_at,
  i.accepted_at,
  i.invited_by_user_id,
  i.created_at
FROM core.project_invitations i
LEFT JOIN core.projects p ON p.id = i.project_id
WHERE i.organization_id = $1
ORDER BY i.created_at DESC;

-- name: DeletePendingInvitationByIDForOrganization :one
DELETE FROM core.project_invitations
WHERE organization_id = $1
  AND id = $2
  AND accepted_at IS NULL
RETURNING *;

-- name: MarkInvitationAccepted :one
UPDATE core.project_invitations
SET accepted_at = NOW()
WHERE id = $1
RETURNING *;

-- name: AddOrganizationMember :one
INSERT INTO core.organization_members (organization_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = EXCLUDED.role
RETURNING *;

-- name: ListBucketsForOrganization :many
SELECT b.id
FROM core.buckets b
JOIN core.projects p ON p.id = b.project_id
WHERE p.organization_id = $1;

-- name: DeleteOrganizationByID :one
DELETE FROM core.organizations
WHERE id = $1
RETURNING *;

-- name: GetOrganizationByID :one
SELECT * FROM core.organizations
WHERE id = $1;
