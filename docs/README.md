# Docs

Working notes for Banners In 48. The running app is the source of truth; these files are context, not runtime config.

## Layout

| Path | What belongs here |
|---|---|
| [`archive/`](archive/) | Completed or superseded plans and audits |
| [`research/signs365/`](research/signs365/) | Competitor catalog research used for the BANNER rebuild |

## Design tokens

Colors, type, spacing, and radii live in `packages/design-tokens/src/tokens.ts` and
sync into `frontend/app/globals.css` via `npm run sync-css -w @bannersin48/design-tokens`.
The palette is sampled from the client brand board (magenta `#CB1079`, green `#3EAF2C`,
black `#000000`). The Housecall Pro palette that preceded it is archived below and is no
longer authoritative.

## Current UX work

- [Comprehensive front-end UX audit (2026-08-23)](frontend-ux-audit.md)
- [Front-end UX remediation plan (2026-08-23)](frontend-ux-remediation-plan.md)

## Archive

- [Phase 1 build & test plan](archive/phase1-build-test-plan.md)
- [HCP design audit (2026-06-20)](archive/design-audit-hcp-2026-06-20.md) — superseded
- [GSAP animation plan (2026-06-21)](archive/gsap-animation-implementation-plan-2026-06-21.md)

## Signs365 research

Do not copy Signs365 colors, logos, fonts, or marketing copy into the app.

- [Catalog hub map](research/signs365/catalog-map.md)
- [Per-module behavior](research/signs365/modules-e2e.md)
- [Rebuild contract](research/signs365/rebuild-contract.md)
- [Screenshots](research/signs365/evidence/)
