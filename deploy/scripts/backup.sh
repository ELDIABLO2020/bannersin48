#!/usr/bin/env bash
# Nightly backup (systemd timer bannersin48-backup.timer, runs as root).
#
#   1. pg_dump -Fc -Z zstd:9 of the application database, taken as the
#      bannersin48_migrate role (the owner) inside the postgres container, to
#      $BI48_ROOT/backups/db/bannersin48-<UTC timestamp>.dump; verified with
#      pg_restore --list.
#   2. Local dumps older than 14 days are deleted.
#   3. If RESTIC_REPOSITORY is set in secrets/backup.env: restic backup of the
#      dump directory + artwork storage + secrets/, then forget --prune with
#      retention (14 daily, 8 weekly, 12 monthly).
#      Otherwise a warning is logged (off-site backups are required before go-live).
#
# Exits non-zero on any failure, logs to syslog (tag bannersin48-backup) and
# posts to ALERT_WEBHOOK_URL (secrets/ops.env) if set.
# Manual run: sudo systemctl start bannersin48-backup.service
#             journalctl -u bannersin48-backup.service
set -euo pipefail
umask 027

ROOT="${BI48_ROOT:-/srv/bannersin48}"
APP="${BI48_APP_DIR:-$ROOT/app}"
SECRETS="$ROOT/secrets"
DUMP_DIR="$ROOT/backups/db"
STORAGE_DIR="$ROOT/storage"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
COMPOSE=(docker compose -f "$APP/deploy/docker-compose.prod.yml")
TAG=bannersin48-backup

load_env() {
  # Shell-syntax env files written by gen-secrets.sh (root-readable, mode 600).
  if [[ -f "$1" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$1"
    set +a
  fi
}

alert() {
  local msg="$1" payload
  logger -t "$TAG" -p user.err -- "$msg" || true
  echo "ERROR: $msg" >&2
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    payload="$(printf '[%s] %s' "$(hostname)" "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    curl -fsS --max-time 10 -H 'Content-Type: application/json' \
      -d "{\"text\":\"${payload}\",\"content\":\"${payload}\"}" \
      "$ALERT_WEBHOOK_URL" >/dev/null || true
  fi
}

on_error() {
  local status=$? line=$1
  alert "backup FAILED (exit $status at line $line); see journalctl -u bannersin48-backup"
  exit "$status"
}
trap 'on_error $LINENO' ERR

info() {
  logger -t "$TAG" -p user.info -- "$1" || true
  echo "$1"
}

main() {
  load_env "$SECRETS/ops.env"

  install -d -m 0750 "$ROOT/backups" "$DUMP_DIR"

  local stamp dump tmp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="$DUMP_DIR/bannersin48-$stamp.dump"
  tmp="$dump.partial"

  info "pg_dump -> $dump"
  # The password comes from the container's own environment (postgres.env),
  # so it never appears on the host command line.
  # shellcheck disable=SC2016  # expanded inside the container, not here
  "${COMPOSE[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$BI48_MIGRATE_PASSWORD" exec pg_dump -h 127.0.0.1 -U bannersin48_migrate -d "${POSTGRES_DB:-bannersin48}" --format=custom --compress=zstd:9' \
    >"$tmp"

  # A truncated or corrupt archive fails here.
  "${COMPOSE[@]}" exec -T postgres pg_restore --list <"$tmp" >/dev/null
  mv "$tmp" "$dump"
  chmod 0640 "$dump"
  info "dump ok ($(du -h "$dump" | cut -f1))"

  find "$DUMP_DIR" -maxdepth 1 -type f -name 'bannersin48-*.dump.partial' -delete
  find "$DUMP_DIR" -maxdepth 1 -type f -name 'bannersin48-*.dump' -mtime "+$((KEEP_DAYS - 1))" -print -delete

  load_env "$SECRETS/backup.env"
  if [[ -z "${RESTIC_REPOSITORY:-}" ]]; then
    logger -t "$TAG" -p user.warning -- "RESTIC_REPOSITORY not set in $SECRETS/backup.env: off-site backup SKIPPED" || true
    echo "WARNING: RESTIC_REPOSITORY not set; off-site backup skipped" >&2
    return 0
  fi
  : "${RESTIC_PASSWORD:?RESTIC_PASSWORD must be set in backup.env}"
  export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic}"

  info "restic backup -> $RESTIC_REPOSITORY"
  # secrets/ is included so a replacement VPS can be rebuilt from the
  # (client-side encrypted) repository plus RESTIC_PASSWORD alone.
  restic backup --quiet --host bannersin48-vps --tag bannersin48 \
    "$DUMP_DIR" "$STORAGE_DIR" "$SECRETS"
  restic forget --quiet --host bannersin48-vps --tag bannersin48 \
    --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
  # Light integrity check weekly (Sundays): verifies repository structure and
  # a 2% sample of pack data.
  if [[ "$(date -u +%u)" == "7" ]]; then
    restic check --read-data-subset=2% --quiet
  fi
  info "off-site backup ok"
}

main "$@"
