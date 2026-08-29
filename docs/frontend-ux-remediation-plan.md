# Banners In 48 — Front-End UX Remediation Plan

**Created:** 2026-08-23  
**Source audit:** [`frontend-ux-audit.md`](./frontend-ux-audit.md)  
**Status:** Product direction approved; implementation not started; legal policies remain an external public-release blocker  
**Goal:** close every implementable audit blocker, make mocks and the real API describe the same product, and establish a release gate that prevents regressions

---

## 1. Executive plan

The work should not begin with a visual redesign. The first four waves must make the commerce journey correct and honest:

1. **Encode the locked product decisions and converge contracts.** The frontend mocks and API client currently expose proof, address, delivery, and reorder APIs that the real backend does not. The real backend also uses a different status/payment model.
2. **Correct dimensions, cart pricing, and scroll behavior.** These carry the highest risk of wrong products and wrong totals.
3. **Require and preserve artwork.** Every order line must carry a valid artwork file and a complete placement/configuration snapshot.
4. **Replace the fake checkout/proof sequence with the locked V1 operating model.** A customer must see the exact file/configuration being confirmed, one authoritative total, and one authoritative delivery state.
5. **Complete order tracking, cancellation, and reorder.** Remove or implement every public action.
6. **Remove deceptive and prototype-only content.** No fake testimonials, payment badges, internal phase language, broken capability claims, or public demo credentials.
7. **Fix mobile and accessibility blockers.** Contrast, dialogs, overlays, touch targets, landmarks, form errors, footer length, and builder ergonomics.
8. **Simplify information architecture and improve mobile performance.** Reduce repeated homepage/pricing content and server-render funnel-critical catalog data.
9. **Isolate and harden admin.** Separate staff and storefront shells and improve responsive/accessibility behavior.
10. **Add release gates.** Run the same critical flow against MSW and the real Nest/Postgres stack, with axe, responsive, and Lighthouse thresholds.

The plan is intentionally split into small, independently verifiable pull requests. No visual-polish wave is allowed to hide a failing commerce-correctness gate.

---

## 2. Repository reality that the plan must resolve

The audit exercised the MSW experience. The repository now also contains a substantial real NestJS backend. They do not currently describe the same product.

| Concern | Frontend/MSW today | Real backend today | Required resolution |
|---|---|---|---|
| Initial order status | `AWAITING_PROOF_APPROVAL` | `RECEIVED` + `PENDING_PAYMENT` | Use one V1 state machine |
| Proof | Post-order approve endpoint and cancellation window | Five confirmations are recorded at order creation; no approve endpoint | Confirm the actual uploaded file/configuration at checkout and remove the post-order approval model |
| Payment | “stub card” Place Order | Manual payment; staff marks paid | Present a truthful manual-payment submission flow; no card/wallet claims |
| Tax | “Total before tax” but order proceeds | Tax is hard-coded to zero and deferred | Gate the internal V1 from public release and display the limitation truthfully |
| Delivery endpoint | Client calls `GET /delivery/next-cutoff` | Service exists, public controller does not | Add real endpoint and remove divergent client fallback claims |
| Address validation | MSW endpoint exists | No real endpoint/module | Add a real provider interface and server enforcement |
| Reorder | MSW endpoint exists | No real endpoint | Implement one canonical current-price reorder flow |
| Tracking lookup | Fake public form | Authenticated order endpoints only | Remove the public form and route authenticated customers to their orders |
| Artwork upload | MSW allows builder use | Real upload/library requires JWT | Add return-to-builder authentication with state preservation |
| Artwork preview | Relative mock URLs | Guarded API download URLs | Add authenticated blob/preview handling |
| Order statuses/types | Shared package includes mock-only states | Prisma has the real 8-state V1 enum | Generate or align one contract |
| Quotes | API type omits quote ID | Backend persists and returns `quoteId` | Store and validate quote IDs through checkout |

**Wave 1 is therefore contract convergence, not UI styling.** Without it, fixes can pass mock E2E while remaining broken against the real backend.

---

## 3. Locked Wave 0 decisions

**Approved by the product owner on 2026-08-23.** These decisions are authoritative for implementation unless this log is amended.

| ID | Locked decision | Implementation consequence |
|---|---|---|
| D1 | **Internal platform-testing V1** | Mandatory account, manual payment, no live payment/tax integration, USD only, and no public-commerce claims. Internal/staging deployments remain access-controlled or visibly non-production and noindex. |
| D2 | **Industry-facing height × width** | Display “4′ H × 8′ W”; store horizontal `width = 8` and vertical `height = 4`; migrate versioned drafts/fixtures and test landscape orientation end to end. |
| D3 | **Artwork required before cart/order** | Every sign needs a valid owned artwork file before Add to Cart. Frontend, backend, and mocks enforce the same invariant. There is no upload-later order state in V1. |
| D4 | **Uploaded-file confirmation at checkout** | Show the actual uploaded file and complete production configuration before submission; clearly state that it is not a designer-created proof. Remove the mock-only post-order approval flow. |
| D5 | **Mandatory account, return-to-builder login, authenticated tracking** | Upload/library prompts for authentication while preserving builder state and returning to the artwork step. Track Order routes to authenticated order history; no guest lookup endpoint in V1. |
| D6 | **Order submitted and payment confirmed** | Interpret this as the later of order submission (which includes required artwork confirmation) and manual payment confirmation. In the normal V1 sequence the effective SLA start is `paymentConfirmedAt`. Persist the committed delivery date once both conditions are true. |
| D7 | **USA only in V1** | Restrict checkout/delivery validation to US addresses. Display `USD`; remove Canadian marketing, province fields, CAD implications, and Canadian tax/duty copy. |
| D8 | **No current legal policies are available** | Remove unsupported legal/compliance claims, scaffold destinations only when approved copy exists, and treat Privacy/Terms/Shipping/Cancellation/Accessibility policies as external blockers for any future public launch. Internal V1 must not imply that missing policies are complete. |

### Remaining narrow implementation policy

TIFF/EPS preview support was not separately selected. The safe V1 default is to accept only formats that can be faithfully reviewed in the uploaded-file confirmation flow (JPEG, PNG, and PDF). TIFF/EPS should remain unavailable until server-generated review derivatives are implemented. This does not block the rest of the plan and can be changed independently.

Real testimonials must not return without source records and permission. Real product photography and final support/guarantee wording remain optional content dependencies for the internal V1 and required trust inputs before a later public launch.

---

## 4. Delivery principles

1. **Server authority:** pricing, quote validity, order eligibility, address risk, payment status, and delivery commitment are server-enforced.
2. **One contract:** the API client and MSW mocks must derive from or prove parity with the real backend contract.
3. **No silent delivery fallbacks:** if delivery data is unavailable, show “Delivery estimate unavailable,” not a different locally computed promise.
4. **No derived money mutation:** a cart quantity/configuration change always produces a new server quote.
5. **No deceptive placeholder:** unsupported capabilities are removed or labeled as unavailable in non-production environments.
6. **Accessible primitives:** dialogs, disclosures, tabs, and error messaging use documented shared components rather than one-off behavior.
7. **Small PRs with executable acceptance tests:** each work item is done only when its listed test passes.
8. **Real-backend E2E before release:** passing MSW tests alone is insufficient.

---

# 5. Implementation waves

## Wave 0 — Safety gate and decision enforcement

**Purpose:** encode the locked internal/manual V1 model and prevent the prototype from being mistaken for a production checkout.

### Tasks

- Add a typed commerce-mode environment value, for example:
  - `internal_manual`
  - `public_live`
- In `internal_manual`:
  - Display a persistent non-production/manual-payment notice.
  - Replace card/wallet badges and “Payment” stub copy with truthful manual-payment instructions.
  - Keep search engines disabled for staging/internal deployments.
- In `public_live`:
  - Fail the production build if payment, tax, legal URLs, API base URL, and production-mode feature flags are absent.
- Add a deployment-time scan that rejects customer-visible strings such as:
  - “stubbed”
  - “mock backend”
  - “Phase 1.5/2/3”
  - demo passwords
  - placeholder proof text
- Record D1–D8 in a short decision log at the top of this document.

### Likely files

- `.env.example`
- `frontend/app/layout.tsx` or storefront layout after Wave 8
- `frontend/app/providers.tsx`
- `frontend/components/nav/AnnouncementStrip.tsx`
- New `frontend/lib/config/commerce-mode.ts`
- New production-content validation script

### Verification

- Production build fails when `public_live` lacks required integrations/config.
- Internal mode contains no card/wallet claims and is noindex and access-controlled.
- Unit tests cover environment parsing and unsafe-string validation.

---

## Wave 1 — Contract convergence: real API, client, shared types, and MSW

**Covers:** foundation for P0-03, P0-05–08, P1-15, P1-19, P1-23; removes mock-only behavior that masks real failures.

### 1.1 Establish the authoritative V1 order model

- Align `packages/shared` order statuses with the authoritative real backend state machine.
- Remove mock-only proof/cancellation statuses; uploaded-file confirmation occurs at checkout.
- Include real response fields in client types:
  - `paymentStatus`
  - `currency`
  - `events`
  - `proofConfirmedAt`
  - `placedAt`
  - tracking label/download metadata
- Remove API-client methods with no real endpoint, or implement the endpoint before retaining the method.

### 1.2 Complete missing real endpoints

- Add `GET /delivery/next-cutoff` backed by `DeliveryService`.
- Add a US address endpoint/provider interface; without an external provider it may normalize syntax but must return `unverified`, never a false verification.
- Implement the authenticated reorder endpoint before retaining the API-client method.
- Remove `POST /orders/:id/approve-proof`; confirmation is captured during submission.
- Remove the fake public lookup endpoint/client flow and use authenticated order history.

### 1.3 Quote contract

- Add `quoteId` and `validUntil` to `QuoteResponse` in the API client.
- Add `quoteId` to order line input.
- Validate quote ownership/request/expiry at order creation.
- Return `409 QUOTE_CHANGED` with a replacement quote instead of silently creating an order at a different amount.

### 1.4 Make MSW match the real API

- Require authentication where the real API does.
- Use the real status/payment model.
- Return real fields and errors.
- Remove mock-only proof/reorder/address behavior unless equivalent real endpoints exist.
- Add valid local artwork fixtures.

### 1.5 Eliminate mock startup races

- Start MSW before API-querying children render in mock mode.
- Make mock worker initialization idempotent under React Strict Mode.
- Do not issue requests to `localhost:3001` before readiness.

### 1.6 Contract tests

Preferred long-term approach:

- Add Nest Swagger/OpenAPI generation.
- Generate API types/client from the backend schema.
- Keep handwritten convenience methods thin and generated-type-backed.

Minimum acceptable interim approach:

- Run the same contract scenario table against MSW and real API.
- Compare status codes and normalized response shapes.

### Likely files

- `backend/src/delivery/*`
- New `backend/src/address/*`
- `backend/src/orders/orders.controller.ts`
- `backend/src/orders/orders.dto.ts`
- `backend/src/orders/orders.service.ts`
- `packages/shared/src/order.ts`
- `packages/api-client/src/apiClient.ts`
- `packages/api-client/src/types.ts`
- `packages/api-client/src/mocks/{handlers,fixtures}.ts`
- `frontend/app/providers.tsx`
- `frontend/lib/mocks/init.ts`

### Verification

- Contract parity tests pass against both adapters.
- No initial connection-refused errors in mock mode.
- Client has no callable method that returns 404 because the endpoint does not exist.
- Typecheck catches status/response drift.

---

## Wave 2 — Dimension semantics and migration

**Covers:** P0-10 and all orientation-dependent builder/proof/order risk.

**Dependency:** D2.

### Tasks

- Define canonical semantics in `packages/shared`:
  - `width` = horizontal left-to-right
  - `height` = vertical top-to-bottom
- Add explicit formatters that include axis labels where ambiguity matters:
  - `8′ W × 4′ H`
  - “Landscape” / “Portrait” / “Square”
- Update standard-size data and product defaults to the locked height × width convention.
- Update builder stage aspect ratios and ruler labels.
- Rename query parameters to unambiguous `width` and `height`; retain a versioned legacy redirect.
- Add a size/orientation diagram to the size panel and cart/proof review.
- Version persisted builder/cart data. Migrate or discard incompatible pre-fix local drafts safely.
- Update backend seed `displayConfig.defaultSize` and any local saved-design fixtures.
- If non-test order data exists, add an explicit migration strategy rather than silently swapping axes.

### Likely files

- `packages/shared/src/{constants,dimensions,product}.ts`
- `frontend/components/builder/{BuilderStage,SizePanel,StageHeader}.tsx`
- `frontend/lib/stores/{configurator,cart}.ts`
- `frontend/app/order/[slug]/page.tsx`
- `frontend/app/sizes/page.tsx`
- `backend/prisma/seed.ts`

### Verification

- A “4′ H × 8′ W” selection renders a 2:1 landscape preview and snapshots horizontal width 8 / vertical height 4.
- Builder, cart, checkout, order detail, admin, and production snapshot show identical axes.
- Tests cover portrait, landscape, square, fractional inches, and legacy URLs.

---

## Wave 3 — Cart pricing correctness and drawer recovery

**Covers:** P0-01, P0-02, P0-11 pricing portion, P2 edit/remove concerns.

### 3.1 Cart data model v2

Persist canonical configuration plus a server quote snapshot; never mutate quantity without pricing:

```ts
interface CartLineV2 {
  id: string;
  config: {
    productId: ProductId;
    material: Material;
    dimensions: Dimensions;
    finishing: Finishing;
    quantity: number;
    artworkId: string;
    placement?: ArtworkPlacement;
    colorMatching?: ColorMatching;
  };
  quote: {
    quoteId: string;
    validUntil: string;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: "USD";
    delivery: DeliveryCommitment;
  };
  quoteState: "confirmed" | "refreshing" | "stale" | "error";
}
```

### 3.2 Re-quote orchestration

- Add/update a line only after a successful quote.
- On quantity/config changes:
  - mark refreshing
  - block checkout
  - request a new quote
  - atomically replace config + quote
- On failure:
  - keep the prior confirmed configuration/quote
  - show retry/revert
  - do not display a new quantity beside an old total
- Revalidate expired quotes on cart/checkout load.
- Require all lines to be confirmed before checkout.

### 3.3 Server agreement

- Send quote IDs with order creation.
- Server verifies quote request and expiry.
- A changed/expired quote returns a reviewable 409 response; it never silently creates a higher-priced order.

### 3.4 Drawer scroll/focus fix

- Save previous body overflow on open.
- Restore it on every close path:
  - close button
  - backdrop
  - Escape
  - View Cart
  - Checkout
  - route change
  - unmount
- Restore focus to the triggering control.
- Prefer a shared Radix Dialog/Sheet primitive to remove custom lock duplication.

### 3.5 Cart UX

- Add “Edit configuration” per line.
- Display artwork filename/status.
- Add remove undo toast.
- Display `USD` and quote expiry/refresh state.

### Likely files

- `frontend/lib/stores/cart.ts`
- New `frontend/lib/cart/requote.ts`
- `frontend/components/cart/{CartDrawer,CartLineRow}.tsx`
- `frontend/app/{cart,checkout}/page.tsx`
- `backend/src/orders/*`
- `packages/api-client/src/types.ts`

### Verification

- Quantity 1 → 2 changes subtotal, shipping, CTA, checkout, and created order consistently.
- A forced quote change returns review UI and creates no order.
- Drawer close leaves body scrollable and focus restored on all paths.
- Multi-line and quantity-10 totals match the server exactly.

---

## Wave 4 — Artwork integrity and honest file review

**Covers:** P0-03, P0-04, P1-14, P1-15, P1-24, P1-22 artwork portion.

**Dependencies:** D3, D4, D5; Wave 1 contract.

### 4.1 Authentication continuity

Artwork remains account-only in V1:

- Gate upload/library selection with a clear sign-in/create-account dialog.
- Pass `next` back to the exact product URL and preserve builder state.
- After authentication, reopen the artwork step automatically.
- Do not expose a guest-upload path or make files globally accessible.

### 4.2 Require artwork

- Frontend: each sign/item has a visible required/completed/error state.
- Add to Cart is blocked until every sign has a valid artwork ID.
- Retractable uses the same artwork step rather than bypassing the builder.
- Backend: `artworkId` is required per order line and ownership/health is revalidated.
- Mocks enforce the same rule.

### 4.3 Preserve the complete production configuration

Add a versioned artwork-placement snapshot to cart/order input and backend order snapshot:

- fit vs fill/crop
- crop/position if supported
- orientation
- effective dimensions
- side assignment for double-sided products
- color-match notes
- artwork file/version ID

No visual option may exist only in frontend state and disappear before production.

### 4.4 Authenticated preview handling

- Fetch protected artwork with Authorization and create revocable blob URLs.
- Do not depend on frontend-relative `/artwork/...` paths.
- Do not place long-lived JWTs in public URLs/logs.
- Add loading, expired-file, retry, and download states.
- Replace missing mock fixture files.

### 4.5 V1 uploaded-file review

- Rename the step to “Review uploaded artwork.”
- Show every line’s actual file, filename, page/format, size, orientation, fit/crop, dimensions, material, finishing, quantity, and delivery state.
- Clearly state that the platform prints the uploaded file as configured and does not provide designer correction.
- Move the relevant versioned confirmations here, before order creation.
- Remove the fake post-order proof page and mock-only approve/cancellation flow.
- Limit V1 uploads to JPEG, PNG, and PDF unless TIFF/EPS review derivatives are separately approved and implemented.
- Treat generated, versioned production proofs as out of scope for internal V1.

### 4.6 Print-readiness guidance

- Show effective DPI where reliable.
- Distinguish blocking errors from warnings.
- Explain safe area, crop/fit, and bleed.
- If color matching changes SLA, return a new delivery estimate instead of showing only generic warning text.

### Verification

- No order can be created without required artwork.
- Every accepted UI option appears in the backend config snapshot/admin order workspace.
- Preview displays the actual protected file; no placeholder proof text or broken fixture URL remains.
- Authentication returns to the same artwork step without losing configuration.
- TIFF/EPS are rejected with an explicit supported-format message until review derivatives exist.

---

## Wave 5 — Checkout, address, payment mode, and delivery commitment

**Covers:** P0-05, P0-06, P0-11, P0-12 integration points, P1-03, P1-04, P1-18–20.

**Dependencies:** D1, D5–D7; Waves 1, 3, and 4.

### 5.1 Checkout continuity

- Add and validate a same-origin `next` parameter for login/register.
- Default checkout links to `/login?next=/checkout` and `/register?next=/checkout`.
- Prefill the email query parameter.
- Preserve cart and builder state.
- Keep the account requirement explicit; do not expose guest checkout.

### 5.2 Address validation

- Replace the unused duplicate state with one state machine:
  - incomplete
  - validating
  - verified
  - suggested
  - unverified
  - error
- Add a real server endpoint with provider abstraction.
- Restrict country selection and server validation to US addresses.
- Return a validation token/version with normalized address.
- Order creation revalidates token/address.
- If unverified, require a dedicated risk acknowledgement client- and server-side.
- Never label a syntactically valid but provider-unchecked address “verified.”

### 5.3 Payment mode

For `internal_manual`:

- Remove card/wallet method chips and fake payment method payloads.
- Explain that the order is submitted as `PENDING_PAYMENT` and how payment is completed.
- Use “Submit order” rather than a card-charge-style “Place order” where appropriate.
- Show that delivery is not committed until the order is submitted and manual payment is confirmed.

A future `public_live` mode remains out of V1. It must not be enabled until payment authorization, tax, webhook reconciliation, receipts/refunds, production credentials, and approved legal policies are implemented.

### 5.4 Tax and totals

- Always display currency explicitly.
- Show product, discounts, shipping, tax, and final total.
- In public mode, block order placement until tax is authoritative.
- In internal mode, show the exact non-production tax limitation and keep deployment gated.

### 5.5 Delivery commitment

- Stop using the divergent client fallback for delivery dates.
- Builder/cart use quote delivery data.
- Checkout uses refreshed cart/order estimate.
- Persist the committed delivery timestamp/date once the submitted order's manual payment is confirmed.
- Order pages render only the persisted order commitment.
- If unavailable, display a neutral unavailable state rather than a guess.
- Rewrite global copy to state the exact qualifying event and retain “business hours” on mobile.

### 5.6 Checkout form and consent accessibility

- Add a form-level error summary.
- Focus the first invalid field after submit.
- Associate errors via `aria-describedby`.
- Use fieldsets/legends for grouped consent.
- Remove duplicate proof acknowledgements.
- Add terms/privacy links and versioned consent fields once legal copy exists.
- Add an H1 to the empty checkout state.

### 5.7 Submission safety

- Add idempotency key to order creation.
- Disable duplicate submissions while pending.
- On network ambiguity, query by idempotency key before asking the user to retry.
- Show a dedicated confirmation state with order number and next action.

### Verification

- Login/register returns to checkout.
- Unverified address cannot proceed without risk consent; server rejects bypass attempts.
- Checkout total and created order match exactly.
- No conflicting delivery dates appear during one journey.
- Manual mode contains no live-payment implication; public mode cannot build without live requirements.
- Keyboard/error-recovery checkout passes axe and E2E.

---

## Wave 6 — Orders, tracking, cancellation, reorder, and account recovery

**Covers:** P0-07, P0-08, P1-17, P1-19, P1-23, P2 status/timeline issues.

### 6.1 Authenticated tracking destination

- Replace the fake lookup form with an account-gated order search/list.
- Point Track Order to `/orders` or a real authenticated search route.
- Explain that order history and tracking require the ordering account.
- Do not expose a public order-number/email lookup endpoint in V1.

### 6.2 Reorder

- Implement one endpoint/flow shared by dashboard, order list, and order detail.
- Verify order ownership.
- Map the prior immutable config into new cart drafts.
- Revalidate product availability, size rules, artwork retention, and finishing compatibility.
- Re-quote at current prices.
- If artwork expired/missing, require replacement.
- Route to cart review; never create the second order immediately.
- Remove the nonexistent `/orders/[id]/reorder` link unless a real page is intentionally added.

### 6.3 Timeline/status

- Drive timeline from backend `order_events`, not a static completed-by table.
- Use friendly labels; never display raw enum strings to customers.
- Model the locked V1 sequence exactly.
- Show payment, artwork confirmation/proof, fulfillment, shipped, delivered, hold, and cancellation events as applicable.
- Render the persisted delivery commitment.

### 6.4 Cancellation

- Align customer cancellation UI with the real backend rule (currently before payment is marked).
- Show confirmation and consequences.
- Remove the mock-only ten-minute proof window and post-order proof approval model.

### 6.5 Authentication recovery

- Build Forgot Password and Reset Password pages against existing backend endpoints.
- Add show/hide password and visible password requirements.
- Keep demo credentials development-only.

### 6.6 Dashboard capability honesty

- Remove or disable saved-design/reward/template claims not yet backed by working APIs.
- Make “Soon” cards visibly noninteractive and not keyboard-focusable as actions.
- Point Upload Artwork to a working authenticated library/upload flow.

### Verification

- Every Track/Reorder link resolves and completes its intended path.
- Reorder always uses current price and warns about missing/expired artwork.
- Timeline is event-driven and contains no raw enum copy.
- Password reset works end to end in the selected email environment.

---

## Wave 7 — Trust, legal, content honesty, and metadata

**Covers:** P0-09, P0-11 wording, P0-12, P1-16, P1-20–24, and trust-related P2 items.

### 7.1 Remove deceptive content immediately

- Remove placeholder testimonial data and both testimonial sections/pages from public navigation.
- If the Reviews URL remains, show a neutral non-indexed state without invented quotes.
- Remove payment methods that are not available.
- Remove internal roadmap/phase wording from customer UI.
- Remove public demo credentials.
- Fix literal `&amp;` copy.
- Rewrite offline copy to mention only capabilities that actually persist.

### 7.2 Legal and policy surfaces

Approved policy text does not exist. Therefore:

- Do not invent or publish empty/template legal policies.
- Remove broken footer/checkout links and unsupported compliance claims from internal V1.
- Keep internal V1 access-controlled/noindex.
- Add a `public_live` build gate requiring approved, versioned URLs for Privacy, Terms, Shipping/Delivery, and Cancellation/Refund.
- Add Accessibility and cookie preferences only when approved content and the actual tracking stack define their requirements.
- When legal/business owners supply approved text, publish it with version identifiers and effective dates before public release.

### 7.3 Delivery/support copy

- Use one centrally managed delivery copy source.
- For internal V1, describe the persisted date as an estimate/commitment and do not make a legally framed “guarantee” claim without approved exclusions and remedy.
- State that timing begins after order submission and manual payment confirmation, including cutoff timezone and business-hour meaning.
- Replace “No inbound phone calls” with neutral support-channel copy; add a response-time promise only after operations approves it.

### 7.4 Email CTA

- Remove the currently discarded email field and use a direct Order CTA.
- Registration/login screens remain responsible for collecting account email.
- If lead capture is added later, it must persist the address, disclose its purpose, and measure completion.

### 7.5 Metadata

- Remove duplicated title suffixes.
- Add unique metadata for login, register, cart, checkout, dashboard, orders, tracking, admin, offline, and 404.
- Add canonical URLs.
- Noindex account/admin/internal states.
- Use stable sitemap modification dates.
- Add structured data only for authoritative products/offers/FAQs.
- Never add review schema until reviews are genuine.

### 7.6 Product media

When real assets are supplied:

- Replace repeated generic imagery.
- Add material/finish close-ups.
- Show retractable stand, base, case, graphic, and assembled dimensions.
- Track image source/usage rights.

### Verification

- Production-content scan finds no placeholder, stub, demo, internal phase, or fake verification language.
- Internal V1 has no broken/template policy links; future public mode cannot build until approved policy routes are configured.
- Metadata snapshot tests pass with no duplicated brand suffix.
- No review claims/schema exist without approved source records.

---

## Wave 8 — Accessibility and mobile shell

**Covers:** P1-01, P1-05–13, P1-25–26 accessibility portion, and touch/landmark P2 issues.

### 8.1 Contrast tokens

- Replace `#979797` normal-text tokens with an AA-safe neutral (candidate `#616161`, subject to token-pair tests).
- Separate decorative/disabled neutrals from readable secondary text.
- Add automated contrast tests for every semantic foreground/background pair.

### 8.2 Links

- Underline links in prose by default.
- Keep nav/button/card overlays exempt through explicit component variants.
- Verify visited/focus/hover/active states.

### 8.3 Dialogs and sheets

Migrate More Info, Image Picker, Color Match, Cart, and mobile drawers to shared Radix-based primitives with:

- focus entry
- focus trap
- Escape
- outside-click policy
- focus return
- inert/hidden background
- scroll restoration
- accessible name/description

### 8.4 Navigation and landmarks

- Add Skip to Main Content.
- Give `<main>` a stable target.
- Convert announcement to a named region/aside as appropriate.
- Uniquely label builder summary/item asides.
- Fix nested complementary landmark.
- Repair footer/page heading hierarchy.
- Add accessible names to tables and nontext controls.
- Add `aria-pressed` to filter chips and `aria-disabled` + descriptions to unavailable builder controls.

### 8.5 Touch targets and controls

- Make primary controls at least 44 × 44.
- Ensure every other non-exempt control is at least 24 × 24 with spacing.
- Enlarge dialog closes, filters, quantity controls, form fields, and footer links.
- Replace 12 px grommet removal dots with a larger hit area and visible selected state.

### 8.6 Fixed mobile UI

- Remove the floating countdown island from task/account/help pages; recommended default is remove it entirely and keep delivery state inside relevant cards.
- Reserve safe-area space for the bottom bar.
- Ensure no sticky/fixed surface covers content at 320 px or 200% zoom.
- Put a primary central Order action in mobile navigation; move order history under Account if needed.

### 8.7 Mobile footer

- Use compact disclosure groups or a minimal contact/legal footer.
- Do not repeat the entire catalog beneath task pages.
- Ensure footer controls remain accessible with the bottom safe area.

### 8.8 Builder responsiveness

- Desktop: one authoritative sticky summary and a larger artwork stage.
- Tablet: two-pane mode where width permits.
- Mobile: guided steps with an accessible bottom-sheet editor and full-screen artwork zoom.
- Add visible affordances wherever horizontal scrolling remains.

### Verification

- Zero serious/critical axe violations across all primary routes/states.
- Keyboard-only funnel passes.
- Dialog focus tests pass.
- 320 px and 200% zoom screenshots have no obscured content.
- Touch-target automated checks pass for critical controls.

---

## Wave 9 — Information architecture, visual refinement, and performance

**Covers:** P1-02, P1-21–22, remaining P2 visual/content issues, mobile LCP findings.

### 9.1 Homepage reduction

Target structure:

1. Exact value proposition + primary CTA
2. Compact “Help me choose” selector
3. Four featured products + View All
4. Real production/customer evidence, only when supplied
5. Three concise process steps
6. Guarantee/support
7. Five top FAQs
8. Final CTA

Remove duplicate catalog/material/industry sections or move secondary detail behind View All.

### 9.2 Product hub

Add authoritative, server-derived decision facts:

- starting price and currency
- best use
- environment
- key size limit
- included finishing/hardware

Use one clear primary card action and an accessible details disclosure.

### 9.3 Sizes/pricing mobile

- Use accessible tabs/accordions for:
  - HD Banner
  - Other Products
  - Finishing
  - Stands
  - Rules
- Keep first table column sticky.
- Add a visible horizontal-scroll cue.
- Keep shipping/currency treatment consistent.

### 9.4 Performance

- Server-render/revalidate catalog data instead of hiding primary cards behind a client-only request.
- Reduce homepage DOM and image count.
- Correct Next Image `sizes` for 390/412 px devices.
- Load only above-fold priority media.
- Remove unused client JS after section simplification.
- Add route-level Web Vitals/RUM when production analytics is approved.

### 9.5 PWA

- Remove portrait-only orientation lock or permit any orientation.
- Re-test offline claims and cart persistence.
- Ensure protected/API data is not cached unsafely.

### Verification

- Mobile home and sizes page lengths are materially reduced.
- Mobile LCP lab target ≤2.5 s on home, order hub, and builder.
- CLS ≤0.1; no primary catalog skeleton is the long-lived first impression.
- Product facts match quote/catalog API values.

---

## Wave 10 — Admin isolation and operational UX

**Covers:** P1-26 and admin P2 findings.

### Tasks

- Move storefront chrome into a storefront route-group layout.
- Keep root layout limited to document/providers.
- Give `/admin` a separate layout with no consumer announcement, footer, countdown, mobile tabs, or cart.
- Add responsive admin navigation/drawer.
- Add explicit labels to search fields.
- Add pagination/filter/empty/error states to tables.
- Replace free-form material codes with validated selects.
- Add unsaved-change protection to pricing/content forms.
- Add structured CMS fields and preview for supported content block types.
- Replace `window.confirm` with shared accessible confirmation dialogs.
- Display audit history for destructive/pricing/content/status mutations where API data exists.

### Likely structural change

Use route groups without changing URLs:

```text
app/
  layout.tsx                 # html/body/providers only
  (storefront)/
    layout.tsx               # announcement/nav/main/footer/mobile/cart
    page.tsx
    order/...
    checkout/...
    ...
  admin/
    layout.tsx               # staff-only shell
    ...
```

### Verification

- Admin never renders storefront chrome at desktop/mobile widths.
- Role matrix works with real seeded ADMIN/STAFF/CONTENT_EDITOR users.
- Admin keyboard/axe smoke passes.
- Destructive actions require accessible confirmation and produce audit records.

---

## Wave 11 — Release gates and regression suite

**Purpose:** make “fixed” durable.

### 11.1 Two E2E modes

- **Fast PR suite:** MSW, desktop Chromium + mobile WebKit.
- **Release suite:** real Nest API + Postgres + Redis/local storage, seeded fixtures.

Both must run the same canonical customer scenarios where applicable.

### 11.2 Required commerce scenarios

1. Register/login return to intended route.
2. Configure standard landscape size; axes are correct everywhere.
3. Upload/select real artwork and see actual preview.
4. Add to cart; quantity 1 → 2 re-quotes.
5. Close/reopen drawer; scrolling/focus recover.
6. Valid and unverified address branches.
7. Quote expires/changes before submit.
8. Submit order with idempotency and authoritative total.
9. See correct manual-payment/live-payment state.
10. Track order through the authenticated account model.
11. Cancel in valid state and reject invalid cancellation.
12. Reorder at current price; expired artwork branch.

### 11.3 Accessibility suite

- Add `@axe-core/playwright` to all primary route specs.
- Add keyboard interaction specs for mega menu, mobile menu, all dialogs, builder, cart, checkout, and admin confirmation.
- Add 320 px and 200% zoom/reflow screenshots.
- Add touch-target checks for critical controls.

### 11.4 Visual regression

Capture approved states at:

- 320 × 568
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1440 × 900

Include loading, error, empty, populated, modal, cart, checkout, and order status states.

### 11.5 Performance and content gates

- Lighthouse CI mobile performance ≥90 initially, then field p75 targets.
- Accessibility ≥95 with no serious/critical axe failures.
- Production unsafe-string scan.
- Broken internal link/image crawl.
- Metadata snapshot.
- Console/network error assertion.

### 11.6 Required commands

```bash
npm run typecheck
npm run lint
npm run test:ws
NEXT_PUBLIC_ENABLE_MOCKS=1 npm run build
npm run e2e
# New: real-backend E2E orchestration
npm run e2e:real
# New: accessibility/performance/content gates
npm run audit:ci
```

### Release definition of done

- Every P0 audit item is Closed or explicitly External/Deferred with public release blocked.
- No public UI action routes to an unimplemented capability.
- Mock and real API canonical flows agree.
- The exact amount, artwork, dimensions, currency, and delivery state confirmed by the customer are the values persisted on the order.

---

# 6. Recommended PR sequence

| PR | Scope | Main dependency | Risk |
|---:|---|---|---|
| 1 | Commerce mode guard, remove deceptive testimonials/demo/stub claims | D1 | Low |
| 2 | API/status/quote contract convergence + MSW readiness | D4/D5 model | High |
| 3 | Delivery endpoint and single-source delivery display | D6 | High |
| 4 | Dimension semantics and persisted-state migration | D2 | High |
| 5 | Cart v2, server re-quote, quote-ID validation | PR 2 | Critical |
| 6 | Cart drawer Radix Sheet and scroll/focus fix | None | Medium |
| 7 | Artwork auth return, protected preview, valid fixtures | D5; PR 2 | High |
| 8 | Required artwork + full config snapshot + retractable upload | D3; PR 7 | Critical |
| 9 | Checkout address state/server enforcement | PR 2 | Critical |
| 10 | Checkout mode, totals, consent, idempotency, return URLs | D1/D4/D6/D7; PRs 5/8/9 | Critical |
| 11 | Tracking/reorder/timeline/password recovery | D5; PR 2 | High |
| 12 | Contrast, links, landmarks, touch targets | None | Medium |
| 13 | Shared Radix dialogs and keyboard navigation | PR 6 patterns | Medium |
| 14 | Mobile fixed UI, footer, bottom nav, builder responsiveness | PRs 10/13 | High |
| 15 | Homepage/pricing IA reduction and catalog decision facts | Content decisions | Medium |
| 16 | Metadata/legal/footer/content gate | Approved legal copy | Medium |
| 17 | Storefront/admin layout isolation and admin hardening | PR 13 | Medium |
| 18 | Real-backend E2E, axe, visual, Lighthouse release gate | All critical PRs | Critical |

D1–D8 are locked, so the PR sequence can proceed in dependency order. Approved legal copy remains an external dependency for PR 16 and for any future public launch; it does not block internal V1 correctness work.

---

# 7. Coverage matrix for audit findings

## P0 coverage

| Audit item | Planned wave | Internal V1 disposition | External dependency |
|---|---:|---|---|
| P0-01 stale quantity pricing | 1, 3, 11 | Implement now; preserve the backend's 14-day quote validity and reject changed/expired quotes before order creation | None |
| P0-02 scroll lock | 3, 8 | Implement now | None |
| P0-03 no real proof | 4, 5 | Replace fake proof with actual uploaded-file/configuration confirmation | TIFF/EPS derivatives only if later restored |
| P0-04 artwork optional | 4 | Require artwork in UI, API, and mocks | None |
| P0-05 payment stub | 0, 5 | Replace with truthful manual-payment submission | Payment provider for a future public launch |
| P0-06 address risk bypass | 1, 5 | Enforce US address result and risk consent server-side | Provider required only for true verification |
| P0-07 fake tracking lookup | 6 | Remove fake lookup; use authenticated orders | None |
| P0-08 broken reorder | 1, 6 | Implement authenticated current-price reorder | None |
| P0-09 fake verified testimonials | 0, 7 | Remove all representative testimonials/review claims | Real evidence and permission to restore |
| P0-10 orientation | 2 | Migrate to 4′ H × 8′ W / width 8 × height 4 | Existing production-data migration, if any |
| P0-11 currency/tax/final total | 5, 7 | Show USD and truthful internal tax limitation | Tax provider for a future public launch |
| P0-12 legal policies | 7 | Remove unsupported claims; do not publish fake policy content | Approved legal text blocks public launch |

## P1 coverage

| Audit range | Planned wave(s) |
|---|---|
| P1-01 fixed countdown obstruction | 8 |
| P1-02 excessive mobile length | 8, 9 |
| P1-03 auth continuity | 4, 5 |
| P1-04 mandatory account friction | 0, 4, 5; reduce friction with return URLs while retaining the locked requirement |
| P1-05 contrast | 8 |
| P1-06 inline link distinction | 8 |
| P1-07 dialog keyboard behavior | 3, 8 |
| P1-08 mega-menu keyboard behavior | 8 |
| P1-09 landmarks/skip/H1 | 8 |
| P1-10 touch targets | 8 |
| P1-11 clipped builder controls | 8 |
| P1-12 builder required steps | 4, 8 |
| P1-13 duplicated builder pricing | 8 |
| P1-14 print-quality feedback | 4 |
| P1-15 broken artwork fixtures | 1, 4 |
| P1-16 discarded CTA email | 5, 7 |
| P1-17 account recovery | 6 |
| P1-18 checkout acknowledgements/errors | 4, 5, 8 |
| P1-19 delivery disagreement | 1, 5 |
| P1-20 ambiguous cutoff copy | 5, 7 |
| P1-21 missing product decision facts | 9 |
| P1-22 retractable imagery | 4, 7, 9 |
| P1-23 capability inconsistency | 1, 6, 7 |
| P1-24 artwork/color-match delivery effect | 4, 5 |
| P1-25 mobile shopping navigation | 8 |
| P1-26 admin consumer chrome | 10 |

All P2 items are grouped into Waves 6–10 and the release/content gates; none should interrupt P0 closure unless the same files are already being changed.

---

# 8. Metrics and release reporting

Track after every major wave:

| Metric | Baseline | Target |
|---|---:|---:|
| P0 findings open | 12 | 0 for public release |
| Serious contrast occurrences | 1,477 repeated occurrences | 0 |
| Primary route snapshots with serious axe finding | 88/90 | 0 |
| Home mobile full-page height | 17,940 px at 390 px | Substantially reduced; target ≤9–10 viewports |
| Sizes mobile full-page height | 12,085 px | Progressive disclosure; target ≤7–8 initial viewports |
| Home mobile LCP | 3.9 s lab | ≤2.5 s |
| Order hub mobile LCP | 5.1 s lab | ≤2.5 s |
| Builder mobile LCP | 4.7 s lab | ≤2.5 s |
| Existing E2E mobile skips | 35 total suite skips, mainly mobile coverage | No critical-flow mobile skips |
| Mock/real contract divergences | Multiple | 0 for used endpoints |

Each PR should update a small findings ledger with status: `Open`, `In progress`, `Blocked`, `Closed`, or `External release blocker`.

---

## 9. Safe work that can start immediately

The following work does not require product answers:

1. Fix cart drawer scroll restoration and add regression tests.
2. Remove placeholder testimonials and verified-review claims.
3. Hide demo credentials outside mock/development mode.
4. Fix homepage email prefill or replace it with a direct CTA.
5. Fix literal `&amp;` copy.
6. Change the readable muted color token and add contrast tests.
7. Add skip link, main target, empty-checkout H1, named builder asides, and rate-table headers.
8. Add active-filter semantics and larger critical touch targets.
9. Migrate simple modals to shared Radix Dialog.
10. Make MSW startup idempotent and gate query rendering until ready.
11. Add the real delivery controller endpoint without changing business rules.
12. Add unique metadata and remove duplicated title suffixes.
13. Remove the floating countdown from routes where it covers controls.
14. Add a CI unsafe-production-copy scan.
15. Add axe checks to the existing Playwright shell and marketing tests.

Dimension migration, order/proof state convergence, artwork enforcement, checkout/payment wording, tracking model, and delivery commitment require the Wave 0 answers.
