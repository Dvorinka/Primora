-- +goose Up
ALTER TABLE core.scheduled_jobs
  ADD COLUMN function_id UUID REFERENCES core.functions(id) ON DELETE SET NULL;

ALTER TABLE core.inbound_hooks
  ADD COLUMN function_id UUID REFERENCES core.functions(id) ON DELETE CASCADE;
ALTER TABLE core.inbound_hooks
  DROP CONSTRAINT inbound_hooks_mode_check;
ALTER TABLE core.inbound_hooks
  ADD CONSTRAINT inbound_hooks_mode_check
  CHECK (mode IN ('event','job','function'));

ALTER TABLE core.functions
  ADD COLUMN event_pattern TEXT NOT NULL DEFAULT '';

ALTER TABLE core.function_runs
  DROP CONSTRAINT function_runs_trigger_check;
ALTER TABLE core.function_runs
  ADD CONSTRAINT function_runs_trigger_check
  CHECK (trigger IN ('manual','schedule','hook','event'));

-- +goose Down
ALTER TABLE core.function_runs
  DROP CONSTRAINT function_runs_trigger_check;
ALTER TABLE core.function_runs
  ADD CONSTRAINT function_runs_trigger_check
  CHECK (trigger IN ('manual','schedule','hook'));
ALTER TABLE core.functions DROP COLUMN IF EXISTS event_pattern;
ALTER TABLE core.inbound_hooks
  DROP CONSTRAINT inbound_hooks_mode_check;
ALTER TABLE core.inbound_hooks
  ADD CONSTRAINT inbound_hooks_mode_check CHECK (mode IN ('event','job'));
ALTER TABLE core.inbound_hooks DROP COLUMN IF EXISTS function_id;
ALTER TABLE core.scheduled_jobs DROP COLUMN IF EXISTS function_id;
