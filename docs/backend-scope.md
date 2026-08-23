# Backend, Dashboard & Database Scope — Banners In 48

Status: DRAFT for review · Created from founder Q&A session
Frontend is source of truth for UX flows; MSW handlers in `packages/api-client/src/mocks/handlers.ts` define the API contract this backend must implement.

---

## 0. Operating model (as decided)

1. Customer builds banner online → server-side quote (source of truth) → account required → order placed.
2. **Payments deferred** (V1 is an extensive platform-testing phase): orders enter as `PENDING_PAYMENT`; **staff marking payment received is the gate** that releases an order to drop-ship submission. Provider integration comes post-V1.
3. Staff duplicates the order manually on the drop shipper's website → drop shipper generates FedEx label immediately → staff records tracking number + uploads label PDF.
4. Customer is emailed at each transition: paid → accepted/submitted-to-drop-shipper (with tracking + label copy) → shipped → delivered (via FedEx Tracking API webhook, phase 2).
5. Artwork lives in S3 with server-side validation, **retained 6 months** (S3 lifecycle expiry). Proofs: customer self-confirms via liability checkbox (versioned consent text + timestamp + IP). Formal proof-versioning deferred.
6. **Sales tax deferred to end of V1** — business is Michigan-registered; MI nexus only when tax work begins. No drop-shipper API exists; fulfillment status capture stays manual in the staff workspace.
7. Rewards: **$1 credit per $100 spent** (1%), tracked as a dollar ledger from day one.
6. Scale target: 1/day → ~10/day (month 4) → 20–25/day (year 1). Design for 100× headroom, build for simplicity.

---

## 1. Backend scope (NestJS modular monolith)

Modules in suggested build order. Every module owns its tables; cross-module access goes through services.

| # | Module | Responsibilities |
|---|--------|------------------|
| 1 | **Auth** | Email/password (bcrypt), JWT access + refresh tokens, email verification, password reset tokens, login throttling. Roles seeded: `CUSTOMER`, `STAFF`, `ADMIN` |
| 2 | **Users & Addresses** | Profiles, address book (validated via address validation service), admin-initiated password reset |
| 3 | **Catalog & Pricing** | Products, materials, finishing options, volume tiers, size rules (min/max per axis, shorter-side caps) — all DB-driven. `POST /pricing/quote` recomputes from DB using the shared pricing engine (`packages/shared`) — never trusts client math |
| 4 | **Quotes** | Persisted quote snapshots (request + breakdown JSONB, totals, expiry). Cart references a quote per line |
| 5 | **Cart & Saved Designs** | Active cart per user; "unfinished orders" = named saved designs (builder config snapshots) surfaced in customer dashboard |
| 6 | **Orders** | Create from cart (snapshot everything — prices, config, ship address), status machine, status history, cancellation rules, one-time reorder |
| 7 | **Artwork** | S3 pre-signed uploads, server-side validation (MIME sniff, allow-list jpg/jpeg/pdf/tiff/tif/eps/png, DPI check, size caps), virus scan hook (ClamAV lambda, phase 2), folders/library, per-user quota, **6-month lifecycle expiry** |
| 8 | **Fulfillment** (internal) | The staff workspace backing: mark paid, record drop-shipper submission (ref #, submitted-by, timestamp), attach tracking number + label PDF, trigger customer email |
| 9 | **Shipping & Tracking** | Phase 1: label file + tracking number storage, deep link to FedEx tracking. Phase 2: FedEx Tracking API webhooks → automatic shipped/delivered transitions + emails. Drop shipper confirmed: no API/CSV/webhook — manual capture in the fulfillment workspace is the permanent V1 flow |
| 10 | **Tax** *(deferred to end of V1)* | TaxJar (or Avalara) API integration when activated: real-time estimate at quote/checkout, persisted on order. No local rate tables ever. Michigan nexus first; expansion per accountant guidance |
| 11 | **Promotions & Rewards (minimal)** | Percentage/fixed promo codes with limits/expiry; rewards ledger in **dollars — $1 per $100 spent**, earned automatically on paid orders; redemption via admin/support only in V1 |
| 12 | **Notifications** | Transactional email via **Amazon SES** with template registry; per-event preferences; full outbound email log. Marketing automation (Klaviyo or similar) deliberately deferred until post-launch marketing begins |
| 13 | **CMS / Site Content** | Keyed content blocks (JSON) powering homepage/banner imagery, promo strips, announcements — editable from admin panel |
| 14 | **Admin & RBAC** | Guarded admin routes, permission checks per role, audit log of every staff/admin mutation |
| 15 | **Worker (BullMQ)** | Email dispatch, artwork validation pipeline, FedEx tracking polls (phase 1) / webhook ingestion (phase 2), nightly reward accrual, quote cleanup |

**Non-goals (V1):** B2B/reseller accounts, formal proof versioning, payment provider integration, automated drop-shipper submission, multi-currency.

---

## 2. Customer dashboard scope

Existing pages to back with real APIs, plus additions (marked ➕):

| Feature | Notes |
|---|---|
| Order history + status timeline | Per-order event feed (placed, paid, accepted, shipped, delivered) |
| Live order tracking | Tracking number deep-link + label PDF download |
| Unfinished orders / saved designs | Named builder-config snapshots; resume builder with one click |
| Media library | Reuse uploaded artwork in new orders; folders |
| Quick reorder | One click → prior order config into cart at *current* prices |
| ➕ Address book | Multiple ship-to addresses, validated |
| ➕ Promotions available to me | Eligible/active codes visible in dashboard |
| Rewards points balance | Earn history (V1: redemption via admin/support only) |
| ➕ Notification preferences | Per-event email opt-in/out |
| Account settings | Password change, contact info |

➕ **Quick order button** (requested): shortcut form — pick product, size, material → straight to cart with defaults. Feeds the "reuse" goal.

---

## 3. Admin dashboard scope ("full-fledged")

### 3a. Operations home
- **Order buckets** (kanban-style counts + filtered lists): New / Awaiting payment / Paid–in processing / Submitted to drop shipper / Shipped / Delivered / On hold / Cancelled
- SLA flags: orders breaching the 48-business-hour promise highlighted

### 3b. Fulfillment workspace (the core staff screen)
For each paid order: full config readout, artwork previews/downloads, checklist flow —
1. Mark payment received (manual, until provider lands)
2. Record drop-shipper submission (their order ref, submitted-by, timestamp)
3. Attach FedEx tracking number + upload label PDF → fires "accepted + tracking" email automatically
4. Later transitions: shipped/delivered (auto once FedEx webhooks land; manual toggle until then)

### 3c. Pricing control
- CRUD on products, materials ($/sqft + flat), finishing adders (per-ft / flat / per-edge), volume-tier tables, size rule min/maxes
- All changes audited (who/when/old→new); effective immediately for new quotes (existing orders keep snapshots)

### 3d. Content management
- Upload/replace homepage + landing banner images, edit promo strip text, toggle announcements — backed by the CMS content blocks

### 3e. Customers & access
- Customer search, profile view, order history, admin password reset
- Admin user management with privilege levels: `ADMIN` (everything incl. staff + pricing), `STAFF` (fulfillment + customer lookup, read-only pricing), optional `CONTENT_EDITOR`
- Impersonate-for-support: view-as-customer, heavily audited (phase 2)

### 3f. Marketing & misc
- Promo code CRUD, rewards adjustments, exports (orders/customers CSV), basic reports (revenue by day/product, avg order value)

---

## 4. Database schema (Postgres / Prisma)

Snapshots everywhere: orders never join against catalog tables for money math.

### Identity & accounts
```
users              id, email(uq), password_hash, first_name, last_name, phone,
                   role(CUSTOMER|STAFF|ADMIN|CONTENT_EDITOR), status(ACTIVE|SUSPENDED),
                   email_verified_at, reward_points_balance(denormalized), timestamps
refresh_tokens     id, user_id, token_hash, expires_at, revoked_at, user_agent, ip
password_resets    id, user_id, token_hash, expires_at, used_at, requested_by(admin?)
addresses          id, user_id, label, line1, line2, city, state, zip, country,
                   validated(bool), is_default_shipping
audit_log          id, actor_id, action, entity_type, entity_id, diff(jsonb), ip, created_at
```

### Catalog & pricing (admin-editable)
```
products             id, slug(uq), name, active, size_mode(CUSTOM|FIXED),
                     fixed_w_in, fixed_h_in, min/max dims, short_side_max,
                     production_hours, display config(jsonb), sort
product_materials    id, product_id, code, name, rate_per_sqft, flat_price_usd,
                     double_side_multiplier, active, sort
finishing_options    id, code(welding|webbing|rope|grommets|pole_pockets|wind_slits),
                     products jsonb[], price_model(PER_FT|FLAT|PER_EDGE|FREE), amount
volume_tiers         id, product_id, material_code(nullable), min_billable_sqft,
                     rates(jsonb), warning_copy
promo_codes          id, code(uq), type(PERCENT|FIXED), value, min_order, max_uses,
                     per_user_limit, times_used, starts_at, ends_at, active
reward_ledger        id, user_id, delta(+/-), reason(ORDER_EARN|ADJUSTMENT|REDEMPTION),
                     order_id, created_by, created_at
```

### Selling
```
quotes             id, user_id, request(jsonb), breakdown(jsonb), subtotal, discount,
                   tax, total, valid_until, created_at
carts              id, user_id(uq active), updated_at
cart_items         id, cart_id, product_id, qty, quote_id, artwork_file_id, finishings(jsonb)
saved_designs      id, user_id, name, product_id, config(jsonb), artwork_file_id, updated_at
artwork_folders    id, user_id, name
artwork_files      id, user_id, folder_id, s3_key, s3_bucket, original_filename,
                   mime, bytes, sha256, width_px, height_px, dpi_report(jsonb),
                   scan_status(PENDING|CLEAN|FLAGGED), deleted_at
```

### Orders & fulfillment
```
orders               id, number(human uq), user_id, status(RECEIVED|AWAITING_PAYMENT|
                     IN_PROCESSING|ACCEPTED|SHIPPED|DELIVERED|ON_HOLD|CANCELLED),
                     payment_status(PENDING_PAYMENT|MARKED_PAID|PAID|REFUNDED),
                     promo_code_id, reward_points_earned,
                     subtotal, discount_amount, tax_amount, shipping_amount, total,
                     currency(USD), ship_address(jsonb snapshot),
                     proof_confirmed_at, proof_consent_text_version, proof_confirm_ip,
                     placed_at, cancelled_at, cancel_reason, timestamps
order_items          id, order_id, product_id, product_slug(snapshot), description,
                     qty, width_in, height_in, billable_sqft, material_code,
                     print_sides, finishings(jsonb), unit_price, line_total,
                     artwork_file_id, config_snapshot(jsonb)
order_events         id, order_id, from_status, to_status, actor_id(null=system),
                     note, emailed(bool), created_at
dropship_submissions id, order_id(uq), external_ref, submitted_by(user_id),
                     submitted_at, notes
shipments            id, order_id, carrier(FEDEX), tracking_number,
                     label_file_id(→artwork_files or dedicated file store),
                     shipped_at, delivered_at, tracking_events(jsonb), updated_at
tax_records          id, order_id(uq), provider(TAXJAR), provider_txn_id,
                     rate, amount, jurisdiction_breakdown(jsonb)
```

### Platform
```
site_content       key(uq), block_type(BANNER_IMAGE|TEXT|ANNOUNCEMENT|PROMO_STRIP),
                   payload(jsonb), published(bool), updated_by, updated_at
email_log          id, to_email, template, order_id, provider_message_id,
                   status(QUEUED|SENT|FAILED), payload(jsonb), sent_at
tracking_jobs      id, shipment_id, next_poll_at, last_status   -- worker bookkeeping
```

Key constraints/decisions:
- **Money as integers (cents)** or Prisma `Decimal` — never floats.
- Status machine enforced in service layer; every transition writes `order_events` (this powers both dashboards' timelines).
- `proof_*` columns exist now even though proofing UI is deferred — the liability checkbox writes here.
- Rewards balance denormalized on `users` + authoritative ledger rows (recomputed nightly as drift check).

---

## 5. Infrastructure & deployment (AWS-native — decided)

| Concern | AWS service | Notes |
|---|---|---|
| API hosting | **ECS Fargate** service `api` | NestJS container from ECR; ALB + ACM cert; autoscaling ready |
| Worker | **ECS Fargate** service `worker` | Same image, different entrypoint; BullMQ consumer + cron |
| Database | **RDS PostgreSQL** | Automated backups/PITR; start single-AZ small instance, Multi-AZ when revenue justifies |
| Queue/cache | **ElastiCache Redis** (smallest node) | BullMQ + rate limiting |
| Artwork files | **S3** + CloudFront (OAC, signed URLs) | 6-month lifecycle expiry rule |
| Transactional email | **SES** | Domain verification (DKIM), templates, bounce/complaint webhooks → `email_log` |
| DNS/TLS | **Route 53** + ACM | Zone for bannersin48 domain |
| Secrets/config | **SSM Parameter Store** | JWT secret, DB URL, S3 keys; no secrets in images |
| Container registry | **ECR** | One repo, immutable tags |
| Errors/monitoring | Sentry (SaaS) + CloudWatch alarms + billing alarm | Billing alarm ~$150/mo as runaway guard |
| CI/CD | GitHub Actions → ECR → ECS deploy | Staging on merge to main; prod on version tag |
| IaC | **Terraform** in `infra/` | Entire stack reproducible; staging + prod workspaces |
| Frontend | **Stays on Vercel** for V1 | Free at this traffic; move to Amplify only if needed later |
| Analytics | GA4 client-side | Unchanged |

Cost estimate at V1 volume: **~$60–90/month**. Avoid NAT Gateway at this scale (public subnets + task public IPs, DB/cache in private subnets reachable via security groups).

Environments: local (docker-compose Postgres/Redis, already scaffolded) → AWS staging → AWS prod. Seed script creates admin user, catalog from `packages/shared` rates, sample content.

---

## 6. Implementation roadmap

**Phase 0 — Backend foundation (starts immediately, no AWS needed)**
Local-only against docker-compose. Prisma schema for all §4 tables + migrations + seed; NestJS module scaffolding; Auth (register/login/JWT/reset); Users & addresses; Catalog & pricing module with DB-driven rules; real `POST /pricing/quote` (server recomputes via `packages/shared` engine, never trusts client math); Quotes persistence. MSW handlers stay until each endpoint goes live, then frontend flips over one by one.

**Phase 1 — AWS bootstrap (needs account access)**
Terraform: VPC/subnets/security groups, ECR, ECS cluster + `api`/`worker` services, RDS, ElastiCache, S3 (+lifecycle), CloudFront, Route 53 zone + ACM certs, SSM parameters, SES domain verification, billing alarm. GitHub Actions OIDC deploy role. Staging environment end-to-end.

**Phase 2 — Commerce loop**
Carts & saved designs; order creation from cart (full snapshots, payment-status modeling, promo hooks); order events + status machine; customer orders/dashboard endpoints; artwork upload pipeline (pre-signed S3, server-side validation); SES transactional emails wired to order events.

**Phase 3 — Operations (admin)**
RBAC guards; order buckets + fulfillment workspace APIs (mark-paid → drop-shipper submission → tracking number + label PDF → customer email); CMS content blocks; pricing CRUD with audit log; customer management + admin password reset.

**Phase 4 — Growth layer**
Promo codes; rewards ledger ($1 per $100 spent, earned on paid orders); FedEx Tracking API webhook ingestion (auto shipped/delivered); CSV exports + basic reports; frontend admin dashboard build-out against these APIs.

**Later (post-V1):** payment provider, sales tax activation (TaxJar/Avalara, MI nexus first), proof versioning, marketing automation platform, impersonation, saved-design sharing.

---

## 7. Decisions log (all resolved)

1. Payment gate while manual: staff "mark paid" releases order to drop-ship submission ✅
2. Tax: deferred to end of V1; Michigan nexus first; TaxJar/Avalara when activated ✅
3. Drop shipper: no API/CSV/webhook — manual fulfillment workspace is the permanent V1 flow ✅
4. Artwork retention: 6 months, S3 lifecycle ✅
5. Rewards: $1 credit per $100 spent, dollar ledger, earn-on-paid-order, redemption via admin in V1 ✅
6. Infrastructure: all-AWS backend (ECS Fargate / RDS / ElastiCache / S3+CloudFront / SES / Route 53), Terraform-managed ✅
7. Email: SES replaces Resend; Klaviyo deferred until marketing begins ✅
8. Frontend stays on Vercel for V1 ✅

---

## Phase 0 implementation notes (deviations & clarifications)

Everything above is the authoritative plan; these are Phase 0 implementation decisions made while building it.

1. **Pricing math source of truth.** `POST /pricing/quote` validates the request against DB-driven catalog rules (active product, material offered on that product, size limits stored on `product`), then recomputes all math by calling the shared engine (`priceOrder` in `@bannersin48/shared`). The engine currently reads rates from shared constants; the DB is seeded **from those same constants** so they cannot drift at Phase 0. When admin pricing CRUD lands (Phase 3), the quote service should pass DB-loaded rates into the engine (small refactor: make rates a parameter of `priceLine`).
2. **Table naming.** Prisma models are mapped to snake_case tables (`@@map`), matching §4 naming. Column names remain camelCase (Prisma default) — fine because all access goes through Prisma Client.
3. **Money.** Catalog/order/quote money columns are Prisma `Decimal(12,2)`; the reward ledger uses integer **cents** (`deltaCents`) per the "never floats" rule, with `users.rewardPointsBalance` keeping the denormalized integer points value the frontend already renders.
4. **Finishing price models.** §4 lists `PER_FT|FLAT|PER_EDGE|FREE`, but rope / wind slits / pole pockets are charged **per billable sqft** by the engine, so the enum adds `PER_SQFT`. Webbing uses `PER_FT` (per billable width-ft per edge).
5. **Quotes are anonymous-allowed.** `quotes.user_id` is nullable: the public builder quotes before login; carts attach quotes at checkout (no guest checkout — that rule is untouched).
6. **Auth contract.** Register/login responses match the MSW shapes (`{ user, token, ... }`); the real API adds `refreshToken` alongside `token`. `GET /auth/me` returns the literal JSON `null` body with HTTP 200 when unauthenticated (Nest maps a null return to an empty body, so the controller sends it explicitly). Access JWT: 15 min; refresh token: opaque 48-byte random, stored sha256-hashed, 30-day expiry, rotated on use. Login throttle: in-memory, 5 failures → 15-minute lock per email (swap for Redis-based limiting when multi-instance).
7. **Password reset emails.** Phase 0 logs the reset token to the server console (dev only); SES delivery replaces this in Phase 2 per §1.12.
8. **Catalog visibility.** `products.displayConfig.inHub` mirrors the shared `BANNER_HUB_ORDER`; `GET /catalog/banner` returns only hub products (Retractable is orderable but not listed), matching the MSW handler.
9. **Port convention.** The API listens on `PORT` from env, default **3001** — the MSW contract base URL. `backend/.env.example` was updated from 3000 to 3001 to avoid colliding with the Next.js dev server.
10. **Seed admin.** `prisma/seed.ts` upserts `admin@bannersin48.local` / `ChangeMe123!` (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`). Re-running the seed never clobbers an existing password.
11. **Volume tiers.** Seeded as one sample tier (HD Banner 100+ billable sqft, ~10% off vinyl rates). The quote engine does not apply tier discounts yet — wiring them in is part of Phase 3 pricing CRUD.

## Stages A–F implementation notes (commerce + admin, local-only)

12. **Local artwork storage abstraction.** `StorageService` owns opaque object keys and delegates to `LocalStorageDriver` (`STORAGE_DRIVER=local`, `LOCAL_STORAGE_DIR=./storage`). Files are never statically exposed; `/artwork/:id/download` checks ownership/role. Browser-native previews may pass the same short-lived access JWT as `?access_token=` because `<img>` cannot set an Authorization header. The Phase 1 S3 driver implements the same `put/get/delete` interface.
13. **Artwork validation.** Uploads use Multer memory storage, a 50 MB cap, sha256, and server magic-byte detection for JPEG/PNG/PDF/TIFF/EPS. Client MIME/extension is ignored. Pixel dimensions and DPI are best-effort (PNG pHYs, JPEG JFIF/SOF, TIFF IFD; PDF/EPS point bounds). New artwork rows remain `PENDING` for the future malware scanner. Shipment-label uploads must also sniff as PDF.
14. **Initial order status.** A newly placed order is `RECEIVED` with `paymentStatus=PENDING_PAYMENT`; the payment field is the gate. `AWAITING_PAYMENT` remains supported by the status machine for future provider flows. Staff mark-paid moves `RECEIVED|AWAITING_PAYMENT|ON_HOLD → IN_PROCESSING`.
15. **Proof consent at checkout.** `POST /orders` requires all five acknowledgement booleans. It writes `proofConfirmedAt`, request IP, and consent version `v1-2026-08`. The old mock-only post-checkout proof route is bypassed by the real checkout.
16. **Order numbers and snapshots.** A Postgres `order_number_seq` generates `BI48-000001` numbers. Order/item rows snapshot request config, display names, per-line pricing output, current DB rates, address, artwork references, and guaranteed-delivery estimate. Existing orders never rejoin catalog rows for money.
17. **SLA definition.** The V1 SLA flag is `placedAt + 48 business hours`, where business hours advance continuously Monday–Friday and pause on weekends. Holidays and per-day opening windows are intentionally deferred.
18. **Timeline activity events.** Real status changes go through `OrdersService.transition` and always write `order_events`. Checklist activity that does not change status (for example recording the drop-ship reference) writes a same-status event (`fromStatus == toStatus`) so both dashboards retain the complete trail.
19. **Rewards on mark-paid.** The locked 1% rule is applied once at mark-paid. Total spend is converted to integer cents; `floor(totalCents / 100)` is written as `reward_ledger.deltaCents`, `orders.rewardPointsEarned`, and atomically increments `users.rewardPointsBalance`. Thus a $95.50 order earns 95 cents; fractional reward cents are floored.
20. **Transactional email in local V1.** Fulfillment transitions call `EmailService`; the local transport logs to console and writes `email_log` with `SENT`. Email failures never roll back fulfillment. SES replaces only this transport in Phase 1.
21. **DB-driven pricing.** The shared `priceLine`/`priceOrder` engine accepts optional `PricingRates`; defaults preserve existing shared-package behavior. Backend `PricingEngineService` loads active product-material, finishing, fixed, and applicable highest-threshold volume-tier rates from Postgres for both quotes and order creation. Admin rate changes affect the next quote immediately; existing orders remain unchanged.
22. **Role matrix.** ADMIN has all permissions; STAFF has fulfillment, customer management, and read-only pricing; CONTENT_EDITOR has CMS only; CUSTOMER has no `/admin/*` access. The frontend admin shell hides inaccessible sections, but Nest `JwtAuthGuard + RolesGuard` is authoritative on every route.
23. **Admin frontend auth gate.** The existing browser auth model stores the access JWT in localStorage, so Next middleware cannot securely read it. `/admin` uses a role-aware client layout while every API call is server-enforced. Moving auth to httpOnly cookies later permits a middleware redirect without changing admin APIs.
24. **Password-reset development response.** Admin resets persist only the sha256 token hash and set `requestedBy`; local development returns the raw token for testing and logs an email row. Remove `devResetToken` when SES links are live.
25. **API documentation.** `docs/commerce-admin-api.md` is the concise endpoint/role map for Stages A–E.
