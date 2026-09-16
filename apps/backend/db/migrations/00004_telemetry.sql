-- +goose Up
CREATE TABLE core.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other'
        CHECK (kind IN ('frontend','backend','database','android','desktop','web','other')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

CREATE TABLE core.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  component_id UUID REFERENCES core.components(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('error','metric','log','heartbeat','event')),
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint TEXT NOT NULL DEFAULT '',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_project_ts ON core.events(project_id, ts DESC);
CREATE INDEX idx_events_project_type_ts ON core.events(project_id, type, ts DESC);
CREATE INDEX idx_events_fingerprint ON core.events(fingerprint) WHERE type = 'error';
CREATE INDEX idx_events_metric_name ON core.events(project_id, (payload->>'name')) WHERE type = 'metric';

-- +goose Down
DROP TABLE IF EXISTS core.events;
DROP TABLE IF EXISTS core.components;
