-- +goose Up
-- Project-level secrets: AES-256-GCM ciphertext produced by the backend's
-- Encryptor. Values are write-once — list/read expose metadata only; a
-- dedicated reveal endpoint decrypts and is audit-logged. secret://NAME
-- references in job payloads resolve at delivery time.
CREATE TABLE core.project_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

-- +goose Down
DROP TABLE IF EXISTS core.project_secrets;
