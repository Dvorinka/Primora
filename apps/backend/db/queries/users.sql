-- name: UpsertUser :one
INSERT INTO core.users (
  auth_subject,
  email,
  name,
  email_verified,
  updated_at,
  last_seen_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  NOW(),
  NOW()
)
ON CONFLICT (auth_subject) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  email_verified = EXCLUDED.email_verified,
  updated_at = NOW(),
  last_seen_at = NOW()
RETURNING *;

-- name: GetUserByAuthSubject :one
SELECT * FROM core.users
WHERE auth_subject = $1;

-- name: GetUserByID :one
SELECT * FROM core.users
WHERE id = $1;

-- name: CountOrganizations :one
SELECT COUNT(*)::BIGINT FROM core.organizations;
