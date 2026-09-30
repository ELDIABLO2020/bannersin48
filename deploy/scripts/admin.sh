#!/usr/bin/env bash
# One-off admin commands against the production stack. Run as `deploy` on the VPS.
#
#   admin.sh seed                      Seed catalog + first admin (prompts for
#                                      ADMIN_EMAIL / ADMIN_PASSWORD; never
#                                      overwrites an existing admin password)
#   admin.sh reset-password <email>    Admin password reset CLI (see below)
#   admin.sh node <file.js> [args...]  Run a compiled script from backend/dist in a
#                                      fresh api container (same env, read-only)
#   admin.sh migrate-status            prisma migrate status (schema-owner role)
#   admin.sh psql [app|migrate|postgres]
#                                      psql inside the postgres container
#                                      (default: app = the API's DML-only role)
#   admin.sh shell                     sh inside the running api container
#   admin.sh logs [service...]         Follow logs (default: all services)
#   admin.sh ps                        Service status
#
# One-off containers use `docker compose run --rm --no-deps api`, so they get
# the api's env_file, volumes, networks and hardening but do not touch the
# running api container.
#
# reset-password runs dist/src/cli/reset-password.js (i.e. the backend source
# file backend/src/cli/reset-password.ts). Override with ADMIN_RESET_SCRIPT.
set -euo pipefail

ROOT="${BI48_ROOT:-/srv/bannersin48}"
APP="${BI48_APP_DIR:-$ROOT/app}"
COMPOSE=(docker compose -f "$APP/deploy/docker-compose.prod.yml")
RESET_SCRIPT="${ADMIN_RESET_SCRIPT:-dist/src/cli/reset-password.js}"

# Keep the image build arg identical to deploy.sh so a one-off run reuses the
# deployed image instead of producing a differently-labelled rebuild.
GIT_SHA="$(git -C "$APP" rev-parse HEAD 2>/dev/null || echo unknown)"
export GIT_SHA

usage() { sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; }
die() { printf 'admin.sh: %s\n' "$*" >&2; exit 1; }

run_api() {
  "${COMPOSE[@]}" run --rm --no-deps "$@"
}

cmd="${1:-}"
[[ $# -gt 0 ]] && shift
case "$cmd" in
  seed)
    read -r -p "ADMIN_EMAIL: " ADMIN_EMAIL
    read -r -s -p "ADMIN_PASSWORD (min 12 chars): " ADMIN_PASSWORD
    echo
    [[ ${#ADMIN_PASSWORD} -ge 12 ]] || die "password too short"
    export ADMIN_EMAIL ADMIN_PASSWORD
    # `-e NAME` without a value passes it from this shell's environment, so the
    # password never appears in a process list.
    run_api -e ADMIN_EMAIL -e ADMIN_PASSWORD api node dist/prisma/seed.js
    ;;
  reset-password)
    [[ $# -ge 1 ]] || die "usage: admin.sh reset-password <email>"
    # shellcheck disable=SC2016  # $1/$@ are expanded by the container's sh
    run_api api sh -c 'test -f "$1" || { echo "missing $1 in the image; is the admin:reset-password CLI deployed?" >&2; exit 1; }; exec node "$@"' \
      _ "$RESET_SCRIPT" "$@"
    ;;
  node)
    [[ $# -ge 1 ]] || die "usage: admin.sh node <file.js> [args...]"
    run_api api node "$@"
    ;;
  migrate-status)
    run_api migrate node /app/node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma
    ;;
  psql)
    role="${1:-app}"
    # Passwords are expanded inside the container from its own environment.
    # shellcheck disable=SC2016
    case "$role" in
      app) "${COMPOSE[@]}" exec postgres sh -c 'PGPASSWORD="$BI48_APP_PASSWORD" exec psql -h 127.0.0.1 -U bannersin48_app -d "$POSTGRES_DB"' ;;
      migrate) "${COMPOSE[@]}" exec postgres sh -c 'PGPASSWORD="$BI48_MIGRATE_PASSWORD" exec psql -h 127.0.0.1 -U bannersin48_migrate -d "$POSTGRES_DB"' ;;
      postgres) "${COMPOSE[@]}" exec -u postgres postgres psql -d bannersin48 ;;
      *) die "unknown role '$role' (app|migrate|postgres)" ;;
    esac
    ;;
  shell)
    "${COMPOSE[@]}" exec api sh
    ;;
  logs)
    "${COMPOSE[@]}" logs -f --tail 200 "$@"
    ;;
  ps)
    "${COMPOSE[@]}" ps
    ;;
  "" | -h | --help | help)
    usage
    ;;
  *)
    usage >&2
    die "unknown command '$cmd'"
    ;;
esac
