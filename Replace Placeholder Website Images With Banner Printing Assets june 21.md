# Replace Placeholder Website Images With Banner Printing Assets

## Summary
- Replace all 21 off-brand images in `frontend/public/images/placeholders/` with cohesive banner and banner-printing-specific visuals.
- Keep the existing `PlaceholderImage` component and `frontend/content/placeholders.ts` wiring intact by preserving filenames, dimensions, and aspect-ratio intent.
- Leave `frontend/public/images/hero-print-workshop.png` unchanged because it is already relevant print-production imagery.

## Key Changes
- Generate a complete local asset set for:
  - Ordering/process: size selection, vinyl material choice, proof approval, packed/shipped banner.
  - Materials: 13 oz matte vinyl, 15 oz gloss vinyl, 18 oz blockout/heavy-duty vinyl.
  - Industries: contractor/jobsite banners, restaurant storefront banners, school/sports banners, event banners, retail/business banners, real estate/open-house banners.
  - Product/showcase/resources: desktop order UI, mobile order UI, production floor, testimonial/jobsite review, artwork help, FAQ/support, templates, how-it-works.
- Overwrite the existing placeholder image files in place so existing code references remain valid.
- Use photorealistic, commercial website-safe images with:
  - Clear vinyl banners, large-format printing, print shop equipment, rolled banners, grommets, hems, proofing, or installation context.
  - No fake brand names, no readable AI-generated slogans, no watermarks, no unrelated landscapes/objects.
  - Natural crops that still work with current `object-cover` usage.

## Implementation Details
- Use the built-in image generation flow to create project-bound bitmap assets, then save final selected outputs into `frontend/public/images/placeholders/`.
- Preserve current file extensions and image roles unless a format issue forces a same-path-compatible update.
- Update `frontend/content/placeholders.ts` only if generated dimensions materially differ from the current declared width/height.
- Keep testimonial fallback pointing at `/images/placeholders/testimonial-featured.jpg`, but replace the image with a banner-specific customer/jobsite review scene.

## Test Plan
- Run a static search after replacement to confirm no generic placeholder assets or unrelated stock-style visuals remain in the placeholder set.
- Run `npm.cmd run build` from the repo root to verify Next image imports/build output.
- Start the frontend locally and audit the homepage visually in desktop and mobile viewports.
- Browser QA checks:
  - Homepage loads and is not blank.
  - No framework error overlay.
  - Console has no relevant image/load errors.
  - All visible homepage image sections render banner-printing-specific visuals.
  - Cropping remains acceptable in hero-adjacent cards, industry grid, material cards, resources, testimonial, and product showcase.

## Assumptions
- Replacement source: generated local assets.
- Scope: all placeholder images, except the already-good hero image.
- Priority: make the visuals industry-specific now without redesigning layout, copy, navigation, or testimonial content.
