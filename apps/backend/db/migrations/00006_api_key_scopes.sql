-- +goose Up
ALTER TABLE core.api_keys
  ADD COLUMN scopes TEXT[] NOT NULL DEFAULT '{admin}';

-- +goose Down
ALTER TABLE core.api_keys DROP COLUMN IF EXISTS scopes;
