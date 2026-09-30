#!/usr/bin/env bash
# Banners In 48 - database roles.
#
# Run automatically by the postgres image's docker-entrypoint on FIRST start
# (empty data directory), as OS user `postgres`. Idempotent, so it can be
# re-run by hand later, e.g. after rotating a role password in postgres.env:
#
#   docker compose -f deploy/docker-compose.prod.yml exec -u postgres postgres \
#     bash /docker-entrypoint-initdb.d/01-roles.sh
#
# Roles:
#   bannersin48_migrate  owns the database (and so the public schema) and every
#                        table/sequence Prisma creates. Used ONLY by the one-shot
#                        `migrate` service and by backups.
#   bannersin48_app      what the API connects as: CONNECT + schema USAGE,
#                        SELECT/INSERT/UPDATE/DELETE on tables and
#                        USAGE/SELECT/UPDATE on sequences (order_number_seq needs
#                        nextval). No DDL, no TRUNCATE, no ownership.
#
# Superuser-only work is done here, not in Prisma migrations: the existing
# migrations need no extension or superuser privilege. pg_stat_statements is
# created in the `postgres` maintenance database (its view is cluster-wide), so
# it never appears in pg_dump of the application database.
set -euo pipefail

db="${POSTGRES_DB:-bannersin48}"

for var in BI48_MIGRATE_PASSWORD BI48_APP_PASSWORD; do
  value="${!var:-}"
  # Restricting the alphabet keeps the value safe inside SQL literals and
  # DATABASE_URL without escaping. gen-secrets.sh produces 64 hex chars.
  if [[ ! "$value" =~ ^[A-Za-z0-9._~-]{32,}$ ]]; then
    echo "01-roles.sh: $var must be set to >= 32 chars of [A-Za-z0-9._~-]" >&2
    exit 1
  fi
done
if [[ ! "$db" =~ ^[a-z0-9_]+$ ]]; then
  echo "01-roles.sh: unexpected POSTGRES_DB '$db'" >&2
  exit 1
fi

run_psql() {
  psql -v ON_ERROR_STOP=1 --no-psqlrc --quiet --username postgres --dbname "$1"
}

# Cluster level: roles, database ownership and CONNECT.
run_psql postgres <<EOSQL
-- Never write the password-bearing statements below to the server log.
SET log_statement = 'none';
SET log_min_duration_statement = -1;

SELECT 'CREATE ROLE bannersin48_migrate'
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bannersin48_migrate')\gexec
SELECT 'CREATE ROLE bannersin48_app'
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bannersin48_app')\gexec

ALTER ROLE bannersin48_migrate WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10 PASSWORD '${BI48_MIGRATE_PASSWORD}';
ALTER ROLE bannersin48_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 40 PASSWORD '${BI48_APP_PASSWORD}';

-- Backstops for the API's connections (Prisma interactive transactions time
-- out at 5 s by default; nothing in the app should run for 30 s).
ALTER ROLE bannersin48_app SET statement_timeout = '30s';
ALTER ROLE bannersin48_app SET idle_in_transaction_session_timeout = '60s';

ALTER DATABASE "${db}" OWNER TO bannersin48_migrate;
REVOKE ALL ON DATABASE "${db}" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE "${db}" TO bannersin48_migrate;
GRANT CONNECT ON DATABASE "${db}" TO bannersin48_app;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOSQL

# Database level: schema and object privileges.
run_psql "$db" <<'EOSQL'
-- PG15+: public is owned by pg_database_owner (now bannersin48_migrate) and
-- PUBLIC has no CREATE. Also drop PUBLIC's USAGE; grant it to the app only.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO bannersin48_app;

-- Objects that already exist (none on first boot; covers manual re-runs).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bannersin48_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO bannersin48_app;

-- Everything the migrate role creates from now on.
ALTER DEFAULT PRIVILEGES FOR ROLE bannersin48_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bannersin48_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bannersin48_migrate IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO bannersin48_app;

-- The API never needs Prisma's migration history.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM bannersin48_app;
  END IF;
END
$$;
EOSQL

echo "01-roles.sh: roles bannersin48_migrate / bannersin48_app ready on database ${db}"
