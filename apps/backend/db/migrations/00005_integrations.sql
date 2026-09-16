-- +goose Up
CREATE TABLE core.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rybbit')),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials BYTEA NOT NULL DEFAULT ''::bytea,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'ok', 'error')),
  last_health_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_integrations_project_id ON core.integrations(project_id);

CREATE TABLE core.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret BYTEA NOT NULL DEFAULT ''::bytea,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, url)
);

CREATE INDEX idx_webhooks_project_id ON core.webhooks(project_id);

CREATE TABLE core.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES core.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_status_code INT,
  last_error TEXT NOT NULL DEFAULT '',
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON core.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry ON core.webhook_deliveries(next_retry_at)
  WHERE status = 'pending';

-- +goose Down
DROP TABLE IF EXISTS core.webhook_deliveries;
DROP TABLE IF EXISTS core.webhooks;
DROP TABLE IF EXISTS core.integrations;
