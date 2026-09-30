#!/usr/bin/env bash
# Deploy (or redeploy) the stack on the VPS. Run as `deploy` (docker group):
#
#   /srv/bannersin48/app/deploy/scripts/deploy.sh            # latest origin/main
#   /srv/bannersin48/app/deploy/scripts/deploy.sh <sha|tag>  # a specific ref
#
# Steps: fetch + hard reset the checkout -> build the api image -> make sure
# postgres is up -> run `prisma migrate deploy` (one-shot, schema-owner role)
# -> recreate api and wait for its healthcheck -> make sure caddy is up and
# reload its config -> prune dangling images -> print health.
#
# Downtime is limited to the api container restart; Caddy holds and retries
# requests for up to 15 s (lb_try_duration) meanwhile.
#
# Migrations are forward-only. Deploying an older ref does not roll back the
# schema, so only roll back to code that is compatible with the current schema.
#
# Everything runs inside main(): bash parses the whole function before running
# it, so `git reset` replacing this file mid-run is harmless.
set -euo pipefail

ROOT="${BI48_ROOT:-/srv/bannersin48}"
APP="${BI48_APP_DIR:-$ROOT/app}"
SECRETS="$ROOT/secrets"
COMPOSE=(docker compose -f "$APP/deploy/docker-compose.prod.yml")

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'deploy.sh: %s\n' "$*" >&2; exit 1; }

preflight() {
  local f mode
  [[ -d "$APP/.git" ]] || die "$APP is not a git checkout"
  docker info >/dev/null 2>&1 ||
    die "cannot reach the Docker daemon (is $(id -un) in the docker group? log in again after bootstrap)"
  for f in site.env postgres.env migrate.env api.env; do
    [[ -f "$SECRETS/$f" ]] || die "missing $SECRETS/$f (run deploy/scripts/gen-secrets.sh)"
    mode="$(stat -c '%a' "$SECRETS/$f")"
    [[ "$mode" == "600" || "$mode" == "400" ]] || die "$SECRETS/$f has mode $mode; expected 600"
  done
  if grep -Eq '^ACME_EMAIL=(.*CHANGE_ME.*)?$' "$SECRETS/site.env"; then
    die "set ACME_EMAIL in $SECRETS/site.env first"
  fi
  [[ -d "$ROOT/storage" && -d "$ROOT/pgdata" ]] || die "run deploy/scripts/bootstrap-vps.sh first"
}

main() {
  local ref="${1:-origin/main}" api_domain

  # One deploy at a time.
  exec 9>"$ROOT/.deploy.lock"
  flock -n 9 || die "another deploy is running"

  preflight

  log "Fetching $ref"
  git -C "$APP" fetch --prune --tags origin
  git -C "$APP" reset --hard "$ref"
  GIT_SHA="$(git -C "$APP" rev-parse HEAD)"
  export GIT_SHA # build arg -> image label
  echo "HEAD is now $(git -C "$APP" log -1 --format='%h %s')"

  log "Building api image"
  "${COMPOSE[@]}" build api

  log "Starting postgres"
  "${COMPOSE[@]}" up -d --wait postgres

  log "Running prisma migrate deploy"
  "${COMPOSE[@]}" run --rm --no-deps migrate
  # The migrate role's default privileges give the app DML on every new table,
  # including Prisma's own history table, which the API never needs.
  # shellcheck disable=SC2016  # expanded inside the container
  "${COMPOSE[@]}" exec -T postgres sh -c \
    'PGPASSWORD="$BI48_MIGRATE_PASSWORD" psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U bannersin48_migrate -d "$POSTGRES_DB" -c "REVOKE ALL ON TABLE public._prisma_migrations FROM bannersin48_app"'

  log "Recreating api"
  "${COMPOSE[@]}" up -d --no-deps --wait --wait-timeout 120 api

  log "Starting / reloading caddy"
  "${COMPOSE[@]}" up -d --no-deps --wait caddy
  # Picks up Caddyfile edits without dropping connections.
  "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

  log "Pruning dangling images and old build cache"
  docker image prune -f >/dev/null
  docker builder prune -f --filter until=168h >/dev/null

  log "Status"
  "${COMPOSE[@]}" ps
  api_domain="$(grep -E '^API_DOMAIN=' "$SECRETS/site.env" | tail -n 1 | cut -d= -f2-)"
  echo
  if curl -fsS --max-time 15 "https://$api_domain/health"; then
    echo
    echo "Deployed $GIT_SHA -> https://$api_domain"
  else
    echo "WARNING: https://$api_domain/health did not answer. On a first deploy the"
    echo "certificate may still be issuing: ${COMPOSE[*]} logs caddy"
    exit 1
  fi
}

main "$@"
