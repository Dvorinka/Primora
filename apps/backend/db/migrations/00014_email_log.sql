-- +goose Up
CREATE TABLE core.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES core.projects(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_project ON core.email_log(project_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS core.email_log;
