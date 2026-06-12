# Banners In 48 — Phase 1 Build & Test Plan (Desktop + Mobile PWA, E2E)

> Companion to [bannersin48-final-website-structured-plan.md](bannersin48-final-website-structured-plan.md).
> Scope: **Phase 1 Revenue MVP**, built end-to-end as one responsive Next.js application serving the desktop website and the mobile PWA.
> **Visual design — single source:** the design system in `www.housecallpro.com-DESIGN.md` (navy foundations, gold CTAs, blue interactives, Open Sans / Headline Gothic). It governs **all** colors, typography, components, spacing, radii, and shadows on both desktop and mobile.
> **Layout/IA reference — mobile only:** the 48HR Banners mobile mockup screenshots are used **only for how things are positioned** — the app-like structure (bottom tab bar, screen composition, step flow, card arrangement). None of the mockup's colors, fonts, or copy carry over.
> Engineering discipline: **Karpathy guidelines** (think before coding, simplicity first, surgical changes, goal-driven execution) applied to every milestone.
> Backend stack: NestJS + PostgreSQL + Prisma + Redis/BullMQ, already scaffolded in `backend/` (dependencies installed).

---

## 0. Governing Rules

### 0.1 Code Is the Source of Truth

Mockups and design files are **references**. Every number, date, price, and business rule shown in the UI must come from code/config — never be hardcoded from a reference image. Concretely:

| Truth | Lives in | Consumed by |
|---|---|---|
| Data model | `backend/prisma/schema.prisma` | Generated Prisma client; migrations |
| Pricing rules (rates, add-ons, shipping) | `PricingConfig` DB table + seed; pricing engine service | Frontend via `POST /pricing/quote` — the frontend **never computes a price** |
| Cutoff & delivery schedule | `CutoffRule`/`Holiday` tables + delivery engine service | Frontend via `GET /delivery/next-cutoff` (countdown) and order responses (guaranteed date) |
| API contract | NestJS controllers + `@nestjs/swagger` → generated `openapi.json` | `packages/api-client` (generated TypeScript client) — frontend imports types, never hand-writes them |
| Validation rules | Zod schemas in `packages/shared` (sizes 1–10 ft, qty 1–10, PDF/JPG/JPEG only, pole-pocket incompatibility) | Reused verbatim by backend pipes and frontend forms — one definition, two consumers |
| Design tokens (colors, type, spacing, radii, shadows) | `packages/design-tokens/tokens.ts`, transcribed once from `www.housecallpro.com-DESIGN.md` | Tailwind preset + CSS variables; the tokens **file** is authoritative from then on |
| UI components | shadcn/ui pattern — components are **copied into the repo** and owned as code, not consumed as a styled black-box dependency | All screens |

**Known reference/plan conflicts — resolved in favor of code/config (surfaced per Karpathy Rule 1):**

1. Mockup shows flat **"$4/Sq Ft"** copy → final plan specifies tiered rates (13 oz $4.00 / 15 oz $4.75 / 18 oz $5.25 / DS $7.50). UI copy reads rates from the quote API.
2. Mockup shows **"Order by 9PM Mon–Sat"** → final plan specifies the 9:00 PM **Eastern Time** daily cutoff with the weekly delivery table. Countdown and cutoff copy come from the delivery engine endpoint.
3. Mockup order screen shows **"By 7:00 PM"** delivery → final plan guarantees **12:00 PM noon**. The guaranteed date/time renders from the order record.
4. Mockup finishing options ("Hemmed Edges, Grommets every 2 ft") differ from the developer report's finishing model (welding/grommets included, wind slits, pole pockets). Build the report's model; the visual *card-selector pattern* follows the mockup's positioning.
5. Mockup shows Design Editor, AI Assistant, and Templates screens — these are **Phase 2/3** in the final plan. Phase 1 ships them as **feature-flagged "Coming soon" shells** so the tab bar matches the mockup's structure without building unscoped features (Karpathy Rule 2: nothing speculative).
6. Mockup brands as **"48HR Banners"**; the developer report's brand is **"Banners In 48" / BannersIn48.com**. Build with "Banners In 48" (report is authoritative); logo/lockup is an open item.
7. Mockup colors (dark navy + lime green) are **discarded entirely** per this revision — all styling comes from the Housecall Pro design system file.

### 0.2 Karpathy Guidelines — How They Apply Here

1. **Think before coding** — each milestone below opens with its assumptions; any new ambiguity stops work and gets asked, not guessed.
2. **Simplicity first** — one responsive app, one design theme, not two. No state library beyond what's needed (server state = TanStack Query; the only client state store is the order configurator). No editor, no AI, no template engine in Phase 1. No abstraction until a second consumer exists.
3. **Surgical changes** — work proceeds milestone by milestone; diffs touch only the milestone's files. Generated artifacts (`api-client`, Prisma client) are regenerated, never hand-edited.
4. **Goal-driven execution** — every milestone ends with a **verify** step that is a runnable command (test suite, E2E spec, Lighthouse budget). A milestone is done when its verification passes, not when the code "looks done."

---

## 1. Phase 1 Scope (What Ships)

**In scope (from the final plan's Revenue MVP):**

- Homepage with live cutoff countdown (desktop + mobile)
- Vinyl banner order flow: size (quick-picks + custom ft/in), material, finishing (with pole-pocket incompatibility enforcement), quantity, live server-side quote
- Retractable banner product page ($175 flat)
- Artwork upload (PDF/JPG/JPEG only, validated client- and server-side)
- Mandatory accounts: register / login / JWT sessions; guest browsing
- Checkout: address + validation stub, acknowledgements, payment stub (Stripe/PayPal adapters with test mode)
- Instant proof page with 5 acknowledgements → 10-minute cancellation window → automatic production transfer (BullMQ)
- Customer dashboard: recent orders with status badges, order detail with timeline, reorder (artwork locked)
- PWA: installable, offline app shell, bottom tab bar in mobile/standalone mode
- Admin API endpoints (order list/filter, exceptions, config) — admin UI is API-first in Phase 1 (minimal table screens only)

**Explicitly out of scope (feature-flagged shells only):** design editor, AI assistant, template library, graduation module, rewards UI (backend foundation only), reviews UI.

---

## 2. Repository Layout (npm workspaces monorepo)

```text
Bannersin48/
├─ package.json                  # workspaces root: backend, frontend, packages/*
├─ backend/                      # NestJS API + worker (already scaffolded, deps installed)
│  ├─ prisma/schema.prisma       # ← data model source of truth
│  └─ src/{pricing,delivery,orders,auth,artwork,payments,shipping,production,admin,jobs}/
├─ frontend/                     # Next.js app — desktop + mobile PWA
│  ├─ app/                       # App Router routes (see §5)
│  ├─ components/ui/             # shadcn-pattern components (owned code)
│  ├─ lib/api/                   # thin wrappers over generated client
│  └─ e2e/                       # Playwright specs
├─ packages/
│  ├─ design-tokens/             # tokens.ts → Tailwind preset + CSS vars (single theme, from the design file)
│  ├─ shared/                    # Zod schemas + constants shared by backend & frontend
│  └─ api-client/                # GENERATED from backend openapi.json — do not edit
└─ docker-compose.yml            # postgres:16 + redis:7 (already in backend/, move to root)
```

---

## 3. Libraries — Install These First

All versions are pinned majors of proven, widely-deployed tools. No subscription-model SaaS SDKs; payments/shipping are usage-priced and stubbed behind interfaces.

### 3.1 Root (workspace tooling)

```powershell
npm init -y   # then set "workspaces": ["backend", "frontend", "packages/*"]
npm i -D typescript@~5.4 prettier@^3
```

### 3.2 Backend (`backend/` — already installed, plus two additions)

Already present: `@nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/jwt @prisma/client prisma bullmq ioredis bcryptjs class-validator class-transformer jest ts-jest`

Add for the contract pipeline and shared validation:

```powershell
cd backend
npm i @nestjs/swagger@^7        # OpenAPI generation → feeds packages/api-client
npm i zod@^3.23                  # consume packages/shared schemas in pipes
```

### 3.3 Frontend (`frontend/`)

```powershell
npx create-next-app@14 frontend --typescript --tailwind --app --eslint --src-dir=false
cd frontend

# UI foundation (shadcn pattern: code copied into repo, Radix primitives under the hood)
npx shadcn@latest init
npm i class-variance-authority@^0.7 clsx@^2 tailwind-merge@^2 lucide-react@^0.4xx
npm i @radix-ui/react-dialog @radix-ui/react-radio-group @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-dropdown-menu

# Data & state
npm i @tanstack/react-query@^5          # server state (quotes, orders, countdown)
npm i zustand@^4.5                       # one store: the order configurator
npm i react-hook-form@^7 zod@^3.23 @hookform/resolvers@^3

# Typed API client (generated — code as source of truth)
npm i openapi-fetch@^0.12
npm i -D openapi-typescript@^7

# PWA (Serwist = maintained successor of next-pwa, Workbox-based)
npm i @serwist/next@^9
npm i -D serwist@^9
```

Fonts via `next/font` (no extra package): **Open Sans** (body/UI/nav, per design file), **Plus Jakarta Sans** (inputs/labels). *Headline Gothic ATF is a licensed font — open item; interim display stand-in served via `next/font` with Georgia serif fallback chain exactly as the design file specifies.*

### 3.4 Testing (frontend dev-deps unless noted)

```powershell
# Unit + component
npm i -D vitest@^2 @vitejs/plugin-react@^4 jsdom@^24 @testing-library/react@^16 @testing-library/user-event@^14 @testing-library/jest-dom@^6

# API mocking for component tests (mocks match the generated contract)
npm i -D msw@^2

# E2E — desktop + mobile emulation + PWA checks (root-level install)
npm i -D @playwright/test@^1.45
npx playwright install chromium webkit

# Accessibility + performance gates
npm i -D @axe-core/playwright@^4
npm i -D @lhci/cli@^0.14
```

Backend tests stay on the already-installed **Jest** (don't churn working tooling — Karpathy Rule 3).

---

## 4. Design System (One Theme — `www.housecallpro.com-DESIGN.md`)

`packages/design-tokens/tokens.ts` is transcribed **once** from the design file and is authoritative thereafter. Components reference semantic names (`bg-surface`, `text-link`, `bg-cta`) — never raw hex (enforced by lint rule).

### 4.1 Tokens (from the design file)

- **Backgrounds:** navy base `#13191E`, deep navy `#002942`, dark navy `#0E2634`, surface `#FFFFFF`, tint `#F5F5F5`, light-blue info tint `#DEF0FF`
- **CTA (gold, conversion only):** `#FF9B24` (hover `#FFB706`, active `#FCB900`), text-on-CTA `#13191E`
- **Interactive/links (blue):** `#0F77CC` (hover `#0055FF`, active `#002942`)
- **Text:** `#212121` on light, `#FFFFFF` on dark (never dark text on navy), secondary `#979797`, error `#CF2E2E`
- **Badges:** success `#E8F5E9`/`#2E7D32`, warning `#FFF3E0`/`#F57C00`, error `#FFEBEE`/`#CF2E2E` — 12px/600, `4px 12px`, radius 16
- **Type:** Headline Gothic ATF for display only — H1 83px/85, H2 68px/68 (scaling 83→48→32 across desktop→tablet→mobile); Open Sans body 16/24, H4 18/700, H5 14/700; weights 400/700 only
- **Radii:** 8 (buttons), 16 (feature cards), 24 (cards), 100 pill (inputs `100px 0 0 100px` + attached CTA `0 100px 100px 0`)
- **Shadows:** L1 `0 2px 8px rgba(0,0,0,.08)` (cards/inputs) → L4 `0 12px 32px rgba(0,0,0,.2)` (tooltips); never on full-width sections
- **Spacing scale (exclusive):** 4/8/12/16/20/24/32/40/64/80; grids 12-col/40px (desktop), 8-col/24px (tablet), 4-col/16px (mobile); containers 1200px (hero 1440px)
- **Touch targets:** ≥44×44px, ≥16px between targets, inputs 40px mobile / 54–56px desktop

### 4.2 Mobile app layout, styled with these tokens

The mockup contributes **positioning only**. Mapping of its layout patterns to design-file styling:

| Layout element (from mockup) | Styling (from design file) |
|---|---|
| Bottom tab bar, 5 tabs (Home, Orders, Design, Templates, Account), fixed | Navy base `#13191E` bar; inactive icons/labels `#FFFFFF` at reduced emphasis; active tab `#FF9B24`; labels Open Sans 11px; 44px touch targets |
| Dark hero with emphasized headline lines + primary CTA | Navy base background, white display type, **gold** emphasis spans, gold CTA button (radius 8, `12px 40px`) |
| Countdown card under hero (HRS : MINS : SECS + cutoff note) | Deep navy `#002942` card, radius 24, white tabular-numeral digits, secondary text `#979797` |
| Quick-action row (Upload Artwork / Design Online / AI Helper) | White cards, radius 16, L1 shadow, blue `#0F77CC` icons, Open Sans 14/700 labels |
| Popular-size chips | White chips, `1px solid #E0E0E0`, radius 8; selected: light-blue tint `#DEF0FF` + `1px solid #0F77CC` |
| 3-step configurator (numbered sections, radio cards, sticky price footer) | Section headers Open Sans 18/700; option cards white radius 16 with L1 shadow; selected card `#DEF0FF` bg + blue border; sticky footer white, top border `#E0E0E0`, price 18/700 `#212121`, gold CTA full-width |
| Status hero card on order detail (colored banner with state) | Blue `#0F77CC` background, white text, radius 16 (semantic blue = informational; gold stays conversion-only per design file Don'ts) |
| Order timeline (checkpoints with dates) | Done: blue `#0F77CC` markers; current: blue filled + light-blue ring; pending: `#BDBDBD`; labels Open Sans 14/700 + 11px metadata |
| Status badges on order list (In Production / Shipped / Delivered) | Design-file badge styles: warning (In Production), success (Shipped, Delivered) |
| Dashboard profile header + quick actions + recent orders | White cards radius 24, 24px padding, L1 shadow on `#F5F5F5` page background |
| Search + category chips (Templates shell) | Pill input `100px 0 0 100px` with attached gold CTA `0 100px 100px 0`, border `#BDBDBD`, blue focus glow |

**Desktop** follows the design file natively: 64px white top nav with L1 shadow and blue link states, full-bleed navy heroes with 80px padding, 1200px content containers, 12-col grid, two-column configurator (options left, sticky summary card right).

### 4.3 Theme mechanics

- **One theme.** No theme switching — a single CSS-variable block from `tokens.ts`; desktop vs mobile differences are **responsive layout** (breakpoints 600/1024/1400 from the design file), not color systems.
- Bottom tab bar renders <1024px or in `display-mode: standalone`; top nav renders ≥1024px (hamburger collapse per design file on tablet).
- Verify (M2): snapshot test asserts every token in §4.1 exists in `tokens.ts`; lint rule rejects raw hex in component files.

---

## 5. Screen Inventory & Routes

Layout column = positioning reference from the mockup screens; all styling per §4.

| Route | Mobile layout (mockup ref) | Desktop layout (design file) | Phase 1? |
|---|---|---|---|
| `/` Home | Screen 1: hero → countdown card → quick actions → popular sizes → "why choose" list → FAQ; tab bar | Navy hero (83px display, gold CTA), light sections in 1200px container, 64px top nav | ✅ |
| `/order` | Screen 2: numbered steps (size → material → finishing) + sticky price footer | Two-column: configurator left, sticky summary/guarantee card right | ✅ |
| `/order/retractable` | Same pattern, fixed size/price | Same pattern | ✅ |
| `/order/artwork` | Upload card (PDF/JPG/JPEG), requirements checklist | Drag-drop zone + requirements panel | ✅ |
| `/checkout` | Stacked: login gate → address → payment → acknowledgements | Two-column with order summary | ✅ |
| `/orders/[id]/proof` | Proof preview + 5 acknowledgement checkboxes + approve | Side-by-side proof and spec sheet | ✅ |
| `/orders/[id]` | Screen 6 layout: status hero card → delivery date → timeline → details → price breakdown | Wide timeline + detail panels | ✅ |
| `/dashboard` | Screen 5 layout: profile header → quick-action grid → recent orders → saved designs | Table + cards layout | ✅ (Brand Kit/Saved = shells) |
| `/login`, `/register` | Stacked forms | Centered card on navy | ✅ |
| `/design` | Screen 3 layout | — | 🚩 Flagged shell ("Coming soon") |
| `/templates` | Screen 4 layout: search, category chips, grid | — | 🚩 Flagged shell |
| `/admin/*` | — | Minimal tables: orders, exceptions, config | ✅ API-first, minimal UI |

**PWA deliverables:** `manifest.json` (name "Banners In 48", standalone, `theme_color: #13191E`, `background_color: #13191E`, icons 192/512 + maskable, gold-on-navy mark), Serwist service worker (precache app shell, runtime cache for static assets, network-first API, offline fallback page), install prompt on second visit, bottom tab bar in mobile/standalone contexts.

---

## 6. Build Sequence (Milestones with Verification)

Each milestone = one PR-sized unit. **Done = its verify command passes.**

### M0 — Monorepo & toolchain
Convert to npm workspaces; move docker-compose to root; root scripts (`build`, `test`, `e2e`, `lint`); CI script order: typecheck → unit → build → e2e.
**Verify:** `npm install && npm run build -ws` succeeds from clean clone; `docker compose up -d` starts Postgres + Redis.

### M1 — Backend completion (resume scaffold)
Finish the modules already designed: Prisma schema + migration + seed (pricing config, cutoff rules, admin user); pricing engine; delivery engine; auth; orders state machine with 10-minute BullMQ delayed job; artwork upload; payment/FedEx/storage stubs; production package builder; admin endpoints; `@nestjs/swagger` wired and `openapi.json` emitted to disk on build.
**Verify:** `cd backend && npm test` — Jest suites must include: (a) the plan's **5 pricing examples** ($138 / $70 / $162 / $534 / $770) and **6 rounding examples**, (b) the **6-row cutoff table** incl. the Thu 9:01 PM–Sun 9 PM weekend cycle, (c) pole-pocket incompatibility normalization, (d) order state-machine transitions. `npx prisma migrate dev && npm run seed` clean on fresh DB.

### M2 — Shared packages
`packages/design-tokens` (single theme per §4.1); `packages/shared` (Zod: dimensions, quantity, file types, finishing rules); `packages/api-client` generation script: `openapi-typescript backend/openapi.json -o packages/api-client/schema.d.ts`.
**Verify:** token snapshot test passes; no-raw-hex lint rule active; backend pipes and a sample frontend form both import the same Zod schema and typecheck; regenerating the client from a changed controller produces a compile error in a deliberately stale consumer (proves the contract bites).

### M3 — App shell, navigation, PWA scaffold
Next.js root layout with token CSS variables; desktop top nav (64px white, blue link states per design file) + mobile bottom tab bar (5 tabs per mockup layout, navy/gold per §4.2, flagged tabs marked "Soon"); fonts via `next/font`; manifest + Serwist service worker + offline fallback; feature-flag module (env-driven).
**Verify:** Playwright smoke at 1440×900 (top nav, no tab bar) and iPhone 14 viewport (tab bar, no top nav); `lhci autorun` reports PWA installable = pass; offline E2E: kill network in Playwright context → offline page serves.

### M4 — Homepage
Hero (navy + gold per design file), countdown card (TanStack Query polling `GET /delivery/next-cutoff`, ticking client-side between refetches), quick actions, popular sizes (prices from quote API), trust/"why choose" section, FAQ — mobile composition per mockup screen 1, desktop per design-file section patterns.
**Verify:** Playwright (desktop + mobile projects): countdown shows API-derived target, not a hardcoded date; popular-size card prices equal `POST /pricing/quote` responses fetched in-test; axe scan: no critical violations; computed style of primary CTA equals token `#FF9B24`.

### M5 — Order configurator + artwork upload
Numbered-step flow per mockup screen 2 layout: size (quick-picks + custom ft/in with billable-size display), material (3 radio cards), finishing (visual cards; selecting pole pockets disables & clears grommets/welding with the exact plan message), quantity (1–10), sticky live price (debounced quote calls — server price only); upload with client-side type check + server validation; reject >10 ft → custom-quote contact path.
**Verify:** Playwright: for each of the 5 plan pricing examples, configure UI → displayed total equals API quote; entering 2'1" shows billable 3'; selecting pole pockets unchecks grommets/welding and shows the message; uploading a `.png` is rejected with visible error; component tests (Vitest+MSW) for the configurator store reducer.

### M6 — Accounts & checkout
Register/login (JWT, httpOnly cookie via route handler proxy), guest-browse/auth-gate at checkout, address form + validation-stub flow with risk acknowledgement branch, payment step (stub provider, test cards), guaranteed-date acknowledgement checkbox, order creation.
**Verify:** Playwright E2E: anonymous user configures banner → checkout forces registration → completes payment → order exists via API with status `AWAITING_PROOF_APPROVAL`; unverified-address branch requires risk acknowledgement before continue.

### M7 — Proof, cancellation window, order tracking
Proof page (preview, full spec, 5 acknowledgements — approve disabled until all checked); post-approval screen with live 10-minute cancel countdown and cancel button; order detail page per mockup screen 6 layout (status hero card styled blue per §4.2, guaranteed delivery "by 12:00 PM", timeline, price breakdown).
**Verify:** E2E with `CANCELLATION_WINDOW_MS` env shortened to 5s in test: (a) approve → cancel inside window → status `CANCELLED`; (b) approve → wait → status auto-advances to `READY_FOR_TRANSFER`/`TRANSFERRED_TO_PRODUCTION` and production package row exists; timeline renders all states from the API status enum (no hardcoded labels).

### M8 — Dashboard & reorder
Dashboard per mockup screen 5 layout: profile header, quick actions (flagged ones inert), recent orders with design-file badge styles, order list; reorder flow: artwork locked (no upload step), finishing/quantity editable, new proof + new cancellation window.
**Verify:** E2E: place order → reorder it → artwork step is skipped/locked, changing quantity reprices via API, second order gets its own proof and window.

### M9 — Hardening & full E2E gate
Cross-browser run (chromium + webkit), full a11y sweep, Lighthouse budgets, error/empty/loading states, README runbook.
**Verify (release gate):** `npm run e2e` green across both Playwright projects; axe: zero critical/serious on all Phase 1 routes (design file requires WCAG AA contrast); LHCI budgets: Performance ≥ 85 (mobile), PWA installable, a11y ≥ 95; `npm run build` clean with zero TS errors.

---

## 7. Test Strategy Summary (E2E means end-to-end: UI → API → DB → queue)

| Layer | Tool | What it proves | Where |
|---|---|---|---|
| Unit (backend) | Jest | Pricing formulas, rounding, cutoff table, state machine — the plan's exact numeric examples | `backend/src/**/*.spec.ts` |
| Unit (frontend) | Vitest | Configurator store logic, form schemas, token integrity | `frontend/**/*.spec.ts(x)` |
| Component | Vitest + Testing Library + MSW | Screens render correct states against contract-shaped mocks | `frontend/components/**` |
| Contract | openapi-typescript codegen in CI | Frontend cannot drift from backend API | `packages/api-client` |
| E2E | Playwright, two projects: `desktop-chromium` (1440×900) and `mobile-webkit` (iPhone 14 emulation, touch) | Full journeys against real backend + Postgres + Redis (docker compose in CI) | `frontend/e2e/` |
| PWA | Playwright (offline context, manifest assertions) + Lighthouse CI | Installability, offline shell, manifest/theme color = `#13191E` | `frontend/e2e/pwa.spec.ts` |
| Accessibility | @axe-core/playwright | WCAG AA per design file requirement | all route specs |
| Performance | LHCI budgets | Mobile-first speed promise from the plan | CI gate |

**Canonical E2E journey (must stay green from M6 onward):**
register → configure 4'×8' 13 oz qty 1 → upload PDF → checkout ($138 asserted) → approve proof → (shortened window) auto-transfer → dashboard shows In Production → order detail timeline correct.

---

## 8. Open Items (ask, don't assume — Karpathy Rule 1)

1. **Headline Gothic ATF license** for display headlines; Georgia-serif fallback chain (per the design file) serves until purchased.
2. **Logo/lockup** for "Banners In 48" in the navy + gold system (mockup's "48HR Banners" mark is discarded with the rest of its styling).
3. Real Stripe/PayPal/FedEx credentials and tax service activation — stubs until provided.
4. Confirm the "In Production" status hero treatment (blue informational per design-file semantics) — gold is reserved for conversion CTAs by the design file's own Don'ts.
