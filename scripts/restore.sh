#!/usr/bin/env bash
# Primora restore: rebuilds the database and storage volume from a backup
# tarball produced by scripts/backup.sh.
#
#   ./scripts/restore.sh backups/primora-20260101-120000.tar.gz
#
# DESTRUCTIVE: drops and recreates the target database's objects and
# overwrites the storage volume. Stop the stack first:
#   docker compose stop backend auth
# Then restore, then `docker compose up -d`.

set -euo pipefail

ARCHIVE="${1:?usage: restore.sh <backup.tar.gz>}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-primora-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-primora}"
POSTGRES_DB="${POSTGRES_DB:-primora}"
STORAGE_VOLUME="${STORAGE_VOLUME:-primora_backend_storage}"

[ -f "$ARCHIVE" ] || { echo "no such archive: $ARCHIVE" >&2; exit 1; }
docker exec "$POSTGRES_CONTAINER" true 2>/dev/null \
  || { echo "postgres container $POSTGRES_CONTAINER is not running" >&2; exit 1; }

echo "This will overwrite database '$POSTGRES_DB' in $POSTGRES_CONTAINER"
echo "and the contents of volume $STORAGE_VOLUME."
read -r -p "Continue? [y/N] " confirm
[ "$confirm" = "y" ] || [ "$confirm" = "Y" ] || { echo "aborted"; exit 1; }

# Workdir under cwd — /tmp is not bind-mountable on every docker setup.
work="$(mktemp -d "$(pwd)/.restore-tmp.XXXXXX")"
trap 'rm -rf "$work"' EXIT
tar -xzf "$ARCHIVE" -C "$work"
[ -f "$work/db.dump" ] || { echo "archive has no db.dump" >&2; exit 1; }

echo "==> restoring database"
cat "$work/db.dump" | docker exec -i "$POSTGRES_CONTAINER" \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner

if [ -f "$work/storage.tar" ]; then
  echo "==> restoring storage volume $STORAGE_VOLUME"
  docker run --rm -v "$STORAGE_VOLUME:/data" -v "$work:/backup" \
    alpine:3 sh -c 'rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar -C /data -xf /backup/storage.tar'
else
  echo "warning: archive has no storage.tar — skipping volume" >&2
fi

echo "==> restore complete; restart the stack with: docker compose up -d"
