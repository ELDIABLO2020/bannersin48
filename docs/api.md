# API map

NestJS API in `backend/src`, default port `3001`. Routes marked **auth** need a Bearer access
JWT (15 min). Refresh tokens are opaque, last 30 days, and rotate on use. Controllers are
authoritative. The MSW handlers in `packages/api-client/src/mocks/handlers.ts` mirror these shapes.

## Public

| Method | Route | Notes |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/auth/register`, `/auth/login` | Returns `{ user, token, refreshToken }` |
| POST | `/auth/refresh` | Rotates the refresh token |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Always 200 (no account enumeration) |
| GET | `/auth/me` | Current user, or a literal `null` body when signed out |
| GET | `/catalog/banner`, `/catalog/banner/:slug` | Hub products and product detail |
| POST | `/pricing/quote` | Server re-prices from DB rates and persists a quote snapshot. Anonymous allowed |
| GET | `/delivery/next-cutoff` | Next order cutoff + guaranteed delivery estimate |
| POST | `/address/validate` | US syntax normalization; returns a signed token checked again at order time |
| GET | `/content`, `/content/:key` | Published CMS blocks only |

## Customer (auth)

| Method | Route | Notes |
|---|---|---|
| POST | `/auth/logout` | |
| GET/PATCH | `/users/me` | Profile |
| GET/POST | `/users/me/addresses` | Address book |
| PATCH/DELETE | `/users/me/addresses/:id` | |
| POST | `/artwork/upload` | multipart `file`. Magic-byte check: PDF/JPG/PNG/TIFF/EPS, 50 MB max |
| GET | `/artwork/library?folderId=` | Current user's files |
| GET/POST | `/artwork/folders` | |
| PATCH/DELETE | `/artwork/folders/:id` | Deleting a folder moves its files to the root |
| GET | `/artwork/:id/download` | Owner or staff. Bearer header, or `?access_token=` for `<img>` |
| POST | `/orders` | Needs artwork and the five proof acknowledgements. An optional `idempotencyKey` makes replays safe. Re-priced server-side, so a changed quote fails with `QUOTE_MISMATCH` |
| GET | `/orders`, `/orders/:id` | Summaries; detail with snapshot, tracking and event timeline |
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
| POST | `/admin/customers/:id/reset-password` | STAFF, ADMIN |
| GET | `/admin/products`, `/admin/finishing-options`, `/admin/volume-tiers` | STAFF, ADMIN (read-only for STAFF) |
| POST/PATCH/DELETE | `/admin/products[/:id]`, `/admin/products/:id/materials[/:materialId]` | ADMIN |
| POST/PATCH/DELETE | `/admin/finishing-options[/:id]` | ADMIN |
| POST/PUT/DELETE | `/admin/volume-tiers[/:id]` | ADMIN |
| GET/PUT/DELETE | `/admin/content[/:key]` | CONTENT_EDITOR, ADMIN. Block types: `BANNER_IMAGE`, `TEXT`, `ANNOUNCEMENT`, `PROMO_STRIP` |
