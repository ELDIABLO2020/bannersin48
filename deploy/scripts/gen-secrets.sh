#!/usr/bin/env bash
# Generate the production env files under $BI48_ROOT/secrets (default
# /srv/bannersin48/secrets). Run as the `deploy` user, once, before the first
# deploy:
#
#   deploy/scripts/gen-secrets.sh [--domain 179-236-230-7.sslip.io] [--email ops@example.com]
#
# Files (all mode 600, directory mode 700):
#   site.env      API_DOMAIN, ACME_EMAIL           -> caddy + api (not secret)
#   postgres.env  superuser + both role passwords  -> postgres container only
#   migrate.env   DATABASE_URL (bannersin48_migrate) -> migrate one-shot only
#   api.env       app config + secrets             -> api only
#   backup.env    restic settings (RESTIC_PASSWORD generated, repo left empty)
#   ops.env       ALERT_WEBHOOK_URL, disk-alert threshold
#
# Never overwrites an existing file. If some files already exist, the DB role
# passwords are read back from postgres.env so the new files stay consistent.
# To rotate a value, edit the file by hand (see deploy/README.md).
set -euo pipefail

ROOT="${BI48_ROOT:-/srv/bannersin48}"
SECRETS="$ROOT/secrets"
API_DOMAIN="${API_DOMAIN:-179-236-230-7.sslip.io}"
ACME_EMAIL="${ACME_EMAIL:-CHANGE_ME@bannersin48.com}"

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) API_DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --email) ACME_EMAIL="${2:?--email needs a value}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 64 ;;
  esac
done

if [[ ! "$API_DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "Invalid --domain '$API_DOMAIN'" >&2
  exit 64
fi
if [[ ! "$ACME_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Invalid --email '$ACME_EMAIL'" >&2
  exit 64
fi

command -v openssl >/dev/null || { echo "openssl is required" >&2; exit 1; }

umask 077
mkdir -p "$SECRETS"
chmod 700 "$SECRETS"

rand_hex() { openssl rand -hex 32; }

# Read KEY=value from an existing env file (no sourcing, no eval).
read_env() {
  local file="$1" key="$2" line
  [[ -f "$file" ]] || return 0
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

MIGRATE_PW="$(read_env "$SECRETS/postgres.env" BI48_MIGRATE_PASSWORD)"
APP_PW="$(read_env "$SECRETS/postgres.env" BI48_APP_PASSWORD)"
if [[ -f "$SECRETS/postgres.env" && ( -z "$MIGRATE_PW" || -z "$APP_PW" ) ]]; then
  echo "postgres.env exists but lacks BI48_MIGRATE_PASSWORD/BI48_APP_PASSWORD; fix it by hand." >&2
  exit 1
fi
if [[ ! -f "$SECRETS/postgres.env" ]]; then
  for f in migrate.env api.env; do
    if [[ -f "$SECRETS/$f" ]]; then
      echo "$f exists but postgres.env does not; refusing to invent new DB passwords." >&2
      exit 1
    fi
  done
fi
MIGRATE_PW="${MIGRATE_PW:-$(rand_hex)}"
APP_PW="${APP_PW:-$(rand_hex)}"

created=()
# write_file NAME: body on stdin. Skips (keeps the old file) if it exists.
write_file() {
  local name="$1" path="$SECRETS/$1" tmp
  if [[ -e "$path" ]]; then
    cat >/dev/null
    echo "keep    $path (exists)"
    return 0
  fi
  tmp="$(mktemp "$SECRETS/.${name}.XXXXXX")"
  cat >"$tmp"
  chmod 600 "$tmp"
  mv -n "$tmp" "$path"
  [[ -e "$tmp" ]] && rm -f "$tmp"
  created+=("$name")
  echo "created $path"
}

write_file site.env <<EOF
# Public hostname Caddy serves and obtains a certificate for. Also read by the API.
API_DOMAIN=${API_DOMAIN}
# ACME (Let's Encrypt) account contact. deploy.sh refuses to run with the placeholder.
ACME_EMAIL=${ACME_EMAIL}
EOF

write_file postgres.env <<EOF
# postgres container only. The superuser is reachable only inside the container.
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(rand_hex)
POSTGRES_DB=bannersin48
POSTGRES_INITDB_ARGS=--auth-local=peer --auth-host=scram-sha-256
# Read by deploy/postgres/init/01-roles.sh (first boot) and backup.sh.
# Changing these here does NOT change the DB; see "Rotating secrets" in deploy/README.md.
BI48_MIGRATE_PASSWORD=${MIGRATE_PW}
BI48_APP_PASSWORD=${APP_PW}
EOF

write_file migrate.env <<EOF
# migrate one-shot only: the schema owner role.
DATABASE_URL=postgresql://bannersin48_migrate:${MIGRATE_PW}@postgres:5432/bannersin48?schema=public
EOF

write_file api.env <<EOF
NODE_ENV=production
PORT=3001
# DML-only role; small pool (single Nest process, max_connections=60).
DATABASE_URL=postgresql://bannersin48_app:${APP_PW}@postgres:5432/bannersin48?schema=public&connection_limit=10&pool_timeout=10
# 256-bit secrets. Rotating JWT_SECRET logs everyone out.
JWT_SECRET=$(rand_hex)
JWT_ISSUER=bannersin48-api
JWT_AUDIENCE=bannersin48-web
ADDRESS_TOKEN_SECRET=$(rand_hex)
DOWNLOAD_URL_SECRET=$(rand_hex)
# Browser origins allowed by CORS (comma-separated, exact match).
CORS_ORIGINS=https://bannersin48.com,https://www.bannersin48.com
# 1 = also allow this project's Vercel preview URLs. Keep 0 in production.
ALLOW_PREVIEW_ORIGINS=0
STORAGE_DRIVER=local
# Container path; bind-mounted from ${ROOT}/storage in docker-compose.prod.yml.
LOCAL_STORAGE_DIR=/data/storage
EOF

write_file backup.env <<EOF
# Sourced by deploy/scripts/backup.sh (shell syntax: quote values with spaces).
# Off-site backups are skipped (with a warning) until RESTIC_REPOSITORY is set.
# Examples:
#   RESTIC_REPOSITORY=s3:https://s3.us-west-000.backblazeb2.com/bannersin48-backups
#   RESTIC_REPOSITORY=sftp:backup@storagebox.example.net:/bannersin48
RESTIC_REPOSITORY=
# Encrypts the restic repository. STORE A COPY OFFLINE (password manager):
# without it the off-site backups cannot be restored.
RESTIC_PASSWORD=$(rand_hex)
# Credentials for the repository backend, e.g. S3-compatible:
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
EOF

write_file ops.env <<EOF
# Sourced by disk-alert.sh and backup.sh. Optional Slack/Discord-compatible webhook.
ALERT_WEBHOOK_URL=
DISK_ALERT_THRESHOLD=70
EOF

chmod 600 "$SECRETS"/*.env

if ((${#created[@]} > 0)); then
  echo
  echo "Created: ${created[*]}"
fi
if grep -Eq '^ACME_EMAIL=(.*CHANGE_ME.*)?$' "$SECRETS/site.env"; then
  echo "NEXT: set ACME_EMAIL in $SECRETS/site.env (deploy.sh refuses the placeholder)."
fi
