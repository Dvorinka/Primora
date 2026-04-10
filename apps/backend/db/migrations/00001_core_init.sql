-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;

CREATE TYPE core.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE core.project_role AS ENUM ('admin', 'developer', 'viewer');
CREATE TYPE core.bucket_visibility AS ENUM ('private', 'public');

CREATE TABLE core.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  role core.org_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE core.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE core.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  role core.project_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE core.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  secret_hash BYTEA NOT NULL,
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  visibility core.bucket_visibility NOT NULL DEFAULT 'private',
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, slug)
);

CREATE TABLE core.bucket_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES core.buckets(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  uploaded_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_id, object_key)
);

CREATE TABLE core.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  org_role core.org_role NOT NULL DEFAULT 'member',
  project_role core.project_role,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE core.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  actor_api_key_id UUID REFERENCES core.api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_subject ON core.users(auth_subject);
CREATE INDEX idx_org_members_user_id ON core.organization_members(user_id);
CREATE INDEX idx_projects_org_id ON core.projects(organization_id);
CREATE INDEX idx_project_members_user_id ON core.project_members(user_id);
CREATE INDEX idx_api_keys_project_id ON core.api_keys(project_id);
CREATE INDEX idx_api_keys_prefix ON core.api_keys(prefix);
CREATE INDEX idx_buckets_project_id ON core.buckets(project_id);
CREATE INDEX idx_bucket_objects_bucket_id ON core.bucket_objects(bucket_id);
CREATE INDEX idx_bucket_objects_bucket_key ON core.bucket_objects(bucket_id, object_key);
CREATE INDEX idx_project_invitations_email ON core.project_invitations(email);
CREATE INDEX idx_audit_logs_project_id ON core.audit_logs(project_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_id ON core.audit_logs(organization_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS core.audit_logs;
DROP TABLE IF EXISTS core.project_invitations;
DROP TABLE IF EXISTS core.bucket_objects;
DROP TABLE IF EXISTS core.buckets;
DROP TABLE IF EXISTS core.api_keys;
DROP TABLE IF EXISTS core.project_members;
DROP TABLE IF EXISTS core.projects;
DROP TABLE IF EXISTS core.organization_members;
DROP TABLE IF EXISTS core.organizations;
DROP TABLE IF EXISTS core.users;
DROP TYPE IF EXISTS core.bucket_visibility;
DROP TYPE IF EXISTS core.project_role;
DROP TYPE IF EXISTS core.org_role;
DROP SCHEMA IF EXISTS core;

