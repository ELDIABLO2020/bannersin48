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
- **Tokens never go in URLs.** Only the `Authorization: Bearer` header is read (`?access_token=` is
  ignored). Artwork and label files are fetched through short-lived signed links instead (below).
- **Client IP:** `trust proxy` is 1 (Caddy), so audit rows and proof consent use `req.ip`.
- **Bodies:** JSON and urlencoded bodies are capped at 256 KB (`413` above that). Files use multipart
  and are streamed to disk (`$LOCAL_STORAGE_DIR/.incoming`, then renamed into place); they are never
  buffered in memory. At most `UPLOAD_MAX_CONCURRENCY` (default 4) uploads run at once per process;
  beyond that uploads answer `503 { code: "UPLOADS_BUSY" }` with `Retry-After: 5`.
- **Rate limits** (per client IP, per minute; `429` with `Retry-After`, or `Retry-After-auth` /
  `-quote` / `-upload` / `-download` for the other buckets): 120 across all
  routes; 10 across register/login/refresh/forgot/reset; 30 for `POST /pricing/quote`;
  20 for `POST /artwork/upload`. Signed file links (`GET /artwork/:id/file`) have their own
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
| GET | `/auth/me` | Current user, or a literal `null` body when signed out (optional auth) |
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
| GET/PATCH | `/users/me` | Profile |
| GET/POST | `/users/me/addresses` | Address book |
| PATCH/DELETE | `/users/me/addresses/:id` | |
| POST | `/artwork/upload` | multipart `file`, 50 MB max (`413`). Streamed to disk with a running sha256; type from magic bytes only (PDF/JPEG/PNG, else `400 UNSUPPORTED_FILE_TYPE`). Stored at `<userId>/<sha256>.<ext>`: re-uploading identical bytes reuses the stored object (new library entry, no new bytes). Per-user quota: `ARTWORK_QUOTA_BYTES` (default 2 GiB, `413 ARTWORK_STORAGE_QUOTA`) and `ARTWORK_QUOTA_FILES` live files (default 500, `409 ARTWORK_FILE_QUOTA`). Returns `{ artworkId, previewUrl (signed, 5 min), meta }` |
| GET | `/artwork/library?folderId=` | Current user's files (shipment labels excluded), each with a signed 5-minute `previewUrl` |
| GET/POST | `/artwork/folders` | |
| PATCH/DELETE | `/artwork/folders/:id` | Deleting a folder moves its files to the root |
| POST | `/artwork/:id/download-url` | `{ purpose?: "download" \| "preview" }` (default `download`) → `{ url, expiresAt }`, a 5-minute signed link. Allowed for the file's owner, STAFF and ADMIN, and for a shipment label, the customer whose order it belongs to. CONTENT_EDITOR and other customers get `403` |
| POST | `/orders` | Needs artwork and the five proof acknowledgements. An optional `idempotencyKey` makes replays safe. Re-priced server-side, so a changed quote fails with `QUOTE_MISMATCH` |
| GET | `/orders`, `/orders/:id` | Summaries; detail with snapshot, tracking and event timeline. Events carry `actor: "customer" \| "staff" \| "system"`, never a staff user id. `fedexTracking.labelFileId` (or null): mint the label link with `POST /artwork/:labelFileId/download-url` |
| POST | `/orders/:id/reorder` | Returns a fresh quote at current prices. Never creates an order |
| POST | `/orders/:id/cancel` | Only before payment is marked. If staff mark it paid at the same moment, one of the two wins and the other gets `409 CONFLICT` |

## Admin

Every mutation is audited, in the same transaction as the change it records. Status changes are
compare-and-set on the status that was read: a concurrent change answers `409 { code: "CONFLICT" }`
and writes nothing.

| Method | Route | Roles |
|---|---|---|
| GET | `/admin/orders/buckets` | STAFF, ADMIN. Counts by status + SLA-breach counts |
| GET | `/admin/orders?status=&page=&pageSize=`, `/admin/orders/:id` | STAFF, ADMIN. Detail: each item's `artwork` has a signed 5-minute `previewUrl`; `shipment.labelFileId` for the label link |
| POST | `/admin/orders/:id/mark-paid` | STAFF, ADMIN. → `IN_PROCESSING` and earns rewards, in one transaction (status, payment status, reward ledger, user balance, order event, audit). `409 ALREADY_PAID` once recorded; of two concurrent calls one succeeds and the other gets `409 CONFLICT` (credited once); `400 INVALID_STATUS_TRANSITION` (nothing written) for cancelled/shipped orders |
| POST | `/admin/orders/:id/dropship` | STAFF, ADMIN. `{ externalRef, notes? }`, one per order (`409 DROPSHIP_EXISTS`, also when two submissions race) |
| POST | `/admin/orders/:id/tracking` | STAFF, ADMIN. multipart `trackingNumber` + optional PDF `label` (20 MB, streamed; `400 LABEL_NOT_PDF`). The label is stored at `labels/<orderId>/<sha256>.pdf`. → `ACCEPTED` |
| POST | `/admin/orders/:id/status` | STAFF, ADMIN. `{ status, reason? }`. `shippedAt` / `deliveredAt` are written in the same transaction as the status change |
| GET | `/admin/customers?search=`, `/admin/customers/:id` | STAFF, ADMIN |
| POST | `/admin/customers/:id/reset-password` | STAFF for CUSTOMER accounts; ADMIN also for STAFF and CONTENT_EDITOR accounts and their own. Never another ADMIN (`403 FORBIDDEN_TARGET`). Returns `{ ok: true }`; the token is only emailed |
| GET | `/admin/products`, `/admin/finishing-options`, `/admin/volume-tiers` | STAFF, ADMIN (read-only for STAFF) |
| POST/PATCH/DELETE | `/admin/products[/:id]`, `/admin/products/:id/materials[/:materialId]` | ADMIN |
| POST/PATCH/DELETE | `/admin/finishing-options[/:id]` | ADMIN |
| POST/PUT/DELETE | `/admin/volume-tiers[/:id]` | ADMIN |
| GET/PUT/DELETE | `/admin/content[/:key]` | CONTENT_EDITOR, ADMIN. Block types: `BANNER_IMAGE`, `TEXT`, `ANNOUNCEMENT`, `PROMO_STRIP` |
