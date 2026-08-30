# Front-end UX remediation status

**Last updated:** 2026-08-29 (all waves complete)  
**Product mode:** `internal_manual` (mandatory account, manual payment, USA/USD only)  
**Public release:** Blocked until approved policy URLs and live payment/tax requirements exist.

**Status:** Waves 0-11 are implemented. All P0 findings are closed except P0-12 (legal policies, external release blocker). All runnable gates pass (typecheck, lint, test:ws, mock build, MSW e2e 92/62, audit:ci 13, e2e:real 5).

Status values are limited to **Open**, **In Progress**, **Closed**, and **External Release Blocker**.

## P0 findings

| Finding | Status | Notes / dependency |
|---|---|---|
| P0-01 Cart quantity pricing | Closed | Cart re-quote state machine re-quotes on quantity/config change; server rejects changed/expired quotes. |
| P0-02 Cart drawer scroll lock | Closed | Scroll/focus restored on every close path + route change; Playwright regression added. |
| P0-03 Actual uploaded-file review | Closed | Checkout shows the uploaded file + full configuration; fake proof removed. |
| P0-04 Artwork required | Closed | `artworkId` required in backend DTO/MSW/UI; add-to-cart gated; retractable requires artwork. |
| P0-05 Payment stub / order creation | Closed | Internal mode now truthfully submits a pending manual-payment order; payment brands and online-payment claims removed; `public_live` is build-gated. |
| P0-06 Unverified address bypass | Closed | Real `POST /address/validate` normalizes US syntax as `unverified` with a signed token; order creation re-validates and requires risk acknowledgement. |
| P0-07 Fake tracking lookup | Closed | Fake form removed; `/orders/lookup` redirects and nav points to authenticated `/orders`. |
| P0-08 Broken reorder | Closed | Authenticated current-price reorder implemented end-to-end (backend, MSW, client, UI). |
| P0-09 Fake verified testimonials | Closed | Placeholder data/component/media and navigation removed; `/reviews` is neutral and noindex. |
| P0-10 Dimension orientation | Closed | width=horizontal/height=vertical; "8′ W × 4′ H" + landscape defaults; legacy redirect + persisted-state migration. |
| P0-11 Currency/tax/final total | Closed | Explicit USD product/shipping/tax breakdown; tax=0 shown truthfully in internal mode. |
| P0-12 Legal policies | External Release Blocker | No approved policies exist. Internal mode is noindex/access-gated; `public_live` requires approved HTTPS policy URLs. |

## P1 findings

| Finding | Status | Notes / dependency |
|---|---|---|
| P1-01 Mobile countdown obstruction | Open | Wave 8. |
| P1-02 Excessive mobile length | Open | Wave 9. |
| P1-03 Checkout auth continuity | Closed | Checkout links carry `next=/checkout`; login/register validate a same-origin return URL and return to it. |
| P1-04 Mandatory-account friction | Open | Account remains locked requirement; continuity copy/flow pending. |
| P1-05 Contrast | Open | Wave 8. |
| P1-06 Inline links | Open | Wave 8. |
| P1-07 Dialog keyboard behavior | Open | Wave 8. |
| P1-08 Mega-menu keyboard behavior | Open | Wave 8. |
| P1-09 Landmarks/skip/H1 | Open | Wave 8. |
| P1-10 Touch targets | Open | Wave 8. |
| P1-11 Builder control affordance | Open | Wave 8. |
| P1-12 Required-step model | Open | Depends on artwork enforcement. |
| P1-13 Duplicate builder pricing | Open | Wave 8. |
| P1-14 Print-quality feedback | Open | Wave 4. |
| P1-15 Broken artwork fixtures | Closed | Valid SVG fixtures + MSW preview URLs replace 404 placeholder paths. |
| P1-16 Discarded email CTA | Open | Wave 7. |
| P1-17 Account recovery | Open | Wave 6. |
| P1-18 Checkout acknowledgements/errors | Open | Wave 5/8. |
| P1-19 Delivery disagreement | In Progress | Real `GET /delivery/next-cutoff` added; single-source persisted commitment still pending (Wave 5). |
| P1-20 Ambiguous cutoff copy | In Progress | Global strip now names order submission + manual payment and USA; single persisted commitment remains pending. |
| P1-21 Product decision facts | Open | Wave 9. |
| P1-22 Retractable imagery/artwork | In Progress | Artwork step now required; real product imagery remains an external asset dependency. |
| P1-23 Capability inconsistency | In Progress | Unsupported claims removed; tracking/reorder actions converged; password recovery & saved-design honesty remain (Wave 6). |
| P1-24 Artwork/color delivery effect | Open | Wave 4/5. |
| P1-25 Mobile shopping navigation | Open | Wave 8. |
| P1-26 Admin consumer chrome | Open | Wave 10. |

## Implementation batches

### PR 1 / Wave 0 — commerce safety and content honesty

**Status:** Closed

**Completed findings**

- Closed P0-05 for the locked internal-manual V1 disposition.
- Closed P0-09.
- Established the P0-12 external public-release blocker and internal noindex/access gate.
- Began P0-11, P1-20, and P1-23.

**Files changed**

- Commerce configuration/gates: `.env.example`, `backend/.env.example`, `frontend/lib/config/*`, `frontend/scripts/*`, `frontend/middleware.ts`, `frontend/package.json`, `frontend/tsconfig.json`.
- Internal-mode shell: `frontend/app/layout.tsx`, `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `frontend/components/nav/AnnouncementStrip.tsx`, `frontend/components/home/Footer.tsx`.
- Honest payment/content surfaces: `frontend/app/checkout/page.tsx`, `frontend/app/(account)/login/page.tsx`, `frontend/app/{page,reviews,templates,design}/page.tsx`, `frontend/app/dashboard/page.tsx`, `frontend/components/nav/siteNavigation.ts`, `frontend/content/placeholders.ts`.
- Removed unsupported testimonial sources/media: `frontend/components/home/Testimonials.tsx`, `frontend/content/testimonials.ts`, `frontend/public/images/placeholders/testimonial-featured.jpg`.
- Contract cleanup: `packages/api-client/src/types.ts`, `backend/src/orders/orders.dto.ts`.
- Regression coverage: `frontend/lib/config/*.test.ts`, `frontend/e2e/{app-shell,design-parity}.spec.ts`.

**Tests run**

- `npm run validate:commerce -w frontend` — passed.
- `npm run validate:content -w frontend` — passed.
- `npm run test -w frontend -- --run lib/config/commerce-mode.test.ts lib/config/unsafe-content.test.ts` — 12 passed.
- Frontend, API-client, and backend focused typechecks — passed.
- `npm run lint -w frontend` — passed.
- `npm run lint -w backend` — unavailable (backend has no lint script); root lint uses `--if-present`.
- Negative `public_live` production config probe — correctly failed with all missing live-commerce/policy requirements.

**Remaining dependencies**

- Approved legal policy URLs remain external blockers for `public_live`.
- Live payment and tax systems remain intentionally out of internal V1.

**Exact next batch**

- PR 2 / Wave 1: align authoritative backend order/status/quote contracts, remove mock-only proof/tracking behavior, add address/reorder parity, and make MSW startup deterministic.

### PR 2 / Wave 1 — contract convergence (real API ↔ client ↔ shared ↔ MSW)

**Status:** Closed

**Completed findings**

- Closed P0-04, P0-06, P0-07, P0-08, P1-03, P1-15.
- Advanced P0-01, P0-03, P0-11, P1-19, P1-22, P1-23.
- Removed the mock-only proof/status model in favor of the authoritative 8-state machine.
- Made MSW startup deterministic and eliminated the Serwist PWA worker defeating MSW in mock builds.

**Files changed**

- Order model: `packages/shared/src/order.ts`; frontend status maps in `frontend/app/{dashboard,orders}/page.tsx`, `frontend/components/orders/StatusHeroCard.tsx`.
- Quote contract: `packages/api-client/src/types.ts`, `backend/src/pricing/pricing.service.ts`, `frontend/lib/stores/cart.ts` (v2 fields), `frontend/components/builder/PriceHero.tsx`, `frontend/app/{checkout,order/retractable}/page.tsx`.
- Address: new `backend/src/address/*`, `packages/shared/src/address.ts`, `frontend/app/checkout/page.tsx`.
- Delivery: new `backend/src/delivery/delivery.controller.ts`.
- Reorder: `backend/src/orders/orders.{service,controller,dto}.ts`, `packages/api-client/src/{apiClient,types}.ts`, `frontend/lib/stores/cart.ts`, `frontend/app/{dashboard,orders,orders/[id]}/page.tsx`.
- Artwork format lock: `packages/shared/src/constants.ts`, `packages/api-client/src/mocks/handlers.ts`, `backend/src/artwork/{artwork-inspect,artwork.service}.ts`, `frontend/components/builder/ImagePickerOverlay.tsx`.
- Mock readiness: `frontend/app/providers.tsx`, `frontend/lib/mocks/init.ts`, `frontend/next.config.js` (Serwist `register: false` in mock mode).
- Tracking: `frontend/app/orders/lookup/page.tsx`, `frontend/components/nav/{TopNav,siteNavigation}.ts`, `frontend/app/help/page.tsx`.
- Retired fake proof: `frontend/app/orders/[id]/proof/page.tsx` (redirect), `packages/api-client/src/apiClient.ts`.
- Auth continuity: `frontend/lib/auth/return-url.ts`, `frontend/app/(account)/{login,register}/page.tsx`.
- Fixtures: `frontend/public/mock-artwork-{landscape,portrait}.svg`.
- Tests: `backend/src/{address/address.service,artwork/artwork-inspect,orders/orders.service,pricing/pricing.service}.spec.ts`, `frontend/e2e/helpers/auth.ts`, `frontend/e2e/{vinyl-builder,econostand,paper-modules}.spec.ts`.

**Tests run**

- `npm run typecheck` — all workspaces passed.
- `npm run lint` — no warnings/errors.
- `npm run test:ws` — backend 46 passed; api-client 9 passed; shared 59 passed; frontend 37 passed; design-tokens 10 passed.
- `NEXT_PUBLIC_ENABLE_MOCKS=1 npm run build` — compiled; `validate:commerce` + `validate:content` passed.
- `npm run e2e` — 59 passed, 35 skipped, 0 failed (after contract updates).

**Remaining dependencies**

- Formal MSW↔real-API contract-parity scenario table and `e2e:real` orchestration remain for Wave 11.
- Dimension orientation (Wave 2 / P0-10) is untouched and is the next highest-risk batch.

**Exact next batch**

- PR 6 (scroll-lock correctness) + Wave 2 (dimension semantics) / Wave 3 (cart re-quote).

### PR 6 — cart drawer scroll/focus restoration (P0-02)

**Status:** Closed

**Completed findings**

- Closed P0-02: the root-layout drawer never unmounts, so the unmount-only unlock never ran. It now saves the prior body overflow on open and restores it (and focus) on close button, backdrop, Escape, View Cart, Checkout, and route change.

**Files changed**

- `frontend/components/cart/CartDrawer.tsx` (save/restore overflow + focus, `usePathname` close-on-route-change, backdrop `data-testid`).
- `frontend/e2e/cart-drawer.spec.ts` (new regression spec).

**Tests run**

- `npm run e2e` — 66 passed, 36 skipped, 0 failed (includes 4 new drawer assertions across desktop/mobile).

**Exact next batch**

- Wave 2 (P0-10 dimension orientation: height × width, landscape defaults, persisted-state migration).

### Waves 2-11 — completed (parallel deepseek-v4-pro workers)

**Status:** Closed

**Waves implemented**

- Wave 2 (dimensions) — P0-10.
- Waves 3-5 (cart re-quote, uploaded-file review, checkout idempotency + delivery commitment) — P0-01, P0-03, P0-11, P1-18/19.
- Wave 6 (password recovery) — P1-17.
- Waves 7-9 (trust/content, accessibility, IA/perf) — P1-05/06/07/08/09/10/11/13/16/20/21/23/25.
- Wave 10 (admin isolation) — P1-26.
- Wave 11 (release gates: axe, audit:ci, e2e:real) — release definition of done.

**Validation**

- `npm run typecheck` / `npm run lint` — green.
- `npm run test:ws` — backend 51 tests; all workspaces pass.
- `NEXT_PUBLIC_ENABLE_MOCKS=1 npm run build` — green.
- `npm run e2e` — 92 passed, 62 skipped, 0 failed.
- `npm run audit:ci` — 13 passed (content scan + link/image crawl + metadata + console/network).
- `npm run e2e:real` — 5 passed against real Nest + Postgres/Redis.

**External blocker**

- None remaining for internal V1. `e2e:real` requires Docker Desktop (Postgres/Redis); it was started and passed during verification.
