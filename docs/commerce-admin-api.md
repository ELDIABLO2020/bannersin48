# Commerce + Admin API map (local V1)

All `/orders`, `/artwork`, and `/admin/*` routes require a Bearer access JWT. Admin routes are additionally role-guarded.

## Customer commerce

| Method | Route | Notes |
|---|---|---|
| POST | `/artwork/upload` | multipart `file`; magic-byte validation; PDF/JPG/PNG/TIFF/EPS, 50 MB |
| GET | `/artwork/library?folderId=` | Current user's files, MSW-compatible list shape |
| GET/POST | `/artwork/folders` | List/create folders |
| PATCH/DELETE | `/artwork/folders/:id` | Rename/delete; deleting moves files to root |
| GET | `/artwork/:id/download` | Owner/staff; Bearer header or `access_token` query param |
| POST | `/orders` | Required account + five proof acknowledgements; server re-prices current DB rates |
| GET | `/orders` | Current user's order summaries |
| GET | `/orders/:id` | Current user's snapshot, tracking, and event timeline |
| POST | `/orders/:id/cancel` | Only before payment is marked |

## Admin operations (STAFF + ADMIN)

| Method | Route | Notes |
|---|---|---|
| GET | `/admin/orders/buckets` | Counts by status + breached 48-business-hour counts |
| GET | `/admin/orders?status=&page=&pageSize=` | Filtered paginated list |
| GET | `/admin/orders/:id` | Fulfillment workspace detail |
| POST | `/admin/orders/:id/mark-paid` | `MARKED_PAID` → `IN_PROCESSING`; earns 1% rewards |
| POST | `/admin/orders/:id/dropship` | `{ externalRef, notes? }`; one per order |
| POST | `/admin/orders/:id/tracking` | multipart `trackingNumber` + optional PDF `label`; → `ACCEPTED` |
| POST | `/admin/orders/:id/status` | `{ status, reason? }`; shipped/delivered/on-hold/cancelled/release hold |
| GET | `/admin/customers?search=` | Customer search (STAFF + ADMIN) |
| GET | `/admin/customers/:id` | Profile, addresses, order history |
| POST | `/admin/customers/:id/reset-password` | Admin/staff initiated reset; `requestedBy` persisted |

## Pricing control

GET routes are STAFF read-only; mutations are ADMIN-only.

| Method | Route |
|---|---|
| GET/POST/PATCH/DELETE | `/admin/products` / `/admin/products/:id` |
| POST/PATCH/DELETE | `/admin/products/:id/materials` / `.../materials/:materialId` |
| GET/POST/PATCH/DELETE | `/admin/finishing-options` / `/admin/finishing-options/:id` |
| GET/POST/PUT/DELETE | `/admin/volume-tiers` / `/admin/volume-tiers/:id` |

Referenced materials return `409 IN_USE` on delete and must be deactivated. Every mutation writes `audit_log` with an old→new diff.

## CMS

| Method | Route | Role |
|---|---|---|
| GET | `/content` / `/content/:key` | Public; published blocks only |
| GET/PUT/DELETE | `/admin/content` / `/admin/content/:key` | CONTENT_EDITOR + ADMIN |

Supported block types: `BANNER_IMAGE`, `TEXT`, `ANNOUNCEMENT`, `PROMO_STRIP`.
