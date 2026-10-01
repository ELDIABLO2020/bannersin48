# Architecture & decisions

The code is the source of truth. This file records the business decisions the code
can't explain on its own, and what is deliberately not built yet.

## Operating model (V1)

1. The customer builds a banner, and the server re-prices it. The server's quote is authoritative and client math is never trusted.
2. An account is required to order. There is no guest checkout.
3. **Payment is manual.** New orders are `RECEIVED` with `paymentStatus = PENDING_PAYMENT`.
   Staff "mark paid" is the gate that moves an order to `IN_PROCESSING`. There is no payment provider.
   The 48-hour promise starts when payment is confirmed. Storefront copy must say so.
4. **Fulfillment is manual.** The drop shipper has no API, CSV or webhook, so staff re-enter
   each order on the drop shipper's site. They then record the drop-ship reference, the FedEx
   tracking number and the label PDF in the admin fulfillment workspace. Recording tracking moves
   the order to `ACCEPTED`. Later statuses are set by staff.
5. **Sales tax is deferred.** Tax is always 0 and shown as such. The business is registered in Michigan.
6. **Rewards:** $1 per $100 spent. The credit is applied once, at mark-paid, as
   `floor(totalCents / 100)` cents on `reward_ledger`, and is denormalized onto `users`.
   Mark-paid is one transaction whose status update only matches a still-unpaid order in the
   status that was read, so a double click or two staff members can't credit twice.
7. **Proof:** the customer self-confirms at checkout with five acknowledgements. The server stores the
   timestamp, IP and consent version. There is no proof-versioning workflow.
8. **SLA:** `placedAt + 48 business hours`, counted Monday to Friday. Holidays are not modelled.
9. USA/USD only. The app runs in `NEXT_PUBLIC_COMMERCE_MODE=internal_manual`, which is noindex.
   `public_live` is build-gated. It requires live payment and tax, plus approved policy URLs.

## Order status machine

`backend/src/orders/status-machine.ts` is authoritative. Every transition writes an
`order_events` row, in the same transaction as the status update, which is a compare-and-set on
the status that was read (`409 CONFLICT` if someone else changed the order first). Activity that doesn't change status, such as recording a drop-ship
reference, writes a same-status event.

```
RECEIVED | AWAITING_PAYMENT → IN_PROCESSING → ACCEPTED → SHIPPED → DELIVERED
any pre-ship state → ON_HOLD | CANCELLED; ON_HOLD → IN_PROCESSING | ACCEPTED | CANCELLED
```

Customers may cancel only before payment is marked (`RECEIVED`, `AWAITING_PAYMENT`).

## Roles and permissions

Access is role + permission based (full design: `docs/accounts-admin-rbac-plan.md`). A
**permission** is a `resource:action` key from the code-defined catalog in
`packages/shared/src/permissions.ts` (mirrored into the `permission` table at boot by
`RbacService.syncCatalog`). An **access role** (`access_role`) is a named set of permissions; each
user has one primary role (`user.roleId`) plus optional per-user ALLOW/DENY overrides
(`user_permission`, optionally expiring). Effective permissions are
`role ∪ ALLOW − DENY`; the `admin` role is the wildcard `*` and ignores overrides.

| Role (`access_role.key`) | Kind (`User.role`) | Default permissions |
|---|---|---|
| `customer` | `CUSTOMER` | none — own account, artwork and orders are ownership-scoped in services, not permissions |
| `staff` | `STAFF` | order board + fulfillment (`orders:*`), `customers:read`, `artwork:read_any`, `rewards:read`, `catalog:read`, `promos:read`. **Not** `payments:mark_paid` or `customers:reset_password` |
| `content_editor` | `CONTENT_EDITOR` | `content:read`, `content:edit`, `content:publish` (no artwork) |
| `admin` | `ADMIN` | `*` — immutable |
| `fulfillment`, `support`, `catalog_manager` | `STAFF` | editable templates seeded by the migration (Support holds `customers:reset_password` and `rewards:adjust`; Catalog Manager holds `catalog:write` and `pricing:write`) |

The legacy `Role` enum on `User.role` is a derived *kind*: `RbacService.assignRole` writes it from
the role's `legacyRole` whenever `roleId` changes, registration writes `CUSTOMER` + the `customer`
role, and the phase 1 migration backfilled `roleId` from it. Since phase 5 `user.roleId` is NOT NULL
(migration `20261005000000_user_role_id_not_null`, which repeats the backfill first), nothing under
`/admin/*` carries `@Roles`, and the kind is read only for the wire shape, the customer-vs-staff
target checks and the staff password rules — never for authorization.

Guards, in order: `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard`, all
global (`APP_GUARD`). `RolesGuard` is kept only for optional coarse gating of future non-admin
routes and has no implicit ADMIN pass (an admin passes permission checks because the `admin` role
holds `*`). Every route needs a valid access token unless it is marked `@Public()`;
`backend/src/app.security.spec.ts` pins the public list and checks every other route returns 401
anonymously, and `backend/src/rbac/permissions-coverage.spec.ts` fails if any `/admin/*` route
lacks a permission decorator, still carries `@Roles`, or is `@Public` (deny by default, structurally). `JwtAuthGuard` re-reads the user,
role and overrides on each request, so role, permission and status changes apply at once; nothing
about access is in the JWT. The admin UI only hides sections and buttons the user can't use
(`useCan` / `<Can>` / `hasAdminAccess`, fed by `permissions` from `/auth/me`, which the app
re-reads on load and after any `403 FORBIDDEN_PERMISSION`). The access JWT lives in
`localStorage`, so the admin gate is client-side and every API call is still enforced by the server.

Escalation safeguards live in `RbacService` (plan §3.6): grant ceiling (you can only grant what you
hold; elevated permissions need `rbac:manage`), immutable `admin`/`customer` role sets, no
self-modification, last-active-admin lock, and target-kind checks (`customers:*` on customer
accounts, `users:*` on staff). Password resets from the dashboard: `customers:reset_password` for
customers, `users:reset_password` for staff; another admin's password is CLI-only.

## Admin panel surfaces

The staff area (`/admin`, `frontend/app/admin/**`) lands on a dashboard (`GET /admin/dashboard`:
today's placed / paid / shipped counts from the shop's local midnight, open orders, SLA breaches,
and every bucket linking into the order board at `/admin/orders`). Beyond fulfillment it covers
customers (CUSTOMER-kind accounts only: profile edits on their behalf, suspend / reactivate with a
reason, reward ledger with manual adjustments), promo codes, catalog & pricing, CMS content, staff,
roles and the audit log. Every page is permission-gated in the shell and every route by
`PermissionsGuard` (routes and permissions in [api.md](api.md#admin)). Manual reward adjustments
are one transaction — balance compare-and-set with a `>= 0` guard, `ADJUSTMENT` ledger row with
`createdBy`, audit row with the reason — so the denormalised `user.rewardPointsBalance` always
equals the ledger sum. Promo codes are managed here but **not yet applied at checkout**; order
notes are same-status `order_event` rows the customer is never emailed about.

## Conventions

- **Pricing:** one engine (`priceLine`/`priceOrder` in `packages/shared`). The backend passes
  DB-loaded rates into it (`PricingEngineService`), and the MSW mocks use the shared defaults.
  An admin rate change affects the next quote immediately.
- **Snapshots:** orders and order items snapshot config, rates, prices, address and artwork refs.
  Orders never re-join catalog tables for money.
- **Money:** Prisma `Decimal(12,2)` for catalog, quote and order amounts; integer cents for the reward ledger.
- **Dimensions:** `width` is horizontal and `height` is vertical. Labels read "8′ W × 4′ H". Billable size
  rounds each axis up to a whole foot. The old `w`/`h` URL params and pre-v2 persisted carts
  and drafts are migrated with their axes swapped. Keep those migrations.
- **Mocks:** `packages/api-client/src/mocks/handlers.ts` mirrors the real API shapes for
  `NEXT_PUBLIC_ENABLE_MOCKS=1`. Change both together.
- **Audit:** every staff or admin mutation writes `audit_log` (old→new diff). Catalog rows referenced
  by orders are deactivated, never deleted (`409 IN_USE`); promo codes likewise (`DELETE` = `active: false`).
- **Order numbers:** `BI48-000001`, generated from the Postgres sequence `order_number_seq`.

## Not built yet

These are local stand-ins. Each sits behind an interface, so a real implementation can replace it.

| Concern | Today | Planned |
|---|---|---|
| Artwork storage | `LocalStorageDriver` (`STORAGE_DRIVER=local`): uploads stream to `$LOCAL_STORAGE_DIR/.incoming` and are renamed to `<userId>/<sha256>.<ext>` (labels: `labels/<orderId>/…`); per-user quota; files are served only through 5-minute HMAC-signed links | S3/R2 driver + CDN, 6-month lifecycle expiry (after go-live) |
| Email | `EmailService` logs to console + `email_log`, with tokens and passwords replaced by a sha256 fingerprint. Nothing is delivered | Real transport (SES or similar), before go-live |
| Rate limits | In-memory `@nestjs/throttler` per IP, and an in-memory IP+email login backoff (see [api.md](api.md)) | Redis store when multi-instance |
| Malware scan | Artwork rows stay `scanStatus = PENDING` | Scanner |
| Tracking | Tracking number, label PDF and a FedEx deep link | FedEx Tracking API for automatic shipped/delivered |
| Payments, tax | None (see operating model) | Provider integrations |
| Hosting | Frontend on Vercel. Backend deploy files in [`deploy/`](../deploy/README.md), not yet live | Hostinger VPS: Caddy → Nest → Postgres 16 in Docker Compose |

Auth stays custom and is hardened rather than replaced with a hosted provider. The work is sequenced in
[backend-plan.md](backend-plan.md), from the findings in [backend-security-review.md](backend-security-review.md).
The API never returns reset tokens. Until email exists, nobody receives a reset link, so an operator
resets passwords over SSH with the CLI below.

## Running and testing the feature set locally

Everything below runs against the real backend (Postgres in Docker). With `NEXT_PUBLIC_ENABLE_MOCKS=1`
the MSW handlers in `packages/api-client/src/mocks/*` serve the same surfaces from fixtures, which is
what `npm run e2e` uses.

```bash
cp backend/.env.example backend/.env            # fill the three secrets: openssl rand -hex 32
docker compose -f backend/docker-compose.yml up -d
npm exec -w backend -- prisma migrate deploy    # forward-only; see the three RBAC migrations below
npm run seed -w backend                         # catalog, content, permission catalog, roles, admin user
npm run start:dev -w backend                    # :3001
npm run dev -w @bannersin48/frontend            # :3000
```

The account/admin/RBAC work ships as three migrations, all applied by `migrate deploy`:
`20261003000000_rbac_roles_permissions` (tables, permission catalog, system + template roles, backfill
of `user.roleId`), `20261004000000_customer_account` (notification settings) and
`20261005000000_user_role_id_not_null` (repeats the backfill, then `roleId NOT NULL`). The seed is
idempotent and also re-syncs the permission catalog, so re-running it after a code change that adds a
permission is safe; `RbacService.syncCatalog()` does the same at API boot.

Accounts to test with:

| As | How |
|---|---|
| Admin | the seeded `admin@bannersin48.local` / `ChangeMe123!` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`); sign in at `/admin`. Holds `*` |
| Limited staff | in `/admin/staff`, *Add employee* with a template role (Fulfillment, Support, Catalog Manager) and a temporary password; sign out, sign in at `/admin` as that user, and the first-login password change is enforced before any other call. Narrow further with per-user overrides on the staff detail page |
| Customer | register at `/register` (gets the empty `customer` role) and use `/account/*`; `/admin` shows the "Staff access only" card |

Checks: `npm run ci` (typecheck, lint, unit tests, mock build, Playwright + axe on desktop Chromium and
mobile WebKit); `npm run e2e:real` for the release scenarios against the real backend, including the
staff flow (temporary-password employee → forced change → tracking allowed → mark-paid refused →
suspension immediate). Known limitations: `EmailService` only logs, so staff *invites*, email change
and email verification have working endpoints but hidden UI (`frontend/lib/config/features.ts`);
promo codes are managed in `/admin/promos` but checkout does not apply them yet; the sudo step for
`rbac:manage` / `users:create` and folding `PasswordReset` into `ActionToken` (plan §11 Q3, Q6) are
deferred.

## Local accounts

`npm run seed -w backend` upserts `admin@bannersin48.local` / `ChangeMe123!`. Override
them with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Re-running the seed never overwrites an existing password.

With `NODE_ENV=production` the seed (`npm run seed:prod -w backend`, i.e. `node dist/prisma/seed.js`)
refuses to run unless `ADMIN_EMAIL` and `ADMIN_PASSWORD` are both set and the password is at least
16 characters and not a placeholder.

## Operator password reset

```
npm run admin:reset-password -w backend -- someone@example.com   # local (ts-node)
node dist/src/cli/reset-password.js someone@example.com          # production container
```

The new password (12–128 characters) comes from a hidden, confirmed TTY prompt, or from the
`NEW_PASSWORD` env var when that is set (non-interactive use), or from stdin with
`--password-stdin`. It is never accepted as an argument. The script revokes the user's refresh tokens and
unused reset links and writes an `audit_log` row with `actorId` null and `diff.actor = "system:cli"`.
Access tokens already issued stay valid until they expire (15 minutes).

## Required environment

The API validates its environment on every boot, whatever `NODE_ENV` is:
`DATABASE_URL`; `JWT_SECRET`, `ADDRESS_TOKEN_SECRET`, `DOWNLOAD_URL_SECRET` (each 64+ hex or 43+
base64url characters, all different, no placeholders; generate with `openssl rand -hex 32`);
`CORS_ORIGINS` (required, https only, when `NODE_ENV=production`). Optional: `JWT_ISSUER`
(default `bannersin48-api`), `JWT_AUDIENCE` (default `bannersin48-web`), `ALLOW_PREVIEW_ORIGINS`
(`1` to allow Vercel previews); `PUBLIC_API_URL` (origin used in signed file links; defaults to
`https://$API_DOMAIN`, else `http://localhost:$PORT`, and one of the two is required when
`NODE_ENV=production`); `UPLOAD_MAX_CONCURRENCY` (default 4), `ARTWORK_QUOTA_BYTES` (default 2 GiB)
and `ARTWORK_QUOTA_FILES` (default 500). At boot the API checks that `$LOCAL_STORAGE_DIR/.incoming`
is writable and deletes temp files there older than an hour. Unknown variables are ignored. On SIGTERM the API stops accepting
requests and force-closes anything still open after 25 s, inside Docker's 30 s stop window.
