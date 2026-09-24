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
7. **Proof:** the customer self-confirms at checkout with five acknowledgements. The server stores the
   timestamp, IP and consent version. There is no proof-versioning workflow.
8. **SLA:** `placedAt + 48 business hours`, counted Monday to Friday. Holidays are not modelled.
9. USA/USD only. The app runs in `NEXT_PUBLIC_COMMERCE_MODE=internal_manual`, which is noindex.
   `public_live` is build-gated. It requires live payment and tax, plus approved policy URLs.

## Order status machine

`backend/src/orders/status-machine.ts` is authoritative. Every transition writes an
`order_events` row. Activity that doesn't change status, such as recording a drop-ship
reference, writes a same-status event.

```
RECEIVED | AWAITING_PAYMENT → IN_PROCESSING → ACCEPTED → SHIPPED → DELIVERED
any pre-ship state → ON_HOLD | CANCELLED; ON_HOLD → IN_PROCESSING | ACCEPTED | CANCELLED
```

Customers may cancel only before payment is marked (`RECEIVED`, `AWAITING_PAYMENT`).

## Roles

| Role | Access |
|---|---|
| `CUSTOMER` | Own account, artwork, and orders. No `/admin/*` |
| `STAFF` | Fulfillment, customer management, read-only pricing |
| `CONTENT_EDITOR` | CMS content blocks only |
| `ADMIN` | Everything |

`JwtAuthGuard` + `RolesGuard` on every Nest route are authoritative. The admin UI only hides
sections the user can't access. The access JWT lives in `localStorage`, so the admin gate
is client-side and every API call is still enforced by the server.

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
  by orders are deactivated, never deleted (`409 IN_USE`).
- **Order numbers:** `BI48-000001`, generated from the Postgres sequence `order_number_seq`.

## Not built yet

These are local stand-ins. Each sits behind an interface, so a real implementation can replace it.

| Concern | Today | Planned |
|---|---|---|
| Artwork storage | `LocalStorageDriver` (`STORAGE_DRIVER=local`) | S3 driver, 6-month lifecycle expiry |
| Email | `EmailService` logs to console + `email_log`; reset tokens logged | Real transport (SES) |
| Login throttle | In-memory (5 failures → 15-min lock) | Shared store when multi-instance |
| Malware scan | Artwork rows stay `scanStatus = PENDING` | Scanner |
| Tracking | Tracking number, label PDF and a FedEx deep link | FedEx Tracking API for automatic shipped/delivered |
| Payments, tax | None (see operating model) | Provider integrations |
| Hosting | Frontend on Vercel. No backend deployment exists | — |

Remove `devResetToken` from the admin password-reset response once real email exists.

## Local accounts

`npm run seed -w backend` upserts `admin@bannersin48.local` / `ChangeMe123!`. Override
them with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Re-running the seed never overwrites an existing password.
