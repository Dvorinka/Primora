-- +goose Up
-- App logins: username + password bound to a stable app id, not a host:port.
-- The password is AES-256-GCM ciphertext. List returns metadata (including
-- the username and origin); reveal decrypts and is audit-logged.
CREATE TABLE core.project_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  app TEXT NOT NULL,
  username TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  origin TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, app)
);

-- +goose Down
DROP TABLE IF EXISTS core.project_logins;
