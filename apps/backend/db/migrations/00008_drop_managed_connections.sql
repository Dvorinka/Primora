-- +goose Up
-- Managed seeds stored the platform's own DATABASE_URL/DRAGONFLY_URL in
-- tenant-visible rows; the feature is removed, so drop the leaked rows.
DELETE FROM core.db_connections WHERE is_managed;
-- Passwords are AES-GCM sealed app-side from now on; strip any plaintext
-- password left in existing configs (users re-enter on next edit).
UPDATE core.db_connections SET config = config - 'password' WHERE config ? 'password';

-- +goose Down
-- Deleted managed rows and stripped passwords are not recoverable.
SELECT 1;
