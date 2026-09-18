-- +goose Up
CREATE TABLE core.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  url TEXT NOT NULL,
  secret BYTEA NOT NULL DEFAULT ''::bytea,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT '' CHECK (last_status IN ('', 'success', 'failed')),
  next_run_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES core.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

CREATE INDEX idx_scheduled_jobs_due ON core.scheduled_jobs(next_run_at)
  WHERE enabled AND next_run_at IS NOT NULL;

CREATE TABLE core.scheduled_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES core.scheduled_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  triggered_by TEXT NOT NULL DEFAULT 'schedule' CHECK (triggered_by IN ('schedule', 'manual')),
  status_code INT,
  error TEXT NOT NULL DEFAULT '',
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_scheduled_job_runs_job ON core.scheduled_job_runs(job_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS core.scheduled_job_runs;
DROP TABLE IF EXISTS core.scheduled_jobs;
