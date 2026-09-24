# Banners In 48

Speed-first custom banner ordering platform — npm workspaces monorepo.

## Structure

| Path | Description |
|---|---|
| `frontend/` | Next.js 14 storefront, builder and admin (App Router, Tailwind, GSAP, PWA) |
| `backend/` | NestJS + Prisma API (auth, catalog, pricing, artwork, orders, admin) |
| `packages/shared` | Pricing engine, product config, dimensions, delivery rules, used by both frontend and backend |
| `packages/api-client` | Typed API client + MSW mock handlers |
| `packages/design-tokens` | Brand tokens and Tailwind preset |
| `docs/` | [Architecture & decisions](docs/architecture.md), [API map](docs/api.md) |

## Local development

Requires Node.js 20+. Copy `.env.example` to `.env` (and `backend/.env.example` to `backend/.env`).

```bash
npm install
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_ENABLE_MOCKS=1`
to let MSW mocks serve the API. Without it, run the real backend on `:3001`:

```bash
docker compose -f backend/docker-compose.yml up -d   # Postgres 16
npm exec -w backend -- prisma migrate deploy
npm run seed -w backend
npm run start:dev -w backend
```

## Checks

| Command | What it runs |
|---|---|
| `npm run ci` | typecheck → lint → unit tests → mock production build → Playwright E2E + axe (MSW) |
| `npm run e2e` | Playwright only (desktop Chromium + mobile WebKit, MSW) |
| `npm run e2e:real` | Release scenarios against the real Nest + Postgres backend. Needs Docker; exits `2` if Docker is unavailable |
| `npm run audit:ci` | Production content scan, broken link/image crawl, metadata snapshot, console/network errors |

CI: `.github/workflows/ci.yml` runs `ci` + `audit:ci` on every push and PR.
`release-gate.yml` also runs `e2e:real`, on `v*` tags or manually.

## Design tokens

Colors, type, spacing and radii live in [`packages/design-tokens/src/tokens.ts`](packages/design-tokens/src/tokens.ts).
Run `npm run sync-css -w @bannersin48/design-tokens` to sync them into `frontend/app/globals.css`.
The brand palette is magenta `#CB1079` (actions), green `#3EAF2C` (money/confirmed) and black.

## Deployment (Vercel)

The frontend deploys to Vercel through the GitHub integration, with **Root Directory** `frontend` and
**Node.js** 20.x. [`frontend/vercel.json`](frontend/vercel.json) installs and builds from the
monorepo root so the workspace packages are available. Production domain: `https://bannersin48.com`
(project `bannersin48-frontend`).

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://bannersin48.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL when deployed |
| `NEXT_PUBLIC_COMMERCE_MODE` | `internal_manual` (see [architecture](docs/architecture.md)) |
