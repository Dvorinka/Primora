#!/usr/bin/env bash
# Primora backup: pg_dump of the database + archive of the object-storage root.
#
# Produces backups/primora-YYYYMMDD-HHMMSS.tar.gz containing:
#   db.dump       postgres custom-format dump (all schemas, incl. core + auth)
#   storage/      contents of the backend_storage volume
#
# Usage (from the repo root, against the compose stack):
#   ./scripts/backup.sh
#
# Optional env:
#   BACKUP_DIR           output directory            (default: ./backups)
#   POSTGRES_CONTAINER   compose container name      (default: primora-postgres-1)
#   POSTGRES_USER/DB     dump credentials            (default: primora/primora)
#   STORAGE_VOLUME       docker volume for objects   (default: primora_backend_storage)
#
# Restore with scripts/restore.sh. Schedule via cron or a systemd timer —
# see DEPLOYMENT_GUIDE.md#backups.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-primora-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-primora}"
POSTGRES_DB="${POSTGRES_DB:-primora}"
STORAGE_VOLUME="${STORAGE_VOLUME:-primora_backend_storage}"

stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
# Workdir lives under BACKUP_DIR — /tmp is not bind-mountable on every
# docker setup, and the storage archive is written through a container.
work="$(mktemp -d "$BACKUP_DIR/.tmp.XXXXXX")"
out="$BACKUP_DIR/primora-$stamp.tar.gz"
trap 'rm -rf "$work"' EXIT

echo "==> dumping database from $POSTGRES_CONTAINER"
docker exec "$POSTGRES_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$work/db.dump"
[ -s "$work/db.dump" ] || { echo "pg_dump produced an empty file" >&2; exit 1; }

echo "==> archiving storage volume $STORAGE_VOLUME"
# Read the volume through a throwaway container — no host mount assumptions.
docker run --rm -v "$STORAGE_VOLUME:/data:ro" -v "$work:/backup" \
  alpine:3 tar -C /data -cf /backup/storage.tar .
[ -s "$work/storage.tar" ] || echo "warning: storage volume appears empty" >&2

tar -C "$work" -czf "$out" db.dump storage.tar
echo "==> wrote $out ($(du -h "$out" | cut -f1))"
