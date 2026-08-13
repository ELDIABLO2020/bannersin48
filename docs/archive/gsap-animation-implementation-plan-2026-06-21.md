# GSAP Animation Implementation Plan - 2026-06-21

## Summary

- GSAP is already installed in `frontend/package.json`, with shared setup in `frontend/lib/gsap/registry.ts`.
- Existing GSAP usage before this pass was limited to the homepage hero entrance sequence and FAQ accordion transitions.
- The first implementation phase focuses on subtle, conversion-safe marketing motion on the homepage.
- Checkout, artwork upload, cart, and order-status flows should stay function-first, with no animated field movement, delayed pricing, or drag/drop animation that can affect reliability.

## Implementation Scope

- Add a reusable client-only scroll reveal wrapper backed by the shared GSAP presets.
- Apply scroll-triggered reveal and stagger animations to homepage marketing sections:
  - `SocialProofBand`
  - `PopularSizes`
  - `MaterialsBand`
  - `FeaturedTestimonial`
  - `FlagshipBand`
  - `HowItWorks`
  - `ProductShowcase`
  - `IndustriesGrid`
  - `GuaranteePanel`
  - `TestimonialsCarousel`
  - `ResourcesBand`
  - `EmailCapture`
  - `ContactBand`
- Keep CSS hover states and the existing use-case marquee in place.
- Keep server-rendered content readable before JavaScript runs. GSAP should animate from visible markup at runtime, not depend on hidden initial CSS.

## Animation Standards

- Use small movements only: 12-16px slide distances, short fade/slide durations, and light staggers.
- Respect `prefers-reduced-motion` globally.
- Use `useGSAP` and `gsap.context` cleanup through the shared registry and wrapper.
- Use grouped reveals for repeated cards and single-block reveals for headings, media, and CTA panels.
- Avoid converting whole server components to client components unless the client wrapper alone cannot cover the interaction.

## Test Plan

- Run `npm.cmd run typecheck -w @bannersin48/frontend`.
- Run `npm.cmd run test -w @bannersin48/frontend`.
- Run Playwright homepage checks on desktop and mobile:
  - existing `app-shell.spec.ts`
  - existing `design-parity.spec.ts`
  - reduced-motion coverage to confirm content remains visible
- Manual QA:
  - desktop 1440px homepage scroll
  - mobile iPhone homepage scroll
  - `/order/vinyl`
  - `/order/artwork`
  - `/cart`

## Acceptance Criteria

- No layout shift caused by animation wrappers.
- No hidden content if JavaScript fails or reduced motion is enabled.
- No new hydration warnings from the animation layer.
- Homepage content remains readable and fast before animations run.
- Checkout, upload, and cart flows remain visually stable and interaction-first.
