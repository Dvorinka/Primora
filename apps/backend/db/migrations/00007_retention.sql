-- +goose Up
ALTER TABLE core.projects
  ADD COLUMN retention_events_days INT NOT NULL DEFAULT 90,
  ADD COLUMN retention_audit_days INT NOT NULL DEFAULT 365,
  ADD COLUMN retention_webhook_days INT NOT NULL DEFAULT 30;

-- +goose Down
ALTER TABLE core.projects
  DROP COLUMN IF EXISTS retention_events_days,
  DROP COLUMN IF EXISTS retention_audit_days,
  DROP COLUMN IF EXISTS retention_webhook_days;
