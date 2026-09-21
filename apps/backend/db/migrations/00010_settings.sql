-- +goose Up
-- Instance-level settings. In-app values override env vars; secrets are
-- AES-256-GCM ciphertext (base64) produced by the backend's Encryptor and
-- readable by the auth service, which shares PRIMORA_ENCRYPTION_KEY.
CREATE TABLE core.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  secret BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS core.settings;
