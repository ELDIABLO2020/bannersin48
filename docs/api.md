# API map

NestJS API in `backend/src`, default port `3001`. Every route needs a Bearer access JWT
(HS256, 15 min, `iss` `bannersin48-api`, `aud` `bannersin48-web`, payload `sub` only) unless it
is listed under Public. `JwtAuthGuard`, `PermissionsGuard` and the rate limiter are global guards
(`RolesGuard` stays registered for optional coarse gating of future routes, with no ADMIN bypass,
and is unused under `/admin`); a route opts out of auth with `@Public()`. Refresh tokens are opaque, last 30 days,
and rotate on use. Controllers are authoritative. The MSW handlers in
`packages/api-client/src/mocks/handlers.ts` mirror these shapes.

Authorization is permission-based (`docs/accounts-admin-rbac-plan.md`): the guard re-reads the
user, their access role and per-user overrides on every request and resolves an effective
permission set (`["*"]` for the `admin` role). `/auth/me`, `/auth/login` and `/auth/register`
return it as `permissions` next to `roleKey`. A route the caller cannot use answers
`403 { code: "FORBIDDEN_PERMISSION", required: [...] }`. Permissions are the only gate on `/admin/*`
(phase 5): `backend/src/rbac/permissions-coverage.spec.ts` fails if any admin route lacks a permission
decorator, carries a legacy `@Roles`, or is `@Public`. Every account holds exactly one access role
(`user.roleId` is NOT NULL; storefront sign-ups get `customer`), and the `User.role` enum is derived
from it.

## HTTP behaviour

- **CORS:** exact origins from `CORS_ORIGINS`, plus `https://bannersin48-frontend-*.vercel.app`
  when `ALLOW_PREVIEW_ORIGINS=1`. No credentials (the API sets no cookies); allowed request
  headers are `Authorization`, `Content-Type`, `Accept`, `Idempotency-Key`; preflights cached 10 min.
- **Headers:** helmet with `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
  `nosniff`, `Cross-Origin-Resource-Policy: cross-origin` (artwork previews load in `<img>` on the
  storefront). HSTS comes from Caddy, not the API.
- **Tokens never go in URLs.** Only the `Authorization: Bearer` header is read (`?access_token=` is
  ignored). Artwork and label files are fetched through short-lived signed links instead (below).
- **Client IP:** `trust proxy` is 1 (Caddy), so audit rows and proof consent use `req.ip`.
- **Bodies:** JSON and urlencoded bodies are capped at 256 KB (`413` above that). Files use multipart
  and are streamed to disk (`$LOCAL_STORAGE_DIR/.incoming`, then renamed into place); they are never
  buffered in memory. At most `UPLOAD_MAX_CONCURRENCY` (default 4) uploads run at once per process;
  beyond that uploads answer `503 { code: "UPLOADS_BUSY" }` with `Retry-After: 5`.
- **Rate limits** (per client IP, per minute; `429` with `Retry-After`, or `Retry-After-auth` /
  `-quote` / `-upload` / `-download` for the other buckets): 120 across all
  routes; 10 across register/login/refresh/forgot/reset/accept-invite/verify-email/confirm-email-change
  and the signed-in password/email changes; 30 for `POST /pricing/quote` and `POST /designs/:id/quote`;
  20 for `POST /artwork/upload`; 20 (`Retry-After-sensitive`) across the staff mutations that mint
  credentials or move money — `POST /admin/users`, `/admin/users/:id/invite/resend`,
  `/admin/users/:id/reset-password`, `/admin/customers/:id/reset-password`,
  `/admin/customers/:id/rewards/adjust`. Signed file links (`GET /artwork/:id/file`) have their own
  300/min bucket instead of the 120 (a library grid loads many previews). `/health` is never limited.
- **Login backoff:** after 5 failed logins for the same IP + email, each further failure doubles the
  wait (2 s, 4 s, … capped at 15 min) and login answers `429 { code: "LOGIN_BACKOFF", retryAfterSeconds }`.
  Other IPs are unaffected, a success clears it, and it is forgotten after 30 min without failures.

## Public

| Method | Route | Notes |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/auth/register`, `/auth/login` | Returns `{ user, token, refreshToken }`. Register answers `409 EMAIL_TAKEN` for a used email |
| POST | `/auth/refresh` | Rotates the refresh token |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Always 200 (no account enumeration). The token is only emailed; logs show a redacted fingerprint |
| POST | `/auth/accept-invite` | `{ token, password }` redeems a staff invite (single use, 72 h): sets the password, activates the account, marks the email verified, revokes sessions and signs in (`{ user, token, refreshToken }`). Bad/used/expired tokens all answer `400 INVITE_INVALID`. Auth rate bucket |
| GET | `/auth/me` | Current user, or a literal `null` body when signed out (optional auth). Carries `mustChangePassword` |
| GET | `/catalog/banner`, `/catalog/banner/:slug` | Hub products and product detail |
| POST | `/pricing/quote` | Server re-prices from DB rates and persists a quote snapshot, because orders reference quotes by id. Stored: the validated, normalised request only (≤ 64 `grommetPoints`, enum finishing values, bounded strings). Anonymous allowed (unowned quote, so a cart built before sign-in still checks out); with a valid Bearer token the quote carries the caller's `userId` and other accounts can't order with it. Expired quotes are purged daily (04:00 UTC) |
| GET | `/artwork/:id/file?purpose=&exp=&sig=` | Signed file link, minted by `POST /artwork/:id/download-url` or embedded as `previewUrl`. `sig` = HMAC-SHA256(`DOWNLOAD_URL_SECRET`, `${id}.${exp}.${purpose}`), valid 5 minutes; tampered, expired or unsigned → `403 DOWNLOAD_LINK_INVALID` / `DOWNLOAD_LINK_EXPIRED`. Response: stored `Content-Type` (sniffed at upload), `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cache-Control: private, max-age=300`; `Content-Disposition: inline` only for PNG/JPEG/WebP with `purpose=preview`, otherwise `attachment` (PDFs always) |
| GET | `/delivery/next-cutoff` | Next order cutoff + guaranteed delivery estimate |
| GET | `/content`, `/content/:key` | Published CMS blocks only |

## Customer (auth)

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/logout` | |
| POST | `/address/validate` | US syntax normalization; returns a token signed with `ADDRESS_TOKEN_SECRET`, checked again at order time |
| GET/PATCH | `/users/me` | Profile (`firstName`, `lastName`, `phone`). The response also carries `emailVerifiedAt`, `pendingEmail`, `notifyOrderUpdates`, `notifyMarketing` and the address book as `savedAddresses` |
| PATCH | `/users/me/settings` | `{ notifyOrderUpdates?, notifyMarketing? }`. Security mail always sends |
| POST | `/users/me/password` | `{ currentPassword, newPassword, keepRefreshToken? }`. Wrong current password → `400 INVALID_CURRENT_PASSWORD` and nothing changes. Staff accounts must meet the operator rules (12–128 chars, `400 WEAK_PASSWORD`); reuse → `400 PASSWORD_REUSED`. Clears `mustChangePassword`, revokes every other refresh token, audits `user.change_password`. The only route (besides logout) an account with `mustChangePassword` may call: everything else answers `403 PASSWORD_CHANGE_REQUIRED` |
| POST | `/users/me/email` | `{ newEmail, currentPassword }`. The password is checked first (`400 INVALID_CURRENT_PASSWORD`), then `400 EMAIL_UNCHANGED` / `409 EMAIL_TAKEN`. Sets `pendingEmail`, stores a hashed 1-hour `EMAIL_CHANGE` action token, emails the **new** address the link and the old one a notice, audits `user.email_change_requested`. Auth rate bucket. UI hidden until an email transport exists |
| POST | `/users/me/email/resend-verification` | Re-sends the 24-hour `EMAIL_VERIFY` link for the current address; `409 ALREADY_VERIFIED` |
| POST | `/auth/confirm-email-change` | **Public**, `{ token }`: swaps the email, sets `emailVerifiedAt`, clears `pendingEmail`, revokes every session, audits `user.email_changed`, notifies the old address. Wrong/used/expired → `400 TOKEN_INVALID`; address claimed meanwhile → `409 EMAIL_TAKEN` |
| POST | `/auth/verify-email` | **Public**, `{ token }` → `emailVerifiedAt`, only for the address the link was issued to (`400 TOKEN_INVALID` otherwise) |
| GET | `/users/me/sessions` | Live refresh tokens: `{ id, createdAt, lastUsedAt, expiresAt, userAgent, ip, current }`. `ip` is the network only (IPv4 /24, IPv6 /64); `current` matches the access token's `sid` claim. Never the token itself |
| DELETE | `/users/me/sessions` | Signs out every device except the caller's (`{ revoked }`); audits `user.revoke_sessions` |
| DELETE | `/users/me/sessions/:id` | Revokes one session; another user's answers `404` |
| GET | `/users/me/rewards?page=&pageSize=` | `{ balanceCents, page, pageSize, total, ledger: [{ id, deltaCents, reason, orderId, orderNumber, createdAt }] }`, newest first. The adjusting staff member (`createdBy`) is never exposed |
| GET/POST | `/users/me/addresses` | Address book. Rows carry `isDefaultShipping`; the first address becomes the default |
| PATCH/DELETE | `/users/me/addresses/:id` | Another user's address answers `404` |
| POST | `/users/me/addresses/:id/default` | Makes it the default shipping address |
| GET/POST | `/designs` | Saved designs: `{ name, productId (code), config: { material, dimensions, finishing, quantity }, artworkFileId? }`. The config is validated against the live catalog (`MATERIAL_NOT_OFFERED`, size limits) and artwork must be the caller's own and not flagged. At most 50 per account (`409 DESIGN_QUOTA`). Rows carry `productSlug`, `productName` and a signed `previewUrl` when artwork is attached |
| GET/PATCH/DELETE | `/designs/:id` | Owner-scoped (`404` otherwise). `PATCH` renames, replaces `config`, or attaches/detaches artwork (`artworkFileId: null`) |
| POST | `/designs/:id/quote` | Re-prices the saved config through the pricing engine at today's rates: `{ designId, line: { productId, material, dimensions, finishing, quantity, artworkId }, quote }`. Never creates an order. Quote rate bucket |
| POST | `/artwork/upload` | multipart `file`, 50 MB max (`413`). Streamed to disk with a running sha256; type from magic bytes only (PDF/JPEG/PNG, else `400 UNSUPPORTED_FILE_TYPE`). Stored at `<userId>/<sha256>.<ext>`: re-uploading identical bytes reuses the stored object (new library entry, no new bytes). Per-user quota: `ARTWORK_QUOTA_BYTES` (default 2 GiB, `413 ARTWORK_STORAGE_QUOTA`) and `ARTWORK_QUOTA_FILES` live files (default 500, `409 ARTWORK_FILE_QUOTA`). Returns `{ artworkId, previewUrl (signed, 5 min), meta }` |
| GET | `/artwork/library?folderId=` | Current user's files (shipment labels excluded), each with a signed 5-minute `previewUrl` |
| GET/POST | `/artwork/folders` | |
| PATCH/DELETE | `/artwork/folders/:id` | `204`. Deleting a folder moves its files to the root |
| POST | `/artwork/:id/download-url` | `{ purpose?: "download" \| "preview" }` (default `download`) → `{ url, expiresAt }`, a 5-minute signed link. Allowed for the file's owner, holders of `artwork:read_any` (default staff; not content editors), and for a shipment label, the customer whose order it belongs to. Everyone else gets `403` |
| POST | `/orders` | Needs artwork and the five proof acknowledgements. An optional `idempotencyKey` makes replays safe. Re-priced server-side, so a changed quote fails with `QUOTE_MISMATCH` |
| GET | `/orders`, `/orders/:id` | Summaries; detail with snapshot, tracking and event timeline. Events carry `actor: "customer" \| "staff" \| "system"`, never a staff user id. `fedexTracking.labelFileId` (or null): mint the label link with `POST /artwork/:labelFileId/download-url` |
| POST | `/orders/:id/reorder` | Returns a fresh quote at current prices. Never creates an order |
| POST | `/orders/:id/cancel` | Only before payment is marked. If staff mark it paid at the same moment, one of the two wins and the other gets `409 CONFLICT` |

## Admin

Every mutation is audited, in the same transaction as the change it records. Status changes are
compare-and-set on the status that was read: a concurrent change answers `409 { code: "CONFLICT" }`
and writes nothing.

Every `/admin/*` route declares a permission (`backend/src/rbac/permissions-coverage.spec.ts` fails
otherwise). The catalog and the default role matrix live in `packages/shared/src/permissions.ts`.

| Method | Route | Permission | Notes |
|---|---|---|---|
| GET | `/admin/dashboard` | `orders:read` | The staff landing page: `buckets` (as below), `today: { since, placed, paid, shipped }` counted from the shop's local midnight (`America/New_York`; `paid` = `paymentConfirmedAt`, `shipped` = `shipment.shippedAt`), `openOrders`, `slaBreachedCount` |
| GET | `/admin/orders/buckets` | `orders:read` | Counts by status + SLA-breach counts |
| GET | `/admin/orders?status=&page=&pageSize=`, `/admin/orders/:id` | `orders:read` | Detail: each item's `artwork` has a signed 5-minute `previewUrl`; `shipment.labelFileId` for the label link |
| POST | `/admin/orders/:id/mark-paid` | `payments:mark_paid` | → `IN_PROCESSING` and earns rewards, in one transaction (status, payment status, reward ledger, user balance, order event, audit). `409 ALREADY_PAID` once recorded; of two concurrent calls one succeeds and the other gets `409 CONFLICT` (credited once); `400 INVALID_STATUS_TRANSITION` (nothing written) for cancelled/shipped orders |
| POST | `/admin/orders/:id/dropship` | `orders:dropship` | `{ externalRef, notes? }`, one per order (`409 DROPSHIP_EXISTS`, also when two submissions race) |
| POST | `/admin/orders/:id/tracking` | `orders:tracking` | multipart `trackingNumber` + optional PDF `label` (20 MB, streamed; `400 LABEL_NOT_PDF`). The label is stored at `labels/<orderId>/<sha256>.pdf`. → `ACCEPTED` |
| POST | `/admin/orders/:id/status` | `orders:hold` for `ON_HOLD`, `orders:cancel` for `CANCELLED`, else `orders:update_status` | `{ status, reason? }`. `shippedAt` / `deliveredAt` are written in the same transaction as the status change |
| POST | `/admin/orders/:id/note` | `orders:note` | `{ note }` (1–1000 chars) → a same-status `order_event` with `emailed: false` plus audit `order.note`, in one transaction. Returns the detail |
| GET | `/admin/customers?search=&page=&pageSize=` | `customers:read` | CUSTOMER-kind accounts only (staff live under `/admin/users`): `status`, `rewardsPoints`, `orderCount` |
| GET | `/admin/customers/:id` | `customers:read` | Customers only (`404` for a staff id; email works too). `user` (serialized, with `roleKey` + `permissions`), `account: { status, suspendedAt, suspendedReason, emailVerifiedAt, lastLoginAt, rewardBalanceCents, orderCount }`, `addresses`, `orders` |
| PATCH | `/admin/customers/:id` | `customers:update` | `{ firstName?, lastName?, phone? }` on the customer's behalf; audit `customer.update` with the field diff. `403 FORBIDDEN_TARGET` for staff ids |
| POST | `/admin/customers/:id/suspend`, `/reactivate` | `customers:suspend` | `{ reason }` (3–200 chars; optional on reactivate). Suspend revokes sessions (the next request is 401); `409 ALREADY_SUSPENDED` / `409 NOT_SUSPENDED`. Audit `customer.suspend` / `customer.reactivate` |
| POST | `/admin/customers/:id/reset-password` | `customers:reset_password` for CUSTOMER targets, `users:reset_password` for staff targets | Never another admin (`403 FORBIDDEN_TARGET`; use the CLI), own account allowed. Returns `{ ok: true }`; the token is only emailed |
| GET | `/admin/customers/:id/rewards?page=&pageSize=` | `rewards:read` | `{ balanceCents, ledger[] }` newest first; unlike `/users/me/rewards`, rows carry `createdBy` + `createdByEmail` (the adjusting staff member) |
| POST | `/admin/customers/:id/rewards/adjust` | `rewards:adjust` | `{ deltaCents (± integer, ≠ 0, ≤ 50 000), reason (10–200 chars) }`. One transaction: `user.rewardPointsBalance` compare-and-set with a `>= 0` guard (`409 INSUFFICIENT_BALANCE`, nothing written), `ADJUSTMENT` ledger row with `createdBy`, audit `reward.adjust` carrying the reason and before/after balance. Returns `{ balanceCents, entry }` |
| GET | `/admin/products`, `/admin/finishing-options`, `/admin/volume-tiers` | `catalog:read` | |
| POST/PATCH/DELETE | `/admin/products[/:id]` | `catalog:write` | |
| POST | `/admin/products/:id/materials`, `/admin/finishing-options` | `catalog:write` + `pricing:write` | A new row carries its price |
| PATCH | `/admin/products/:id/materials/:materialId`, `/admin/finishing-options/:id` | `pricing:write` for `ratePerSqft` / `flatPriceUsd` / `doubleSideMultiplier` / `amount` / `priceModel`; `catalog:write` for everything else; both when the patch touches both | |
| DELETE | `/admin/products/:id/materials/:materialId`, `/admin/finishing-options/:id` | `catalog:write` | |
| POST/PUT/DELETE | `/admin/volume-tiers[/:id]` | `pricing:write` | |
| GET | `/admin/content[/:key]` | `content:read` | Block types: `BANNER_IMAGE`, `TEXT`, `ANNOUNCEMENT`, `PROMO_STRIP` |
| PUT | `/admin/content/:key` | `content:edit`, plus `content:publish` when the body sets `published` | |
| DELETE | `/admin/content/:key` | `content:publish` | |
| GET | `/admin/promos?search=&active=&page=&pageSize=`, `/admin/promos/:id` | `promos:read` | Active first, newest first. `value` / `minOrder` are decimal strings (`Decimal(10,2)`), never floats. **Checkout does not apply promo codes yet** (plan §11 Q7): this is the management surface only |
| POST | `/admin/promos` | `promos:write` | `{ code (3–40 `[A-Za-z0-9_-]`, stored upper-case), type: "PERCENT" \| "FIXED", value (≤ 2 decimals; PERCENT ≤ 100 → `400 PROMO_VALUE_INVALID`), minOrder?, maxUses?, perUserLimit?, startsAt?, endsAt? (end after start → `400 PROMO_WINDOW_INVALID`), active? }`. `409 PROMO_CODE_TAKEN`. Audit `promo_code.create` |
| PATCH | `/admin/promos/:id` | `promos:write` | Any subset of the fields above; `null` clears a nullable one. The rules are re-checked against stored values. Audit `promo_code.update` with the field diff |
| DELETE | `/admin/promos/:id` | `promos:write` | Deactivates (`active: false`) and returns the row; orders keep their reference. Idempotent (audits `promo_code.deactivate` only when it changed). Reactivate with `PATCH { active: true }` |
| GET | `/admin/users?search=&status=&roleId=&page=&pageSize=` | `users:read` | Non-customer accounts: role key/name, status (`ACTIVE`/`SUSPENDED`/`INVITED`), `mustChangePassword`, override count, `lastLoginAt`, `invitedBy` |
| GET | `/admin/users/:id` | `users:read` | + effective `permissions`, pending `invite` |
| POST | `/admin/users` | `users:create` | `{ email, firstName, lastName, phone?, roleId, mode, temporaryPassword? }`. `mode: "temporary_password"` creates an ACTIVE account with `mustChangePassword: true` (password must pass the operator rules; it is never returned). `mode: "invite"` creates an INVITED account with an unusable hash and a 72-hour `ActionToken` that only goes to `EmailService` (no transport yet — the UI disables this mode). Role must be assignable by the actor (grant ceiling; `admin` needs `rbac:manage`); `409 EMAIL_TAKEN`. Audit `user.create` |
| POST | `/admin/users/:id/invite/resend` | `users:create` | INVITED accounts only (`409 NOT_INVITED`); burns prior tokens |
| PATCH | `/admin/users/:id` | `users:update` | name / phone; audit `user.update` |
| POST | `/admin/users/:id/role` | `users:update` (+ `rbac:manage` for `admin`) | `{ roleId }`. Syncs `User.role`, revokes sessions, `403 SELF_MODIFICATION`, `403 GRANT_CEILING`, `409 LAST_ADMIN`. Audit `rbac.user.role.assign` with full before/after |
| POST | `/admin/users/:id/suspend`, `/reactivate` | `users:suspend` | `{ reason }` (3–200 chars; optional on reactivate). Revokes sessions; never self; last-admin lock. Audit `user.suspend` / `user.reactivate` |
| POST | `/admin/users/:id/reset-password` | `users:reset_password` | Staff targets only; another admin stays CLI-only (`403 FORBIDDEN_TARGET`) |
| GET | `/admin/users/:id/permissions` | `rbac:read` | `{ roleKey, rolePermissions[], overrides[], effective[] }` |
| PUT | `/admin/users/:id/permissions/:key` | `rbac:manage` | `{ effect: "ALLOW" \| "DENY", reason?, expiresAt? }` upserts an override; ALLOW is subject to the grant ceiling; admins take no overrides (`403 ROLE_IMMUTABLE`); never self. Revokes the target's sessions; audit `rbac.user.permission.set` |
| DELETE | `/admin/users/:id/permissions/:key` | `rbac:manage` | Audit `rbac.user.permission.clear` |
| GET | `/admin/permissions` | `rbac:read` | The code catalog (`key`, `resource`, `action`, `description`, `elevated`) |
| GET | `/admin/roles`, `/admin/roles/:id` | `rbac:read` | Roles with sorted permission keys, `memberCount`, `isSystem`, `immutable` (`admin`, `customer`) |
| POST | `/admin/roles` | `rbac:manage` | `{ key (slug), name, description?, legacyRole: "STAFF" \| "CONTENT_EDITOR", permissions[] }`; grant ceiling; `409 ROLE_KEY_TAKEN`. Audit `rbac.role.create` |
| PATCH | `/admin/roles/:id` | `rbac:manage` | name / description; `403 ROLE_IMMUTABLE` for `admin` / `customer`. Audit `rbac.role.update` |
| PUT | `/admin/roles/:id/permissions` | `rbac:manage` | `{ permissions[] }` full replacement; the ceiling applies to additions only; members' sessions are revoked. Audit `rbac.role.permissions.set` with before/after |
| DELETE | `/admin/roles/:id` | `rbac:manage` | Custom roles only (`403 ROLE_IMMUTABLE`), and only with no members (`409 ROLE_IN_USE`). Audit `rbac.role.delete` |
| GET | `/admin/audit?actorId=&action=&entityType=&entityId=&from=&to=&page=&pageSize=` | `audit:read` | Newest first, `actorEmail` joined, `diff` as stored. `pageSize` ≤ 100 (default 50); `from` must precede `to` |
| GET | `/admin/audit/actions` | `audit:read` | Distinct action names |
