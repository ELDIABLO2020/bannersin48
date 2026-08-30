# Wave 11 — Release gates and regression suite

**Created:** 2026-08-29  
**Status:** implemented; real-backend E2E runnable when Docker/Postgres is available

Wave 11 makes "fixed" durable by adding two E2E modes, an accessibility suite,
and a production content/performance audit, all wired into CI.

---

## Commands

| Command | What it runs | Backend |
|---|---|---|
| `npm run ci` | typecheck → lint → unit tests → production build (mocks) → MSW Playwright E2E (now includes axe + keyboard/reflow/touch-target specs) | MSW (in-browser) |
| `npm run e2e` | The Playwright suite only (desktop Chromium + mobile WebKit) | MSW |
| `npm run e2e:real` | Canonical customer scenarios against the **real** Nest + Postgres/Redis backend | Real (Docker) |
| `npm run audit:ci` | Production unsafe-content scan + broken internal link/image crawl + metadata snapshot + console/network error assertions | MSW (production build) |

### `npm run e2e:real`

`frontend/scripts/e2e-real.sh` orchestrates the real backend:

1. preflight `docker` + a reachable daemon (exits `2` with a precise blocker otherwise),
2. `docker compose up -d` (Postgres 16 + Redis 7 from `backend/docker-compose.yml`),
3. `prisma migrate deploy` + the idempotent seed,
4. builds + starts the Nest API on `:3001`,
5. builds + starts the Next frontend **without mocks** on `:3000`,
6. runs `playwright -c playwright.real.config.ts` (`frontend/e2e-real/commerce.spec.ts`).

The release spec covers the §11.2 commerce scenarios:

- register with `?next=` return-to-builder
- landscape size (`8′ W × 4′ H`) and axis correctness
- real artwork upload + preview
- cart quantity 1 → 2 re-quote (`$138 → $276`)
- drawer close/reopen scroll+focus recovery
- unverified-address branch (risk acknowledgement)
- server rejection of a changed quote (`QUOTE_MISMATCH`, no order created)
- submit with idempotency + authoritative total, `RECEIVED` / `PENDING_PAYMENT`
- authenticated order tracking
- cancel in a valid state + rejection of a second cancel
- reorder returns a fresh current-price quote (and never creates an order)
- duplicate submission under one idempotency key returns the same order

### `npm run audit:ci`

`frontend/scripts/audit-ci.sh` runs against a locally-served production build:

1. `validate:content` + `validate:commerce` (production unsafe-string + commerce-mode scan),
2. `scripts/audit-links.mjs` — broken internal link/image crawl,
3. `scripts/audit-metadata.mjs` — metadata snapshot + invariants (no duplicated
   brand suffix, `noindex` in internal mode),
4. `playwright -c playwright.audit.config.ts` — console/network error assertions
   across primary routes (`e2e/console-errors.spec.ts`).

---

## Accessibility suite (`frontend/e2e/accessibility.spec.ts`)

- `@axe-core/playwright` WCAG A/AA scans on every primary route and state,
  failing on **serious/critical** violations only (`helpers/axe.ts`).
- Keyboard interaction specs: skip link, mega menu, mobile menu, Radix dialog
  focus trap/Escape/return, cart drawer, builder image picker, checkout empty
  state, admin sign-in gate, admin mobile menu.
- 320 px reflow + 200%-zoom-proxy (640 px) screenshots with no horizontal overflow.
- Touch-target checks: 44×44 primary CTAs, 24×24 minimum for secondary controls.

---

## CI wiring

- `.github/workflows/ci.yml` — `ci` job (fast gate) + `audit` job (content/perf).
- `.github/workflows/release-gate.yml` — full release gate including
  `e2e:real` (Docker), triggered manually or on `v*` tags.

---

## External blockers

`npm run e2e:real` requires a Docker daemon (Postgres 16 + Redis 7). When it is
unavailable the orchestrator prints a precise blocker and exits with code `2`,
so CI can distinguish *blocked* from *failed*. The MSW-backed `npm run e2e` and
`npm run audit:ci` remain fully runnable without Docker.
