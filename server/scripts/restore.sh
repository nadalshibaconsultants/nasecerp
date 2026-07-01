#!/usr/bin/env bash
# Restore a backup produced by backup.sh into the configured DATABASE_URL.
# Usage: ./restore.sh path/to/dump.sql.gz[.gpg]
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL required}"
file="${1:?usage: restore.sh <dump-file>}"

if [[ "$file" == *.gpg ]]; then
  echo "[restore] decrypting"
  gpg --batch --yes --decrypt "$file" | gunzip | psql "$DATABASE_URL"
else
  gunzip -c "$file" | psql "$DATABASE_URL"
fi

echo "[restore] done"
