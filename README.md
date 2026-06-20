# Banners In 48

Speed-first custom banner ordering platform — npm workspaces monorepo.

## Structure

| Path | Description |
|---|---|
| `frontend/` | Next.js 14 app (App Router, Tailwind, GSAP, PWA) |
| `packages/` | Shared design tokens, schemas, and API client |
| `backend/` | NestJS API scaffold (not yet implemented) |

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000). In development, MSW mocks intercept API calls automatically.

Other useful commands:

```bash
npm run build    # build packages + frontend
npm run test     # unit tests
npm run e2e      # Playwright end-to-end tests
npm run lint     # lint all workspaces
```

Copy `.env.example` to `.env` and adjust values as needed.

## Deployment (Vercel)

This project deploys to Vercel via GitHub integration. Vercel must be configured with:

- **Root Directory:** `frontend`
- **Node.js Version:** 20.x

The [`frontend/vercel.json`](frontend/vercel.json) file runs install and build from the monorepo root so workspace packages are available.

Recommended environment variables:

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://bannersin48.vercel.app` |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL when deployed |

## Planning docs

- [`bannersin48-final-website-structured-plan.md`](bannersin48-final-website-structured-plan.md) — product spec
- [`phase1-build-test-plan.md`](phase1-build-test-plan.md) — engineering plan
- [`www.housecallpro.com-DESIGN.md`](www.housecallpro.com-DESIGN.md) — **canonical design system** (navy + gold CTAs + blue links). Implemented in [`packages/design-tokens/src/tokens.ts`](packages/design-tokens/src/tokens.ts).
- [`docs/archive/ecwid-redesign-structured-refactoring-plan.md`](docs/archive/ecwid-redesign-structured-refactoring-plan.md) — deprecated; do not use for styling
