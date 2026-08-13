# Signs365 BANNER catalog hub map

Source: live session on 2026-08-12. URL: `https://www.signs365.com/portal/#catalog/2`. Page title: **Banner · Signs365**.

Evidence: [docs/signs365-banner-evidence/hub__banner-catalog.png](signs365-banner-evidence/hub__banner-catalog.png), [hub__banner-catalog-econostand.png](signs365-banner-evidence/hub__banner-catalog-econostand.png).

This file maps only the BANNER catalog hub and shared chrome. Per-module builders are in [signs365-banner-modules-e2e.md](signs365-banner-modules-e2e.md). Rebuild notes are in [signs365-banner-rebuild-contract.md](signs365-banner-rebuild-contract.md).

## Session / access

- Authenticated portal session (hamburger MENU lists Manage Account, Manage Payments, Order History, Product Catalog, How To Videos, What's New?, Logout).
- Cart badge showed **2** during capture. Do not treat that as a default empty state.
- Hash-only navigation to `#catalog/2` can render an empty grid (`/API/product/category/NaN/children`). Recovery: click the **BANNER** nav tile. After that, title becomes `Banner · Signs365` and 7 cards load.
- No login wall, captcha, or session expiry during this capture.

## Shared chrome (all BANNER catalog + order pages)

### Top nav — category tabs (center)

Observed left-to-right. BANNER is selected on this hub (`header__selected`). APPAREL shows a **NEW** badge.

| Tab | Selected on hub? | Hash after click | Page title | Mapped this session? |
|---|---|---|---|---|
| BANNER | Yes (yellow/active underline) | `#catalog/2` | Banner · Signs365 | Yes — this file |
| RIGID | No | `#catalog/1` | Rigid · Signs365 | Link only — catalogs not mapped |
| ADHESIVE | No | `#catalog/3` | Adhesive · Signs365 | Link only — catalogs not mapped |
| HANDHELD | No | `#catalog/11` | Handheld · Signs365 | Link only — catalogs not mapped |
| MAGNET | No | `#catalog/4` | Magnet · Signs365 | Link only — catalogs not mapped |
| APPAREL | No (NEW badge) | `#catalog/999` | Apparel · Signs365 | Link only — catalogs not mapped |
| MISC | No | `#catalog/6` | Misc · Signs365 | Link only — catalogs not mapped |

**Do not map** RIGID / ADHESIVE / HANDHELD / MAGNET / APPAREL / MISC catalogs. They are sibling category hubs, not BANNER modules. Hashes recorded 2026-08-13 by clicking each tab and returning to BANNER.

### Top nav — utility (right)

| Control | Label | Observed | Notes |
|---|---|---|---|
| CURRENCY | CURRENCY | US flag icon | Tile class `header__currencyTile`. Nested currency list not opened on hub (see Unknowns). |
| IMAGE ZONE | IMAGE ZONE | Camera / stacked-sheets icon | Opens artwork library overlay (mapped from order chrome). |
| CART | CART | Badge **2** during session | Opens cart. Do not complete paid checkout. |
| MENU | MENU | Hamburger | Items: Manage Account, Manage Payments, Order History, Product Catalog, How To Videos, What's New?, Logout. |

### Logo

SIGNS365 wordmark, top-left. Yellow “SIGNS” + “365” in a dark bubble. Click target not exercised (likely home / portal).

### Footer (always present)

- Yellow button: **HOW ARE WE DOING?**
- `Copyright © 2026`
- Link: Terms and Conditions
- Phone: `(800) 265-8830`
- Link: Customer Service Hours
- Floating chat: dark circle, yellow speech bubble, green online dot. Welcome copy from store: `Welcome to Signs365, how may I assist you?`

## Hero

- DOM: `div.catalog__ad` wrapping `<video id="promoVideo" autoplay loop>` with poster `static/managed/promos/22/HDBanner.jpg` and sources `HDBanner.mp4` / `.ogv` / `.webm`.
- Hero **copy is burned into the video/poster**, not HTML. Visible frames:
  - Left: sample “Brookside Bengals Northwest District Champions” vinyl banner (tiger art) on a fence / sports-field scene.
  - Right: **HD BANNER**
  - Subtitle: **VINYL BANNER AVAILABLE IN 13, 15 & 18 OZ**
  - CTA: outlined **ORDER TODAY**
- Hero height ~256px. ORDER TODAY click destination: UNKNOWN (not clicked; likely `#order/18`).
- No other promo rotation observed in this session.

## Catalog body

- Section heading (HTML): **Banner Products** (`div.catalog__categoryHeader`).
- Layout: 3-column card grid, cards ~399×224 CSS px, 16:9 (`padding-top: 56.2%`).
- Scroll: inner `.content` scroller. `scrollHeight` 1050 / `clientHeight` 836. **Econostand is below the fold** until scrolled.
- Filters / sort / search: **none** observed.
- Cards have `data-test="product-card-{id}"`.
- Hover overlay: each card’s `div.catalog__actions` contains MORE INFO (gray) and/or ORDER (yellow). Overlay text (subtitle + bullets + buttons) is in the DOM even when the visual logo state is showing; hover darkens the card and shows actions.

## The 7 BANNER cards (page order)

Grid order is **not** numeric id order. Observed:

| # | Slug | Logo / title on card | Caption (subtitle) | Hover bullets | MORE INFO | ORDER | `data-test` | ORDER URL |
|---|---|---|---|---|---|---|---|---|
| 1 | hd-banner | HD BANNER (yellow slanted bars left of type) | Premium Vinyl Scrim Banner | Material: Stunningly Vibrant, Premium Vinyl Scrim, Available in 13, 15 & 18oz Weights | Yes (gray) | Yes (yellow) | product-card-18 | `#order/18` |
| 2 | hdpe | HDPE (stylized E) | Water & Tear Resistant Paper | Material: HD Polyethylene, Water & Tear Resistant Paper | Yes | Yes | product-card-20 | `#order/20` |
| 3 | canvas | CANVAS (easel/A mark) | Poly-Cotton Blend, Stretch & Frame | Material: 11oz Poly-Cotton Blend with a Gesso Finish, Great for Stretching & Framing | Yes | Yes | product-card-19 | `#order/19` |
| 4 | mesh | MESH (perforated M/H) | Polyester with Air-Flow Perforation | Material: Durable 8oz Coated Polyester Mesh Banner with 37% Air-Flow Perforation | Yes | Yes | product-card-23 | `#order/23` |
| 5 | poster | POSTER (peel/pin on P) | Bright White Paper, Short-Term Indoor | Material: 8mil Bright White Paper, Smooth Satin Finish | Yes | Yes | product-card-21 | `#order/21` |
| 6 | no-curl | NO CURL BANNER (CURL in yellow / ribbon) | No Edge Curl Material, Lays Flat & Stays Flat | Material: 8mil No Edge Curl Material, Waterproof & Weather Resistant | Yes | Yes | product-card-121 | `#order/121` |
| 7 | econostand | ECONO$TAND (dollar-sign / stand glyph) | Economical Banner Stand Solution | Economical: Great cost efficient product. Stable Design: Adjustable with steel feet | **No** | Yes only | product-card-124 | `#order/124` |

Logo image URLs (do **not** copy into `frontend/public`):

- HD Banner: `/portal/static/images/categories/18/logo.png` + `background.jpg`
- HDPE: `/portal/static/images/categories/20/logo.png`
- Canvas: `/portal/static/images/categories/19/logo.png`
- Mesh: `/portal/static/images/categories/23/logo.png`
- Poster: `/portal/static/images/categories/21/logo.png`
- No Curl: `/portal/static/images/categories/121/logo.png`
- Econostand: `/portal/static/images/categories/124/logo.png`

Info overlay alignment: HD Banner info panel uses `productcard__right`; the other six use `productcard__left`.

## Not on this grid (do not map)

Present in `/API/product/cards` but **not** among the 7 BANNER catalog cards:

- Fabric (22) — Indoor & Outdoor. Sewing & Grommets
- Roll Up Banner Stand (57), Retractable Banner Stand (63), Retractable Plus (123)

## MORE INFO vs ORDER

- MORE INFO: gray small button `catalog__moreInfoButton`. Opens a product info overlay/modal (full text captured per module in the e2e file). Spec sheet PDFs exist under `/portal/static/managed/categories/more_info/`.
- ORDER: yellow small button `catalog__orderButton`. Navigates to `#order/{id}` and title `{Product} · Signs365`.
- Econostand: ORDER only. Gap: no MORE INFO control on the card.

## Unknowns (hub)

- Hero ORDER TODAY destination (not clicked).
- Currency picker contents (not opened on hub).
- Whether cards autoplay category background video; DOM also references `.webm` assets that returned transferSize 0 in this browser.
