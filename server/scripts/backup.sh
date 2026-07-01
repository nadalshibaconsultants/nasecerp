#!/usr/bin/env bash
# Nightly Postgres backup. Encrypts with GPG and uploads to S3 if configured.
# Cron suggestion (host): 0 1 * * *  /opt/nasec/scripts/backup.sh >> /var/log/nasec-backup.log 2>&1
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL required}"
: "${BACKUP_DIR:=/var/backups/nasec}"
: "${BACKUP_RETENTION_DAYS:=14}"
: "${BACKUP_S3_BUCKET:=}"
: "${BACKUP_GPG_RECIPIENT:=}"          # email/keyid; if unset, backup is left unencrypted

mkdir -p "$BACKUP_DIR"
ts=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/nasec_erp_${ts}.sql.gz"

echo "[backup] starting $file"
pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" \
  | gzip -9 > "$file"

if [ -n "$BACKUP_GPG_RECIPIENT" ]; then
  gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" "$file"
  rm -f "$file"
  file="${file}.gpg"
fi

# Upload to S3 if AWS credentials available
if [ -n "$BACKUP_S3_BUCKET" ] && command -v aws >/dev/null; then
  aws s3 cp "$file" "s3://${BACKUP_S3_BUCKET}/$(basename "$file")" \
    --storage-class STANDARD_IA --no-progress
  echo "[backup] uploaded to s3://${BACKUP_S3_BUCKET}/"
fi

# Local retention
find "$BACKUP_DIR" -name 'nasec_erp_*' -mtime +"$BACKUP_RETENTION_DAYS" -delete

echo "[backup] done: $file"
