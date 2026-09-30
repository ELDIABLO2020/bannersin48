# Backend hardening & deploy plan

Built from the [security & scalability review](backend-security-review.md) (finding IDs like C1, H4 refer to it).
Tick items off as PRs land. Each numbered item is one PR.

## Decisions (2026-09-30)

- **Auth:** keep the custom login system and harden it. No hosted IdP (Auth0, Keycloak, Ory) in V1.
- **Artwork storage:** stays on the VPS disk through testing and go-live. S3/R2 + CDN comes after go-live.
  Because of that, streamed uploads, per-user quotas, disk alerts and off-site artwork backups are required before go-live.
- **Hosting:** Hostinger VPS (2 vCPU / 8 GB / 96 GB, Ubuntu 24.04, already hardened) running Docker Compose:
  Caddy (HTTPS, compression) → one Nest process → Postgres 16 on loopback. Frontend stays on Vercel.
- **Runtime:** Node 24 LTS, NestJS 11, Prisma stays on 5 until after go-live.
- **Compression:** Caddy `encode zstd gzip` (no Nest compression middleware); Postgres lz4 TOAST + zstd WAL;
  `pg_dump -Fc -Z zstd`; rotated, compressed logs. Images and PDFs are never recompressed.
- **Password resets without real email:** once `devResetToken` is removed, resets can't be delivered until an email
  transport exists. During testing, an admin resets passwords with a CLI script run over SSH on the VPS.
  Real email (SES or similar) is required before go-live.

## Phase 1 — before the first VPS deploy (test environment)

Security:
1. [x] Remove `devResetToken`; STAFF can only reset CUSTOMER accounts; add `admin:reset-password` CLI script (C1).
2. [x] `JWT_SECRET` validated on every boot: reject placeholders, require 256-bit random; separate `ADDRESS_TOKEN_SECRET`; pin JWT `HS256` + `iss` + `aud`, payload `sub` only; hide staff `actorId` from customers (C3, M7, L1).
3. [x] `JwtAuthGuard` as global `APP_GUARD` with explicit `@Public()` routes (M2).
4. [x] `helmet`, env-driven `CORS_ORIGINS` (+ opt-in Vercel preview regex), `credentials:false`, `trust proxy` + `req.ip` (delete `ipOf`), shutdown hooks, server timeouts (H3, H5, M10).
5. [x] `@nestjs/throttler` global + stricter auth/quote/upload limits; replace per-email hard lockout with IP+email backoff (H2).
6. [ ] Quote DTO bounds (`grommetPoints`, string lengths); stop persisting anonymous quotes or purge expired ones (H1).
7. [x] Seed refuses to run in production without a strong `ADMIN_PASSWORD` (H6).
8. [ ] Mark-paid: validate the transition first, single conditional transaction, no double credit (H8).
9. [ ] Remove `?access_token=`; short-lived HMAC-signed artwork/label download URLs; PDFs served with `nosniff` + `CSP: sandbox` (H4, M11).
10. [ ] Stream uploads to disk and downloads from disk; streaming sha256; upload concurrency cap; per-user quota (H9).

Platform:
11. [ ] Node 24, NestJS 11.1.18+, multer ≥2.4; CI on Node 24; `npm audit --omit=dev --audit-level=high` gate; Dependabot (H7, M13).
12. [ ] Production deploy files: backend `Dockerfile` (non-root, pinned base), `docker-compose.prod.yml` (only Caddy publishes 80/443; Postgres on the compose network; read-only rootfs, `cap_drop: [ALL]`, `no-new-privileges`, `env_file` 600), `Caddyfile` (HSTS, `encode zstd gzip`, log rolling), `prisma migrate deploy` one-shot before the API starts (C2).
13. [ ] Postgres: `bannersin48_migrate` (owner) and `bannersin48_app` (DML + sequences only) roles; tuned `postgresql.conf` with lz4 TOAST, zstd WAL and memory settings; lz4 on wide jsonb columns (M12, §7).
14. [ ] VPS: Docker daemon log rotation, journald cap, DOCKER-USER drop rule, nightly `pg_dump` + artwork backup with `restic` off-site, disk-usage alert at 70% (§7, §9).

## Phase 2 — before go-live (public)

15. [ ] Real email transport (SES or similar); password-reset and notification emails; never log tokens.
16. [ ] Session redesign: access token in memory, refresh token in an `httpOnly; Secure; SameSite=None; Path=/auth` cookie, Origin allowlist + custom-header CSRF check, refresh-family reuse detection, nightly token purge (M1).
17. [ ] argon2id + breached-password (HIBP) check; change-password endpoint that revokes sessions; email verification; neutral register/login responses (M14, M6, M5).
18. [ ] TOTP MFA with recovery codes for STAFF / ADMIN / CONTENT_EDITOR (H6).
19. [ ] Admin suspend/role endpoints (audited); CONTENT_EDITOR can't read artwork; shipment labels owned by the order, not the staff actor (M6, M3, M4).
20. [ ] Query DTOs, `TrackingDto`, slug regex, P2002→409 and Prisma error filter, `nestjs-pino` with redaction (M8, M9, L4, L6).
21. [ ] Index migration and retention/purge jobs via `@nestjs/schedule` (§6, M15).
22. [ ] CI: CodeQL or Semgrep, gitleaks, Trivy image scan; IDOR regression tests against real Postgres (M13).
23. [ ] Ops: uptime check on `/health`, internal `/health/ready`, a restore drill from off-site backups, zero-downtime deploy (`docker compose up -d --no-deps --wait api`).

## Phase 3 — after go-live

24. [ ] Artwork to S3/R2 + CDN with presigned upload/download; sha256 dedup; 6-month lifecycle.
25. [ ] Redis-backed throttling + 2 API replicas; managed Postgres + PgBouncer when CPU >60% or DB >4 GB.
26. [ ] Catalog cache in `PricingEngineService`; SQL-side SLA bucket counts.
27. [ ] Prisma 6 → 7.
28. [ ] Monthly partitioning of `audit_log` / `email_log` / `order_event` past ~50 M rows; optional Postgres RLS.
