# Production deploy (Hostinger VPS)

The API runs on one VPS (Ubuntu 24.04, 2 vCPU, 7.8 GiB RAM, 96 GB disk) as a
Docker Compose stack. The frontend stays on Vercel and calls the API
cross-origin. Plan items 12–14 in [docs/backend-plan.md](../docs/backend-plan.md).

```
                     Vercel: https://bannersin48.com (Next.js)
                                    │  fetch() cross-origin (CORS_ORIGINS)
                                    ▼
 internet ──► ufw 22/80/443 ──► DOCKER-USER: only 80/tcp, 443/tcp, 443/udp reach containers
                                    │
          ┌─────────────────────────┼──────────── docker network "edge" (egress for ACME)
          │                  ┌──────▼──────┐
          │                  │   caddy     │  TLS (Let's Encrypt for $API_DOMAIN), HSTS,
          │                  │ 80/443 only │  zstd/gzip, 55 MiB body cap, JSON access log
          │                  └──────┬──────┘
          ├─────────────────────────┼──────────── "proxy" (internal: no internet)
          │                  ┌──────▼──────┐
          │                  │    api      │  Nest (node dist/src/main.js), uid 1000,
          │                  │   :3001     │  read-only rootfs, cap_drop ALL, 2 GiB
          │                  └──┬───────┬──┘
          │    /srv/bannersin48/storage │ ──► /data/storage (artwork)
          ├─────────────────────────────┼──────── "db" (internal: no internet)
          │   migrate (one-shot) ──►┌───▼───────┐
          │   prisma migrate deploy │ postgres  │  16, lz4 TOAST, zstd WAL, scram only,
          │                         │  :5432    │  never published, 4 GiB
          │                         └───────────┘  data: /srv/bannersin48/pgdata
          └── host: systemd timers ─ backup.sh (03:15 UTC: pg_dump + restic)
                                   ─ disk-alert.sh (every 15 min, ≥ 70 %)
```

| Path | What |
|---|---|
| `docker-compose.prod.yml` | caddy, api, migrate, postgres; hardening, limits, log rotation |
| `Caddyfile` | TLS, HSTS, compression, body limit, health-checked reverse proxy, access log |
| `postgres/postgresql.conf`, `postgres/pg_hba.conf` | Tuned PG16 config; SCRAM-only auth, app roles from the compose network only |
| `postgres/init/01-roles.sh` | Creates `bannersin48_migrate` (owner) and `bannersin48_app` (DML only) on first boot |
| `scripts/bootstrap-vps.sh` | One-time host setup (Docker, daemon.json, journald, firewall, dirs, timers) |
| `scripts/gen-secrets.sh` | Writes `/srv/bannersin48/secrets/*.env` with random secrets (never overwrites) |
| `scripts/deploy.sh` | Pull, build, migrate, recreate api, reload caddy, prune, health |
| `scripts/backup.sh`, `scripts/disk-alert.sh` | Run by the systemd timers in `systemd/` |
| `scripts/admin.sh` | Seed, password-reset CLI, psql, logs, one-off scripts |
| `scripts/docker-user-firewall.sh` | DOCKER-USER rules (installed to `/usr/local/sbin`) |
| `../backend/Dockerfile` | API image (multi-stage, non-root, pinned base); also runs migrations |

Host layout:

| Path | Owner / mode | Contents |
|---|---|---|
| `/srv/bannersin48/app` | deploy 755 | This repository (git checkout) |
| `/srv/bannersin48/secrets` | deploy 700, files 600 | `*.env` (never in git) |
| `/srv/bannersin48/storage` | 1000:1000 750 | Artwork files |
| `/srv/bannersin48/pgdata` | 999:999 700 | Postgres data directory |
| `/srv/bannersin48/backups/db` | root:deploy 750 | Nightly dumps, 14 days |

## First-time setup

All commands run on the VPS as `deploy` over SSH. Nothing else needs to be
installed first; `git`, `curl` and `openssl` ship with Ubuntu.

1. **Clone the repo.**
   ```bash
   sudo install -d -o deploy -g deploy /srv/bannersin48/app
   git clone https://github.com/ELDIABLO2020/bannersin48.git /srv/bannersin48/app
   ```
2. **Bootstrap the host** (Docker, log caps, firewall, directories, restic, timers).
   Then log out and back in so the `docker` group applies.
   ```bash
   sudo /srv/bannersin48/app/deploy/scripts/bootstrap-vps.sh
   exit
   ```
3. **Generate secrets.** `--email` is the Let's Encrypt contact. The domain defaults to
   `179-236-230-7.sslip.io`, which already resolves to the VPS.
   ```bash
   /srv/bannersin48/app/deploy/scripts/gen-secrets.sh --email ops@bannersin48.com
   ```
   If you skip `--email`, edit `ACME_EMAIL` in `/srv/bannersin48/secrets/site.env`
   (`deploy.sh` refuses the `CHANGE_ME` placeholder).
   Copy `RESTIC_PASSWORD` from `secrets/backup.env` into the password manager now.
4. **Deploy.**
   ```bash
   /srv/bannersin48/app/deploy/scripts/deploy.sh
   ```
   The first run builds the image (a few minutes), initialises Postgres, applies
   migrations and obtains the certificate. It ends with `GET https://<API_DOMAIN>/health`.
5. **Seed the catalog and the first admin.** Prompts for `ADMIN_EMAIL` and
   `ADMIN_PASSWORD`. Use a long unique password; it is never shown or logged.
   ```bash
   /srv/bannersin48/app/deploy/scripts/admin.sh seed
   ```
6. **Point the frontend at the API.** In Vercel, set
   `NEXT_PUBLIC_API_BASE_URL=https://179-236-230-7.sslip.io` and redeploy.
7. **Turn on off-site backups** (required before go-live). Create a bucket or
   repository (e.g. Backblaze B2 / S3-compatible, or an SFTP storage box). Fill in
   `RESTIC_REPOSITORY` and the backend credentials in `secrets/backup.env`, then:
   ```bash
   sudo bash -c 'set -a; . /srv/bannersin48/secrets/backup.env; restic init'
   sudo systemctl start bannersin48-backup.service
   journalctl -u bannersin48-backup.service -n 50
   ```
8. **Optional alerts.** Set `ALERT_WEBHOOK_URL` in `secrets/ops.env` (Slack or Discord
   incoming webhook). Both backup failures and disk alerts post there.

## Routine deploy

```bash
/srv/bannersin48/app/deploy/scripts/deploy.sh          # origin/main
/srv/bannersin48/app/deploy/scripts/deploy.sh v1.4.0   # a tag or commit
```

`deploy.sh` hard-resets the checkout to the ref, builds the image, runs
`prisma migrate deploy` as `bannersin48_migrate`, then recreates only the api
container (`up -d --no-deps --wait api`). Caddy holds and retries requests for up
to 15 s while the new container starts, so a deploy looks like a short pause.
Changes to the `Caddyfile` are applied with a graceful `caddy reload`.

**Rollback:** `deploy.sh <previous-sha>`. Migrations are forward-only, so this is
safe only if the older code works with the newer schema. Otherwise restore a dump
(below) and then deploy the older ref.

Useful commands (`C="docker compose -f /srv/bannersin48/app/deploy/docker-compose.prod.yml"`):

```bash
$C ps                                   # status + health
admin.sh logs api                       # follow logs (also: caddy, postgres)
$C exec caddy tail -f /var/log/caddy/access.log
admin.sh migrate-status
admin.sh psql                           # as bannersin48_app (DML only)
admin.sh psql postgres                  # superuser; slow queries:
#   SELECT calls, mean_exec_time, query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;
docker system df && sudo du -sh /srv/bannersin48/*
```

## One-off admin commands

`admin.sh` wraps `docker compose run --rm --no-deps api …`: a fresh container
with the api's env, volumes, network and hardening, next to the running api.

| Command | Does |
|---|---|
| `admin.sh seed` | `node dist/prisma/seed.js` with prompted `ADMIN_EMAIL` / `ADMIN_PASSWORD` (passed by name, not on the command line). Idempotent; never overwrites an existing admin password |
| `admin.sh reset-password <email>` | Runs the admin password-reset CLI, `dist/src/cli/reset-password.js` (source `backend/src/cli/reset-password.ts`; override with `ADMIN_RESET_SCRIPT`) |
| `admin.sh node <file.js> [args]` | Any compiled script in the image, e.g. `admin.sh node dist/src/some-script.js` |
| `admin.sh psql [app\|migrate\|postgres]` | psql inside the postgres container |
| `admin.sh shell` | `sh` in the running api container |

The image has no `ts-node` and no dev dependencies: scripts must be compiled
into `backend/dist`, and `npm run <script>` entries that use `ts-node` don't work.

## Backups and restore

Nightly at 03:15 UTC (`bannersin48-backup.timer`), `backup.sh`:

1. `pg_dump --format=custom --compress=zstd:9` as `bannersin48_migrate`, to
   `/srv/bannersin48/backups/db/bannersin48-<UTC>.dump`, verified with `pg_restore --list`;
2. deletes local dumps older than 14 days;
3. if `RESTIC_REPOSITORY` is set: `restic backup` of the dumps, artwork storage and
   `secrets/`, then `forget --prune` (14 daily, 8 weekly, 12 monthly) and a weekly
   2 % data check. If not set, it logs a warning and skips this step.

Failures exit non-zero, go to syslog (`journalctl -t bannersin48-backup`) and to
`ALERT_WEBHOOK_URL`. Check timers with `systemctl list-timers 'bannersin48-*'`.

**Restore the database in place** (e.g. after bad data or a bad migration):

```bash
cd /srv/bannersin48/app
C="docker compose -f deploy/docker-compose.prod.yml"
DUMP=/srv/bannersin48/backups/db/bannersin48-20261001T031500Z.dump   # pick one
$C stop api
$C exec -T postgres sh -c 'PGPASSWORD="$BI48_MIGRATE_PASSWORD" pg_restore -h 127.0.0.1 \
  -U bannersin48_migrate -d bannersin48 --clean --if-exists --single-transaction --exit-on-error' < "$DUMP"
$C start api
```

`--single-transaction` means a failed restore changes nothing. Grants to
`bannersin48_app` are part of the dump.

**Restore drill** (monthly, into a scratch database; production is untouched):

```bash
$C exec -u postgres postgres createdb -O bannersin48_migrate bannersin48_restore
$C exec -T postgres sh -c 'PGPASSWORD="$BI48_MIGRATE_PASSWORD" pg_restore -h 127.0.0.1 \
  -U bannersin48_migrate -d bannersin48_restore --single-transaction --exit-on-error' < "$DUMP"
$C exec -u postgres postgres psql -d bannersin48_restore -c 'SELECT count(*) FROM "order";'
$C exec -u postgres postgres dropdb bannersin48_restore
```

**Restore from off-site** (dumps, artwork or secrets):

```bash
sudo bash -c 'set -a; . /srv/bannersin48/secrets/backup.env; restic snapshots'
sudo bash -c 'set -a; . /srv/bannersin48/secrets/backup.env; \
  restic restore latest --target /tmp/restore --include /srv/bannersin48/backups/db'
# artwork: restore to a temp dir, then copy back and fix ownership
sudo bash -c 'set -a; . /srv/bannersin48/secrets/backup.env; \
  restic restore latest --target /tmp/restore --include /srv/bannersin48/storage'
sudo rsync -a /tmp/restore/srv/bannersin48/storage/ /srv/bannersin48/storage/
sudo chown -R 1000:1000 /srv/bannersin48/storage
```

**New VPS from scratch:** steps 1–2 of the first-time setup; recreate
`secrets/backup.env` by hand (repository + credentials + `RESTIC_PASSWORD` from
the password manager); restore `secrets/` and `storage/` with restic as above
(`secrets/` must stay 700/600 and owned by `deploy`); run `deploy.sh` (creates an
empty database with the roles); restore the latest dump in place.

## Rotating secrets

All secrets live in `/srv/bannersin48/secrets`. A changed `env_file` makes
Compose recreate that container on the next `up`.

`C="docker compose -f /srv/bannersin48/app/deploy/docker-compose.prod.yml"`

| Secret | How | Effect |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` into `api.env`, then `$C up -d --no-deps --wait api` | Everyone is logged out |
| `ADDRESS_TOKEN_SECRET` | Same | In-flight address validations must be redone |
| `DOWNLOAD_URL_SECRET` | Same | Outstanding signed download links stop working |
| `bannersin48_app` password | New value in **both** `postgres.env` (`BI48_APP_PASSWORD`) and `api.env` (`DATABASE_URL`); then `$C up -d --no-deps --wait postgres`; `$C exec -u postgres postgres bash /docker-entrypoint-initdb.d/01-roles.sh`; `$C up -d --no-deps --wait api` | A few seconds of DB errors while the api restarts |
| `bannersin48_migrate` password | Same, with `BI48_MIGRATE_PASSWORD` and `migrate.env` (no api restart needed) | None |
| `postgres` superuser | `$C exec -u postgres postgres psql -c '\password postgres'`, then update `POSTGRES_PASSWORD` in `postgres.env` | None (only reachable inside the container) |
| `RESTIC_PASSWORD` | `restic key add` then `restic key remove <old id>` (with `backup.env` sourced), then update `backup.env` and the password manager | None |

Generate DB passwords with `openssl rand -hex 32`. `01-roles.sh` only accepts
`[A-Za-z0-9._~-]{32,}` so values are safe inside SQL and URLs.

## Switching `API_DOMAIN` to api.bannersin48.com

1. In **Vercel → Domains → bannersin48.com → DNS records**, add `A  api  179.236.230.7`
   (TTL 60). No `AAAA` record: the stack is IPv4-only. If the zone has a `CAA`
   record, it must allow `letsencrypt.org`.
2. Wait until `dig +short api.bannersin48.com` prints `179.236.230.7`.
3. Set `API_DOMAIN=api.bannersin48.com` in `/srv/bannersin48/secrets/site.env`, then
   `$C up -d --no-deps --wait caddy api`. Caddy obtains the new certificate within
   a minute (`admin.sh logs caddy`). The sslip.io name stops being served.
4. In Vercel, set `NEXT_PUBLIC_API_BASE_URL=https://api.bannersin48.com` and redeploy.

## Environment variables

Files in `/srv/bannersin48/secrets` (all mode 600, created by `gen-secrets.sh`).

| Variable | File → container | Value / default | Notes |
|---|---|---|---|
| `API_DOMAIN` | `site.env` → caddy, api | `179-236-230-7.sslip.io` | Public hostname; Caddy site address |
| `ACME_EMAIL` | `site.env` → caddy, api | set by `--email` | Let's Encrypt contact |
| `NODE_ENV` | `api.env` → api | `production` | Also set in the image and compose |
| `PORT` | `api.env` → api | `3001` | Caddy proxies to `api:3001` |
| `DATABASE_URL` | `api.env` → api | `postgresql://bannersin48_app:…@postgres:5432/bannersin48?schema=public&connection_limit=10&pool_timeout=10` | DML-only role |
| `JWT_SECRET` | `api.env` → api | 64 hex chars (256 bit) | Signs access tokens |
| `JWT_ISSUER` | `api.env` → api | `bannersin48-api` | JWT `iss` |
| `JWT_AUDIENCE` | `api.env` → api | `bannersin48-web` | JWT `aud` |
| `ADDRESS_TOKEN_SECRET` | `api.env` → api | 64 hex chars | Address-validation tokens (separate from JWT) |
| `DOWNLOAD_URL_SECRET` | `api.env` → api | 64 hex chars | HMAC for short-lived artwork/label download URLs |
| `CORS_ORIGINS` | `api.env` → api | `https://bannersin48.com,https://www.bannersin48.com` | Comma-separated exact origins |
| `ALLOW_PREVIEW_ORIGINS` | `api.env` → api | `0` | `1` also allows this project's Vercel preview URLs |
| `STORAGE_DRIVER` | `api.env` → api | `local` | |
| `LOCAL_STORAGE_DIR` | `api.env` → api | `/data/storage` | Container path of the artwork bind mount |
| `DATABASE_URL` | `migrate.env` → migrate | `postgresql://bannersin48_migrate:…@postgres:5432/bannersin48?schema=public` | Schema owner; migrations only |
| `POSTGRES_USER` | `postgres.env` → postgres | `postgres` | Superuser; socket (peer) or in-container loopback only |
| `POSTGRES_PASSWORD` | `postgres.env` → postgres | 64 hex chars | Superuser password (first boot) |
| `POSTGRES_DB` | `postgres.env` → postgres | `bannersin48` | |
| `POSTGRES_INITDB_ARGS` | `postgres.env` → postgres | `--auth-local=peer --auth-host=scram-sha-256` | Fallback only; `pg_hba.conf` is authoritative |
| `BI48_MIGRATE_PASSWORD` | `postgres.env` → postgres | 64 hex chars | Read by `01-roles.sh` and `backup.sh` |
| `BI48_APP_PASSWORD` | `postgres.env` → postgres | 64 hex chars | Read by `01-roles.sh` |
| `RESTIC_REPOSITORY` | `backup.env` → host (`backup.sh`) | empty | Off-site repo; empty = skip with warning |
| `RESTIC_PASSWORD` | `backup.env` → host | 64 hex chars | Repository encryption key; keep an offline copy |
| `AWS_ACCESS_KEY_ID` etc. | `backup.env` → host | unset | restic backend credentials |
| `ALERT_WEBHOOK_URL` | `ops.env` → host | empty | Slack/Discord-style webhook for alerts |
| `DISK_ALERT_THRESHOLD` | `ops.env` → host | `70` | Percent |

Set by the image or compose, not by env files:

| Variable | Where | Value |
|---|---|---|
| `NODE_OPTIONS` | compose (api) | `--max-old-space-size=1024` |
| `NO_COLOR` | image | `1` (plain Nest log lines) |
| `GIT_SHA` | image (build arg from `deploy.sh`) | Deployed commit; also the `org.opencontainers.image.revision` label |
| `CHECKPOINT_DISABLE`, `PRISMA_HIDE_UPDATE_MESSAGE` | image | `1` (no Prisma telemetry / update checks) |
| `NPM_CONFIG_CACHE` | image | `/tmp/.npm` (rootfs is read-only) |
| `PGDATA` | compose (postgres) | `/var/lib/postgresql/data/pgdata` |

Script overrides (testing only): `BI48_ROOT` (default `/srv/bannersin48`),
`BI48_APP_DIR` (default `$BI48_ROOT/app`), `EXT_IF` for the firewall script.
The systemd units hardcode `/srv/bannersin48/app`.

## Security notes

- **Only Caddy publishes ports**, and the DOCKER-USER chain drops anything else
  arriving on the external interface for a container, even if a port is published
  by mistake later (Docker's published ports bypass ufw).
  `sudo bannersin48-docker-user-firewall status` shows the rules; the
  `bannersin48-docker-user.service` unit re-applies them whenever Docker restarts.
- **Postgres** is on an internal network, never published; `pg_hba.conf` admits
  only `bannersin48_app` / `bannersin48_migrate` to `bannersin48` from the
  compose network, SCRAM only. The superuser is reachable only inside the container.
- **API and migrate containers have no internet egress** (internal networks). When
  SES or FedEx arrive, attach `api` to an additional non-internal network.
- **api / migrate**: uid 1000, read-only rootfs (64 MiB `/tmp` tmpfs), all
  capabilities dropped, `no-new-privileges`, memory and PID limits, `init`.
  Postgres and Caddy keep only the capabilities their entrypoints need.
- **HSTS is set by Caddy only.** The API's `helmet()` must use `hsts: false`.
- **Client IP:** Caddy has no `trusted_proxies`, so it overwrites any client-sent
  `X-Forwarded-For`. The API must `set("trust proxy", 1)` and use `req.ip`.
- **Access logs** redact `Authorization` / `Cookie` (Caddy default) and the
  `access_token` query parameter.
- **Images are pinned** by version and digest (`node`, `caddy`, `postgres`). To
  update: `docker buildx imagetools inspect <image>:<tag>`, bump both parts, deploy.
  Docker Engine itself comes from Docker's apt repo, which unattended-upgrades
  does not touch; update it deliberately (`sudo apt-get install --only-upgrade docker-ce …`).
- The backup and disk-alert units run scripts from the checkout as root. `deploy`
  already has passwordless sudo and the docker group, so this adds no privilege,
  but it means write access to `main` is effectively root on the VPS: protect the
  branch.
