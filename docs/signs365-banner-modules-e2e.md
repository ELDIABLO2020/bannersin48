# Signs365 BANNER modules — end-to-end map

Captured 2026-08-12–13 from the live portal. Hub context: [signs365-banner-catalog-map.md](signs365-banner-catalog-map.md). Rebuild contract: [signs365-banner-rebuild-contract.md](signs365-banner-rebuild-contract.md). Evidence: [signs365-banner-evidence/](signs365-banner-evidence/).

Do not copy Signs365 colors, logos, fonts, or marketing copy into the Bannersin48 app. This file is behavior/structure only.

Shared order chrome (every `#order/{id}` unless noted): BANNER/RIGID/ADHESIVE/HANDHELD/MAGNET/APPAREL/MISC, Currency, Image Zone (`#imageZone`), Cart (`#cart`), Menu. Footer: HOW ARE WE DOING? / Feedback, Call, Hours, Message, Copyright © 2026, Terms and Conditions, (800) 265-8830, Customer Service Hours. Left rail (often off-stage): ITEM #1 / SELECT FRONT IMAGE, width/height/qty, FRONT / CLICK HERE TO SELECT A FRONT IMAGE, double-sided back-image gate, contour cut (?), color matching, + ADD SIGN. Hidden DOM also contains gang-sheet copy, grommet presets, split direction — only treat as live if a dock tile is `.show`.

---

## HD BANNER

### Identity
- Signs365 catalog title / subtitle / logo notes: **HD BANNER** / Premium Vinyl Scrim Banner. Yellow slanted bars left of wordmark. Logo `/portal/static/images/categories/18/logo.png`.
- MORE INFO URL or modal: React modal on `#catalog/2`, header **MORE INFORMATION - HD BANNER**. CTAs: VIEW SPEC SHEET, ORDER. Spec sheet path `/portal/static/managed/categories/more_info/Signs365-HD-Banner_Specification_Sheet_3.pdf`.
- ORDER URL hash and numeric id: `#order/18`. Page title **HD Banner · Signs365**.
- One-line product definition in Signs365’s words: “HD Banner is a premium vinyl scrim that delivers vibrant, long lasting color for short to medium term use. Available in 13, 15 and 18oz weights, it’s great for indoor or outdoor use.”

### MORE INFO
- Full extracted text (live modal):

```
MORE INFORMATION - HD BANNER

HD Banner is a premium vinyl scrim that delivers vibrant, long lasting color for short to medium term use. Available in 13, 15 and 18oz weights, it’s great for indoor or outdoor use.

VIEW SPEC SHEET
ORDER

COMMON USES
Business Promotions
Sports
Fundraisers
Events and Directional Signage
Trade Shows
Celebrations

ENVIRONMENT
Indoor & Outdoor
Short to Medium Term Use

OPTIONS
Single or Double-sided (18oz. only)
Custom Size
Smooth, Heat Welded Edges
Grommets
Pole Pockets
Rope
Wind Slits
```

- Specs / materials: 13, 15, 18oz vinyl scrim. Indoor & outdoor. Short to medium term.
- Size min/max if stated: not stated in MORE INFO (custom size only).
- Pricing teaser: none in the modal.

Evidence: `hd-banner__more-info.png`.

### Builder chrome
- Page title: HD Banner · Signs365
- Default subtitle / spec line: `Vinyl 15oz Single Sided , 0" x 0"`
- Product heading: **HD BANNER (VINYL)**
- Pricing table (live, labeled **PRICING AND SHIPPING**). **The on-page table itself changes above 1000 billable sqft:**

| | Single-Sided (standard, ≤1000 sqft) | Double-Sided (standard) | Single-Sided (volume, >1000 sqft) | Double-Sided (volume) |
|---|---|---|---|---|
| 13oz | $1.25 per sqft | (blank) | **$1.00** | (blank) |
| 15oz | $1.75 per sqft | (blank) | **$1.25** | (blank) |
| 18oz | $2.25 per sqft | $4.25 per sqft | **$1.75** | **$3.25** |

Breakpoint: **31'×32' = 992 sqft** still standard $1.75 ($1736, 1 warning, 1–2 Days). **24'×42' = 1008 sqft** and **32'×32' = 1024** use the volume table, 3 warnings, 1–5 Days. 50'×50' = 2500 × $1.25 = **$3125**. Chip: **“29% discount applied.”** (15oz $1.75→$1.25 ≈ 28.6%). Evidence `hd-banner__pricing-50x50-warnings.png`.
- Price display: large green `$0.00` until size > 0. Readout: `{n} sqft / 24 Hours Production` (also seen as “24 Hour Production”).
- Stage empty-state copy: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE** + camera icon, dashed artboard.
- Add-to-cart: **ADD TO CART** present on wide layout (class `add-cart-checkout`). Enable/disable at $0: UNKNOWN (not clicked). Mobile has hidden `Add To Cart` button.

Evidence: `hd-banner__builder-default.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | integer count; + ADD SIGN on left rail | Opens image picker / Image Zone. Qty field on left rail. | Always | — | Left-rail **qty** multiplies copies of that item (Images dock stays 1). **+ ADD SIGN** adds ITEM #2 (dock becomes 2). | See qty=2 cases. |
| Size | Yes | 0" x 0" | Custom ft + in | SIGN SIZE: Width ft/in, Height ft/in, swap/aspect icon, custom + reset | Always | Height 0 after width set: red bar **HEIGHT CAN NOT BE ZERO**. Size tile outline red; display e.g. `36" x 0"` | Drives sqft. Display is inches (`36" x 72"` for 3 ft × 6 ft) | Aspect lock: “Click to unlock aspect ratio” on left rail. Evidence `hd-banner__control-size.png`, `hd-banner__conflict-height-zero.png` |
| Material | Yes | 15oz (green) | 13oz, 15oz, 18oz | Dropdown panel | Always | — | Uses pricing table rates | Evidence `hd-banner__control-material.png` |
| Print sides | Yes | SINGLE | DOUBLE, SINGLE | Toggle on tile | 18oz | 13oz/15oz: **Double-sided is not available for this material. Please change the material thickness to enable the Double-sided option** | 18oz DOUBLE uses $4.25/sqft | DS raises **1 WARNINGS** |
| Welding | Yes | YES | NO, YES | Toggle | After a non-zero size (class `valid`). At 0×0: disabled | 0×0: **Please select image first.** With pole pockets: **To add welding, you must first remove pole pocket .** DS: warning modal (below) | Not isolated (default YES included in table rates) | DS copy: “Double sided banners will have a 1.5 inch white border for welding purposes. Our system will auto adjust your image.” |
| Rope | Yes | NONE | NONE, Bottom Only, Top Only, Top & Bottom | Nested list | Grommets off | 0×0: **Please select image first.** With grommets: **To add rope, you must first remove grommets.** Stayed disabled with pole pockets on | UNKNOWN (not priced on) | |
| Grommets | Yes | YES | NO, YES | GROMMET PRESETS bar when YES | After non-zero size | 0×0: **Please select image first.** With pole pockets: **To add grommets, you must first remove pole pocket .** | Not isolated | Presets: All Sides; Top/Left/Right; Top/Left/Bottom; Top/Right/Bottom; Left/Right/Bottom; Top & Left; Top & Right; **Top & Bottom** (default); Left & Right; Left & Bottom; Right & Bottom; Top Only; Left Only; Right Only; Bottom Only. Spacing: --SELECT SPACING--; **Every 2-3 Feet** (default); Every 1-2 Feet; Every 6-12 Inches; Corners Only; Custom Inches. Buttons: custom, reset. Split: Vertical/Horizontal; All Splits; POSITION ±0.25". “Click to add or delete grommets or use grommet presets below” |
| Pole pockets | Yes | NONE | None; Right/Left/Left & Right/Bottom/Top/Top & Bottom × 1, 2, 3, 4 inch | Nested tree | After size; grommets and welding off | 0×0: **Please select image first.** With grommets+welding: **To add pole pocket , you must first remove grommets, welding.** | 18oz DS 3×6: $76.50 → $89.50 with Top Only 2" | Help: “Pole pocket size is for the actual diameter of the pole. We calculate the amount of material necessary to fit the specified pole size. The pole pocket will be welded.” DS+pockets modal: **Double-sided HD Banner with Pole Pockets now finish at ordered size with bleed.** Evidence `hd-banner__conflict-pole-pockets.png` |
| Wind slits | Yes | NO | NO, YES | Toggle | Both dims > 24" and < 120" (36×72 eligible) | Exact: **Windslits may only be applied for banners over 24"x24" and under 120"x120"** | 18oz DS + Top Only 2" pockets: $89.50 → $98.50 with YES | Combined with pole pockets in this session |
| Webbing | No (`.control.webbing` in DOM, 0×0) | — | NO, YES (DOM) | — | N/A on HD Banner | Hidden | — | Shared HTML leftover |
| Hem / laminate / cling / standoffs / step-stakes / gloss / rounded-corners / sewing / packing / copies / padding / orientation | No | — | Present in shared order HTML listitems | — | N/A | Hidden | — | Do not surface on HD Banner |
| Contour cut | Left rail | — | — | ? tooltip | — | **Contour cutting is not available for this product.** | — | |
| Color matching | Left rail | off | PMS textarea | Modal **COLOR MATCHING** | Always (enabled class) | — | **No dollar adder.** SUBMIT on 3×6 15oz stayed **$31.50**. Production readout **24 Hours → 1–2 Days Production** (matches the 24–48h delay warning). Button gains class `selected`. | Exact copy in Shared Image Zone. Evidence `shared__color-matching.png`, `shared__color-matching-submitted.png` |
| + ADD SIGN | Left rail / `.create-sign.add-sign` | — | New ITEM #N | Same overlay | After a valid size | — | Adds another line at that size’s unit price (Canvas 3×6: qty 2 + ADD SIGN → 3×$89.64 = $268.92 / 54 sqft; dock IMAGES 2) | Distinct from qty copies |

### Size rules
- Units: entry **ft + in**; summary **inches** (`36" x 72"`). Left-rail width/height also inches, readonly once set from SIGN SIZE.
- HTML spinbuttons: `min=0`, width/height **ft max 999**, **in max 9999** (input ceiling, not the material max).
- Min legal: **1" × 1"** is valid. Both axes must be > 0.
- Max: vinyl accepted **50' × 50'** (600" × 600", class `valid`). Wind-slit option still gated **over 24"×24" and under 120"×120"**. No material roll-width error on HD Banner. Above **1000 billable sqft** the rate table switches to the volume column (see pricing table).
- Step: inches spinbuttons (integer). POSITION grommets ±0.25".
- **Billable sqft = max(1, ceil(W_in/12) × ceil(H_in/12))** — each dimension rounds **up to whole feet**, then a **1 sqft floor**. 3'×6' = 18 sqft (coincides with true area). **13" × 12" = 2 sqft** (not 1.08). Earlier “true sqft / no round-up” reading was wrong (only 3×6 was sampled).
- Aspect lock: icon between Width/Height; left rail **Click to unlock aspect ratio**. After a library image is assigned, wrapper `.manual-size-controls.disabled` + `.size-container.aspect-ratio-lock` (DOM). Evidence `hd-banner__image-aspect-lock.png`.
- Quick picks: none observed on HD Banner size panel.
- Below min: **HEIGHT CAN NOT BE ZERO** / **WIDTH CAN NOT BE ZERO** (size tile class `error`). Price $0.00.
- Above HTML max: not forced (999 ft still within inputs). 20'×20' valid, production **1-2 Days** (still standard $1.75 table, 1 warning). 50'×50' valid, production **1-5 Days**, volume table.
- **Image-driven size proven:** from 0×0, **CLICK HERE TO SELECT A FRONT IMAGE** → Image Zone overlay → click `Fast_Med_Now_Open.jpg` (**36 x 48in**, 300 DPI) sets dock SIZE to **36" × 48"**, spec `Vinyl 15oz Single Sided , 36" x 48"`, **$21.00 / 12 sqft / 24 Hours Production**, Images dock **1**, stage shows the artwork. Overlay then has **delete**, contour-cut (unavailable), color matching. Left rail shows **ACTUAL: 36 x 48**. Evidence `hd-banner__image-driven-size.png`. Not re-probed: replacing with a different native size; scaling while lock is on (auto-review blocked a live size mutation).

### Artwork / Images
- How many images/signs: default 1; + ADD SIGN; Images dock count.
- Upload `input[type=file]` **accept**: `.jpg, .jpeg, .pdf, .tiff, .tif, .eps, .png`. **multiple=true**.
- Reject copy (same for `.txt` and `.gif`): **Only the following files are allowed: jpg,jpeg,eps,pdf,tiff,tif,png**. Failed card: red triangle, filename, warning, delete X (`title="Delete image"`). Evidence `shared__upload-reject-txt.png`.
- Size limits / DPI: library shows DPI per file (72 and 300 observed). Assigning a 300 DPI 36×48 jpg did **not** raise a print-quality chip. IMAGE SETUP video still says **MAY COMPROMISE PRINT QUALITY** (instructional, not a live gate on 72 DPI files in this pass).
- Library / Image Zone / folders: hash `#imageZone`. Home folder. UPLOAD IMAGE (green), CREATE/RENAME/DELETE FOLDER (blue), IMAGE SETUP, Search Images, Sort ↓Date ↑Date ↓Name ↑Name ↓Size ↑Size, SELECT ALL, “0 items selected”. Cards: thumb, filename, `{w} x {h}in`, `{n} DPI`, timestamp, checkbox / delete / move-to-folder. Evidence `shared__image-zone.png`.
- Fit vs center / crop: labels `fit` / `center` exist in DOM. **IMAGE SETUP** is **not** a crop panel — it is an instructional video modal (see Shared Image Zone).
- Color matching: SUBMIT recorded (see Shared Image Zone).
- Replace / delete: Image Zone X on card; builder “delete” on item rail.
- Double-sided artwork: back gated: **Product must first be double-sided before you can add a back image.** **SIGN IS NOT DOUBLE-SIDED**. COPY FROM FRONT. Front x1 on cart lines.

### Option conflicts and gates
- 13oz/15oz ⊥ DOUBLE — message above.
- 0×0 finishing: **Please select image first.** (also used when size is zero, even without image language matching).
- Rope ⊥ grommets: **To add rope, you must first remove grommets.**
- Pole pockets ⊥ grommets + welding: **To add pole pocket , you must first remove grommets, welding.** Reverse: **To add grommets, you must first remove pole pocket .** / **To add welding, you must first remove pole pocket .**
- DS welding warning modal: **Please review the following warning(s):** **Double sided banners will have a 1½ inch white border for welding purposes. Our system will automatically adjust your image.** CLOSE. Red **1 WARNINGS** chip.
- DS + pole pockets: **Double-sided HD Banner with Pole Pockets now finish at ordered size with bleed.** OK.
- Wind slits size gate: **Windslits may only be applied for banners over 24"x24" and under 120"x120"**.
- Height 0: **HEIGHT CAN NOT BE ZERO**.
- Volume (>1000 sqft) warning modal (CLOSE), three lines:
  1. `29% discount applied.`
  2. `With quantities greater than 1000 sqft a production time of 1-5 business days may be required. Ground or Freight shipping may apply.`
  3. `Your banner is oversized and will have to be seamed and folded for shipping. It will also require freight shipping. For Oversize Banners (greater than 16 feet in width) please allow an extra 24 hours production time and an extra 1-5 days for delivery.`
  20'×20' (400 sqft, 20 ft wide): **1 warning**, still standard $1.75, 1–2 Days. 17'×10' (170 sqft): no warning chip in that probe.

### Pricing cases (run and record)

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0, 15oz SS, weld YES, grommets YES | $0.00 | 0 | not shown | 24 Hours Production | ADD TO CART visible |
| Height zero | 3 ft × 0 | blocked | — | — | — | HEIGHT CAN NOT BE ZERO |
| Mid 3'×6' default finishing | 36×72, 15oz SS | $31.50 | 18 | not shown | 24 Hours | 18×$1.75 |
| Same, 18oz SS | 36×72, 18oz SINGLE | $40.50 | 18 | — | 24 Hours | 18×$2.25 |
| Same, 18oz DS | 36×72, DOUBLE | $76.50 | 18 | — | 24 Hours | 18×$4.25; 1 WARNINGS |
| + Top Only 2" pockets (grommets/weld off) | 18oz DS 36×72 | $89.50 | 18 | — | 24 Hours | +$13.00 vs DS |
| + Wind slits YES | previous | $98.50 | 18 | — | 24 Hours | +$9.00 vs pockets |
| Smallest legal | 1" × 1", 15oz SS | $1.75 | 1 | — | 24 Hours | 1 sqft floor |
| 13" × 12" | 15oz SS | $3.50 | 2 | — | 24 Hours | ceil-ft: 2' × 1' |
| 11" × 12" | 15oz SS | $1.75 | 1 | — | 24 Hours | still 1 sqft |
| Width zero | 0 × 1" | $0.00 blocked | 0 | — | — | **WIDTH CAN NOT BE ZERO** |
| 20' × 20' | 15oz SS | $700.00 | 400 | — | **1-2 Days** | valid; still **$1.75** table; 1 warning |
| 31' × 32' | 15oz SS | $1736.00 | 992 | — | **1-2 Days** | still standard table (≤1000 sqft) |
| 24' × 42' | 15oz SS | $1260.00 | 1008 | — | **1-5 Days** | volume table 1008×$1.25; 3 warnings |
| 50' × 50' | 15oz SS (label stays 15oz) | **$3125.00** | 2500 | freight warned | **1-5 Days** | volume 2500×$1.25; table shows $1.00/$1.25/$1.75/$3.25. Evidence `hd-banner__pricing-50x50-warnings.png` |
| Color match SUBMIT | 3×6 15oz + PMS 186 C | $31.50 | 18 | — | **1-2 Days** | no $ adder; chip `selected`. Evidence `shared__color-matching-submitted.png` |
| Image-driven size | 0×0 then Fast_Med 36×48in | $21.00 | 12 | — | 24 Hours | size becomes 36"×48". Evidence `hd-banner__image-driven-size.png` |
| Qty = 2 (Canvas, same pattern) | left-rail qty 2 at 3×6 | 2× unit | 2× sqft | — | 24 Hours | Images dock stays **1**. Proven on Canvas $89.64 → $179.28 / 36 sqft |
| 13oz 3×6 | not run | implied $22.50 | 18 | — | — | from table only |
| Cart 36×48 13oz SS grommets+welding | existing cart | $15.00 | 12 implied | not on line | — | 12×$1.25 |
| Cart 36×48 15oz SS pole pocket + wind slits | existing cart | $40.00 | 12 implied | — | — | 12×$1.75=$21 + $19 addons |

### Cart / checkout (if reachable)
- Cart hash `#cart`, title Cart · Signs365. Heading **Here's your order!**
- Columns: Product, Size, Options, Quantity, Price, Action.
- Line fields: product name (e.g. Vinyl 13oz Single Sided), size inches, options list, qty, green price, Edit (yellow), Remove (red), artwork thumb **Front x1**.
- Total: $55.00 for the two pre-existing lines. Buttons: **Save Cart**, **Checkout**.
- Checkout form: **not opened** (no paid order). UNKNOWN steps/fields.
- Evidence: `shared__cart.png`.

### Gaps vs our current vinyl builder
- Have: 13/15/18oz, SS/DS on 18oz, size ft/in, welding/grommets/rope/pockets/wind, Images, live price, dashed stage.
- Must add: Signs365 rate table ($1.25/$1.75/$2.25/$4.25) vs our $4–$7.50 (do not copy branding; contract decides our rates). Grommet preset list is much larger. Pole pocket “diameter” copy. DS 1.5" weld border warning. DS+pockets bleed message. Size display in inches. **Billable sqft already uses 1-ft round-up per axis** (match that, do not treat 3×6 as “true sqft”). Webbing hidden here. “Please select image first” vs our size-only gates. Cart Edit/Remove/Front x1.
- Must hide for this module: webbing, hem, laminate, etc.

### Unknowns
- Checkout fields; ADD TO CART at $0; 13oz live 3×6 quote; HD Banner rope dollar adder (Mesh rope adder mapped); whether “Please select image first” clears after image without size; whether aspect-lock scales both axes; whether a second library image overwrites size; 72 DPI live quality chip.

---

## HDPE

### Identity
- Catalog: **HDPE** / Water & Tear Resistant Paper. Stylized E. `product-card-20`.
- MORE INFO: **MORE INFORMATION - HDPE**. Spec sheet `Signs365-HDPE_Specification_Sheet.pdf`.
- ORDER: `#order/20`. Title **HDPE · Signs365**.
- One-line: “A lightweight banner material designed for durability and flexibility. HDPE is water & tear resistant making it ideal for short-term indoor or outdoor use where strength and easy handling are key.”

### MORE INFO
```
MORE INFORMATION - HDPE

A lightweight banner material designed for durability and flexibility. HDPE is water & tear resistant making it ideal for short-term indoor or outdoor use where strength and easy handling are key.

VIEW SPEC SHEET
ORDER

COMMON USES
Outdoor Events
Business Promotion
Community & School Events
Directional Signage
Retail & Pop-ups
Promotional Displays

ENVIRONMENT
Indoor & Outdoor
Short-term

OPTIONS
Single-sided
Custom Size
```

No finishing options listed. No pricing teaser. Evidence `hdpe__more-info.png`.

### Builder chrome
- Heading **HDPE**. Subtitle `HDPE Banner , 0" x 0"`.
- Pricing table: **PRICING AND SHIPPING** bar with **no oz matrix** (unlike HD Banner).
- Default `$0.00`, `0 sqft / 24 Hours Production`.
- Stage: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE**.
- ADD TO CART: not visible on the compact layout used; UNKNOWN on wide layout.

Evidence: `hdpe__builder-default.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count | Image Zone | Always | — | UNKNOWN qty=2 | IDENTICAL TO HD BANNER dock pattern for Images, still only this + Size |
| Size | Yes | 0" x 0" | ft + in | SIGN SIZE Width/Height ft/in | Always | HEIGHT CAN NOT BE ZERO (same pattern) | 3×6 → $27.00 / 18 sqft | IDENTICAL TO HD BANNER size panel chrome |
| Material | No | n/a (single HDPE) | — | — | — | Hidden | — | No 13/15/18oz |
| Print sides | No | Single implied | — | — | — | Hidden | — | MORE INFO: Single-sided |
| Welding | No | — | — | — | — | Hidden | — | |
| Rope | No | — | — | — | — | Hidden | — | |
| Grommets | No | — | — | — | — | Hidden (presets exist in unused DOM) | — | |
| Pole pockets | No | — | — | — | — | Hidden | — | |
| Wind slits | No | — | — | — | — | Hidden | — | |
| Webbing | No | — | — | — | — | Hidden | — | |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | IDENTICAL TO HD BANNER message |

### Size rules
- IDENTICAL TO HD BANNER entry (ft/in → inch summary). 3 ft × 6 ft → `36" x 72"`, 18 sqft.
- Rate **$1.50/sqft** from 18 × $1.50 = $27.00. Billable ceil-ft rule not re-run on HDPE (expect same as HD Banner).
- **Roll / shorter-side max = 52"** — same copy as Poster: **The maximum width for this material is 52 inches.** 52×52 valid; 52×120 valid; 72×36 valid (long side may exceed 52" if the other is ≤52"); 53×72 error. Evidence `hdpe__conflict-max-width.png`.
- Aspect lock present. No quick picks observed.
- Image-driven size: proven on HD Banner (shared Image Zone picker); not re-clicked on HDPE.

### Artwork / Images
- IDENTICAL TO HD BANNER shared Image Zone / left rail / contour-unavailable / color matching control. Double-sided back still in DOM but print-sides control hidden.

### Option conflicts and gates
- No finishing dock, so no rope/grommet/pocket conflicts.
- Height zero same as HD Banner.
- Contour cutting unavailable.

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0 | $0.00 | 0 | not shown | 24 Hours | |
| 3'×6' | 36×72, qty 1 | $27.00 | 18 | not shown | 24 Hours | $1.50/sqft |
| 52" × 52" | both axes at max short side | valid | 25 implied | — | 24 Hours | shorter side = 52" |
| 53" × 72" | over max | blocked | — | — | — | **The maximum width for this material is 52 inches.** Evidence `hdpe__conflict-max-width.png` |
| 72" × 36" | long side 72, short 36 | valid | 18 | — | 24 Hours | max is shorter-side, not “width” literally |
| Smallest / qty 2 / materials / sides / finishing | — | UNKNOWN | — | — | — | no those controls |

### Cart / checkout (if reachable)
- Not added this session. Shared cart chrome mapped under HD BANNER. HDPE line shape UNKNOWN.

### Gaps vs our current vinyl builder
- Have: size + images + quote pattern.
- Must add: HDPE material / $1.50-per-sqft (our rates TBD in contract), hide all vinyl finishing and material/sides tiles.
- Must hide: Material, Print sides, Welding, Rope, Grommets, Pole pockets, Wind slits.

### Unknowns
- ADD TO CART; Image Zone select-into-builder on HDPE specifically. Qty=2 / 1" min / WIDTH CAN NOT BE ZERO: IDENTICAL TO HD BANNER pattern (not re-clicked on HDPE).

---

## CANVAS

### Identity
- Catalog: **CANVAS** / Poly-Cotton Blend, Stretch & Frame. Easel-in-A. `product-card-19`.
- MORE INFO: **MORE INFORMATION - CANVAS**. Spec `Signs365-Canvas_Specification_Sheet.pdf`.
- ORDER: `#order/19`. Title **Canvas · Signs365**.
- One-line: “An 11oz poly-cotton blend (65% polyester, 35% cotton) with a gesso finish that provides clean, detailed prints. It’s well-suited for stretching, framing, artwork, decor pieces, and display prints.”

### MORE INFO
```
MORE INFORMATION - CANVAS

An 11oz poly-cotton blend (65% polyester, 35% cotton) with a gesso finish that provides clean, detailed prints. It’s well-suited for stretching, framing, artwork, decor pieces, and display prints.

VIEW SPEC SHEET
ORDER

COMMON USES
Home Decor
Landscapes
Family Portraits
Celebrations
Art Reproduction
Business Promotion

ENVIRONMENT
Indoor

OPTIONS
Single-sided
Custom Size
```

No frames/hardware in OPTIONS despite “Stretch & Frame” subtitle. Evidence `canvas__more-info.png`.

### Builder chrome
- Heading **CANVAS**. Subtitle `Canvas , 0" x 0"`.
- No oz pricing matrix. Table rate **$4.98 per sqft** (Single-Sided) once sized. Default `$0.00`, `0 sqft / 24 Hours Production`.
- Stage: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE**.
- Dock: Images + Size only (after load). Brief “+ SHOW- HIDE OPTIONS” flash on compact viewport.

Evidence: `canvas__builder-default.png`, `canvas__pricing-3x6.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count | Image Zone + left-rail qty / + ADD SIGN | Always | — | qty 2 at 3×6 → $179.28 / 36 sqft; ADD SIGN adds another item | IDENTICAL TO HD BANNER Images; evidence `canvas__qty-2-add-sign.png` |
| Size | Yes | 0" x 0" | ft+in | SIGN SIZE | Always | WIDTH/HEIGHT CAN NOT BE ZERO; roll max 49" | $4.98 × billable sqft | IDENTICAL TO HD BANNER size chrome |
| Material | No | 11oz implied | — | — | — | Hidden | — | |
| Print sides | No | Single | — | — | — | Hidden | — | |
| Welding | No | — | — | — | — | Hidden | — | |
| Rope | No | — | — | — | — | Hidden | — | |
| Grommets | No | — | — | — | — | Hidden | — | |
| Pole pockets | No | — | — | — | — | Hidden | — | |
| Wind slits | No | — | — | — | — | Hidden | — | |
| Frames / stretcher bars | No | — | — | — | — | Not in builder | — | Catalog implies stretch/frame; builder has no frame control |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | |

### Size rules
- IDENTICAL TO HD BANNER ft/in panel + **ceil-ft billable sqft** + 1 sqft floor.
- Constrained axis (message calls it **height**): **The maximum height for this material is 49 inches.** Shorter side must be ≤ 49". 36"×72" valid; 49"×49" valid (25 billable sqft); 49"×120" valid (50 sqft); 50"×50" and 72"×72" error. 3'×6' is legal because 36" ≤ 49".
- Min: 1"×1" valid ($4.98 / 1 sqft). WIDTH CAN NOT BE ZERO same as HD Banner.
- HTML input max still 999 ft / 9999 in; material max is the 49" rule.

### Artwork / Images
- IDENTICAL TO HD BANNER shared Image Zone / left rail / DS back copy in DOM / contour unavailable.
- Qty vs ADD SIGN proven here (see pricing cases).

### Option conflicts and gates
- None on visible dock. Contour unavailable.
- 49" height assistance on the size tile when over max (class `error`); quote may still compute.

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0 | $0.00 | 0 | not shown | 24 Hours | |
| 3'×6' | 36×72, qty 1 | **$89.64** | 18 | not shown | 24 Hours | table **$4.98/sqft**. Evidence `canvas__pricing-3x6.png` |
| 2'×2' | 24×24 | $19.92 | 4 | — | 24 Hours | linear |
| 1"×1" | — | $4.98 | 1 | — | 24 Hours | 1 sqft floor |
| 13"×12" | — | $9.96 | 2 | — | 24 Hours | ceil-ft |
| 49"×49" | — | $124.50 | 25 | — | 24 Hours | ceil 5'×5'; at max |
| 50"×50" | — | $124.50 shown | 25 | — | 24 Hours | **error** — max height 49" |
| Qty 2 | 36×72, qty 2 | $179.28 | 36 | — | 24 Hours | Images dock still 1 |
| Qty 2 + ADD SIGN | two items (2+1 copies) | $268.92 | 54 | — | 24 Hours | dock IMAGES 2 |

### Cart / checkout (if reachable)
- Not added. UNKNOWN line shape.

### Gaps vs our current vinyl builder
- Must add: Canvas product, indoor-only copy in hub, hide vinyl finishing/material/sides. Frame hardware: not in Signs365 builder (do not invent).
- Must hide: all HD Banner finishing + material + print sides.

### Unknowns
- Frames if any after image; checkout.

---

## MESH

### Identity
- Catalog: **MESH** / Polyester with Air-Flow Perforation. Perforated M/H. `product-card-23`.
- MORE INFO: **MORE INFORMATION - MESH**. Spec `Signs365-Mesh_Specification_Sheet_2.pdf`.
- ORDER: `#order/23`. Title **Mesh · Signs365**.
- One-line: “A lightweight, durable banner material designed for outdoor use. It features micro-punctures that allow 37% airflow, reducing wind resistance while maintaining vibrant, full-color prints.”

### MORE INFO
```
MORE INFORMATION - MESH

A lightweight, durable banner material designed for outdoor use. It features micro-punctures that allow 37% airflow, reducing wind resistance while maintaining vibrant, full-color prints.

VIEW SPEC SHEET
ORDER

COMMON USES
Business Promotion
Construction & Job Sites
Events & Festivals
Sponsorships
Fence Signage
Outdoor Promotions

ENVIRONMENT
Indoor & Outdoor

OPTIONS
Single-sided
Custom Size
Heat Welded Edges
Grommets
Pole Pockets
Rope
```

No Wind Slits in OPTIONS. Evidence `mesh__more-info.png` (filename; live text is MESH).

### Builder chrome
- Heading **MESH**. Subtitle `Mesh , 0" x 0"`.
- No oz matrix. Table rate **$2.44 per sqft** (Single-Sided) once sized.
- Default `$0.00`, `0 sqft / 24 Hours Production`.
- Stage: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE**.
- Dock: Images, Size, Welding YES, **Webbing NO**, Rope NONE, Grommets YES, Pole pockets NONE. No Material, Print sides, or Wind slits.

Evidence: `mesh__builder-default.png`, `mesh__pricing-3x6.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count | Image Zone | Always | — | IDENTICAL TO HD BANNER qty pattern | IDENTICAL TO HD BANNER Images |
| Size | Yes | 0" x 0" | ft+in | SIGN SIZE | Always | Please select image first on finishing at 0×0 | $2.44 × billable sqft | IDENTICAL TO HD BANNER size chrome |
| Material | No | 8oz mesh implied | — | — | — | Hidden | — | |
| Print sides | No | Single | — | — | — | Hidden | — | |
| Welding | Yes | YES | NO, YES | Toggle | After image/size (at 0×0 disabled) | **Please select image first.** | In table rate at default YES | IDENTICAL TO HD BANNER welding options list |
| Webbing | Yes | NO | NO, YES | Toggle | After image/size | **Please select image first.** Help when enabled: **Webbing adds extra reinforcement to the top and bottom welds. We recommend webbing on Mesh banners over 8ft.** | 3×6 YES **+$6.00** ($43.92 → $49.92); 2×2 YES **+$4.00** — matches **$1 per linear foot of width × 2** (top+bottom) | **NEW vs HD Banner**. Evidence `mesh__pricing-3x6-webbing.png` |
| Rope | Yes | NONE | NONE, Bottom Only, Top Only, Top & Bottom | Nested | After image; grommets off | **To add rope, you must first remove grommets.** (also **Please select image first.** at 0×0). Help when enabled: **500lb nylon cord will be welded into the banner with 2ft. of slack on both ends.** | **$1 per linear foot of each selected width-edge.** 3×6 Top Only or Bottom Only **+$3**; Top & Bottom **+$6** ($43.92 → $46.92 / $49.92). 2×2 T&B **+$4** vs $9.76 base. Weld YES/NO same base. | IDENTICAL TO HD BANNER conflict copy |
| Grommets | Yes | YES | NO, YES | Presets (DOM) | After image/size | **Please select image first.** With pockets: expect HD Banner reverse copy | Default YES in $2.44 table | IDENTICAL TO HD BANNER grommets YES/NO |
| Pole pockets | Yes | NONE | same tree as HD Banner (1–4 inch placements) | Nested | After image; grommets/weld off | **To add pole pocket , you must first remove grommets, welding.** | Diameter **1–4" does not change price.** 3×6 weld NO, grommets NO, base $43.92: Top Only any inch **+$13** ($56.92); Top & Bottom 2" **+$16** ($59.92); Left Only 2" **+$16** ($59.92); Left & Right 2" **+$22** ($65.92). 2×2 Top Only 2" **+$12** ($21.76 vs $9.76). | IDENTICAL TO HD BANNER pocket conflict copy. Help: “Pole pocket size is for the actual diameter of the pole… Manufactured and finished to the dimensions ordered.” Evidence `mesh__pricing-pocket-2x2.png` |
| Wind slits | No | — | — | — | — | Hidden | — | Removed vs HD Banner |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | |

### Size rules
- IDENTICAL TO HD BANNER ft/in + ceil-ft billable sqft. 3'×6' = 18 sqft. 2'×2' = 4 sqft.
- **No paper-style roll-width max.** 6×6, 10×10, 20×20, **50×50 all valid**. HTML 999 ft / 9999 in is the input ceiling.
- 20'×20' (400 sqft): **$976** = 400×$2.44, production **1–2 Days**.
- 50'×50' (2500 sqft): **$2725** / 1–5 Days — **not** 2500×$2.44=$6100 (volume/other; Mesh volume table not isolated the way HD Banner’s on-page oz table was).

### Artwork / Images
- IDENTICAL TO HD BANNER shared Image Zone / left rail / contour unavailable.

### Option conflicts and gates
- 0×0: **Please select image first.** on welding, webbing, rope, grommets, pockets (leftover assistance text can remain visible even after size is valid).
- Rope ⊥ grommets: **To add rope, you must first remove grommets.** (tile class `disabled` until grommets NO). **Proven on Mesh — same copy as HD Banner.**
- Pockets ⊥ grommets + welding: **To add pole pocket , you must first remove grommets, welding.** **Proven on Mesh — same copy as HD Banner** (including the space before the comma).
- Webbing help: **Webbing adds extra reinforcement to the top and bottom welds. We recommend webbing on Mesh banners over 8ft.**
- Rope help when enabled: **500lb nylon cord will be welded into the banner with 2ft. of slack on both ends.**

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0, weld YES, webbing NO, grommets YES | $0.00 | 0 | not shown | 24 Hours | |
| 3'×6' default finishing | 36×72, webbing NO | **$43.92** | 18 | not shown | 24 Hours | table **$2.44/sqft**. Evidence `mesh__pricing-3x6.png` |
| + Webbing YES | same | **$49.92** | 18 | — | 24 Hours | +$6.00 = 2 × 3 ft × $1/ft. Evidence `mesh__pricing-3x6-webbing.png` |
| 2'×2' + webbing YES | 24×24 | $13.76 | 4 | — | 24 Hours | base 4×$2.44=$9.76 + $4 webbing |
| 3'×6' rope Top Only (grommets NO) | 36×72 | $46.92 | 18 | — | 24 Hours | +$3 vs $43.92 |
| 3'×6' rope Top & Bottom | 36×72 | $49.92 | 18 | — | 24 Hours | +$6 |
| 3'×6' pocket Top Only any 1–4" | 36×72, weld NO, grommets NO | $56.92 | 18 | — | 24 Hours | +$13; diameter does not change $ |
| 3'×6' pocket Left & Right 2" | same | $65.92 | 18 | — | 24 Hours | +$22 |
| 2'×2' pocket Top Only 2" | 24×24 | $21.76 | 4 | — | 24 Hours | +$12 vs $9.76. Evidence `mesh__pricing-pocket-2x2.png` |
| 20' × 20' | default finishing | $976.00 | 400 | — | **1-2 Days** | 400×$2.44 |
| 50' × 50' | default finishing | **$2725.00** | 2500 | — | **1-5 Days** | not 2500×$2.44 |

### Cart / checkout (if reachable)
- Not added. UNKNOWN.

### Gaps vs our current vinyl builder
- Must add: Mesh product, **webbing** control, hide material/sides/wind slits.
- Must hide: Material, Print sides, Wind slits.
- Keep: welding, rope, grommets, pole pockets with the same conflict copy as HD Banner.

### Unknowns
- Reverse pocket messages (grommets/welding while pockets on) not re-clicked; Mesh 50×50 volume table not isolated on-page.

---

## POSTER

### Identity
- Catalog: **POSTER** / Bright White Paper, Short-Term Indoor. Peel/pin P. `product-card-21`.
- MORE INFO: **MORE INFORMATION - POSTER**. Spec `Signs365-Poster_Specification_Sheet.pdf`.
- ORDER: `#order/21`. Title **Poster · Signs365**.
- One-line: “A bright white, 8mil paper with a smooth satin finish that delivers sharp, vibrant prints and a professional appearance. Ideal for indoor signage, POP displays, retail promotions, and event graphics.”

### MORE INFO
```
MORE INFORMATION - POSTER

A bright white, 8mil paper with a smooth satin finish that delivers sharp, vibrant prints and a professional appearance. Ideal for indoor signage, POP displays, retail promotions, and event graphics.

VIEW SPEC SHEET
ORDER

COMMON USES
Indoor Signage
Community Events
POP Displays
School Events
Business Promotion
Retail Promotion

ENVIRONMENT
Indoor
Short-term

OPTIONS
Single-sided
Custom Size
```

Evidence: live text above. (Screenshot file `poster__more-info.png` may be mis-ordered vs MESH; trust this extract.)

### Builder chrome
- Heading **POSTER**. Subtitle `Poster Paper , 0" x 0"`.
- No oz matrix. Table rate **$2.00 per sqft** (Single-Sided) once sized.
- Default `$0.00`, `0 sqft / 24 Hours Production`.
- Stage: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE**.
- Dock: Images + Size only.

Evidence: `poster__builder-default.png`, `poster__pricing-3x6.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count | Image Zone | Always | — | IDENTICAL TO HD BANNER qty pattern | IDENTICAL TO HD BANNER Images |
| Size | Yes | 0" x 0" | ft+in | SIGN SIZE | Always | zero-axis + roll max 52" | $2.00 × billable sqft | IDENTICAL TO HD BANNER size chrome |
| Material | No | 8mil paper implied | — | — | — | Hidden | — | |
| Print sides | No | Single | — | — | — | Hidden | — | |
| Welding | No | — | — | — | — | Hidden | — | |
| Rope | No | — | — | — | — | Hidden | — | |
| Grommets | No | — | — | — | — | Hidden | — | |
| Pole pockets | No | — | — | — | — | Hidden | — | |
| Wind slits | No | — | — | — | — | Hidden | — | |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | |

### Size rules
- IDENTICAL TO HD BANNER ft/in + ceil-ft billable sqft.
- Constrained axis (message calls it **width**): **The maximum width for this material is 52 inches.** Shorter side ≤ 52". 36"×72" and 72"×36" valid; 52"×52" valid (25 billable sqft / $50); 52"×120" valid; 53"×53" error.
- Min: 1"×1" valid ($2.00 / 1 sqft).

### Artwork / Images
- IDENTICAL TO HD BANNER shared Image Zone / left rail.

### Option conflicts and gates
- Contour unavailable. No finishing conflicts.
- Over-max: **The maximum width for this material is 52 inches.**

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0 | $0.00 | 0 | not shown | 24 Hours | |
| 3'×6' | 36×72 | **$36.00** | 18 | not shown | 24 Hours | table **$2.00/sqft**. Evidence `poster__pricing-3x6.png` |
| 1"×1" | — | $2.00 | 1 | — | 24 Hours | 1 sqft floor |
| 13"×12" | — | $4.00 | 2 | — | 24 Hours | ceil-ft |
| 52"×52" | — | $50.00 | 25 | — | 24 Hours | at max; 5'×5' billable |
| 53"×53" | — | $50.00 shown | 25 | — | 24 Hours | **error** — max width 52" |
| 6'×6' | 72×72 | $72.00 shown | 36 | — | 24 Hours | **error** — both sides > 52" |

### Cart / checkout (if reachable)
- Not added. UNKNOWN.

### Gaps vs our current vinyl builder
- Must add: Poster / 8mil paper product. Hide all vinyl finishing + material + sides. Enforce 52" shorter-side max.

### Unknowns
- Checkout.

---

## NO CURL BANNER

### Identity
- Catalog: **NO CURL BANNER** / No Edge Curl Material, Lays Flat & Stays Flat. `product-card-121`.
- MORE INFO: **MORE INFORMATION - NO CURL**. Spec `Signs365-No-Curl_Specification_Sheet.pdf`.
- ORDER: `#order/121`. Title **No Curl · Signs365**.
- One-line: “An 8mil, no edge curl material that lays flat and stays flat. Waterproof and weather resistant, it delivers vibrant, professional-quality prints perfect for posters, trade shows, retail promotion, and outdoor signage.”

### MORE INFO
```
MORE INFORMATION - NO CURL

An 8mil, no edge curl material that lays flat and stays flat. Waterproof and weather resistant, it delivers vibrant, professional-quality prints perfect for posters, trade shows, retail promotion, and outdoor signage.

VIEW SPEC SHEET
ORDER

COMMON USES
Community Events
POP Displays
Trade Shows
School Events
Business Promotion
Retail Promotion
Outdoor Signage

ENVIRONMENT
Indoor & Outdoor

OPTIONS
Single-sided
Custom Size
```

### Builder chrome
- Heading **NOCURL BANNER**. Subtitle `NoCurl Banner , 0" x 0"`.
- No oz matrix. Table rate **$3.00 per sqft** (Single-Sided) once sized.
- Default `$0.00`, `0 sqft / 24 Hours Production`.
- Stage: **PLEASE SPECIFY DIMENSIONS OR CLICK TO SELECT AN IMAGE**.
- Dock: Images + Size only.

Evidence: `no-curl__builder-default.png`, `no-curl__pricing-2x6.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count | Image Zone | Always | — | IDENTICAL TO HD BANNER qty pattern | IDENTICAL TO HD BANNER Images |
| Size | Yes | 0" x 0" | ft+in | SIGN SIZE | Always | **12" x 12" minimum size.** / **The maximum width for this material is 35 inches.** | $3.00 × billable sqft | 3'×6' is **illegal** (36" > 35") |
| Material | No | 8mil no-curl implied | — | — | — | Hidden | — | |
| Print sides | No | Single | — | — | — | Hidden | — | |
| Welding | No | — | — | — | — | Hidden | — | |
| Rope | No | — | — | — | — | Hidden | — | |
| Grommets | No | — | — | — | — | Hidden | — | |
| Pole pockets | No | — | — | — | — | Hidden | — | |
| Wind slits | No | — | — | — | — | Hidden | — | |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | |

### Size rules
- IDENTICAL TO HD BANNER ft/in + ceil-ft billable sqft, **plus tighter min/max**.
- Min: **12" × 12"** exact. 12×12 valid ($3.00 / 1 sqft). 11"×12" and 1"×1" error: **12" x 12" minimum size.**
- Max constrained axis (message calls it **width**): **The maximum width for this material is 35 inches.** Shorter side ≤ 35". **3'×6' (36×72) is illegal.** 35"×72" valid (18 billable sqft / $54). 24"×72" valid. 72×72 error.

### Artwork / Images
- IDENTICAL TO HD BANNER shared Image Zone / left rail.

### Option conflicts and gates
- Contour unavailable. No finishing dock.
- Min copy: **12" x 12" minimum size.**
- Max copy: **The maximum width for this material is 35 inches.**

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty | 0×0 | $0.00 | 0 | not shown | 24 Hours | |
| 12"×12" min | — | $3.00 | 1 | — | 24 Hours | table **$3.00/sqft** |
| 11"×12" | — | $3.00 shown | 1 | — | 24 Hours | **error** — 12" min |
| 13"×12" | — | $6.00 | 2 | — | 24 Hours | ceil-ft |
| 2'×6' | 24×72 | **$36.00** | 12 | not shown | 24 Hours | legal stand-in for 3×6. Evidence `no-curl__pricing-2x6.png` |
| 35"×72" | at max short side | $54.00 | 18 | — | 24 Hours | 35" → 3' billable |
| 36"×72" (3×6) | — | $54.00 shown | 18 | — | 24 Hours | **error** — 36" > 35" max |
| 6'×6' | 72×72 | $108.00 shown | 36 | — | 24 Hours | **error** — max width 35" |

### Cart / checkout (if reachable)
- Not added. UNKNOWN.

### Gaps vs our current vinyl builder
- Must add: No-curl 8mil product. Hide vinyl finishing + material + sides. Do **not** allow 3'×6' — enforce 12" min and 35" shorter-side max.

### Unknowns
- Checkout.

---

## Econostand

### Identity
- Catalog logo **ECONO$TAND** / Economical Banner Stand Solution. `product-card-124`.
- MORE INFO: **none** (ORDER only). Gap.
- ORDER: `#order/124`. Title **Economical Banner Stand Solution · Signs365**.
- One-line (card bullets, no modal): Economical — “Great cost efficient product”. Stable Design — “Adjustable with steel feet”.

### MORE INFO
- Missing on catalog card. No spec sheet link from hub. UNKNOWN full marketing copy beyond card bullets.

### Builder chrome
- Heading **ECONO BANNER STAND**.
- Subtitle `Econo Banner Stand , 33.5" x 80"` (fixed).
- No oz matrix. Live price **$90.00** at default (no image required).
- Readout: **1 item / 24 Hours Production** (not sqft).
- Stage: dimensioned diagram 33.5" × 80", label **Front Side**, **TOP OF IMAGE**. Not the dashed “specify dimensions” empty state.
- Dock: **Images only** (count 1). No Size tile.

Evidence: `econostand__builder-default.png`.

### Controls (table)

| Control | Visible? | Default | Options (complete list) | Nested panel fields | Enabled when | Disabled when + exact message | Price effect | Notes |
|---|---|---|---|---|---|---|---|---|
| Images | Yes | 1 | count; left-rail qty; + ADD SIGN | Image Zone | Always | — | qty 2 → **$180.00** / 2 items; ADD SIGN adds another $90 | Dock stays 1 when only qty changes |
| Size | No | 33.5" × 80" fixed | — | Diagram labels 33.5 / 80 | N/A | Hidden | Flat $90 | Not custom |
| Material | No | — | — | — | — | Hidden | — | |
| Print sides | No | Front Side diagram | — | — | — | Hidden | — | Single-sided implied |
| Welding | No | — | — | — | — | Hidden | — | |
| Rope | No | — | — | — | — | Hidden | — | |
| Grommets | No | — | — | — | — | Hidden | — | |
| Pole pockets | No | — | — | — | — | Hidden | — | |
| Wind slits | No | — | — | — | — | Hidden | — | |
| Stand hardware | No extra dock | Included in product | steel feet mentioned on catalog card | — | — | No hardware picker | In $90 | Catalog: “Adjustable with steel feet” |
| Contour cut | Left rail | — | — | — | — | Contour cutting is not available for this product. | — | |

### Size rules
- Fixed **33.5" × 80"**. No ft/in editor. Not image-driven for canvas size (UNKNOWN if image must match).
- Min/max N/A (single SKU).
- Pricing model: **flat $90 / item**, not per sqft.

### Artwork / Images
- IDENTICAL TO HD BANNER Image Zone entry. Must still select artwork; price already $90 without it.
- Double-sided DOM copy still present; no print-sides control.

### Option conflicts and gates
- None on dock. Contour unavailable.

### Pricing cases

| Case | Inputs | Price | Sqft | Shipping | Production | Notes |
|---|---|---|---|---|---|---|
| Default empty art | 33.5×80, images 1, qty 1 | $90.00 | n/a (1 item) | not shown | 24 Hours | Flat **$90.00 per item** |
| Qty 2 | same SKU, qty 2 | **$180.00** | n/a (2 items) | — | 24 Hours | Readout **2 items / 24 Hours Production**. Images dock still 1. Evidence `econostand__qty-2.png` |
| Qty 2 + ADD SIGN | ITEM #1 qty 2 + ITEM #2 qty 1 | $270.00 | n/a (3 items) | — | 24 Hours | dock IMAGES 2 |
| Finishing variants | N/A | — | — | — | — | |

### Cart / checkout (if reachable)
- Not added. UNKNOWN whether cart shows “Econo Banner Stand” + 33.5×80 + $90.

### Gaps vs our current vinyl builder
- We have `/order/retractable` (33.5×80, $175 in shared constants) — **different product/price** from Econostand $90.
- Must add: Econostand SKU, fixed size, flat $90, hide size/finishing/material dock. Do not reuse vinyl builder as-is.
- Must hide: Size, Material, Print sides, all finishing.

### Unknowns
- MORE INFO (does not exist). Hardware variants. Checkout. Whether $90 includes stand+print.

---

## Shared Image Zone / Cart (all modules)

### Image Zone (`#imageZone`)
- Title Image Zone. Folder: Home. UPLOAD IMAGE, CREATE FOLDER, RENAME FOLDER, DELETE FOLDER, **▸ IMAGE SETUP**, Search, Sort by Date/Name/Size, SELECT ALL.
- File cards: thumb, name, `{w} x {h}in`, DPI, datetime, select / delete / folder.
- `input[type=file]` accept **`.jpg, .jpeg, .pdf, .tiff, .tif, .eps, .png`**, `multiple=true`.
- Reject (`.txt` and `.gif`): **Only the following files are allowed: jpg,jpeg,eps,pdf,tiff,tif,png**. Evidence `shared__upload-reject-txt.png`.
- Observed valid library types this account: jpg, png. Evidence `shared__image-zone.png`.
- **IMAGE SETUP** (opened): React modal titled **IMAGE SETUP** with an HTML5 video player (~0:49). Sources: `/portal/static/video/catalog/background.m4v` (also `.ogv`, `.webm`). Content is a **low-res print-quality warning** (on-screen: **MAY COMPROMISE PRINT QUALITY**), not a crop/fit settings form. Evidence `shared__image-setup.png`.
- Fit / center: labels exist in builder DOM; they are not the IMAGE SETUP modal.
- **Selecting a library card from the builder picker sets product size** to the file’s inch metadata (HD Banner 0×0 → 36"×48" from `Fast_Med_Now_Open.jpg`). Aspect lock engages. Evidence `hd-banner__image-driven-size.png`, `hd-banner__image-aspect-lock.png`.
- **Color matching** (left-rail `image-colormatching enabled`): modal **COLOR MATCHING**. Warning: **Please note that color matching may delay your order for 24-48 hours.** Instruction: **Insert required PMS colors below:** plus a 3-row textarea. Buttons **SUBMIT** / **CANCEL**. SUBMIT (PMS 186 C): modal closes, button class `selected`, **no price change**, production **1–2 Days**. Evidence `shared__color-matching.png`, `shared__color-matching-submitted.png`.

### Cart (`#cart`)
- “Here's your order!” Product / Size / Options / Quantity / Price / Action. Edit, Remove. Total. Save Cart. Checkout **not clicked**. Evidence `shared__cart.png`.

---

## CROSS-MODULE MATRIX

Rows = modules. Cells: Yes / No / N/A / different options.

| | Images | Size | Material | Print sides | Welding | Webbing | Rope | Grommets | Pole pockets | Wind slits | Stand/hardware | Size min | Size max | Artwork | Pricing model | Production | Cart |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HD BANNER | Yes | Yes custom ft/in | 13/15/18oz | SINGLE/DOUBLE (18oz) | Yes default YES | No | Yes | Yes default YES | Yes | Yes | No | 1"×1" (1 sqft floor); WIDTH/HEIGHT CAN NOT BE ZERO | Vinyl 50'×50' still valid; wind <120"; **volume table >1000 sqft** | Image Zone; **image sets size**; accept jpg/jpeg/pdf/tiff/tif/eps/png | ceil-ft sqft × table (volume $1.00/$1.25/$1.75/$3.25) | 24 Hours; 1–2 Days at 20×20 / color-match; 1–5 Days at >1000 sqft | Yes shared |
| HDPE | Yes | Yes custom | No (HDPE only) | No (SS) | No | No | No | No | No | No | No | expect 1" (not re-run) | **shorter side ≤ 52"** | Image Zone | **$1.50/sqft** | 24 Hours | shared, line UNKNOWN |
| CANVAS | Yes | Yes custom | No (11oz implied) | No (SS) | No | No | No | No | No | No | No (no frame control) | 1"×1" | **shorter side ≤ 49"** | Image Zone | **$4.98/sqft** | 24 Hours | qty+ADD SIGN proven |
| MESH | Yes | Yes custom | No (8oz implied) | No (SS) | Yes default YES | **Yes default NO** | Yes | Yes default YES | Yes | **No** | No | expect 1" (36×72 valid) | **no roll max; 50×50 valid** | Image Zone | **$2.44/sqft** + webbing $1/ft×2 + rope $1/ft per selected width-edge + pocket adders | 24 Hours; 1–2 Days at 20×20; 1–5 Days at 50×50 | UNKNOWN line |
| POSTER | Yes | Yes custom | No (8mil) | No (SS) | No | No | No | No | No | No | No | 1"×1" | **shorter side ≤ 52"** | Image Zone | **$2.00/sqft** | 24 Hours | UNKNOWN line |
| NO CURL | Yes | Yes custom | No (8mil) | No (SS) | No | No | No | No | No | No | No | **12"×12"** | **shorter side ≤ 35"** | Image Zone | **$3.00/sqft** | 24 Hours | UNKNOWN line |
| Econostand | Yes | **No (fixed 33.5×80)** | No | No | No | No | No | No | No | No | Included, no picker | N/A | N/A | Image Zone | **flat $90/item** (qty 2 = $180) | 24 Hours (N items) | UNKNOWN line |

### Delta from HD BANNER

| Module | New controls | Removed vs HD BANNER | Changed defaults |
|---|---|---|---|
| HDPE | — | Material, Print sides, Welding, Rope, Grommets, Pockets, Wind | Single material; no finishing; **shorter side ≤ 52"** |
| CANVAS | — | same as HDPE | Indoor; 11oz implied |
| MESH | **Webbing** | Material, Print sides, Wind slits | Welding YES, Grommets YES, Webbing NO |
| POSTER | — | same as HDPE | 8mil paper; indoor short-term; shorter side ≤ 52" |
| NO CURL | — | same as HDPE | 8mil no-curl; **12" min**; shorter side ≤ **35"** (3×6 illegal) |
| Econostand | Fixed diagram stage | Size + all finishing + material + sides | $90 live at default; qty 2 = $180; 33.5×80; item not sqft |
