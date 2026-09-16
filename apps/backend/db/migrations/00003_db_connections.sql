-- +goose Up
CREATE TABLE core.db_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_managed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_db_connections_project_id ON core.db_connections(project_id);

-- +goose Down
DROP TABLE IF EXISTS core.db_connections;
