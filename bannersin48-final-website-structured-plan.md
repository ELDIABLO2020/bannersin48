# Banners In 48 — Final Website Structured Plan

> Consolidated from the original structured plan and the **Website Developer Implementation Report**. Where the two documents conflicted, the Developer Implementation Report is treated as authoritative.
>
> **Note:** Backend tech stack is intentionally left out of this plan — to be discussed separately.

---

## 1. Working Concept

**Custom Banners Delivered in 48 Business Hours — Banners In 48**

A focused, speed-first banner ordering platform for business, retail, schools, events, contractors, real estate, churches, sports teams, and personal celebrations.

The core promise:

> Order and approve your proof by 9:00 PM Eastern Time, and get your custom banner delivered by 12:00 PM noon on the guaranteed delivery date — anywhere in the United States and Canada.

The site is not a general print shop. It launches with exactly two product categories: **custom vinyl banners** and **retractable banners**.

### Launch Model Summary

| Project Item | Specification |
|---|---|
| Primary domain | BannersIn48.com |
| Supporting domains | SignsIn48.com, SignIn48.com, BannerIn48.com |
| Launch model | Ecommerce website with mandatory customer accounts |
| Production model | Outsourced production partner (for now) |
| Shipping carrier | FedEx only |
| Support model | Online chat and email only; outbound phone calls only when Banners In 48 initiates them |

---

## 2. Domain and Site Routing

| Domain | Purpose | Action |
|---|---|---|
| BannersIn48.com | Primary website and ecommerce hub | Build all main pages, products, checkout, accounts, and admin functionality here |
| SignsIn48.com | Supporting domain for future sign products | Redirect or route to future signs landing page; preserve SEO value with 301 redirects |
| SignIn48.com | Short supporting sign domain | Redirect to signs section or landing page |
| BannerIn48.com | Supporting banner domain | Redirect to main banner product/category page |

Supporting domains should be configured so the business can use them as redirects at launch and possibly as dedicated landing pages later. Avoid duplicate content that competes with the primary domain.

---

## 3. Business Positioning

### Primary Positioning

**We only do banners, so we do them faster and simpler than everyone else.**

### Primary Headline

**Custom Banners Delivered in 48 Business Hours**

### Subheadline

**Upload your artwork, use a template, or let AI help you create a print-ready banner. Any size up to 10' × 10'. Clear pricing. Guaranteed delivery.**

### Core Offer

- Vinyl banners from $4.00 per billable square foot (13 oz)
- Retractable banners at $175 each (hardware and carrying case included)
- $10 flat shipping per item/quantity unit (not per cart)
- Guaranteed delivery by 12:00 PM noon on the committed date
- Order/approval cutoff: 9:00 PM Eastern Time
- Coverage: United States and Canada
- FedEx only — system selects the service level, never the customer
- **Guarantee remedy:** if Banners In 48 misses the guarantee, the $10 shipping charge for the affected item is refunded

---

## 4. Core Customer Promise (Displayed Across Site)

| Promise Element | Requirement |
|---|---|
| Cutoff | Order by 9:00 PM Eastern Time |
| Delivery | Delivered by 12:00 PM noon on the guaranteed delivery date |
| Coverage | United States and Canada |
| Carrier | FedEx only |
| Shipping fee | Flat $10 per item/quantity unit, not one flat charge per cart |
| Guarantee remedy | If the guarantee is missed, refund the $10 shipping charge for the affected item |

Display rules:

- Show delivery guarantee messaging on the homepage, product pages, cart, checkout, proof approval page, customer dashboard, and order confirmation.
- The customer never chooses the FedEx service level — the system/back office selects whatever FedEx service satisfies the guarantee.
- Show the guaranteed delivery date **before payment** and again **before proof approval**.

---

## 5. Cutoff and Delivery Engine

### 5.1 Official Weekly Cutoff and Delivery Schedule (Eastern Time)

| Order Approval / Cutoff Window (ET) | Guaranteed FedEx Delivery |
|---|---|
| Monday 12:00 AM – Monday 9:00 PM | Wednesday by 12:00 PM noon |
| Tuesday 12:00 AM – Tuesday 9:00 PM | Thursday by 12:00 PM noon |
| Wednesday 12:00 AM – Wednesday 9:00 PM | Friday by 12:00 PM noon |
| Thursday 12:00 AM – Thursday 9:00 PM | Monday by 12:00 PM noon |
| Thursday 9:01 PM – Sunday 9:00 PM | Tuesday by 12:00 PM noon |
| Sunday 9:01 PM – Monday 9:00 PM | Wednesday by 12:00 PM noon |

### 5.2 Delivery Engine Logic

- All cutoff logic is based on **Eastern Time**, regardless of customer location. The site may show local time for convenience, but the official calculation is ET.
- Any order after 9:00 PM rolls into the next cutoff cycle.
- The delivery date is calculated only after **payment + instant proof approval + required acknowledgements** are complete. If proof approval or payment misses the cutoff, the order uses the next cycle.
- The engine must account for FedEx holidays and service interruptions, configurable by admin.
- All cutoff/delivery rules are implemented as **configurable rules, not hard-coded logic**.

### 5.3 Countdown Requirements

- Live countdown: *"Order within X hours and Y minutes to receive by [Day] at Noon."*
- Display on homepage, product pages, cart, checkout, and proof approval page.
- If the cutoff passes while a customer is shopping, the guaranteed date updates automatically before checkout.
- The customer must **acknowledge the final guaranteed delivery date** before order submission.

---

## 6. Launch Product Catalog

### 6.1 Product Category 1: Vinyl Banners

| Material | Single-Sided Price | Double-Sided Price | Notes |
|---|---|---|---|
| 13 oz vinyl banner | $4.00 / billable sq ft | Not available | Standard indoor/outdoor. Welding, grommets, wind slits, pole pockets |
| 15 oz vinyl banner | $4.75 / billable sq ft | Not available | Premium durability. Same finishing options as 13 oz |
| 18 oz vinyl banner (heavy-duty blockout) | $5.25 / billable sq ft | $7.50 / billable sq ft | **Only material available double-sided** |

### 6.2 Product Category 2: Retractable Banners

| Item | Specification |
|---|---|
| Size | 33.5 inches wide × 80 inches tall |
| Price | $175 each |
| Shipping | $10 per retractable banner |
| Delivery | Same 48-hour promise schedule |
| Included | Retractable hardware and carrying case |
| Artwork | PDF or JPEG only |

---

## 7. Vinyl Banner Dimensions and Square Footage Rules

- Eligible dimensions: **1 ft × 1 ft through 10 ft × 10 ft**.
- Customers may enter **feet and inches**.
- Any fractional measurement **rounds up to the next whole foot** for billing.
- Rounded billable dimensions determine both price and eligibility for the 48-hour/$10 shipping program.
- Sizes beyond 10 ft × 10 ft are **not eligible** — route to a custom quote path.

### 7.1 Square Foot Formula

```text
Billable Width  = entered width, rounded up to next whole foot if inches > 0
Billable Height = entered height, rounded up to next whole foot if inches > 0
Billable Sq Ft  = Billable Width × Billable Height
```

### 7.2 Rounding Examples

| Customer Entered Size | Billable Size | Billable Sq Ft | Eligibility |
|---|---|---:|---|
| 2 ft 0 in × 4 ft 0 in | 2 ft × 4 ft | 8 | Eligible |
| 2 ft 1 in × 4 ft 0 in | 3 ft × 4 ft | 12 | Eligible |
| 2 ft 11 in × 4 ft 7 in | 3 ft × 5 ft | 15 | Eligible |
| 5 ft 6 in × 7 ft 2 in | 6 ft × 8 ft | 48 | Eligible |
| 10 ft 0 in × 10 ft 0 in | 10 ft × 10 ft | 100 | Eligible |
| 10 ft 1 in × 10 ft 0 in | 11 ft × 10 ft | 110 | Not eligible — custom quote path |

**UI requirement:** show both the requested physical size and the billable size in cart and checkout to avoid customer confusion.

### 7.3 Recommended Standard Size Quick-Picks (13 oz, single-sided)

| Size | Sq Ft | Banner Price | Shipping | Total |
|---|---:|---:|---:|---:|
| 2' × 4' | 8 | $32 | $10 | $42 |
| 2' × 6' | 12 | $48 | $10 | $58 |
| 2' × 8' | 16 | $64 | $10 | $74 |
| 3' × 6' | 18 | $72 | $10 | $82 |
| 3' × 8' | 24 | $96 | $10 | $106 |
| 3' × 12' | — | — | — | Not eligible (exceeds 10 ft max) — custom quote |
| 4' × 6' | 24 | $96 | $10 | $106 |
| 4' × 8' | 32 | $128 | $10 | $138 |
| 5' × 8' | 40 | $160 | $10 | $170 |
| 5' × 10' | 50 | $200 | $10 | $210 |
| 10' × 10' | 100 | $400 | $10 | $410 |

*Quick-pick prices shown recalculate automatically when the customer changes material or adds finishing options.*

---

## 8. Vinyl Banner Finishing Options

| Option | Price | Available On | Rules |
|---|---|---|---|
| Welding / No Welding | Included | 13 oz, 15 oz, 18 oz | Included option unless pole pockets are selected |
| Grommets / No Grommets | Included | 13 oz, 15 oz, 18 oz | Included option unless pole pockets are selected |
| Wind Slits | +$0.75 / billable sq ft | 13 oz, 15 oz, 18 oz | Selectable add-on |
| Pole Pockets | +$0.50 / billable sq ft | 13 oz, 15 oz, 18 oz | If selected, automatically remove/disable grommets and welding |
| Double-Sided Print | $7.50 / billable sq ft (replaces base rate) | 18 oz only | Only material that can be double-sided |

### 8.1 Pole Pocket Placement Options

- Right only
- Left only
- Left and right
- Bottom only
- Top only
- Top and bottom

### 8.2 Pole Pocket Incompatibility Rule (must be enforced)

- If pole pockets are selected, grommets must be disabled and removed from the order.
- If pole pockets are selected, welding must be disabled and removed from the order.
- Show the customer message: *"Pole pockets require a different finishing method, so grommets and welding have been removed."*
- Never allow the customer to force incompatible options together.

**UI note:** use simple visual selectors, not long dropdown lists.

---

## 9. Pricing Engine

### 9.1 Vinyl Banner Unit Pricing

| Material / Print Type | Base Formula |
|---|---|
| 13 oz single-sided | Billable Sq Ft × $4.00 |
| 15 oz single-sided | Billable Sq Ft × $4.75 |
| 18 oz single-sided | Billable Sq Ft × $5.25 |
| 18 oz double-sided | Billable Sq Ft × $7.50 |

### 9.2 Add-On Pricing

| Add-On | Formula |
|---|---|
| Wind slits | Billable Sq Ft × $0.75 |
| Pole pockets | Billable Sq Ft × $0.50 |
| Shipping | Quantity × $10 |

### 9.3 Complete Formula

```text
Unit Product Price     = (Billable Sq Ft × Material Rate) + selected add-ons per sq ft
Line Product Subtotal  = Unit Product Price × Quantity
Line Shipping          = Quantity × $10
Line Total Before Tax  = Line Product Subtotal + Line Shipping
Final Total            = Line Total Before Tax + applicable tax − rewards/discounts
```

### 9.4 Quantity Rules

- Quantities are unlimited overall, but **one configuration is limited to 10 at a time**.
- If a customer needs more than 10, they add another configuration/line item to the cart.
- Shipping is charged separately for each quantity unit: $10 × quantity.
- One artwork file can be used for multiple copies of the same banner configuration.
- Different artwork requires a separate banner line item.

### 9.5 Pricing Examples

| Scenario | Calculation | Total Before Tax |
|---|---|---:|
| 4' × 8' 13 oz, qty 1, no add-ons | 32 sq ft × $4 = $128; shipping $10 | $138 |
| 2' 1" × 4' 7" 13 oz, qty 1 | Billable 3×5 = 15 sq ft; 15 × $4 = $60; shipping $10 | $70 |
| 4' × 8' 13 oz with wind slits, qty 1 | Base $128; wind slits 32 × $0.75 = $24; shipping $10 | $162 |
| 4' × 8' 15 oz with pole pockets, qty 3 | Unit: 32 × $4.75 = $152 + 32 × $0.50 = $16 → $168; ×3 = $504; shipping $30 | $534 |
| 5' × 10' 18 oz double-sided, qty 2 | 50 × $7.50 = $375 unit; ×2 = $750; shipping $20 | $770 |

All pricing rules must be implemented as **admin-configurable rules**, not hard-coded values.

---

## 10. Core Customer Flow

1. Choose product (vinyl banner or retractable banner)
2. Enter size (feet + inches) — see requested vs. billable size
3. Choose material (13 oz / 15 oz / 18 oz; double-sided on 18 oz only)
4. Choose finishing options (welding, grommets, wind slits, pole pockets — incompatibilities enforced)
5. Choose quantity (max 10 per configuration)
6. Upload artwork (PDF/JPG/JPEG) — or use a template / AI assistant in later phases
7. See live price + guaranteed delivery date + countdown
8. Log in or create an account (mandatory at checkout)
9. Checkout — payment, tax, address validation, policy acknowledgements
10. Approve instant proof + acknowledgements
11. 10-minute cancellation window
12. Automatic transfer to production
13. Track order from dashboard; FedEx tracking
14. Post-delivery review request; earn rewards; reorder anytime

Goal: a customer with ready artwork can place a complete order in **under 3 minutes**.

---

## 11. Artwork Upload and Instant Proofing

### 11.1 Upload Rules

- Accepted formats: **PDF, JPG, JPEG only**.
- Maximum file size and DPI requirements: to be determined — must be **configurable in admin settings**.
- Reject unsupported file types **before checkout**.

### 11.2 Instant Proof Page

- Customer must approve an automatic instant proof page.
- Order prints **exactly as uploaded** after proof approval.
- No manual proofing in the default workflow.
- The proof page must clearly show: artwork preview, requested size, billable size, material, finishing, quantity, shipping address, delivery date, and final total.

### 11.3 Proof Approval Acknowledgements

The customer must confirm:

1. Artwork is correct.
2. Spelling, colors, layout, and quality are accepted as shown.
3. Banners In 48 will print exactly as uploaded/proofed.
4. The 10-minute cancellation window after proof approval.
5. Final delivery date and shipping address.

### 11.4 Ten-Minute Cancellation Window

- After proof approval, a 10-minute cancellation timer begins.
- The customer can cancel during this window from the dashboard/order confirmation page.
- After 10 minutes, the order automatically moves to production and **cannot be cancelled**.
- Status updates automatically: *Cancellation Window → Sent to Production*.

### 11.5 Automated Artwork Quality Checks (later phase)

The system should eventually auto-flag:

- Low-resolution images
- Text too close to edge
- Poor contrast
- Missing bleed
- RGB color warnings
- Grommet overlap
- QR code too small
- Tiny unreadable text

---

## 12. Customer Accounts (Mandatory)

- Every customer must log in or create an account to place an order.
- Guest **browsing** is allowed; **checkout requires** account login/creation.
- Large customer storage must be supported without slowing the website — files in scalable cloud storage; the database stores metadata and file references only, never large binaries.

### Dashboard Sections

**Orders**
- Current orders, production status, delivery guarantee status
- FedEx tracking
- Invoice download

**Saved Artwork & Designs**
- Uploaded artwork files
- Proof previews
- Saved templates / previous banners / drafts
- AI-generated versions (later phase)

**Reorder**
- Add a previous order to cart with one click
- **Artwork is locked** and cannot be changed from the reorder path
- Finishing options (pole pockets, grommets, welding, wind slits) and quantity are editable where compatible — same incompatibility rules as a new order
- Reorder generates a **new proof confirmation and a new 10-minute cancellation window**

**Rewards**
- Loyalty points balance, earning history, redemption

**Account & Billing**
- Saved addresses, saved payment methods
- Tax-exempt status and documentation
- Invoices and receipts

**Brand Kit** (later phase, business users)
- Logos, brand colors, fonts, previous designs, reusable templates

**Teams** (later phase, B2B)
- Add employees, shared brand templates, approval workflow, multiple shipping addresses, billing history

---

## 13. Payments, Taxes, and Tax-Exempt Support

### Accepted Payment Methods

- Visa
- Mastercard
- American Express
- Discover
- Apple Pay
- PayPal

### Tax Rules

- Sales tax calculated per state/province requirements (US and Canada).
- Tax-exempt customers supported: they can upload documentation or request tax-exempt status from their account.
- **Admin/accounting must approve** tax-exempt status before it applies.
- Invoices and receipts must clearly show taxes, discounts, rewards, shipping, and totals.

---

## 14. FedEx Shipping Requirements

- All shipping through **FedEx only** — no other carrier shown or used.
- Customer never chooses carrier or service level; the system/back office selects the FedEx service that satisfies the guarantee.
- Support FedEx label creation, tracking number storage, tracking updates, and delivery status.
- The guaranteed delivery date must be passed with the order data to the production/transfer workflow.
- Shipping charge: $10 per item/quantity unit.
- If the guarantee is missed due to Banners In 48 responsibility, **automatically refund the $10 shipping charge** for the affected unit.

### 14.1 Address Validation

- Auto-correcting address validation at checkout.
- If the validated address differs from the customer entry, the customer must choose or confirm.
- If the customer rejects validation or uses an unverified address, display a **risk acknowledgement**: unverified-address orders ship at customer risk and may not qualify for the delivery guarantee.

---

## 15. Customer Communication and Support

- **No inbound customer phone support** displayed anywhere on the website.
- Support channels: online chat and email only.
- If a situation requires a phone call, Banners In 48 initiates the outbound call.
- Contact pages include: chat, email, contact form, help center/FAQ, and order lookup for logged-in users.
- All customer communication is logged against the account and order when applicable.

---

## 16. Reviews and Loyalty Program

### 16.1 Review Workflow

- After FedEx confirms delivery, trigger the review/satisfaction workflow.
- Ask the customer how the experience was **before** sending any public review link.
- Positive responses → route to public review platforms (Google, Trustpilot, Facebook).
- Neutral/negative responses → route to private support recovery, not a public review prompt.
- Marketing team gets a dashboard/reporting for review conversion and satisfaction trends.

### 16.2 Banners Loyalty Reward Program

- Customers are enrolled through their required account.
- Points earned from: purchases, reviews/feedback, referrals, and promotions.
- Rewards balance displays in dashboard and at checkout.
- Admin can configure: earning rates, redemption values, expiration, bonus campaigns, and exclusions.

---

## 17. Production Transfer (Outsourced Partner)

- All physical production is outsourced to a third-party production partner for now.
- After proof approval and cancellation-window expiration, the system prepares a **complete production package** automatically.
- A **Review & Transfer Team** reviews/transfers orders and monitors exceptions.
- Architecture must allow production routing to later support internal production, multiple partners, or hybrid production **without changing the customer experience**.

### 17.1 Production Package Fields

| Field | Description |
|---|---|
| Order ID | Unique order number for tracking and support |
| Customer ID | Account reference |
| Product type | Vinyl banner or retractable banner |
| Material | 13 oz, 15 oz, 18 oz, or retractable |
| Requested dimensions | Customer-entered size |
| Billable dimensions | Rounded dimensions used for pricing |
| Billable square footage | Rounded width × rounded height |
| Artwork file | PDF/JPEG production file |
| Proof approval timestamp | Customer approval date/time |
| Cancellation expiration timestamp | Time order becomes non-cancellable |
| Finishing | Grommets / welding / wind slits / pole pockets / placement |
| Quantity | Number of units |
| Ship-to address | Validated address, or customer-risk unverified address |
| Guaranteed delivery date | Required delivery date and noon deadline |
| FedEx tracking | Tracking number once generated |

---

## 18. Admin Dashboard

### 18.1 Role-Based Access

Roles: marketing, website maintenance, accounting, support, review/transfer, and management.

### 18.2 Order Statuses

1. Awaiting Payment
2. Awaiting Proof Approval
3. Cancellation Window
4. Ready for Transfer
5. Transferred to Production
6. In Production
7. Shipped
8. Delivered
9. Exception
10. Cancelled
11. Refunded

### 18.3 Admin Features

- Filters by status, delivery deadline, product, state/province, production partner, and exception type
- View order details, proof, artwork, customer account, payment status, tax status, shipping address, FedEx tracking, and production package
- Artwork approval/exception handling and manual proof upload where needed
- Auto-flag bad artwork
- Download production files
- Refund and reprint controls
- Customer notes
- SLA/guarantee countdown per order
- Failed order alerts
- Tax-exempt approval queue
- Rewards configuration
- Review/satisfaction reporting
- Configurable settings: pricing rules, cutoff/holiday calendar, file size/DPI limits, template management

### 18.4 Exception Queue

- Address validation failed or customer selected unverified address
- Payment failed or fraud review needed
- Artwork file cannot preview or proof generation failed
- Incompatible finishing option error
- FedEx service interruption or label issue
- Tax-exempt approval pending
- Production partner transfer failure

---

## 19. Required Website Pages and Major Modules

| Page / Module | Purpose |
|---|---|
| Homepage | Promise, live countdown, product entry, upload/start buttons, reviews, FAQ |
| Vinyl Banner Product Page | Material, size, finishing, live price calculator, upload, proof path |
| Retractable Banner Product Page | 33.5" × 80" product, $175 pricing, upload/proof path |
| Cart | Product lines, billable square footage, shipping per quantity, delivery date, taxes, rewards |
| Checkout | Login, shipping, address validation, payment, tax, final policy acknowledgements |
| Instant Proof Page | Proof approval, artwork preview, specifications, delivery date, cancellation policy |
| Customer Dashboard | Orders, saved artwork, proofs, reorders, rewards, invoices, tracking, tax-exempt |
| Admin Dashboard | Orders, production transfer, exceptions, customers, tax-exempt, rewards, reviews, reports |
| Support / Help Center | Chat, email/contact form, FAQs — no public phone support |
| Templates Module | Browse/edit templates for banners (Phase 2) |
| AI Banner Creator | Prompt-based banner creation (future phase) |
| Graduation Module | School search and school-specific banner templates (future phase) |

### Homepage Sections

1. Hero: "Custom Banners Delivered in 48 Business Hours"
2. Live cutoff countdown: "Order within X hours and Y minutes to receive by [Day] at Noon"
3. Start order buttons (vinyl banner / retractable banner)
4. Popular banner sizes (quick-picks)
5. Upload artwork / use a template / AI assistant entry points
6. Top banner use cases
7. Reviews and delivery guarantee
8. Reorder dashboard preview
9. FAQ section

---

## 20. Performance and Storage Requirements

- Fast, efficient, consumer-friendly site.
- **Mobile-first design** with a responsive desktop version. Mobile focuses on fast upload, checkout, and reorder; desktop on deeper editing and design control.
- Must work on Safari, Chrome, Edge, Firefox — iPhone, Android, tablets, and desktop.
- Large artwork files use scalable cloud storage + CDN architecture, **separated from the core database**.
- Preview images optimized and cached — never load full production files in dashboards or thumbnails.
- Lazy loading for template libraries, school pages, and order history assets.
- The website must remain fast despite large file storage and customer accounts.

---

## 21. Template Library (Phase 2)

Customers can choose from banner templates instead of uploading artwork. The template system must let admin add new templates **without code changes**.

Launch with ~100 common use-case templates across these categories:

### Business
Grand Opening, Now Open, Coming Soon, Store Closing, Clearance Sale, 50% Off Sale, Black Friday Sale, Holiday Sale, New Location, Now Hiring, Help Wanted, Open House, Customer Appreciation, Anniversary Sale, Ribbon Cutting

### Restaurant
Pizza Special, Taco Tuesday, Happy Hour, Lunch Special, Catering Available, New Menu, Patio Open, Drive-Thru Open, BBQ Event, Food Truck Event

### Contractor
Roofing, Landscaping, Painting, Plumbing, HVAC, Concrete, Fencing, Pool Service, Pressure Washing, Construction Site

### School & Sports
Graduation, Senior Night, Homecoming, Prom, Sports Team, Band, Cheerleading, Fundraiser, School Open House, Back to School

### Events
Birthday, Baby Shower, Wedding, Family Reunion, Church Picnic, Festival, Concert, Car Show, Fundraiser, Tournament, Memorial Event

### Real Estate
For Sale, Open House, New Listing, Sold, Leasing, Commercial Property, Apartment Leasing, New Development, Auction, Land for Sale

### Religious
Church events, services, picnics, revivals, holiday services

### Political / Community
Campaign banners, community events, town events, civic announcements

---

## 22. AI Banner Creator (Future Phase)

AI should make the process easier, not act as a gimmick. Generated designs are saved to customer account storage.

### AI Design Starter
Customer enters a prompt (e.g., *"Grand opening banner for a pizza restaurant in Dallas"*) plus key banner information. The system generates editable banner concepts (3 layout options). Customer selects a design, approves the proof, and checks out.

### AI Redesign
Customer uploads a rough design; AI improves layout, font pairing, color contrast, spacing, CTA placement, and readability.

### AI Copy Helper
Generates short banner copy for use cases: grand opening, sale, graduation, now hiring, real estate, church event, contractor services, restaurant specials.

### AI Print Check
Checks production readiness: low resolution, text too close to edge, poor contrast, missing bleed, RGB color issues, grommet overlap, QR code sizing, tiny unreadable text.

### AI Brand Kit
Customer uploads a logo; system extracts brand colors, suggested fonts, matching layout styles, and reusable brand templates.

---

## 23. Graduation Banner Program (Future Phase)

One of the strongest SEO and automation opportunities.

### Scale Targets

- ~1,000 Michigan high schools initially
- ~25,000 U.S. high schools long-term
- Architecture must allow school database expansion **without rebuilding the site**

### School Search

Search by: name, city, state, ZIP code, mascot, and colors.

### Per-School Products

Each school can have templates for graduation banners, senior banners, sports banners, and school spirit products.

### Programmatic SEO Page Structure

```text
/graduation-banners/michigan/detroit/lincoln-high-school
/graduation-banners/texas/dallas/lincoln-high-school
/graduation-banners/florida/miami/coral-reef-high-school
```

Each school landing page includes: school name, city/state, graduation banner templates, student photo upload, name/year personalization, delivery guarantee, localized SEO copy, and a start design button.

### Important Legal Guardrail

Do **not** automatically use official school logos, mascots, or trademarked artwork unless the school or customer uploads them and confirms usage rights. Use generic templates with: school name, city/state, graduation year, student name, student photo upload, generic school color themes, "Class of 20XX", "Congrats Senior".

---

## 24. Design Editor Approach (Phase 2 Decision)

Do not build a Canva-style editor from scratch for the MVP unless the budget is large. Launch workflow is **upload + instant proof**; the editor arrives with the template system.

**Fastest path:** embeddable web-to-print editor SDK — candidates: IMG.LY, Design Huddle, Customer's Canvas, PitchPrint. Must support templates, image uploads, text editing, brand assets, print-safe zones, and print-ready export.

**Custom path:** Fabric.js or Konva canvas, print-export engine, AI layer, template engine, custom proofing workflow. More control, more development risk.

Required production output (when editor exists): **high-quality CMYK print-ready PDF**, with safe-zone previews for grommets and pole pockets.

---

## 25. Development Roadmap

### Phase 0: Foundations

1. Confirm platform architecture (custom ecommerce, Shopify/WooCommerce customization, or custom web application) — driven by pricing engine, proofing, storage, FedEx, and production transfer needs. *(Tech stack discussion deferred — see Open Items.)*
2. Set up domains, hosting, SSL, redirects, analytics, and development/staging/production environments.

### Phase 1: Revenue MVP (Launch)

- Homepage with promise + live countdown
- Vinyl banner product page (dimension entry, rounding, sq ft, eligibility, pricing engine)
- Retractable banner product page
- Delivery guarantee engine (Eastern Time rules, weekly schedule, countdown)
- Mandatory customer accounts + required login at checkout
- Cloud storage structure for uploaded PDFs/JPEGs, generated proofs, and saved assets
- Artwork upload validation + instant proofing workflow + acknowledgements
- Cart and checkout: payments (Visa/MC/Amex/Discover/Apple Pay/PayPal), taxes, tax-exempt workflow, rewards placeholders, policy acknowledgements
- Address validation with auto-correct and risk acknowledgement
- 10-minute cancellation system with automatic status transition
- FedEx integration (or FedEx-ready data export) for labels/tracking
- Production package generation for the outsourced partner
- Admin dashboard, exception queue, and review/transfer workflow
- Chat/email support integrations + communication logging
- Review request automation after FedEx delivery confirmation
- Loyalty/rewards foundation + dashboard display
- QA: all pricing formulas, delivery schedules (especially the Thursday 9:01 PM – Sunday 9 PM weekend cycle), unsupported file types, address validation, and pole pocket incompatibility logic

### Phase 2: Template System

- ~100 use-case templates across all categories
- Admin-managed template system (no code changes to add templates)
- Basic design editor (SDK decision per Section 24)
- Logo/photo/text replacement, save design, reorder from saved design

### Phase 3: AI Tools

- AI copy generator, AI layout suggestions, AI redesign
- AI artwork quality checker / print check
- Background remover
- Brand kit generator

### Phase 4: Programmatic SEO / Graduation Program

- School database (Michigan first, then national)
- School search (name, city, state, ZIP, mascot, colors)
- Graduation/senior/sports/spirit templates per school
- City/state pages, industry pages, use-case pages, localized template pages

### Phase 5: B2B and Expansion

- Multi-user/team accounts, shared brand templates, approval workflows
- Monthly invoicing, bulk order tools
- Franchise and multi-location business accounts
- Sign products on SignsIn48.com / SignIn48.com
- Internal/hybrid/multi-partner production routing

---

## 26. Final Developer Checklist

- [ ] Pricing calculates correctly for all materials, add-ons, quantities, and rounded dimensions
- [ ] Pole pockets disable welding and grommets automatically
- [ ] 18 oz is the only double-sided vinyl banner option
- [ ] Shipping is $10 per quantity unit, not per cart
- [ ] Delivery date updates correctly, including the Thursday 9:01 PM – Sunday 9 PM weekend cycle
- [ ] Order cannot move to production without payment, proof approval, acknowledgements, and cancellation window expiration
- [ ] Customer accounts are mandatory for checkout
- [ ] Reorders preserve artwork and allow finishing/quantity edits only
- [ ] FedEx is the only carrier shown or used
- [ ] Support is chat/email only with no inbound phone number displayed
- [ ] Tax-exempt workflow exists for qualified customers
- [ ] Large files do not slow down normal page loads
- [ ] Admin team can monitor production transfer and exceptions
- [ ] All pricing, shipping, and order workflows are configurable rules, not hard-coded one-time logic
- [ ] Future modules (templates, AI, graduation, signs) can be added without rebuilding the core platform

---

## 27. Open Items (To Be Discussed)

1. **Backend tech stack** — deferred per stakeholder request. Includes platform architecture decision (custom build vs. Shopify/WooCommerce customization), database, file storage provider, queue/processing, hosting.
2. **Maximum artwork file size and DPI requirements** — TBD; must be configurable in admin settings either way.
3. **Design editor SDK selection** (Phase 2) — IMG.LY vs. Design Huddle vs. Customer's Canvas vs. PitchPrint vs. custom.
4. **Grommet spacing default** — earlier plan specified grommets every 2 feet; the developer report lists grommets only as an included on/off option. Confirm production spec with the production partner.
5. **Chat provider** for support (live chat vs. chatbot + escalation).
6. **Tax calculation service** for US states + Canadian provinces.
7. **Review platform integrations** — Google, Trustpilot, Facebook account setup.

---

## Final Recommendation

Build this as a **speed-first banner ordering platform**, not a full print marketplace.

The strongest angle:

> Custom banners made simple, priced clearly, and delivered on a guaranteed date by noon.

The highest-value assets:

1. Fast quote/order flow with transparent billable-size pricing
2. Upload + instant proof + automatic production transfer
3. Guaranteed delivery engine with live countdown
4. Reorder dashboard and loyalty program
5. Template library
6. Graduation banner SEO program

The AI design editor is valuable, but the real business moat is:

**Speed + simplicity + reorders + templates + guaranteed delivery.**
