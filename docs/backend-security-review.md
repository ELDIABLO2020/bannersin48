# Backend security & scalability review

*Read-only review of `backend/` at commit `dfb2cba` (main), 2026-09-30. Every control below was verified by reading the code path. Backend typecheck and the 51 unit tests passed at review time. Review lens: published 2025–2026 findings on AI-generated auth/backend code (Veracode, Cloud Security Alliance, BaxBench, Endor Labs, Kaspersky, arXiv 2504.20612 / 2510.26103): missing auth, IDOR, weak password handling, placeholder secrets, missing headers/CSRF/rate limits/SSRF defenses, weak tenant isolation.*

## 1. Executive summary

- **Verdict: not production-ready as-is, but the bones are better than typical AI-generated auth.** The three worst AI failure modes (missing auth, IDOR, mass-assignment role escalation) are **absent**: every user-owned read/write is scoped by the JWT user id, `whitelist: true` strips `role`, and guards re-read the user row on every request so suspension/role changes apply immediately.
- **Three Critical items must be fixed before the first deploy:** (C1) any STAFF user can take over any customer or other STAFF account because the admin reset endpoint returns the raw reset token; (C2) `docker-compose.yml` publishes Postgres on `0.0.0.0:5432` with `banners/banners`, and Docker bypasses ufw; (C3) the committed placeholder `JWT_SECRET` (33 chars) passes the 32-char production check, and staff user ids leak to customers through order events, so a forged ADMIN token is a realistic chain.
- **No rate limiting, no security headers, no `trust proxy`, hardcoded localhost CORS.** The unauthenticated `POST /pricing/quote` writes an attacker-controlled JSON blob to the DB per call with no cleanup — a cheap disk-fill DoS.
- **The refresh-token subsystem is dead code from the client's point of view:** the frontend discards `refreshToken`, never calls `/auth/refresh`, and keeps a 15-minute access JWT in `localStorage`. Sessions silently expire every 15 minutes and refresh rows accumulate forever.
- **Statefulness:** the only in-process state is the login-attempt `Map` (unbounded, per-email, lets an attacker lock any account). Everything else is stateless, so a second instance is feasible once that moves to Redis.
- **Scalability:** "hundreds of thousands of sessions" is cheap (stateless JWT + one indexed PK lookup per request). The real ceiling on a 2 vCPU/8 GB box is artwork: uploads buffer 50 MB in RAM via `writeFileSync`, downloads `readFile` the whole object. Move artwork to S3/R2 with presigned URLs before public launch.
- **Stack age:** Node 20 reached EOL on 30 April 2026 (CI still pins it); NestJS 10.4 carries CVE-2026-35515 (SSE only; not used here); `multer` 2.0.2 has DoS CVEs fixed in 2.1/2.4; Prisma 5 is two majors behind. `npm audit --omit=dev`: 1 critical (Next.js, frontend), 8 high.
- **CI gates:** typecheck/lint/test/e2e exist, but no `npm audit`, SAST, secret scanning, Dependabot/Renovate, or Docker build.
- Data-layer defense in depth (Postgres RLS, separate migrate/app DB roles) is absent; recommended but second-tier given correct service-layer scoping.

## 2. Findings

| ID | Sev | Category | Location | Issue | Fix |
|---|---|---|---|---|---|
| C1 | Critical | Auth / privilege escalation | `backend/src/admin/customers-admin.service.ts:141` (guard at `:106` only blocks ADMIN targets) | `POST /admin/customers/:id/reset-password` returns `devResetToken`; STAFF can reset and log in as any CUSTOMER or other STAFF | Delete `devResetToken`; deliver by email only; require ADMIN for non-CUSTOMER targets |
| C2 | Critical | Ops / DB exposure | `backend/docker-compose.yml:7-11` | Postgres published on all interfaces with `banners/banners`; Docker `-p` bypasses ufw | `127.0.0.1:5432:5432` (or no `ports`), strong password from env, DOCKER-USER iptables rule |
| C3 | Critical | Secrets | `backend/src/config/env.validation.ts:23-29`; `.env.example:7`, `backend/.env.example:3`; `backend/src/orders/orders.service.ts:525` | Placeholder secret ≥32 chars passes; check only runs when `NODE_ENV=production`; staff user ids exposed to customers in `events[].actorId` → forged-ADMIN JWT if placeholder ships | Always validate; reject placeholders; require 256-bit random; stop exposing `actorId` to customers |
| H1 | High | DoS / input validation | `backend/src/pricing/pricing.service.ts:79-87`; `quote-request.dto.ts:31-50` | Unauthenticated quote persists unvalidated `request` JSON per call; no rate limit; no expiry cleanup | Validate `grommetPoints` (≤64, numeric bounds), `MaxLength` on strings, throttle, don't persist anonymous quotes (or TTL purge) |
| H2 | High | Rate limiting | `backend/src/auth/auth.service.ts:32,202-217`; `main.ts` | Per-email in-memory lockout lets anyone lock any account with 5 requests; `Map` never evicts; no throttle on register/forgot/reset/upload/quote | `@nestjs/throttler` global + per-route; IP+email backoff; Redis store when >1 instance |
| H3 | High | Trust boundary | `backend/src/common/client-ip.ts:5`; `orders.service.ts:139` | First `X-Forwarded-For` hop trusted, no `trust proxy` → forged IP in proof-consent evidence and audit log | `trust proxy` = 1, use `req.ip`, delete `ipOf` |
| H4 | High | Token leakage | `backend/src/common/jwt-auth.guard.ts:35-37`; `frontend/app/admin/orders/[id]/page.tsx:237` | JWT accepted/sent as `?access_token=` → proxy logs, history, Referer | Short-lived HMAC-signed download URLs or fetch+blob; remove query fallback |
| H5 | High | HTTP hardening | `backend/src/main.ts:12-29` | No helmet/CSP/HSTS/nosniff; CORS hardcoded to localhost; `credentials: true` unnecessary | `helmet()`, env-driven `CORS_ORIGINS` (+ opt-in Vercel preview regex), `credentials:false` until cookies |
| H6 | High | Seed / MFA | `backend/prisma/seed.ts:22-24` | Default admin `ChangeMe123!` when env unset; no prod guard; no MFA for STAFF/ADMIN | Seed refuses in production without strong `ADMIN_PASSWORD`; TOTP MFA for staff roles |
| H7 | High | Supply chain / EOL | `backend/package.json`; `.github/workflows/ci.yml:24` | Node 20 EOL; Nest 10.4.22; multer 2.0.2; Prisma 5; no audit gate | Node 24 LTS; Nest 11.1.18+; multer ≥2.4; `npm audit` CI gate; Dependabot; plan Prisma 6→7 |
| H8 | High | Business logic / atomicity | `backend/src/admin/admin-orders.service.ts:170-213` | Mark-paid credits rewards before `assertTransition`; failed transition leaves reward credited and no audit row; concurrent calls double-credit | Validate first; one transaction with conditional `updateMany` + `count===1` check |
| H9 | High | Scalability / DoS | `artwork.controller.ts:20-24,71-77`; `storage.service.ts:44,49` | 50 MB buffered per upload, `writeFileSync` blocks loop, downloads read whole file; no quota | Stream to disk + `createReadStream`; concurrency cap; per-user quota; later S3/R2 presigned |
| M1 | Medium | Sessions | `auth.service.ts:181-198`; `packages/api-client/src/apiClient.ts:54-58` | Refresh tokens issued but discarded; no reuse detection; never pruned | Implement httpOnly-cookie refresh or stop issuing; reuse detection; purge |
| M2 | Medium | Default-permissive | `backend/src/app.module.ts` | Auth is opt-in per controller | `JwtAuthGuard` as `APP_GUARD` + explicit `@Public()` |
| M3 | Medium | Authorization | `backend/src/artwork/artwork.service.ts:140` | CONTENT_EDITOR can download any customer's artwork | Restrict to STAFF/ADMIN |
| M4 | Medium | Authorization | `orders.service.ts:316`; `artwork.service.ts:141`; `admin-orders.service.ts:279-291` | Label PDF owned by staff actor → customer's `labelDownloadUrl` 403s | Separate shipment-label storage or order-owner check |
| M5 | Medium | Enumeration | `auth.service.ts:44-46,66-67` | Register 409 `EMAIL_TAKEN`; bcrypt only for existing users (timing oracle) | Dummy compare; neutral register response |
| M6 | Medium | Account lifecycle | `backend/src/users/*`, `backend/src/admin/*` | No email verification, change-password, or suspend/role endpoints | Add them, audited, revoking sessions |
| M7 | Medium | Token validation | `auth.module.ts:11-14`; `jwt-auth.guard.ts:45` | No pinned `algorithms`/`iss`/`aud`; role/email in payload | Pin HS256 + iss + aud; payload `sub` only |
| M8 | Medium | Input validation | `admin-orders.controller.ts:45-55,83`; `content-customers.controller.ts:70` | Unvalidated query params (`page=abc` → 500); untyped tracking body | Query DTOs; `TrackingDto` with regex |
| M9 | Medium | Logging | `auth.service.ts:140`; `notifications/email.service.ts:22` | Reset tokens and email payloads logged; no structured logs | `nestjs-pino` with redaction; global Prisma error filter |
| M10 | Medium | Ops resilience | `backend/src/main.ts` | No shutdown hooks, request timeouts, or DB readiness check | `enableShutdownHooks()`, server timeouts, internal `/health/ready` |
| M11 | Medium | Downloads | `artwork.controller.ts:72-76` | PDF served inline without nosniff/CSP sandbox | `nosniff`, `CSP: sandbox`, `attachment` by default |
| M12 | Medium | DB roles / RLS | `backend/docker-compose.yml`, `prisma.service.ts` | App connects as DB owner; no RLS | Split `bannersin48_migrate` / `bannersin48_app` (DML only); RLS optional later |
| M13 | Medium | CI gates | `.github/workflows/*` | No audit, SAST, secret scanning, Dependabot, image scan | `npm audit`, CodeQL/Semgrep, gitleaks, Dependabot, Trivy |
| M14 | Medium | Password hashing | `auth.service.ts:10,52,153` | Pure-JS bcryptjs cost 10; 72-byte truncation; no breached-password check | argon2id (or native bcrypt 12) + HIBP k-anonymity |
| M15 | Medium | Data growth | `prisma/schema.prisma` | No retention/purge for quotes, tokens, resets, audit/email logs | Scheduled purge jobs + retention policy |
| L1 | Low | Info disclosure | `orders.service.ts:525` | Staff user ids exposed to customers | Return role/"Staff" instead |
| L2 | Low | Authorization | `pricing.service.ts:79-87`; `orders.service.ts:215` | `quote.userId` never set, ownership check vacuous | Set `userId` when authenticated |
| L3 | Low | Path handling | `storage.service.ts:35` | `startsWith(baseDir)` without trailing separator (not exploitable today) | `startsWith(baseDir + path.sep)` |
| L4 | Low | Input validation | `admin/pricing-admin.dto.ts:20-21` | Product slug not URL-safe-validated | `@Matches(/^[a-z0-9-]+$/)` |
| L5 | Low | State machine | `admin-orders.service.ts:337-352` | Shipment timestamps upserted before `assertTransition` | Move inside transition transaction |
| L6 | Low | Race | `admin-orders.service.ts:229-244` | Dropship check-then-create → P2002 → 500 | Catch P2002 → 409 |
| L7 | Low | Hygiene | `.gitignore` (tail) | ~45 cuid-looking entries appended | Remove |

## 3. Critical & High details

**C1 — STAFF account takeover via `devResetToken`.** `customers-admin.service.ts:141` returns the raw reset token to the caller; the controller allows STAFF and ADMIN; the only target restriction is "not another ADMIN". STAFF calls the admin reset, then the public `POST /auth/reset-password`, and owns the victim's account. Must be removed before any deploy, not after SES lands.

**C2 — Postgres reachable from the internet.** `"5432:5432"` binds `0.0.0.0`; Docker's iptables rules precede ufw's, so ufw doesn't block it. With `POSTGRES_PASSWORD: banners` that's a one-line compromise. Bind to loopback or drop `ports`, env password, plus `iptables -I DOCKER-USER -i eth0 ! -s 127.0.0.0/8 -p tcp --dport 5432 -j DROP`.

**C3 — Placeholder JWT secret chain.** The committed placeholder passes the length check; with `NODE_ENV` unset there's no check at all. The same secret signs address-validation tokens. A customer sees `events[].actorId` (staff/admin id) on their order, signs `{sub: adminId}` with the placeholder, and `JwtAuthGuard` grants ADMIN. Always validate; reject `/change-me|example|secret/i`; require `openssl rand -hex 32`; separate `ADDRESS_TOKEN_SECRET`.

**H1 — Quote disk-fill.** `POST /pricing/quote` is public, unthrottled, persists the whole body (unvalidated `grommetPoints`, unbounded strings) up to Express's 100 KB limit, and never purges. 1,000 req/s × 100 KB ≈ 6 GB/min into a 96 GB disk.

**H2 — Lockout DoS / no throttling.** 5 wrong passwords lock any account (including admin), renewable forever; the `Map` grows per distinct email. Register (bcrypt per call), forgot-password, upload and quote are unlimited. Use `ThrottlerModule` globally (e.g. 120/min) with stricter auth routes (10/min), IP+email exponential backoff, Redis store when multi-instance.

**H3 — Forged client IP in legal proof records.** Client-supplied `X-Forwarded-For` becomes `proofConfirmIp` and `audit_log.ip`. Set `trust proxy` = 1 on the Express instance, use `req.ip`, leave Caddy `trusted_proxies` unset/loopback.

**H4 — Bearer token in query string.** Admin artwork previews put a valid admin JWT in URLs → proxy logs, history, Referer. Use per-file HMAC-signed URLs (60 s) or fetch+blob.

**H5 — Headers & CORS.** Add `helmet` (API CSP `default-src 'none'; frame-ancestors 'none'`, HSTS), CORS from `CORS_ORIGINS`, optional Vercel preview regex behind `ALLOW_PREVIEW_ORIGINS=1`, `credentials:false` until cookie refresh exists.

**H6 — Seed defaults & MFA.** Seed must throw in production without a strong `ADMIN_PASSWORD`. Add TOTP (`otplib`) with recovery codes for STAFF/ADMIN/CONTENT_EDITOR before public launch.

**H7 — EOL / CVEs.** Node 20 EOL 2026-04-30 (Node 24 LTS to 2028). Nest ≤11.1.17 affected by CVE-2026-35515 (SSE; nil exposure here). multer 2.0.2 affected by CVE-2026-3304 (fixed 2.1.0) and disk-storage cleanup CVEs (fixed ≥2.4). Prisma 7 removes the Rust engine — plan, don't rush.

**H8 — Mark-paid atomicity.** Rewards and `MARKED_PAID` are written before the status transition is validated; a CANCELLED/SHIPPED order keeps the credit with no audit row; concurrent clicks double-credit. Validate first; one transaction with `updateMany({where:{id, paymentStatus:'PENDING_PAYMENT'}})` and `count===1`.

**H9 — Artwork OOM.** Multer memory storage holds up to 50 MB per in-flight upload; 40 concurrent uploads ≈ 2 GB heap. Stream to disk with streaming sha256, `createReadStream` downloads, concurrency semaphore, per-user quota (e.g. ≤2 GB / ≤500 files); then S3/R2 presigned.

## 4. AI-code failure-mode checklist

| Failure mode | Status | Evidence |
|---|---|---|
| Missing auth on endpoints (CWE-306) | Handled, but opt-in | All user/admin controllers carry class-level guards; no `APP_GUARD` (M2) |
| Client-side-only auth checks | Absent (good) | Admin UI gate is cosmetic; every `/admin/*` route re-checks role (`roles.guard.ts:16-35`) |
| IDOR / tenant isolation (CWE-639) | Absent (good) | Orders, addresses, artwork, folders, idempotency keys all scoped by user id. Exceptions: M3, M4, L2 |
| Mass-assignment role escalation (CWE-915) | Absent (good) | `whitelist:true`; no `role`/`status` on user DTOs |
| Weak password handling | Partial | bcryptjs cost 10; no breach check; no change-password (M14, M6) |
| Hardcoded / placeholder secrets | **Present** | JWT placeholder passes (C3); seed password (H6); compose DB password (C2). `.env` never committed |
| Missing token validation | Partial | Signature + exp verified; no alg/iss/aud pin (M7) |
| Default-permissive middleware | Partial | `RolesGuard` allows when no `@Roles` — safe only because always paired with `JwtAuthGuard` |
| No CSP / security headers | **Present** | No helmet (H5) |
| No CSRF protection | N/A today | Bearer header, no cookies. Required once refresh moves to a cookie |
| No rate limiting | **Present** | H2 |
| No SSRF defenses | N/A | No outbound HTTP in backend. Future FedEx/SES clients: allowlisted hosts only |
| Missing input validation (CWE-20) | Partial | H1, M8, L4 |
| String-built SQL / command injection | Absent (good) | One tagged `$queryRaw`; no `$executeRawUnsafe`, no `child_process` |
| Data-layer isolation (RLS) | Absent | Service-layer only; app is DB owner (M12) |
| Secrets sprawl in commits | Absent (good) | Only `.env.example` tracked |
| SAST/SCA/secret-scan CI gates | Absent | M13 |
| File upload hardening | Partial | Magic bytes, 50 MB cap, server keys; memory buffering (H9), inline PDF (M11), no malware scan |
| Verification over trust | Partial | 51 unit tests; no IDOR integration tests against real Postgres |

## 5. Auth decision

**Keep the custom auth and harden it; don't adopt Keycloak/Ory/Auth0 for V1.** The primitives are the right shape (hashed rotating opaque refresh tokens, 256-bit single-use hashed reset tokens, per-request DB re-check, whitelisted DTOs) and requirements are narrow (email+password, four roles, no SSO). Keycloak/Kratos would eat much of a 2 vCPU box and add a second DB; Auth0's free tier caps at 25k MAU. Revisit only for B2B SSO or shared identities.

Mandatory hardening: remove `devResetToken` (C1); secret validation + JWT pinning (C3, M7); global guard + throttler (M2, H2); session redesign — access token in memory, refresh in `httpOnly; Secure; SameSite=None; Path=/auth` cookie with Origin allowlist + custom-header CSRF check and family reuse detection (or drop refresh entirely and use ~1 h access tokens); argon2id + HIBP (M14); change-password/email verification/suspend endpoints (M6); TOTP MFA for staff (H6); signed download URLs (H4).

## 6. Scalability plan

Sessions are cheap: one indexed PK lookup per request; 500k users ≈ 150 MB. What matters is concurrent requests and artwork bytes.

Single VPS (2 vCPU / 7.8 GiB, Postgres co-located): authed JSON ≈ 400–800 req/s for one Nest process (~20× a busy banner shop's need); `POST /orders` ≈ 15–30 ms; bcryptjs ≈ 60–100 ms CPU per login (~15/s/core — throttle, go native); artwork is the ceiling (H9).

Bottlenecks in order: artwork RAM/disk → missing throttles → bcryptjs CPU → unbounded table growth → Postgres sharing CPU.

Indexes to add (one migration):
```sql
CREATE INDEX order_user_created_idx ON "order"("userId","createdAt" DESC);
CREATE INDEX order_status_placed_idx ON "order"(status,"placedAt" DESC);
CREATE INDEX order_event_order_created_idx ON order_event("orderId","createdAt");
CREATE INDEX audit_log_entity_created_idx ON audit_log("entityType","entityId","createdAt" DESC);
CREATE INDEX audit_log_actor_created_idx ON audit_log("actorId","createdAt" DESC);
CREATE INDEX email_log_created_idx ON email_log("createdAt");
CREATE INDEX quote_valid_until_idx ON quote("validUntil");
CREATE INDEX refresh_token_active_idx ON refresh_token("userId") WHERE "revokedAt" IS NULL;
CREATE INDEX artwork_file_user_live_idx ON artwork_file("userId","createdAt" DESC) WHERE "deletedAt" IS NULL;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX user_search_trgm_idx ON "user" USING gin (lower(email) gin_trgm_ops, lower("firstName") gin_trgm_ops, lower("lastName") gin_trgm_ops);
```
Verify table/column names against `schema.prisma` `@@map`s before applying.

Other: `DATABASE_URL` `?connection_limit=10&pool_timeout=10`; no PgBouncer until ≥3 app processes or managed DB; cache catalog in `PricingEngineService` ~30 s; move `buckets()` SLA check into SQL once backlog is large; no queue needed yet (`@nestjs/schedule` for purges; BullMQ when a third-party call sits on checkout or >1 instance).

Staged path:
1. **Now:** fixes above; Caddy → 1 Nest process → Postgres on loopback.
2. **Before public launch:** artwork to S3/R2 + CDN with presigned URLs; off-site backups; MFA; Node 24.
3. **CPU >60% or DB >4 GB:** managed Postgres (or separate DB box), 2 API replicas, Redis throttling, PgBouncer.
4. **Beyond:** monthly partitioning of `audit_log`/`email_log`/`order_event` past ~50 M rows; optional RLS.

## 7. Compression & storage settings

Postgres:
```
default_toast_compression = lz4
wal_compression = zstd
shared_buffers = 2GB
effective_cache_size = 5GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 60
log_min_duration_statement = 500ms
autovacuum_vacuum_scale_factor = 0.05
```
Existing wide jsonb columns (new rows only; verify names):
```sql
ALTER TABLE quote        ALTER COLUMN request SET COMPRESSION lz4, ALTER COLUMN breakdown SET COMPRESSION lz4;
ALTER TABLE order_item   ALTER COLUMN "configSnapshot" SET COMPRESSION lz4;
ALTER TABLE "order"      ALTER COLUMN "shipAddress" SET COMPRESSION lz4;
ALTER TABLE audit_log    ALTER COLUMN diff SET COMPRESSION lz4;
ALTER TABLE email_log    ALTER COLUMN payload SET COMPRESSION lz4;
ALTER TABLE artwork_file ALTER COLUMN "dpiReport" SET COMPRESSION lz4;
```
Keep `jsonb`. Rows under ~2 KB aren't TOASTed; the win is on quote and snapshot blobs.

Backups: `pg_dump -Fc -Z zstd:9`, 14-day local retention, `restic` off-site (encrypted, deduplicated) for dumps + artwork, monthly restore drill.

Logs: Docker `daemon.json` `{"log-driver":"json-file","log-opts":{"max-size":"20m","max-file":"5","compress":"true"}}`; Caddy `roll_size 50mb roll_keep 10 roll_keep_for 720h`; journald `SystemMaxUse=500M`.

HTTP: Caddy `encode zstd gzip` only (skips images/PDF by default). No Nest `compression` middleware.

Artwork: never recompress JPEG/PNG/PDF; dedup by existing `sha256` (key `${userId}/${sha256}${ext}`); 6-month lifecycle job for files not referenced by recent orders. Filesystem: plain ext4 — btrfs/ZFS zstd gains ~nothing on compressed media.

Retention: expired quotes purged; refresh/reset tokens purged weekly; `audit_log` 2 years then archived; `email_log` 1 year; `order_event` kept.

## 8. Remediation plan

*Superseded by [backend-plan.md](backend-plan.md), which adjusts this list for the 2026-09-30 decisions (artwork moves to S3/R2 after go-live, not before).*

**Before first production deploy** (one PR each):
1. Remove `devResetToken`; STAFF can reset CUSTOMER only (C1).
2. Compose: Postgres on loopback, env password, DOCKER-USER rule; non-root, read-only rootfs + tmpfs, `cap_drop: [ALL]`, `no-new-privileges`, `env_file` mode 600 (C2).
3. JWT secret validation always on + placeholder denylist + 256-bit; separate `ADDRESS_TOKEN_SECRET`; hide staff `actorId` (C3, L1).
4. helmet, env CORS, `trust proxy`, `req.ip`, shutdown hooks (H3, H5, M10).
5. Throttler global + auth/upload/quote; IP+email backoff (H2).
6. Quote DTO tightening + no anonymous persistence / TTL purge (H1).
7. Seed production guard (H6).
8. Streamed uploads/downloads, concurrency cap, per-user quota (H9).
9. Mark-paid validate-first conditional transaction (H8).
10. Node 24, Nest 11.1.18+, multer ≥2.4, `npm audit` gate, Dependabot (H7, M13).
11. Global `APP_GUARD` + `@Public()`; JWT alg/iss/aud pin (M2, M7).
12. Remove `?access_token=`; signed download URLs (H4).

**Before public launch:**
13. Session redesign or drop refresh tokens (M1).
14. argon2id + HIBP; change-password; email verification (M14, M6).
15. TOTP MFA for staff roles (H6).
16. CONTENT_EDITOR artwork restriction; label ownership (M3, M4).
17. Query DTOs, `TrackingDto`, slug regex, P2002→409, Prisma error filter, redacted structured logs (M8, M9, L4, L6).
18. Migrate/app DB role split; index migration; TOAST/WAL compression; retention jobs (M12, M15).
19. Artwork to S3/R2 + CDN; sha256 dedup; lifecycle.
20. CodeQL/Semgrep, gitleaks, Trivy; IDOR regression tests on real Postgres.
21. Ops: nightly dumps + restic off-site + restore drills, uptime check, log shipping, `prisma migrate deploy` one-shot before API start, zero-downtime `docker compose up -d --no-deps --wait api`.

**Scale-up later:**
22. Redis throttling + 2 replicas; PgBouncer on managed Postgres.
23. Catalog cache; SQL-side SLA counts.
24. Prisma 6 → 7.
25. Partition large append-only tables; optional RLS via Prisma extension + `SET app.user_id`.

## 9. VPS ops notes

- No `Dockerfile`, `Caddyfile`, or deploy scripts in the repo yet — container hardening is prescriptive, not reviewed.
- Only Caddy publishes 80/443; everything else binds `127.0.0.1` or stays on the compose network (Docker bypasses ufw).
- DB roles: `bannersin48_migrate` (owner, migrations only); `bannersin48_app` DML + sequence usage (`order_number_seq`), no DDL.
- Caddy: leave `trusted_proxies` unset; set HSTS in Caddy or helmet, not both.

**Not verified:** actual VPS Docker/Caddy config; whether the pulled `postgres:16` image has zstd (check `SHOW wal_compression`); frontend CMS `linkHref` sanitisation (`SiteContentStrip.tsx:35`).
