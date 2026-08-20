# Bannersin48 BANNER rebuild contract

Shipped. Source map: [catalog-map.md](catalog-map.md), [modules-e2e.md](modules-e2e.md).

Do not copy Signs365 colors, logos, fonts, or marketing sentences into the app. Brand tokens stay in `packages/design-tokens`. Behavior and option structure come from the map; Bannersin48 copy and rates are ours.

## Routes

| Route | Purpose |
|---|---|
| `/order` | BANNER hub (7 cards). **“Start your order” must land here**, not `/order/vinyl`. |
| `/order/hd-banner` | HD Banner builder (Signs365 `#order/18`) |
| `/order/hdpe` | HDPE (`#order/20`) |
| `/order/canvas` | Canvas (`#order/19`) |
| `/order/mesh` | Mesh (`#order/23`) |
| `/order/poster` | Poster (`#order/21`) |
| `/order/no-curl` | No Curl (`#order/121`) |
| `/order/econostand` | Econostand (`#order/124`) |

Later alias (do not implement now): `/order/vinyl` → `/order/hd-banner` so old links do not 404.

Existing `/order/retractable` is a **different SKU** (our $175 / 33.5×80 in `packages/shared`) from Econostand ($90 flat, same footprint). Do not merge them without a product decision.

Hub cards: MORE INFO (in-app panel, our copy) + ORDER → module route. Econostand: ORDER only (no MORE INFO), matching Signs365.

CTA rewires in a later session (do not do now): `Hero`, `HowItWorks`, `TopNav` “Banners”, `siteNavigation` “Vinyl Banners”, `EmailCtaForm`, sizes page, cart empty states — all currently `/order/vinyl`.

## Shared vs per-module builder chrome

**Shared (one BuilderShell):** top site nav (ours), stage, price hero, Image Zone/library, color match, item rail, add-to-cart, cart drawer.

**Per-module dock (gated by product config, not hardcoded vinyl tiles):**

| Tile | hd-banner | hdpe | canvas | mesh | poster | no-curl | econostand |
|---|---|---|---|---|---|---|---|
| Images | yes | yes | yes | yes | yes | yes | yes |
| Size | yes | yes | yes | yes | yes | yes | no (fixed 33.5×80) |
| Material | 13/15/18oz | no | no | no | no | no | no |
| Print sides | 18oz only DOUBLE | no | no | no | no | no | no |
| Welding | yes | no | no | yes | no | no | no |
| Webbing | no | no | no | **yes** | no | no | no |
| Rope | yes | no | no | yes | no | no | no |
| Grommets | yes | no | no | yes | no | no | no |
| Pole pockets | yes | no | no | yes | no | no | no |
| Wind slits | yes | no | no | no | no | no | no |

HD Banner default: 15oz, SINGLE, welding YES, grommets YES, rope NONE, pockets NONE, wind NO. Mesh default: welding YES, webbing NO, grommets YES, rope NONE, pockets NONE.

Price hero: HD Banner shows a 13/15/18 × SS/DS rate matrix. Other modules: no oz matrix. Econostand: `$90` + `1 item / 24 Hours Production` (not sqft). Empty custom-size modules: `$0.00` + `0 sqft / 24 Hours Production` until size > 0.

Stage: custom-size modules use dashed empty “specify dimensions or click to select an image”. Econostand uses a fixed 33.5×80 diagram (“Front Side”).

## `packages/shared` fields to add (later)

Today: vinyl-only `materialSchema`, finishing, `MATERIAL_RATES`, `ADDON_RATES`, max 10 ft billable round-up.

Add a **product id** on the line (not only material):

`HD_BANNER | HDPE | CANVAS | MESH | POSTER | NO_CURL | ECONOSTAND` (plus existing `RETRACTABLE`).

Per product config (suggested shape):

- `sizeMode`: `custom` | `fixed`
- `fixedSizeIn`: `{ width: 33.5, height: 80 }` for Econostand
- `materials[]` with `ratePerSqFt` or `flatPriceUsd`
- `printSides`: `singleOnly` | `doubleOnMaterials[]`
- `finishing`: flags for welding, webbing, rope, grommets, polePockets, windSlits
- `grommetPresets` / `grommetSpacing` lists (HD Banner list is larger than current `GROMMET_PRESET_OPTIONS`)
- `conflicts`: rope⊥grommets; pockets⊥grommets+welding; wind size band 24–120 in exclusive
- `messages`: user-visible strings (ours, not Signs365 verbatim unless legal/ops requires)
- `productionHours`: 24 observed
- Size: Signs365 billable sqft is **max(1, ceil(W_in/12) × ceil(H_in/12))** (1-ft round-up per axis, 1 sqft floor). 3'×6' = 18 sqft is coincidental. Our engine already rounds up to whole feet — **that matches Signs365**; keep it.
- Per-product **shorter-side max**: Canvas 49", **HDPE 52"**, Poster 52", No Curl 35". No Curl **min 12"×12"**. Vinyl HD Banner and Mesh allowed **50'×50'** (no paper roll max).
- Production readout stays **24 Hours** at typical sizes; HD Banner/Mesh 20'×20' → **1-2 Days**; HD Banner **>1000 sqft** and Mesh 50'×50' → **1-5 Days**. Color-match SUBMIT also moves HD Banner to **1-2 Days** with no dollar adder.
- HD Banner **volume table (>1000 billable sqft)**: 13oz $1.00 / 15oz $1.25 / 18oz $1.75 / 18oz DS $3.25 (vs standard $1.25 / $1.75 / $2.25 / $4.25). Warning copy includes **29% discount applied.** plus 1–5 day / freight / seam-and-fold lines.

Observed Signs365 rates (reference only; set Bannersin48 rates separately):

| Product | Rate | Notes |
|---|---|---|
| HD Banner 13oz SS | $1.25/sqft | table |
| HD Banner 15oz SS | $1.75/sqft | table |
| HD Banner 18oz SS | $2.25/sqft | table |
| HD Banner 18oz DS | $4.25/sqft | table |
| HDPE | $1.50/sqft | from 3×6 = $27 |
| Canvas | **$4.98/sqft** | 3×6 = $89.64 |
| Mesh | **$2.44/sqft** | 3×6 = $43.92; webbing ≈ $1/ft of width × 2; rope ≈ $1/ft per selected width-edge; pockets: diameter does not change $ (3×6 Top Only +$13, T&B +$16, Left Only +$16, L&R +$22) |
| Poster | **$2.00/sqft** | 3×6 = $36 |
| No Curl | **$3.00/sqft** | 2×6 = $36; 3×6 illegal |
| Econostand | **$90/item** | qty 2 = $180 |

Extend `finishingSchema` with `webbing: boolean` (Mesh). Pole pocket copy: diameter of pole, not hem depth-only. Mesh/HD Banner pocket **diameter 1–4" does not change quoted price** in the Mesh pass.

Artwork: library picker can **set custom size from file inch metadata**; lock aspect until unlocked. File accept list: jpg, jpeg, pdf, tiff, tif, eps, png. Reject copy is the allow-list sentence. Color match is a **production delay**, not a line-item adder.

DS HD Banner: 1.5" white weld border warning; DS+pockets “finish at ordered size with bleed”.

Quote body must include `productId` so `/pricing/quote` is not vinyl-shaped only.

## MSW endpoints needed (later)

Existing: `POST /pricing/quote`, `GET /sizes/popular`, artwork folders/library/upload, orders, auth, delivery.

Add/change:

- `GET /catalog/banner` — 7 hub cards (id, title, subtitle, moreInfo yes/no, route)
- `GET /catalog/banner/:id` — more-info payload (uses, environment, options) in **our** copy
- `POST /pricing/quote` — accept `productId` + module finishing (webbing, pocket diameter, etc.)
- Artwork library already mocked; align Image Zone UX (sort, folders, DPI readout) in a later UI pass

No NestJS. Keep MSW in `packages/api-client/src/mocks/handlers.ts`.

## Explicit NON-goals (this and the immediate rebuild)

- No NestJS / real API
- No Signs365 branding, logos, fonts, yellow, or copied hero/MORE INFO sentences in `frontend/public` or UI
- No RIGID, ADHESIVE, HANDHELD, MAGNET, APPAREL, MISC catalogs
- No Fabric / Retractable Plus / Roll Up (not on BANNER hub)
- No implementing product pages in the mapping session (already true)
- No paid checkout against Signs365
- Do not restyle in the mapping session; rebuild session uses existing tokens only
- Do not treat Econostand as `/order/retractable`

## Implementation order (later session)

1. Product config in `packages/shared` + quote function branches.
2. MSW catalog + quote.
3. `/order` hub; point Start your order at `/order`.
4. Generalize ControlDock from `builderRules` product config; migrate vinyl page to `/order/hd-banner`.
5. HDPE / Canvas / Poster / No-curl (Images+Size only).
6. Mesh (+ webbing, no wind).
7. Econostand (fixed size, flat price).
8. Wire per-product min/max (No Curl 12"/35", Canvas 49", Poster/HDPE 52") and webbing/rope/pocket adders; HD Banner volume table >1000 sqft; image-driven size + color-match delay.

## Open UNKNOWNs blocking exact parity

See module file. Remaining: checkout fields; ADD TO CART at $0; HD Banner rope dollar adder; Mesh 50×50 volume table isolation; aspect-lock scale behavior; second-image size overwrite; 72 DPI live quality chip. HDPE roll max, Mesh overall max, Mesh rope/pocket $, color-match SUBMIT, image-driven size, upload reject, and HD Banner 50×50 vs 15oz table are **mapped**.
