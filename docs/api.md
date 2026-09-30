# API map

NestJS API in `backend/src`, default port `3001`. Every route needs a Bearer access JWT
(HS256, 15 min, `iss` `bannersin48-api`, `aud` `bannersin48-web`, payload `sub` only) unless it
is listed under Public. `JwtAuthGuard`, `RolesGuard` and the rate limiter are global guards; a
route opts out of auth with `@Public()`. Refresh tokens are opaque, last 30 days, and rotate on
use. Controllers are authoritative. The MSW handlers in `packages/api-client/src/mocks/handlers.ts`
mirror these shapes.

## HTTP behaviour

- **CORS:** exact origins from `CORS_ORIGINS`, plus `https://bannersin48-frontend-*.vercel.app`
  when `ALLOW_PREVIEW_ORIGINS=1`. No credentials (the API sets no cookies); allowed request
  headers are `Authorization`, `Content-Type`, `Accept`, `Idempotency-Key`; preflights cached 10 min.
- **Headers:** helmet with `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
  `nosniff`, `Cross-Origin-Resource-Policy: cross-origin` (artwork previews load in `<img>` on the
  storefront). HSTS comes from Caddy, not the API.
- **Client IP:** `trust proxy` is 1 (Caddy), so audit rows and proof consent use `req.ip`.
- **Bodies:** JSON and urlencoded bodies are capped at 256 KB (`413` above that). Files use multipart.
- **Rate limits** (per client IP, per minute; `429` with `Retry-After`, or `Retry-After-auth` /
  `-quote` / `-upload` for the stricter buckets): 120 across all
  routes; 10 across register/login/refresh/forgot/reset; 30 for `POST /pricing/quote`;
  20 for `POST /artwork/upload`. `/health` is never limited.
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
| GET | `/auth/me` | Current user, or a literal `null` body when signed out (optional auth) |
| GET | `/catalog/banner`, `/catalog/banner/:slug` | Hub products and product detail |
| POST | `/pricing/quote` | Server re-prices from DB rates and persists a quote snapshot. Anonymous allowed |
| GET | `/delivery/next-cutoff` | Next order cutoff + guaranteed delivery estimate |
| GET | `/content`, `/content/:key` | Published CMS blocks only |

## Customer (auth)

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/logout` | |
| POST | `/address/validate` | US syntax normalization; returns a token signed with `ADDRESS_TOKEN_SECRET`, checked again at order time |
| GET/PATCH | `/users/me` | Profile |
| GET/POST | `/users/me/addresses` | Address book |
| PATCH/DELETE | `/users/me/addresses/:id` | |
| POST | `/artwork/upload` | multipart `file`. Magic-byte check: PDF/JPG/PNG/TIFF/EPS, 50 MB max |
| GET | `/artwork/library?folderId=` | Current user's files |
| GET/POST | `/artwork/folders` | |
| PATCH/DELETE | `/artwork/folders/:id` | Deleting a folder moves its files to the root |
| GET | `/artwork/:id/download` | Owner or staff. Bearer header, or `?access_token=` for `<img>` |
| POST | `/orders` | Needs artwork and the five proof acknowledgements. An optional `idempotencyKey` makes replays safe. Re-priced server-side, so a changed quote fails with `QUOTE_MISMATCH` |
| GET | `/orders`, `/orders/:id` | Summaries; detail with snapshot, tracking and event timeline. Events carry `actor: "customer" \| "staff" \| "system"`, never a staff user id |
| POST | `/orders/:id/reorder` | Returns a fresh quote at current prices. Never creates an order |
| POST | `/orders/:id/cancel` | Only before payment is marked |

## Admin

Every mutation is audited.

| Method | Route | Roles |
|---|---|---|
| GET | `/admin/orders/buckets` | STAFF, ADMIN. Counts by status + SLA-breach counts |
| GET | `/admin/orders?status=&page=&pageSize=`, `/admin/orders/:id` | STAFF, ADMIN |
| POST | `/admin/orders/:id/mark-paid` | STAFF, ADMIN. → `IN_PROCESSING`, earns rewards |
| POST | `/admin/orders/:id/dropship` | STAFF, ADMIN. `{ externalRef, notes? }`, one per order |
| POST | `/admin/orders/:id/tracking` | STAFF, ADMIN. multipart `trackingNumber` + optional PDF `label`. → `ACCEPTED` |
| POST | `/admin/orders/:id/status` | STAFF, ADMIN. `{ status, reason? }` |
| GET | `/admin/customers?search=`, `/admin/customers/:id` | STAFF, ADMIN |
| POST | `/admin/customers/:id/reset-password` | STAFF for CUSTOMER accounts; ADMIN also for STAFF and CONTENT_EDITOR accounts and their own. Never another ADMIN (`403 FORBIDDEN_TARGET`). Returns `{ ok: true }`; the token is only emailed |
| GET | `/admin/products`, `/admin/finishing-options`, `/admin/volume-tiers` | STAFF, ADMIN (read-only for STAFF) |
| POST/PATCH/DELETE | `/admin/products[/:id]`, `/admin/products/:id/materials[/:materialId]` | ADMIN |
| POST/PATCH/DELETE | `/admin/finishing-options[/:id]` | ADMIN |
| POST/PUT/DELETE | `/admin/volume-tiers[/:id]` | ADMIN |
| GET/PUT/DELETE | `/admin/content[/:key]` | CONTENT_EDITOR, ADMIN. Block types: `BANNER_IMAGE`, `TEXT`, `ANNOUNCEMENT`, `PROMO_STRIP` |
