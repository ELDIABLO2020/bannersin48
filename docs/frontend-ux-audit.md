# Banners In 48 — Comprehensive Front-End UX Audit

**Audit date:** 2026-08-23  
**Build audited:** local `main`, production and development builds with `NEXT_PUBLIC_ENABLE_MOCKS=1`  
**Primary goal:** a visually compelling, trustworthy, fast, and easy-to-use custom-banner platform

## Executive summary

The site is a **visually strong prototype, but not launch-ready as a commerce experience**.

The desktop marketing experience has a clear identity: distinctive magenta/black branding, strong display typography, good photography, clear CTAs, and a coherent card system. The product hub and desktop builder are visually polished. Responsive layouts do not create page-level horizontal overflow at 320, 390, 768, or 1440 CSS pixels.

The largest risks are not cosmetic. The core buying journey currently contains pricing, scrolling, artwork, proof, payment, tracking, and trust failures:

1. Changing cart quantity from 1 to 2 leaves the cart and checkout total unchanged. In a tested journey, checkout showed **$138**, while the created order became **$276**.
2. The cart drawer leaves `body { overflow: hidden }` after close or checkout navigation, making the checkout page unscrollable in a real browser.
3. Users can order without artwork, while the proof page contains only a literal placeholder and no rendered proof.
4. Payment is explicitly a stub, but the UI still creates an order.
5. Unverified-address acknowledgement can be bypassed.
6. “Track Order” is a prominent but nonfunctional lookup form; the order-detail “Reorder this” link targets a missing route.
7. Representative testimonials are marked and presented as verified, real customer feedback.
8. The default “4′ × 8′” product is modeled and previewed as 4 feet wide by 8 feet high (portrait), creating a serious dimension/orientation risk.

**Recommendation: treat the current build as a polished prototype and set a launch no-go until all P0 items in this report are closed.**

---

## Audit scope and methodology

### Pages and states reviewed

The audit covered 30 route/probe combinations across desktop, tablet, and mobile, including:

- Home and global navigation
- Product hub and product filters
- HD Banner, Mesh, HDPE, Canvas, Poster, No-Curl, Econostand, and Retractable flows
- Sizes and pricing
- How It Works, Help/FAQ, Reviews, Templates, and Design Online
- Login, registration, cart, checkout, dashboard, orders, tracking lookup, order detail, and proof
- Admin sign-in shell and source-level review of order, pricing, content, and customer operations
- 404, offline/PWA, metadata, manifest, sitemap, and robots behavior

### Viewports and interaction methods

- Desktop: 1440 × 900
- Tablet: 768 × 1024
- Mobile: 390 × 844
- Narrow reflow check: 320 × 568
- Keyboard/focus review of navigation, drawers, and dialogs
- Full transaction walk-through: builder → artwork → cart → quantity → checkout → login → address → order → proof
- Reduced-motion review
- Automated accessibility checks with axe
- Lighthouse on a production build
- Existing Playwright E2E suite
- Source review where the mock environment could not expose a complete state

### Test results

- Production build: **passed**
- Existing Playwright suite: **57 passed, 35 skipped**
- Route/viewport snapshots: **90**
- Expected 200 responses: **84**
- Expected 404 probes: **6** (`/admin/orders` is not the order-board route; the board is `/admin`, and a generic missing-page probe was also included)
- Global horizontal overflow: **none detected** at audited viewport widths
- Axe rule types found: **8**
- Serious color-contrast occurrences: **1,477 element occurrences across repeated route/viewport snapshots**

### Important constraints

- Payment, production, and much of the backend are mocked or stubbed. This report therefore distinguishes prototype limitations from production-ready requirements.
- The mock store has no staff-role fixture and does not mock the full admin API, so authenticated admin screens received source-level and structural review rather than a complete live workflow test.
- Lighthouse values are lab results from a local production build with mocks, not real-user field data.

---

## UX scorecard

| Area | Score | Assessment |
|---|---:|---|
| Visual identity | 8/10 | Distinctive, consistent, and professional on desktop |
| Information architecture | 6/10 | Clear top-level categories, but repetitive marketing and several misleading destinations |
| Mobile UX | 5/10 | Responsive with no global overflow, but excessive page length and fixed overlays obstruct content |
| Product discovery | 7/10 | Good imagery and filters; pricing/use-case comparison can be clearer |
| Builder usability | 5/10 | Strong desktop concept, but orientation, required steps, controls, and mobile layout need work |
| Cart and checkout | 2/10 | Pricing mismatch and scroll lock are critical blockers |
| Post-purchase | 2/10 | Proof, tracking lookup, reorder, and timeline are incomplete or broken |
| Accessibility | 5/10 | Good foundations, but systematic contrast, dialog, landmark, and touch-target issues |
| Performance | 7/10 | Excellent desktop; mobile LCP is too slow on key funnel pages |
| Trust and conversion | 2/10 | Fake “verified” social proof, stubs, missing policies, and unclear currency undermine trust |
| Launch readiness | **No-go** | Core commerce correctness is not yet safe |

---

## What is working well

1. **Strong brand system.** Magenta, black, white, and condensed headings create a recognizable visual identity.
2. **Clear desktop hero.** The main value proposition, product imagery, and paired CTAs are immediately understandable.
3. **Cohesive component language.** Cards, buttons, pills, badges, borders, and image treatments feel related.
4. **Useful product imagery.** The order hub communicates categories faster than a text-only catalog would.
5. **Good desktop builder concept.** Rail, artwork stage, controls, and live price create a compact configuration workspace.
6. **Persistent pricing.** Price is visible in the builder and updates optimistically.
7. **Helpful product filtering.** Indoor, outdoor, windy, lay-flat, art/frame, and stand filters map to user intent.
8. **Good responsive foundations.** Layouts reflow cleanly and avoid page-level horizontal scrolling down to 320 px.
9. **Visible focus styling.** A global focus-visible treatment exists.
10. **Reduced-motion support.** The marquee and GSAP reveal content respect reduced-motion preferences.
11. **Mobile menu implementation.** The full menu includes scroll locking, Escape support, focus trapping, and focus return.
12. **Cart persistence.** Cart state survives authentication and navigation.
13. **Useful empty states.** Cart, orders, and dashboard states generally provide a next action.
14. **SEO/PWA foundations.** Manifest, robots, sitemap, social metadata, and offline scaffolding are present.
15. **Automated test foundation.** The project already has substantial builder and catalog E2E coverage.

---

# Prioritized findings

## P0 — launch blockers

### P0-01 — Cart quantity changes do not recalculate price

**Evidence**

- A cart line was changed from quantity 1 to quantity 2.
- The cart count changed to “2 items,” but product subtotal, shipping, total, and checkout CTA stayed at **$138**.
- Checkout showed “HD Banner · 4′ × 8′ × 2” and still displayed **$138**.
- The backend recalculated the created order to **$276**.

**Cause observed in source**

`updateLine` merges the new quantity into the cart line but does not re-quote or recompute `productSubtotal`, `shipping`, or `totalBeforeTax`.

**Impact**

A customer can agree to one total and receive another. This is a severe pricing, trust, support, and potentially legal issue.

**Recommendation**

- Store canonical configuration, not mutable derived totals, in the cart.
- Re-quote every quantity/configuration change using the same pricing service used by checkout.
- Disable checkout while a quote is refreshing.
- Display an error and preserve the last confirmed quote if re-quoting fails.
- Add E2E assertions that builder, drawer, cart page, checkout, and created order totals are identical.

### P0-02 — Cart drawer permanently locks page scrolling

**Evidence**

- Opening the drawer correctly set body overflow to `hidden`.
- Closing it left body overflow as `hidden`.
- Navigating through the drawer’s Checkout CTA also left body overflow as `hidden`.
- In the tested flow, fields below the checkout fold could not be reached until the page was reloaded.

**Impact**

The primary cart-to-checkout journey can become unusable, especially on mobile.

**Recommendation**

Restore the previous body overflow value whenever drawer state becomes closed, not only when the component unmounts. Add tests for close button, backdrop, Escape, “View full cart,” and “Checkout.”

### P0-03 — No real artwork proof is shown

**Evidence**

The proof screen says:

- “Your artwork, as uploaded”
- “This is what we’ll print”
- `[ Artwork preview — PDF / JPG page 1 ]`

The proof page rendered **zero main-content images** in the tested order.

**Impact**

Customers are asked to legally approve content they cannot see. This defeats the core proof step and risks incorrect production.

**Recommendation**

Render a deterministic, high-resolution proof generated from the exact production asset and configuration. Include dimensions, bleed/safe area, crop, orientation, sides, finishing, file name/version, DPI/quality status, and a zoom/download action.

### P0-04 — Artwork is not required before adding or ordering

**Evidence**

- “Add to cart” is enabled before artwork is uploaded or selected.
- The tested order was successfully placed with no artwork.
- The resulting proof still claimed “Your artwork, as uploaded.”
- Retractable also goes directly to cart without an artwork step.

**Impact**

Orders can enter a production workflow with no printable asset.

**Recommendation**

Either:

1. Require valid artwork before add-to-cart, or
2. Offer an explicit “Upload later” workflow with a clearly blocked production state, deadline, reminders, and no false proof language.

Do not silently treat missing artwork as complete.

### P0-05 — Payment is a stub but the UI creates an order

**Evidence**

Checkout explicitly states that Stripe/PayPal/Apple Pay are stubbed and that Place Order creates a test order.

**Impact**

This is acceptable for an internal prototype, but it is an absolute public-launch blocker. Payment badges currently imply capabilities that do not exist.

**Recommendation**

Keep the environment visibly non-production until real payment authorization, failure/retry, 3DS, wallet, duplicate submission protection, refunds, receipts, and payment status are implemented and tested.

### P0-06 — Unverified-address risk acknowledgement is bypassable

**Evidence**

- Postal code `00000` correctly produced an unverified-address warning and risk checkbox.
- All final acknowledgements were checked, but the address-risk checkbox was left unchecked.
- Place Order became enabled and the order was created.

**Cause observed in source**

A `validated` state exists but is never updated; the UI displays `validate.data` while submit gating checks `validated`.

**Impact**

The stated shipping-risk consent and delivery-guarantee rule are not enforced.

**Recommendation**

Use a single validation state source, require risk consent both client- and server-side, mark the order as unverified, and persist the exact acknowledgement timestamp/version.

### P0-07 — “Track Order” is nonfunctional

**Evidence**

The primary navigation prominently links to order tracking. Submitting an order number and email does not perform a lookup; it only displays a message telling the user to log in. The same behavior remains even though the form appears to support guest lookup.

**Impact**

A highly visible support promise is broken and will drive support contacts.

**Recommendation**

Implement secure order-number + email/postal-code lookup, or remove the form and route users directly to authenticated orders until lookup exists.

### P0-08 — “Reorder this” targets a missing route

**Evidence**

The order detail links to `/orders/{id}/reorder`, but no matching front-end route exists. The dashboard’s separate mutation-based reorder path is not used here.

**Recommendation**

Use the existing reorder API/cart loading flow and route to a reviewable cart, with an artwork-version warning and current-price re-quote.

### P0-09 — Placeholder testimonials are presented as real and verified

**Evidence**

The testimonial data source comments that the entries are representative placeholders. Each entry sets `verified: true`, while the public page says “Real feedback from verified customers. We only publish sourced quotes.”

**Impact**

This is a major trust and advertising risk.

**Recommendation**

Remove the testimonials until written permission and source records exist. Never mark synthetic/representative content as verified. Replace with real production evidence, customer logos with permission, or transparent non-testimonial trust signals.

### P0-10 — Dimension orientation can lead to incorrect orders

**Evidence**

The default is labeled “4′ × 8′,” stored as width 4 and height 8, and rendered as a portrait 0.5 aspect-ratio banner. Common banner ordering convention typically describes 4′ high × 8′ wide, while the UI labels fields Width and Height.

**Impact**

A user can believe they selected a standard landscape banner while the system previews and potentially produces a portrait banner.

**Recommendation**

Resolve the product convention before launch. Use explicit labels such as **Horizontal width (left to right)** and **Vertical height (top to bottom)**, add a dimension diagram, show orientation (“Landscape”/“Portrait”), and ensure all popular-size links, pricing, proof, cart, and production snapshots use the same semantics.

### P0-11 — Currency, tax, and final payable total are unclear

**Evidence**

- The platform sells to the US and Canada but all values use an unlabeled `$`.
- Checkout shows “Total before tax,” then allows Place Order without showing a final tax-inclusive payable total.
- Duties, Canadian taxes, and currency conversion are not explained.

**Recommendation**

State USD/CAD explicitly, calculate destination tax before order placement, disclose duties/fees, and show one final authorized amount directly above Place Order.

### P0-12 — Essential commerce/legal policies are missing

No visible Privacy, Terms, Refund/Cancellation, Shipping/Guarantee Terms, Cookie, or Accessibility links were found in the global footer. Account creation and Place Order do not link to the terms being accepted.

**Recommendation**

Add reviewed policies and versioned consent. The guarantee needs full eligibility/exclusion terms, not only marketing copy.

---

## P1 — high-priority usability, accessibility, and conversion issues

### P1-01 — Mobile countdown obscures content

The fixed countdown island sits above the fixed bottom bar and visibly covers:

- Hero trust points
- Product cards on the order hub
- Builder controls and item rail
- How It Works content
- Login/register content
- Help cards

It uses `pointer-events: none`, so controls may still technically receive input, but users cannot clearly see what they are acting on.

**Recommendation:** remove it from task routes, collapse it into the announcement or sticky CTA, or reserve layout space so it never overlays content.

### P1-02 — Mobile pages are excessively long and repetitive

Measured full-page heights at 390 px width:

| Page | Height | Approx. 844 px viewports |
|---|---:|---:|
| Home | 17,940 px | 21.3 |
| Sizes | 12,085 px | 14.3 |
| Order hub | 4,199 px | 5.0 |
| Help | 4,624 px | 5.5 |
| Login | 2,328 px | 2.8 |
| Builder | 2,493 px | 3.0 |

The home page repeats product discovery through product catalog, popular sizes, product guide, industries, guarantee, testimonials, FAQ, and another CTA. The global mobile footer then adds a long duplicate navigation stack.

**Recommendation:** progressively disclose secondary products, use two-column compact cards or horizontal snap lists where accessible, and collapse the mobile footer into accordions or a compact legal/contact footer.

### P1-03 — Checkout authentication breaks journey continuity

From checkout, Log In and Create Account navigate away. Successful login always goes to `/dashboard`, not back to checkout. The customer must manually rediscover the cart/checkout.

**Recommendation:** preserve `next=/checkout`, return after authentication, and strongly consider guest checkout with optional account creation after purchase.

### P1-04 — Mandatory account creation adds conversion friction

Checkout explicitly requires an account. For a speed-led emergency-printing proposition, forced registration conflicts with the promise of a fast order.

**Recommendation:** support guest checkout, then offer password creation after confirmation. If an account is operationally required, explain the benefit before the user reaches checkout and minimize interruption.

### P1-05 — Systematic text contrast failure

The muted token `#979797` produces approximately:

- **2.92:1** on white
- **2.67:1** on `#F5F5F5`

Normal text requires 4.5:1. Axe found serious contrast issues on 88 of 90 repeated route/viewport snapshots. Labels, descriptions, breadcrumbs, footer content, builder controls, specs, and form guidance are affected.

**Recommendation:** replace the muted token with a darker accessible neutral and validate every token/background pair. Do not solve this only by increasing font size.

### P1-06 — Inline links rely on color alone

Axe found link-in-text-block failures on 23 snapshots. Magenta links are often not underlined until hover and differ insufficiently from surrounding muted gray text for non-color recognition.

**Recommendation:** underline body-copy links by default or add another persistent visual treatment.

### P1-07 — Dialogs lack consistent keyboard behavior

The cart and mobile menu implement focus management well, but More Info, Image Picker, and Color Match do not consistently:

- Move focus into the dialog
- Trap focus
- Close with Escape
- Restore focus
- Lock background scroll
- Make background content inert

In the live Image Picker test, focus remained on the underlying “Images” button after the modal opened.

**Recommendation:** standardize all dialogs on the Radix Dialog dependency already in the project.

### P1-08 — Desktop mega menu is not a complete keyboard menu

The Banners menu opens on focus but has no `aria-expanded`, Escape handling, explicit button trigger, or robust focus/blur close behavior. It can remain open after keyboard focus moves away.

**Recommendation:** use a button + disclosure/menu pattern with `aria-expanded`, `aria-controls`, Escape, outside-click, and deterministic focus behavior.

### P1-09 — Missing skip link and landmark issues

- No “Skip to main content” link exists.
- The announcement content sits outside a named landmark.
- Builder asides are not uniquely labeled.
- The home guarantee aside is nested inside another landmark in a way flagged by axe.
- Repeated footer heading levels create heading-order failures.
- Empty checkout has no H1.

**Recommendation:** establish a documented page-landmark and heading contract across layouts.

### P1-10 — Touch targets are frequently too small

Examples include:

- 32 × 32 builder quantity controls
- Approximately 28 px dialog close buttons
- 38 px filter chips
- Tiny custom grommet dots (about 12 × 12)
- 40 px default form fields
- Many text-only footer targets around 18–20 px high

**Recommendation:** target at least 44 × 44 CSS px for primary touch controls and at least WCAG 2.2’s 24 × 24 minimum for all non-exempt targets.

### P1-11 — Builder control strip hides options without a clear affordance

On desktop the final “Wind slits” control is visibly clipped. On narrow screens, the rail is horizontally scrollable, but there is no gradient, arrow, scrollbar affordance, or “more options” indicator.

**Recommendation:** group options into labeled sections or provide explicit horizontal-scroll affordances.

### P1-12 — Builder lacks a required-step model

The interface presents Images, Size, Material, Sides, Welding, Rope, Grommets, Pockets, and Wind Slits as equally weighted icon tiles. It does not tell a first-time user what is required, complete, invalid, or recommended.

**Recommendation:** use a short step/status model: Product → Size → Artwork → Finishing → Review. Keep expert controls available without making all users decode an icon toolbar.

### P1-13 — Price and configuration information is duplicated

On desktop, live price and rate matrix appear in both the stage header and right-side price card. This consumes space while the actual artwork preview remains small.

**Recommendation:** keep one authoritative sticky summary and use stage space for the proof/artwork.

### P1-14 — No print-quality feedback

Artwork auto-sizing uses pixel dimensions and a default DPI, but the customer receives no visible low-resolution warning, effective DPI, bleed warning, or crop/fit explanation before approval.

**Recommendation:** show effective DPI, safe area, crop/fit result, and blocking vs advisory print checks.

### P1-15 — Sample artwork previews are broken in the mock experience

Mock artwork points to `/placeholder-artwork.png`, which is not present in public assets. The stage receives a background URL but the asset returns 404.

**Recommendation:** ship valid local fixtures and include visual regression coverage for loaded artwork, not just size changes.

### P1-16 — Email CTA discards the entered email

Entering an email in the homepage CTA routes to `/register?email=...`, but registration does not consume the query parameter; the email field is empty.

**Recommendation:** prefill and preserve the email, or remove the field and use a direct Order CTA. Do not present a form that provides no benefit.

### P1-17 — Account recovery and password usability are incomplete

Login has no Forgot Password, show/hide password, password-manager guidance beyond autocomplete, or recovery support. Registration has no visible password requirements until submission.

### P1-18 — Checkout validation and acknowledgement UX is heavy and inconsistent

- Five legal-style checkboxes are required at checkout.
- The same concepts are repeated on the proof page.
- Checkout asks the customer to accept artwork quality before a real proof exists.
- Invalid form messages are not associated through `aria-describedby`.
- There is no top-level error summary or focus jump.

**Recommendation:** move proof-specific acknowledgements to the real proof step, keep checkout consent concise, and provide accessible error recovery.

### P1-19 — Delivery promise changes/flickers between fallback and API data

During the tested checkout/proof flow, the order-specific delivery day was Wednesday while a global countdown card showed Tuesday. Initial fallback/API retry states also changed displayed dates.

**Recommendation:** use one server-authoritative promise tied to cart/order state. Never show a generic countdown beside a conflicting order-specific delivery date.

### P1-20 — Cutoff copy is operationally ambiguous

The announcement says “Order by 9:00 PM ET,” while other copy says the SLA begins after proof approval. Mobile shortens this to “48-hr delivery,” omitting “business,” which can imply calendar hours.

**Recommendation:** consistently state the exact qualifying event, for example: “Pay and approve your proof by 9 PM ET for delivery by [date] at noon.”

### P1-21 — Product hub lacks decision-critical pricing

Cards show title, description, More Info, and Order, but not starting price, common size, best-for summary, or indoor/outdoor/durability comparison. Users must enter builders or the very long pricing page.

**Recommendation:** add concise “From,” use case, durability, and maximum size facts to each product card.

### P1-22 — Retractable imagery does not clearly show the product

The gallery uses generic event and print-production photography rather than clear hardware, stand, case, base, assembled dimensions, and graphic close-ups.

**Recommendation:** use real product photography and show exactly what is included.

### P1-23 — Reviews, saved artwork, templates, and design claims are inconsistent

- Templates and Design are public “Coming soon” destinations.
- Dashboard promises saved artwork/designs but labels the area coming soon.
- An artwork library exists in the builder.
- Offline copy says saved designs are safe, though saved designs are not implemented.

**Recommendation:** define one honest capability matrix and remove unsupported promises from public navigation and offline messaging.

### P1-24 — No-artwork and color-match states do not update delivery eligibility clearly

Color match warns that it may add 24–48 hours, but the surrounding site continues to emphasize the standard 48-business-hour promise. Missing artwork also does not visibly suspend production eligibility.

**Recommendation:** recalculate and display a state-specific promised date before add-to-cart and checkout.

### P1-25 — Mobile navigation under-prioritizes shopping

The fixed bar contains Menu, Orders, Sizes, Account, and Cart. “Orders” means history, but the primary shopping destination (“Order” or “Banners”) is absent. The similar words can be confusing.

**Recommendation:** make a central primary “Order” action and move order history under Account if necessary.

### P1-26 — Admin uses consumer chrome

The root layout always renders consumer announcement, nav, footer, mobile tabs, countdown island, and cart. Admin then adds its own operations header/main. A signed-in staff user therefore risks duplicated shells and irrelevant commerce overlays.

**Recommendation:** place admin in a separate route-group layout with no consumer chrome and a responsive admin navigation pattern.

---

## P2 — polish and consistency improvements

1. **Overlong global footer.** It dominates simple pages and duplicates mobile menu/navigation.
2. **Negative support framing.** “No inbound phone calls” foregrounds a limitation. Replace with response-time expectations and available channels.
3. **Literal HTML entity.** Help renders “US &amp; Canada?” in a visible question because an entity is embedded in a normal string.
4. **Metadata title duplication.** Pages such as Sizes, How It Works, Help, Reviews, Templates, and Design produce titles like “... — Banners In 48 | Banners In 48.”
5. **Generic titles.** Login, registration, cart, checkout, dashboard, orders, tracking, and admin inherit the homepage title.
6. **Demo credentials are public in the login UI.** Keep them only in development/test builds.
7. **Machine status exposed.** Order cards can show raw statuses such as `AWAITING_PROOF_APPROVAL` beside human-readable copy.
8. **Order timeline omits key stages.** Proof approval and production are central but not represented clearly.
9. **Filter semantics.** Active filter chips need `aria-pressed` or equivalent selected-state semantics.
10. **Empty rate-table headers.** Axe flags empty column headers in the builder rate matrix.
11. **Unsupported controls.** Disabled builder tiles are visually faded but should expose `aria-disabled` and an associated explanation.
12. **No edit-from-cart action.** Customers can change quantity but cannot return directly to a line’s exact builder configuration.
13. **No undo after removal.** A toast/undo would reduce accidental loss.
14. **No “clear filter” until a filter is applied.** Fine functionally, but a compact selected-filter summary would improve context on mobile.
15. **Photo repetition.** The same assets appear across the homepage, order hub, help, pricing, and product pages, reducing premium perception.
16. **Payment chips look generic.** Use approved payment marks only after the methods are actually available.
17. **PWA portrait lock.** `orientation: portrait` prevents an installed tablet/mobile builder from using a more useful landscape canvas.
18. **No custom support SLA.** A speed-first product needs a visible email/chat response expectation.
19. **No search.** The current catalog is small enough not to require it, but Help would benefit from searchable questions once content expands.
20. **Admin content editor is JSON-first.** It is error-prone for nontechnical content editors and has no preview.
21. **Admin pricing tiers use free-form material codes.** Use validated selects and a readable rate table.
22. **Admin destructive actions rely on browser confirms.** Use consistent, auditable confirmation dialogs.
23. **Footer product links are too exhaustive on mobile.** Product navigation belongs in the menu/catalog, not a two-screen footer.
24. **Sparse pages carry excessive vertical chrome.** Login and lookup appear polished but are surrounded by large empty areas and a very long footer.

---

# Area-by-area audit

## 1. Global visual system

### Strengths

- Distinct and memorable palette
- Good use of large condensed headings
- Consistent radii and card shadows
- Strong photography-led product cards
- Clear magenta CTA hierarchy
- Clean desktop spacing

### Issues

- Muted gray is too pale and makes the interface feel washed out.
- Display type is used widely, including utilitarian admin/footer headings; reserve it for brand moments and major hierarchy.
- Dense all-caps labels become hard to scan at small sizes.
- Repeated dark gradients over imagery can make product cards visually similar despite different products.
- Large sections and repeated card grids create a template-like rhythm rather than a curated premium journey.

### Direction

Keep the palette and display face, but use fewer, stronger sections; darker body neutrals; more authentic product-detail photography; and a calmer information hierarchy.

## 2. Header, navigation, and footer

### Desktop

The desktop header is clear and keeps Order Now prominent. Track Order is easy to find. The attached Login/Order control is visually distinctive.

Improve keyboard behavior for the Banners mega menu and reduce reliance on hover. Add visible active states consistently for all destinations.

### Mobile

The logo and announcement consume about 106 px before page content. The bottom bar is reachable, but the countdown island competes with it. A central Order action would better reflect the primary task.

### Footer

Desktop footer is organized but oversized on simple pages. Mobile footer is disproportionately long and duplicates the menu. It also lacks essential legal links.

## 3. Homepage

### What works

- Strong first impression and clear value proposition
- Prominent primary CTA
- Good brand/product image pairing
- Helpful visual catalog and use-case discovery
- Guarantee and FAQ help reduce uncertainty

### What to improve

- Reduce repeated explanations of the same products.
- Replace placeholder testimonials with real evidence.
- Avoid repeating “48 business hours” without precise eligibility conditions.
- Do not use a pseudo-email capture that discards email.
- Surface a concise three-question product selector earlier.
- Move secondary product grids behind “View all.”
- Compress mobile page length from ~21 viewports to a focused conversion path.

### Recommended homepage structure

1. Hero with exact delivery promise and one primary CTA
2. Three-question “Help me choose” selector
3. Four top products + View All
4. Real customer/production proof
5. How it works in three concise steps
6. Guarantee and support
7. Five top FAQs
8. Final CTA

## 4. Product hub

The hub is visually attractive and its intent filters are useful. On mobile, filter wrapping is understandable and product cards are easy to scan.

Add starting price, best use, key limit, and material/finish summary. Make More Info dialogs fully accessible. Consider one direct “Choose” action per card rather than a card link plus overlapping action unless both have clearly distinct purposes.

## 5. Sizes and pricing

The page is transparent and detailed, with a useful matrix and constraints. It is one of the strongest informational pages on desktop.

On mobile it reaches ~12,085 px. The full matrix, material cards, standard sizes, other products, finishing, stands, constraints, and footer should not all be expanded by default. Use tabs or accordions: HD Banner, Other Products, Finishing, Stands, Rules. Keep the matrix horizontally scrollable with a sticky first column and visible scroll cue.

Clarify whether displayed prices include shipping and use a consistent “product / shipping / tax / total” model.

## 6. Builder

### Desktop strengths

- Compact workspace
- Live visual stage
- Persistent price and configuration
- Useful finishing options
- Supports multiple signs and color notes

### Major issues

- Portrait rendering of standard banner sizes
- Artwork not required
- Duplicate price/rate UI
- Small preview relative to workspace
- Clipped control strip
- Weak required/completion status
- No quality checks
- No undo/reset
- No clear delivery impact for special options

### Mobile issues

- Price card, stage, controls, rail, countdown, and tab bar compete for limited space.
- The preview is too small to inspect meaningfully.
- Fixed overlays cover controls.
- Item rail requires horizontal discovery.

### Recommended builder model

- Sticky compact summary: product, size, price, delivery date
- Main stepper: Size → Artwork → Options → Review
- Mobile options in an accessible bottom sheet
- Full-screen/zoom artwork review
- Clear orientation diagram
- Required/completed/error badges
- Server-confirmed quote and delivery promise
- Explicit upload-later state if supported

## 7. Cart

The cart presentation is visually clear, and line details include requested/billable dimensions and finishing. The drawer has a useful summary and focus trap.

Before release, fix derived pricing, scroll restoration, artwork status, edit configuration, removal undo, currency, tax, and quote freshness. Revalidate all quotes on load and checkout.

## 8. Checkout

The two-column desktop layout and shipping-summary structure are sensible. Labels and autocomplete attributes are present.

The flow needs to become a real checkout:

1. Contact / guest or account
2. Delivery address and validation
3. Delivery promise
4. Payment
5. Final price and terms
6. Place order

Do not ask customers to approve unseen artwork. Show final currency/tax. Preserve checkout through authentication. Use express wallets only when real. Provide accessible validation summary and focus handling.

## 9. Account and authentication

Login and registration are clean and simple. Add guest checkout, Forgot Password, show/hide password, requirements, terms, and return URLs. Remove demo credentials outside development.

Dashboard quick actions should not render noninteractive “Soon” cards as if they are usable. Explain rewards and provide profile/address management. Align “saved artwork” claims with actual functionality.

## 10. Orders, proof, tracking, and reorder

This area needs substantial product completion:

- Real guest tracking lookup
- Real proof preview and versioning
- Clear proof rejection/re-upload path
- Friendly, complete timeline: Ordered → Paid → Proof → Approved → Production → Shipped → Delivered
- Working reorder with current pricing and artwork confirmation
- Clear cancellation status and confirmation
- No raw status codes
- One authoritative order-specific delivery date

## 11. Help and support

Visual product selection is helpful. The quick answers are readable, though static cards are less efficient than accessible accordions on mobile.

Reframe support positively: “Email us — typical response within X minutes/hours.” For an urgent 48-hour service, add live chat or a monitored escalation route. Separate Artwork Guidelines, Shipping/Guarantee, Cancellation, and File Setup into deep-linkable articles.

## 12. Reviews, templates, and design

Do not publish placeholder reviews. Coming-soon pages should not occupy prominent navigation unless they capture genuine demand and set expectations. If retained, offer a waitlist that actually records the address and explain launch timing without internal terms such as “Phase 2/3.”

## 13. Admin operations

Separate admin from consumer layout. The authenticated admin should have:

- Responsive navigation
- Clear role/access states
- Search, filter, pagination, bulk actions
- Accessible tables with mobile alternatives
- Unsaved-change protection
- Validated pricing controls
- Content preview and structured editors
- Audit history for pricing/content/status actions
- Consistent confirmation dialogs

Avoid exposing technical implementation copy (“Public GET /content”) to content editors unless the audience is explicitly technical.

## 14. Empty, error, loading, and offline states

### Good

- Cart/orders/dashboard empty states usually include next actions.
- A global 404 exists.
- Skeletons are used for catalog loading.
- Offline route exists.

### Improve

- Mock initialization causes initial connection-refused errors and visible retry states before MSW controls requests.
- Empty checkout lacks an H1.
- Order not-found and API errors need retry/support actions.
- Loading should preserve page structure and avoid repeated `updating…` noise.
- Offline copy must not promise saved designs until they exist.
- Add upload progress, cancellation, retry, and recovery for 50 MB files.

---

# Accessibility audit

## Automated results

The following axe rules were triggered:

| Rule | Impact | Main cause |
|---|---|---|
| `color-contrast` | Serious | Muted text token on white/light gray |
| `link-in-text-block` | Serious | Links distinguished primarily by color |
| `heading-order` | Moderate | Footer/page level skips |
| `region` | Moderate | Announcement content outside landmarks |
| `landmark-unique` | Moderate | Unlabeled duplicate builder asides |
| `landmark-complementary-is-top-level` | Moderate | Nested home aside |
| `page-has-heading-one` | Moderate | Empty checkout state |
| `empty-table-header` | Minor | Builder rate matrices |

## Manual findings

- No skip link
- Inconsistent dialog focus management
- Desktop mega-menu disclosure issues
- Small touch targets
- Active filters not exposed semantically
- Default checkboxes are visually small
- Error text is not programmatically associated with controls
- No error summary/focus management after failed submission
- Tiny grommet removal targets are not usable with touch or motor impairment
- Some fixed overlays obscure enlarged/reflowed content

## Positive accessibility foundations

- Language is set to English.
- Most fields have visible labels.
- Inputs use autocomplete where appropriate.
- Focus-visible styling exists.
- Mobile menu and cart drawer attempt focus traps.
- Reduced-motion support exists for major marketing animations.
- Decorative card images use empty alt text while links receive accessible names.

## Accessibility target

Before launch, require:

- Zero critical/serious axe violations in all primary states
- WCAG 2.2 AA contrast
- Complete keyboard operation
- No focus loss or background interaction in dialogs
- 200% zoom/reflow without obstruction
- Screen-reader walkthroughs of builder, cart, checkout, proof, and tracking

---

# Responsive and mobile audit

## Strengths

- No page-level horizontal overflow at 320/390/768 px
- Cards and forms generally stack cleanly
- Bottom navigation is reachable
- Mobile menu is thoughtfully implemented
- Buttons typically expand to full width in key forms

## Weaknesses

- Fixed countdown overlaps content.
- Mobile footer is too long.
- Home and pricing pages require excessive scrolling.
- Builder preview is too small for proofing.
- Product/control rails require hidden horizontal scrolling.
- Large image stacks increase mobile load and fatigue.
- Admin is not isolated from consumer mobile navigation.
- Portrait PWA lock limits the builder.

## Tablet

Tablet reflow is stable, but it inherits mobile bottom navigation and the countdown island. The builder remains in the mobile-style stacked layout until 901 px, missing an opportunity to use tablet width more effectively. Consider a tablet-specific two-pane builder.

---

# Performance audit

## Lighthouse lab results

| Page/profile | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Home desktop | 100 | 92 | 96 | 100 | 0.8 s | 0 ms | 0 |
| Home mobile | 88 | 92 | 96 | 100 | 3.9 s | 40 ms | 0 |
| Order hub mobile | 81 | 92 | 96 | 100 | 5.1 s | 10 ms | 0 |
| Builder mobile | 82 | 94 | 96 | 100 | 4.7 s | 20 ms | 0.08 |

### Findings

- Desktop performance is excellent in the local production build.
- Mobile LCP misses the recommended ≤2.5 s target on all three key pages.
- Home renders about **1,060 DOM elements** and a roughly 17.7–17.9k px mobile body.
- Lighthouse estimated 43–71 KiB responsive-image savings on audited pages.
- Unused JavaScript savings were approximately 31–54 KiB.
- API-backed mock pages log initial connection-refused errors before the worker is ready.
- The order hub waits for catalog data before its primary product imagery becomes the largest content.

### Recommendations

- Server-render or statically provide product catalog data instead of waiting for client mocks/API for first content.
- Gate mock-only rendering until MSW is ready in test/dev.
- Prioritize only above-the-fold images and reduce repeated below-fold media.
- Tighten `sizes` values for 390/412 px devices.
- Reduce homepage DOM and section count.
- Measure real p75 LCP, INP, and CLS in production using RUM.

---

# Content, trust, and conversion audit

## Trust gaps

- Placeholder “verified” testimonials
- Payment stubs with payment-method claims
- No real proof
- Broken tracking/reorder
- Missing policy/legal links
- No currency/tax clarity
- Only email support with no response SLA
- Generic/reused product imagery
- Demo credentials shown publicly
- Internal roadmap language on customer pages

## Copy gaps

- “48-hr delivery” omits “business” on mobile.
- “Order by 9 PM” does not clearly say payment/proof approval must be complete.
- “No inbound phone calls” is unnecessarily negative.
- Technical/internal terms such as “Phase 1.5,” “Phase 2,” “Phase 3,” “mock backend,” and “stubbed” should never appear in production customer UI.
- “What you see is what you get” is inappropriate while no real proof is visible.

## Conversion opportunities

- Guest checkout
- Real delivery-date promise based on destination and approval deadline
- Product starting prices on the hub
- Real reviews and production proof
- File-readiness checks
- Clear support SLA
- Fewer homepage sections
- Compact mobile footer
- Persistent but non-obstructive mobile Order CTA

---

# SEO, metadata, and discoverability

## Good

- Root metadata, Open Graph, Twitter card, sitemap, robots, manifest, and icons exist.
- Product routes have descriptive metadata.
- Marketing pages are indexable while templates/design are noindex.

## Improve

- Remove duplicate brand suffixes in titles.
- Add unique titles/descriptions for account, cart, checkout, dashboard, order history, tracking, and admin/noindex states.
- Add canonical URLs.
- Add Product/Offer structured data only when price/currency/availability are authoritative.
- Add FAQ structured data for public FAQs if content remains visible and accurate.
- Ensure reviews structured data is never used until testimonials are genuine and policy-compliant.
- Use meaningful stable `lastModified` values in the sitemap rather than request time.

---

# Recommended target experience

## Desktop

- Keep the current brand, hero, and photography direction.
- Simplify the homepage to one product-discovery sequence.
- Turn the builder into a clear guided workspace with one summary panel and a larger proof stage.
- Keep checkout distraction-free with reduced header/footer chrome.

## Mobile

- Replace the floating countdown with an integrated sticky summary.
- Use a central Order action in the bottom bar.
- Convert long product grids into compact, accessible progressive disclosure.
- Use a step-based builder with a full-screen artwork preview and bottom-sheet controls.
- Collapse the footer.

## Trust

- Use real customer/production evidence.
- Show an exact order-specific delivery date and qualification rule.
- Show real payment, policy, support, and proof capabilities only when functional.

---

# Remediation roadmap

## Phase 0 — commerce correctness and honesty

1. Fix cart re-quoting and total consistency.
2. Fix drawer scroll restoration.
3. Require artwork or implement a formal upload-later state.
4. Render a real proof.
5. Enforce address validation and acknowledgement server-side.
6. Implement payment or keep the build private/non-production.
7. Implement/remove tracking and reorder actions.
8. Resolve dimension orientation semantics.
9. Remove fake verified testimonials and production-facing stub/demo copy.
10. Add final tax/currency totals and legal policies.

## Phase 1 — mobile and accessibility

1. Replace the muted color token.
2. Fix inline-link styling.
3. Remove/relocate the floating countdown.
4. Standardize dialogs on Radix.
5. Add skip link, landmarks, heading order, table headers, and empty-state H1s.
6. Increase target sizes.
7. Add accessible form error associations and summaries.
8. Simplify mobile footer and long pages.
9. Improve mobile/tablet builder.

## Phase 2 — conversion and visual refinement

1. Simplify homepage information architecture.
2. Add decision facts/prices to product cards.
3. Replace repeated/generic media with real product and production assets.
4. Add guest checkout and checkout return URLs.
5. Improve support, trust, guarantee, and file-readiness content.
6. Complete account/artwork capability alignment.

## Phase 3 — performance and quality gates

1. Server-render catalog/cutoff-critical content.
2. Optimize image sizing and below-fold loading.
3. Reduce home DOM/section count.
4. Add mobile E2E coverage for every hub and builder flow currently skipped.
5. Add axe checks to Playwright.
6. Add visual regression at 320, 390, 768, 1024, and 1440 px.
7. Add RUM and funnel analytics.

---

# Release acceptance criteria

The site should not launch until all of the following are true:

## Commerce

- [ ] Quantity/configuration changes re-quote and remain identical across builder, cart, checkout, receipt, and order detail.
- [ ] A user cannot unknowingly order without artwork.
- [ ] The proof displays the exact production asset and configuration.
- [ ] Payment succeeds/fails/retries safely and the final authorized amount is shown.
- [ ] Unverified addresses cannot proceed without required consent.
- [ ] Currency, taxes, shipping, and total are explicit.
- [ ] Tracking and reorder work end to end.
- [ ] Dimension orientation is unambiguous.

## Usability

- [ ] Closing/navigating from any drawer or dialog restores page scrolling and focus.
- [ ] Authentication returns the user to checkout.
- [ ] No fixed UI obscures content or controls.
- [ ] Mobile home and pricing journeys are substantially shorter and progressively disclosed.
- [ ] All public links lead to implemented, honest destinations.

## Accessibility

- [ ] No serious/critical axe violations in primary states.
- [ ] Normal text meets 4.5:1 contrast.
- [ ] All dialogs support focus entry, trap, Escape, inert background, and focus return.
- [ ] Primary controls meet 44 × 44 target guidance.
- [ ] Complete keyboard and screen-reader purchase flow passes.
- [ ] 200% zoom and 320 px reflow do not obscure content.

## Trust and content

- [ ] All testimonials are genuine, sourced, and permissioned.
- [ ] No mock, stub, placeholder, demo credential, or internal phase language appears in production.
- [ ] Guarantee terms and qualification timing are consistent everywhere.
- [ ] Privacy, terms, shipping, cancellation/refund, and accessibility policies are linked.

## Performance

- [ ] Mobile p75 LCP ≤2.5 s on home, catalog, and builder.
- [ ] Mobile p75 INP ≤200 ms and CLS ≤0.1.
- [ ] No avoidable console/network errors.
- [ ] API loading does not hide the primary product catalog behind repeated retries.

---

# Route-by-route notes

| Route | Status | Primary UX note |
|---|---|---|
| `/` | Strong visual base; revise | Excellent desktop first impression; mobile is ~21 viewports and repeats product discovery too often |
| `/order` | Revise | Attractive cards and useful need filters; add decision facts/prices and accessible dialogs |
| `/order/hd-banner` | Blocked | Strong workspace concept; orientation, no-artwork ordering, clipped controls, and proof flow are critical |
| `/order/mesh` | Blocked | Same core builder blockers; clearly explain webbing/rope/grommet compatibility and delivery impact |
| `/order/hdpe` | Blocked | Simplified builder is easier, but artwork/proof/orientation and checkout blockers remain |
| `/order/canvas` | Blocked | Product distinction is visible; add stretching/frame guidance and real texture/edge imagery |
| `/order/poster` | Blocked | Clear short-term indoor positioning; artwork/proof and size semantics remain unresolved |
| `/order/no-curl` | Blocked | Size eligibility feedback exists; explain the unusual size limits before users enter the builder |
| `/order/econostand` | Blocked | Fixed-product path is simpler; require artwork and show exact included hardware |
| `/order/retractable` | Blocked | Separate configurator works visually, but has no artwork step and uses generic rather than product-specific imagery |
| `/order/vinyl` | Compatible redirect | Legacy redirect preserves size parameters; keep automated coverage |
| `/order/artwork` | Redirect only | Footer “Upload Artwork” suggests a dedicated action but only redirects to the catalog; label more honestly or open a product-aware flow |
| `/sizes` | Strong desktop; revise mobile | Transparent detail, but ~14 mobile viewports; use tabs/accordions and clarify totals/currency |
| `/how-it-works` | Good visual explainer | Four steps are clear; wording must match the real payment/proof/cutoff sequence |
| `/help` | Useful but incomplete | Good visual chooser; improve support framing, deep-linkable guidance, and literal `&amp;` copy bug |
| `/faq` | Redirect | Redirect to Help is fine; footer/menu FAQ links should target the FAQ section directly |
| `/reviews` | Remove or replace | Publicly claims real verified feedback while using placeholder content |
| `/templates` | Coming soon | Keep out of primary navigation or use a real, functioning waitlist without internal phase language |
| `/design` | Coming soon | Same concern; do not advertise unsupported AI/editor capabilities as a near-term customer action |
| `/login` | Visually clean; incomplete | Add recovery, password visibility, production-safe copy, and checkout return URL |
| `/register` | Visually clean; incomplete | Prefill passed email, show password requirements, link terms/privacy, and avoid forced registration at checkout |
| `/cart` | Blocked | Clear presentation, but quantity pricing is stale and line editing/artwork status are missing |
| `/checkout` | Blocked | Scroll lock, stale totals, payment stub, risk bypass, forced auth, and duplicate acknowledgements |
| `/dashboard` | Prototype | Good empty state; capability claims and “Soon” cards need alignment; rewards need explanation |
| `/orders` | Prototype | List structure is clear; depends on completed order/status/reorder functionality |
| `/orders/lookup` | Blocked | Form does not look up an order despite prominent Track Order navigation |
| `/orders/[id]` | Blocked | Status presentation is useful, but reorder is broken and timeline omits core proof/production stages |
| `/orders/[id]/proof` | Blocked | No proof image; placeholder cannot be approved safely |
| `/offline` | Revise copy | Useful scaffold; do not promise saved designs until they are implemented and tested offline |
| 404 | Good base | Clear explanation and return action; add search/help link if content grows |
| `/admin` | Structurally revise | Consumer shell surrounds staff login/admin; isolate admin layout |
| `/admin/pricing` | Source-reviewed | Replace free-form codes, add unsaved-change protection and audit history |
| `/admin/content` | Source-reviewed | JSON-only editing is not friendly for content editors; add structured fields and preview |
| `/admin/customers` | Source-reviewed | Basic search/table is serviceable; add filters, pagination, responsive detail treatment, and explicit labels |
| `/admin/orders/[id]` | Source-reviewed | Useful checklist model; needs responsive isolation, robust confirmations, and action auditability |

---

## Final assessment

Banners In 48 already has the beginnings of a compelling brand and a differentiated desktop configurator. The highest-value next move is **not more visual decoration**. It is to make the promise trustworthy and the purchase path correct: one price, one delivery date, one clear orientation, required artwork, a real proof, real payment, and working support actions.

Once those fundamentals are fixed, simplifying the mobile experience, improving contrast, and replacing placeholder proof with authentic customer/product evidence will make the platform both more beautiful and materially easier to use.
