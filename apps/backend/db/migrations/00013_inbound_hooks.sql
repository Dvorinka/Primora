-- +goose Up
CREATE TABLE core.inbound_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'event' CHECK (mode IN ('event','job')),
  job_id UUID REFERENCES core.scheduled_jobs(id) ON DELETE CASCADE,
  secret BYTEA NOT NULL DEFAULT ''::bytea,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

ALTER TABLE core.scheduled_job_runs
  DROP CONSTRAINT scheduled_job_runs_triggered_by_check;
ALTER TABLE core.scheduled_job_runs
  ADD CONSTRAINT scheduled_job_runs_triggered_by_check
  CHECK (triggered_by IN ('schedule','manual','hook'));

-- +goose Down
ALTER TABLE core.scheduled_job_runs
  DROP CONSTRAINT scheduled_job_runs_triggered_by_check;
ALTER TABLE core.scheduled_job_runs
  ADD CONSTRAINT scheduled_job_runs_triggered_by_check
  CHECK (triggered_by IN ('schedule','manual'));
DROP TABLE IF EXISTS core.inbound_hooks;
