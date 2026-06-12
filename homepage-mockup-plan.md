# Banners In 48 — Homepage Mockup Plan (Client Demo, Desktop + Mobile)

> Purpose: a **visual demonstration for the client** — one homepage that automatically presents the **desktop website** on large screens and the **mobile app-style PWA layout** on phones. Everything looks real; **nothing is operational** (no navigation, no checkout, no backend).
>
> Visual design: 100% from `www.housecallpro.com-DESIGN.md` (navy / gold / blue, Open Sans + display gothic).
> Mobile layout/positioning: from the 48HR Banners mockup screenshots (app-like structure only — none of its colors/branding).
> Copy and numbers: from [bannersin48-final-website-structured-plan.md](bannersin48-final-website-structured-plan.md) — demo values hardcoded and labeled below (acceptable for a throwaway demo; the production build derives them from the API).

---

## 1. Technical Approach (deliberately minimal)

| Decision | Choice | Why |
|---|---|---|
| Stack | **One `index.html` + `styles.css` + `demo.js`** — no framework, no build step | It's a static demo; opens by double-click or any static host. Disposable by design |
| Fonts | Google Fonts: Open Sans (400/700), Plus Jakarta Sans (400), Archivo Black (display stand-in for Headline Gothic ATF — license pending) | Matches design file's families/fallbacks |
| Icons | Inline SVG (lucide outlines pasted in) | No dependency |
| Images | Neutral banner-print placeholder graphics / CSS mockups | No licensed assets needed for demo |
| Device selection | **CSS media queries** at the design file's breakpoints — `<1024px` renders the mobile app layout (bottom tab bar, stacked cards), `≥1024px` renders the desktop site (top nav, 12-col sections). Same URL, automatic, no JS redirect | "Automatically choose which version" with zero infrastructure; resizing the browser live-switches — a good demo moment |
| Countdown | Small JS computing time to the next 9:00 PM ET from the visitor's clock | The one "live" element — makes the demo feel real |
| Non-operational behavior | All `<a href="#">` + `demo.js` intercepts every click on links/buttons → brief toast: **"Preview only — coming soon"** (white card, L3 shadow, radius 8) | Client can click anything safely; nothing navigates |

**Acceptance criteria for the whole mockup:**
1. Opening the file on a phone (or DevTools iPhone emulation) shows the app-style layout with bottom tab bar; on a laptop it shows the desktop site.
2. Every menu, button, and link is visible and styled, and none of them navigates anywhere.
3. The countdown ticks toward 9:00 PM ET.
4. No raw hex in markup — all colors via the CSS variables in §2 (keeps the demo honest to the token system).

---

## 2. Design Guidelines (complete — paste as `:root` CSS variables)

### 2.1 Color Tokens

```css
:root {
  /* Backgrounds */
  --navy-base: #13191E;      /* page-dark, hero, tab bar, footer */
  --navy-deep: #002942;      /* secondary dark containers, countdown card */
  --navy-dark: #0E2634;      /* tertiary dark accents */
  --surface: #FFFFFF;        /* cards, top nav */
  --surface-tint: #F5F5F5;   /* alternating light sections */
  --info-tint: #DEF0FF;      /* selected/highlighted states */

  /* CTA — gold is for conversion actions ONLY */
  --cta: #FF9B24;  --cta-hover: #FFB706;  --cta-active: #FCB900;
  --cta-text: #13191E;

  /* Interactive (links, secondary actions) */
  --link: #0F77CC;  --link-hover: #0055FF;  --link-active: #002942;

  /* Text */
  --text-dark: #212121;  --text-light: #FFFFFF;  --text-secondary: #979797;
  --border: #E0E0E0;  --border-input: #BDBDBD;  --error: #CF2E2E;

  /* Badges */
  --badge-success-bg: #E8F5E9;  --badge-success-text: #2E7D32;
  --badge-warning-bg: #FFF3E0;  --badge-warning-text: #F57C00;
  --badge-error-bg: #FFEBEE;    --badge-error-text: #CF2E2E;
}
```

### 2.2 Typography

| Role | Font | Desktop | Mobile | Weight / Line height |
|---|---|---|---|---|
| Hero H1 | Archivo Black (Headline Gothic stand-in), Georgia fallback | 83px / 85px | 32px / ~1.05 | 400 |
| Section H2 | same display font | 68px / 68px | 28px | 400 |
| Subsection H4 | Open Sans | 18px / 27px | 16px | 700 |
| Card title H5 | Open Sans | 14px / 24px | 14px | 700 |
| Body | Open Sans | 16px / 24px | 14–16px | 400 |
| Small / metadata | Open Sans | 11px / 18px | 11px | 400 |
| Input text | Plus Jakarta Sans | 14–16px | 12px | 400 |

Rules: weights 400/700 only; display font for headlines only (never nav/body); line height ≥1.5× for body; hierarchy by size/weight, not color; white text on navy — never dark-on-navy.

### 2.3 Spacing, Grid, Radius, Elevation

- **Spacing scale (exclusive):** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 64 / 80 px. Cards: 24px padding. Grid gaps: 16px. Section padding: 80px vertical desktop, 64px mobile heroes, 16px mobile section sides.
- **Grid:** desktop 12-col / 40px gutters, container 1200px (hero full-bleed to 1440px); mobile 4-col / 16px gutters.
- **Radius:** 8 buttons · 16 feature cards · 24 large cards · 100 pill inputs (`100px 0 0 100px` input + `0 100px 100px 0` attached CTA).
- **Shadows:** L1 `0 2px 8px rgba(0,0,0,.08)` cards/inputs · L2 `0 4px 16px rgba(0,0,0,.12)` feature cards · L3 `0 8px 24px rgba(0,0,0,.16)` dropdown/toast · never on full-width sections; one level per element.
- **Touch targets:** ≥44×44px; ≥16px between targets; inputs 40px (mobile) / 56px (desktop).

### 2.4 Component Recipes (used by this mockup)

- **Primary CTA:** gold bg, `--cta-text`, Open Sans 16/700, padding `12px 40px`, radius 8, no shadow; hover `--cta-hover`, active `--cta-active` + scale .98.
- **Secondary button:** transparent, `1px solid var(--link)`, text `--link`, padding `12px 32px`, radius 8; hover blue 8% tint.
- **Pill email capture:** input left-rounded (border `--border-input`, blue focus glow `0 0 12px rgba(15,119,204,.2)`) + attached gold CTA right-rounded, both 56px desktop / 40px mobile.
- **Default card:** white, radius 24, `1px solid var(--border)`, L1, padding 24.
- **Feature card:** white 95%, radius 16, L2, padding `32px 24px`.
- **Top nav (desktop):** white, 64px, padding `0 40px`, L1-light shadow `0 1px 3px rgba(0,0,0,.08)`; links Open Sans 16/400 `--text-dark`, hover `--link` + 8% blue tint, active bottom border `2px solid var(--link)`.
- **Badges:** 12px/600, padding `4px 12px`, radius 16, semantic tints (§2.1).

### 2.5 Do / Don't (binding for the mockup)

- Gold appears **only** on conversion CTAs ("Order a Banner", email-capture submit). Everything else interactive is blue.
- One accent per component; no shadow stacking; no radius >24 except pills; no arbitrary spacing values; WCAG AA contrast throughout.

---

## 3. Demo Content (hardcoded values — sourced from the final plan)

| Item | Demo value |
|---|---|
| Brand | **Banners In 48** (text lockup: "BANNERS IN 48" display font, "48" in gold) |
| H1 | Custom Banners. Delivered in 48 Business Hours. |
| Subhead | Any size up to 10'×10'. Clear pricing. Guaranteed by noon. Order by 9 PM ET. |
| Countdown label | Order within **HH : MM : SS** for delivery by **[weekday] at 12:00 PM** *(weekday from the cutoff table: Mon→Wed, Tue→Thu, Wed→Fri, Thu→Mon, Fri/Sat→Tue, Sun→Tue)* |
| Materials | 13 oz $4.00/sq ft · 15 oz $4.75/sq ft · 18 oz $5.25/sq ft · 18 oz double-sided $7.50/sq ft |
| Retractable | 33.5" × 80" — $175 (hardware + case included) |
| Popular sizes | 2'×4' $42 · 3'×6' $82 · 3'×8' $106 · 4'×8' $138 · 5'×10' $210 *(13 oz, incl. $10 shipping)* |
| Trust bullets | Guaranteed by 12:00 PM noon — or shipping refunded · $10 flat shipping per banner · FedEx across the US & Canada · 13/15/18 oz premium vinyl |
| Steps (How it works) | 1 Pick your size & material → 2 Upload your artwork → 3 Approve your instant proof → 4 Delivered by noon, guaranteed |
| Reviews | 3 placeholder cards (name, ★★★★★, one line) labeled "Sample review" |
| FAQ (5) | When will my banner arrive? · What if I miss the 9 PM cutoff? · What file types can I upload? (PDF/JPG/JPEG) · What if my artwork has a problem? · What does the guarantee cover? ($10 shipping refund) |

---

## 4. Desktop Homepage Spec (≥1024px)

Top-to-bottom; container 1200px unless full-bleed.

1. **Announcement strip** — navy-deep bg, white 14px: "Order by 9:00 PM ET → delivered by noon in 48 business hours. US & Canada." (right side: countdown inline `HH:MM:SS`).
2. **Top nav (64px white, sticky)** — left: brand lockup. Center links: **Vinyl Banners · Retractable Banners · Templates · Graduation Banners · How It Works · Help Center**. Right: **Track Order** (ghost link), **Log In** (secondary border button), **Order a Banner** (gold CTA). "Templates" and "Graduation Banners" open a non-operational dropdown panel (white, radius 8, L3) listing 6 category items each — visible on hover, items inert.
3. **Hero (full-bleed navy, 80px pad)** — left 7 cols: H1 (83px, "48 Business Hours." line with gold emphasis), subhead (Open Sans 18 white), two buttons: gold **Order a Banner** + secondary-on-dark **Upload Your Artwork** (white border variant); trust microcopy row (FedEx · US & Canada · Guaranteed by noon). Right 5 cols: **countdown feature card** (navy-deep, radius 24, white tabular digits 48px, "Today's cutoff: 9:00 PM ET", thin progress bar in blue).
4. **Quick-start row (white, 3 feature cards)** — Upload Artwork / Design Online *(Coming Soon badge, warning tint)* / AI Helper *(Coming Soon badge)*; blue icons, radius 16, L2.
5. **Popular sizes (surface-tint section)** — H2; 5 size cards (radius 16): size in H4, sq ft small text, price 18/700, "incl. $10 shipping" 11px secondary; hover = info-tint + blue border (selected-state styling); gold **See All Sizes & Prices** beneath — inert.
6. **Materials band (white)** — 3 columns: 13/15/18 oz with $/sq ft, one-line description, "double-sided available" note on 18 oz only.
7. **How it works (navy-deep full-bleed)** — 4 numbered steps, white text, blue number chips.
8. **Guarantee panel (white card on tint, radius 24)** — the promise table condensed: cutoff 9 PM ET · noon delivery · FedEx only · $10/unit · refund remedy; gold CTA.
9. **Reviews (white)** — 3 default cards, stars in gold *(allowed: rating glyphs are content, not interactive emphasis — note for client)*, names + "Sample review" tag.
10. **FAQ (tint)** — 5 accordions (chevron rotates, panel expands — purely visual, allowed to open/close since it's not navigation).
11. **Email capture band (navy)** — H2 32px white "Get launch updates", pill input + attached gold CTA (§2.4); submit shows the demo toast.
12. **Footer (navy-base, white/secondary text, 4 columns + bar)** —
    - **Products:** Vinyl Banners · Retractable Banners · All Sizes & Pricing · Templates *(soon)* · Graduation Banners *(soon)*
    - **Company:** About Us · Reviews · Delivery Guarantee · Production & Quality
    - **Support:** Help Center · FAQs · Track Your Order · **Chat With Us** · **Email Support** *(no phone number anywhere — per the developer report)*
    - **Account:** Log In · Create Account · Reorder · Tax-Exempt Program
    - Bottom bar: © 2026 Banners In 48 · BannersIn48.com · Privacy Policy · Terms of Service · Refund & Reprint Policy; payment glyphs (Visa, MC, Amex, Discover, Apple Pay, PayPal) rendered as bordered chips.

---

## 5. Mobile Homepage Spec (<1024px) — app layout from the mockup, styled per §2

Single column, 16px side padding, page bg `--surface-tint`, dark sections full-bleed.

1. **App header (navy-base)** — brand lockup left (white + gold "48"), bell icon right (inert). No hamburger: primary nav lives in the tab bar, matching the app feel of the mockup.
2. **Hero (navy-base, 64px pad)** — H1 32px: "Custom Banners. Delivered in **48 Business Hours**." (gold emphasis line); subhead 14px white: "Any size up to 10'×10'. One clear price. Order by 9 PM ET."; full-width gold **Order a Banner** (48px tall).
3. **Countdown card** — navy-deep, radius 24, inside the hero's bottom edge (overlapping by -24px margin like the mockup): "Order within" label 11px secondary, **HH : MM : SS** white 32px tabular with 11px unit labels, divider, "Today's cutoff: 9:00 PM ET" 11px.
4. **Quick actions (3-up grid, 8px gaps)** — white cards radius 16, L1, blue icon, 11px/700 label: Upload Artwork · Design Online *(soon)* · AI Helper *(soon)* — "soon" as warning badges.
5. **Popular sizes (horizontal scroll chips)** — H4 header + "View all" blue link right; chips: white, radius 8, border, size 14/700 + price 11px; first chip in selected style (info-tint + blue border) to show the state.
6. **Why choose (list card)** — white card radius 24; 4 rows (icon in info-tint circle, H5 title, 11px sub): 48-Hour Delivery Guaranteed · Clear Pricing from $4/Sq Ft + $10 Shipping · Premium 13/15/18 oz Vinyl · FedEx — US & Canada.
7. **Materials strip** — 3 stacked rows (white card): name + $/sq ft right-aligned 14/700; 18 oz row gets "Double-sided available" success badge.
8. **How it works** — navy-deep full-bleed card, 4 steps vertical with blue number chips.
9. **Reviews** — horizontal scroll of 3 cards.
10. **FAQ** — 5 accordions (compact, 14px).
11. **Email capture** — stacked: full-width pill input, full-width gold button below (per design file's mobile collapsing rule).
12. **Footer (condensed)** — navy; accordion groups for Products / Company / Support / Account (same items as desktop), payment chips, legal links 11px. Bottom padding 96px so the tab bar never covers content.
13. **Bottom tab bar (fixed)** — navy-base, top border `rgba(255,255,255,.08)`, 5 tabs: **Home · Orders · Design · Templates · Account**; icons 24px + 11px labels; active tab gold (Home), inactive white at 60%; "Design"/"Templates" show a 4px warning-tint dot (= coming soon); each tab ≥44px target. Tapping any tab → demo toast.

---

## 6. Auto Device Selection — exact behavior

- All layout switching via `@media (min-width: 1024px)` / below: mobile DOM and desktop DOM are the **same document**; elements that exist in only one version (`.top-nav`, `.tab-bar`, announcement strip vs app header) toggle with `display`.
- Tablet (600–1023px) renders the mobile app layout (single demo, two faces — keep it simple; note this verbally to the client).
- `<meta name="viewport" content="width=device-width, initial-scale=1">`; test points: 375×812 (iPhone), 768×1024 (iPad), 1440×900 (laptop).
- Optional flourish for the demo session: `?force=desktop` / `?force=mobile` query param adds a class that overrides the media query — useful when presenting both versions on one projector.

---

## 7. Build Checklist (Karpathy-gated, ~half-day of work)

```
1. tokens + base styles (§2)            → verify: swatch page renders every variable
2. desktop sections 1–12 (§4)           → verify: 1440px screenshot matches spec order; nav dropdowns hover correctly
3. mobile sections 1–13 (§5)            → verify: 375px screenshot; tab bar fixed; nothing under tab bar
4. demo.js (countdown + click toast)    → verify: countdown targets next 9 PM ET; every link/button shows toast, zero navigation
5. cross-check Do/Don'ts (§2.5)         → verify: gold only on CTAs; no raw hex outside :root; AA contrast spot-check
```

**Out of scope (don't build, per Karpathy Rule 2):** any second page, real forms/validation, routing, service worker/PWA install, animations beyond hover/accordion/toast, CMS-ability. This is a look-and-feel artifact; the production build follows [phase1-build-test-plan.md](phase1-build-test-plan.md).
