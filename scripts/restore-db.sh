#!/usr/bin/env bash
set -euo pipefail

# Restores a Bounce Postgres dump produced by scripts/backup-db.sh.
# Usage: scripts/restore-db.sh path/to/bounce-TIMESTAMP.sql.gz[.gpg]
#
# DESTRUCTIVE: drops and recreates the `bounce` database. Run this against
# a fresh VPS during disaster recovery, or against a scratch database to
# verify a backup is actually restorable (untested backups are not backups).

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

FILE="${1:?Usage: scripts/restore-db.sh path/to/dump.sql.gz[.gpg]}"
[ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }

WORK_FILE="$FILE"
CLEANUP_DECRYPTED=0
if [[ "$FILE" == *.gpg ]]; then
  echo "[restore] decrypting $FILE"
  : "${BACKUP_GPG_PASSPHRASE:?BACKUP_GPG_PASSPHRASE must be set (in .env) to decrypt a .gpg backup}"
  gpg --yes --batch --pinentry-mode loopback --passphrase "$BACKUP_GPG_PASSPHRASE" \
    --decrypt --output "${FILE%.gpg}" "$FILE"
  WORK_FILE="${FILE%.gpg}"
  CLEANUP_DECRYPTED=1
fi

read -r -p "This will DROP and recreate the 'bounce' database. Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  [ "$CLEANUP_DECRYPTED" = "1" ] && rm -f "$WORK_FILE"
  exit 1
fi

use_docker=0
if command -v docker >/dev/null 2>&1 && docker compose ps -q postgres >/dev/null 2>&1 && [ -n "$(docker compose ps -q postgres 2>/dev/null)" ]; then
  use_docker=1
fi

echo "[restore] dropping and recreating database"
if [ "$use_docker" = "1" ]; then
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set (in .env) for the docker-compose restore path}"
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -U bounce -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS bounce;" -c "CREATE DATABASE bounce OWNER bounce;"
  echo "[restore] loading $WORK_FILE"
  gunzip -c "$WORK_FILE" | docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -U bounce -d bounce -v ON_ERROR_STOP=1
else
  : "${DATABASE_URL:?DATABASE_URL must be set for the direct-Postgres restore path}"
  ADMIN_URL="${DATABASE_URL%/*}/postgres"
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS bounce;" -c "CREATE DATABASE bounce OWNER bounce;"
  echo "[restore] loading $WORK_FILE"
  gunzip -c "$WORK_FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
fi

[ "$CLEANUP_DECRYPTED" = "1" ] && rm -f "$WORK_FILE"

echo "[restore] done"
