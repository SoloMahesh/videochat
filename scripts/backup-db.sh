#!/usr/bin/env bash
set -euo pipefail

# Nightly Postgres backup for Bounce.
#
# Dumps the `bounce` database, gzips it, optionally GPG-encrypts it, and
# optionally uploads it off-box via rclone — the only stateful thing on
# the VPS that isn't reconstructable from source (docs/FSD.md "Backups").
# Prunes local copies older than BACKUP_RETENTION_DAYS.
#
# Setup + cron line: docs/BACKUPS.md
#
# Works two ways:
#   - docker-compose deployment (default): runs pg_dump inside the
#     `postgres` service container, since it's not exposed to the host.
#   - bare-metal/local Postgres: falls back to `pg_dump "$DATABASE_URL"`
#     directly when docker compose / the postgres service isn't available.

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$BACKUP_DIR/bounce-$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

use_docker=0
if command -v docker >/dev/null 2>&1 && docker compose ps -q postgres >/dev/null 2>&1 && [ -n "$(docker compose ps -q postgres 2>/dev/null)" ]; then
  use_docker=1
fi

echo "[backup] dumping database to $DUMP_FILE"
if [ "$use_docker" = "1" ]; then
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set (in .env) for the docker-compose backup path}"
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    pg_dump -U bounce -d bounce --no-owner --no-privileges \
    | gzip > "$DUMP_FILE"
else
  : "${DATABASE_URL:?DATABASE_URL must be set for the direct-Postgres backup path}"
  pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$DUMP_FILE"
fi

if [ ! -s "$DUMP_FILE" ]; then
  echo "[backup] ERROR: dump is empty, aborting" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

FINAL_FILE="$DUMP_FILE"

if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "[backup] encrypting with symmetric passphrase"
  gpg --yes --batch --pinentry-mode loopback --passphrase "$BACKUP_GPG_PASSPHRASE" \
    --symmetric --cipher-algo AES256 "$DUMP_FILE"
  rm -f "$DUMP_FILE"
  FINAL_FILE="$DUMP_FILE.gpg"
else
  echo "[backup] BACKUP_GPG_PASSPHRASE not set — dump left unencrypted, see docs/BACKUPS.md"
fi

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  echo "[backup] uploading to $BACKUP_RCLONE_REMOTE"
  rclone copy "$FINAL_FILE" "$BACKUP_RCLONE_REMOTE"
else
  echo "[backup] BACKUP_RCLONE_REMOTE not set — keeping local copy only, see docs/BACKUPS.md to add off-box storage"
fi

echo "[backup] pruning local backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'bounce-*.sql.gz*' -mtime "+$RETENTION_DAYS" -delete

echo "[backup] done: $FINAL_FILE"
