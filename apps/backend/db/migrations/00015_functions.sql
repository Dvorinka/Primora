-- +goose Up
CREATE TABLE core.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES core.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  runtime TEXT NOT NULL DEFAULT 'bun' CHECK (runtime IN ('bun','deno')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

CREATE TABLE core.function_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID NOT NULL REFERENCES core.functions(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual','schedule','hook')),
  status TEXT NOT NULL CHECK (status IN ('success','error','timeout')),
  exit_code INT,
  stdout TEXT NOT NULL DEFAULT '',
  stderr TEXT NOT NULL DEFAULT '',
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX function_runs_function_idx ON core.function_runs(function_id, created_at DESC);

ALTER TABLE core.scheduled_job_runs
  DROP CONSTRAINT scheduled_job_runs_triggered_by_check;
ALTER TABLE core.scheduled_job_runs
  ADD CONSTRAINT scheduled_job_runs_triggered_by_check
  CHECK (triggered_by IN ('schedule','manual','hook','function'));

-- +goose Down
ALTER TABLE core.scheduled_job_runs
  DROP CONSTRAINT scheduled_job_runs_triggered_by_check;
ALTER TABLE core.scheduled_job_runs
  ADD CONSTRAINT scheduled_job_runs_triggered_by_check
  CHECK (triggered_by IN ('schedule','manual','hook'));
DROP TABLE IF EXISTS core.function_runs;
DROP TABLE IF EXISTS core.functions;
