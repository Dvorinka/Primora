-- name: BootstrapOrganization :one
WITH new_org AS (
  INSERT INTO core.organizations (slug, name)
  VALUES ($1, $2)
  RETURNING *
),
new_org_member AS (
  INSERT INTO core.organization_members (organization_id, user_id, role)
  SELECT id, $3, 'owner'::core.org_role FROM new_org
),
new_project AS (
  INSERT INTO core.projects (organization_id, slug, name, description)
  SELECT id, $4, $5, $6 FROM new_org
  RETURNING *
),
new_project_member AS (
  INSERT INTO core.project_members (project_id, user_id, role)
  SELECT id, $3, 'admin'::core.project_role FROM new_project
)
SELECT
  new_org.id AS organization_id,
  new_org.slug AS organization_slug,
  new_org.name AS organization_name,
  new_project.id AS project_id,
  new_project.slug AS project_slug,
  new_project.name AS project_name
FROM new_org
JOIN new_project ON TRUE;

