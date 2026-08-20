# Public assets

## Brand marks

| File | Use |
|---|---|
| `images/logo.png` | Horizontal lockup for light backgrounds (top nav) |
| `images/logo-dark.png` | Horizontal lockup for dark backgrounds (footer) |
| `images/logo-mobile-header.png` | Light-background lockup for the mobile header strip |
| `icons/icon-192.png`, `icons/icon-512.png` | PWA icons, mark centred on brand black |
| `icons/icon-maskable-512.png` | Maskable PWA icon, extra padding for the safe zone |

The favicon (`app/icon.png`), Apple touch icon (`app/apple-icon.png`), and Open Graph
card (`app/opengraph-image.png`) live in the app directory under the Next.js file
conventions, not here.

## Provenance — these are placeholders

Every mark above was extracted from the raster brand board the client supplied
(1024x766 PNG), not from vector artwork. Two consequences:

1. They are pinned to the board's resolution and will soften if scaled much beyond
   the nav and footer sizes currently in use.
2. The board only shows the lockup on black and dark grey, where the clock arc and
   the word "IN" are white. For the light-background variants those achromatic
   elements were recoloured to near-black (`#100F0D`) so they read on white. That
   recolour is an inference, not something the board specifies.

Replace all of them once the client provides the vector originals (SVG/AI/EPS).
