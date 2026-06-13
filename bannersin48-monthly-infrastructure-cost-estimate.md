# Banners In 48 — Monthly Infrastructure Cost Estimate

> Based on the final website structured plan. Estimates reflect recurring infrastructure costs only — payment processing fees and per-shipment carrier costs are noted separately as cost-of-revenue items.

---

## Summary by Growth Tier

| Tier | Orders/Month | Est. Monthly Cost | Range |
|---|---|---|---|
| Launch (Phase 1) | 50–150 | ~$175 | $120 – $280 |
| Growing (Phase 1–2) | 500–1,000 | ~$650 | $465 – $975 |
| Scaled (Phase 3+) | 5,000–10,000 | ~$3,000 | $1,700 – $4,500 |

---

## Line-Item Breakdown

| Service | Notes | Launch | Growing | Scaled |
|---|---|---|---|---|
| Hosting / compute | Vercel + Railway/Render → AWS/GCP as volume grows | $30–60 | $100–200 | $500–1,500 |
| Database | PostgreSQL — Neon/Supabase at launch → managed AWS RDS | $15–25 | $50–100 | $200–500 |
| File storage + CDN | S3 + CloudFront — artwork files, proofs, saved assets | $5–15 | $30–80 | $100–300 |
| Transactional email | Postmark / Resend / SendGrid — order confirmations, proof alerts, delivery updates, review requests | $10–20 | $30–60 | $100–200 |
| Tax calculation | TaxJar / Avalara — US states + Canadian provinces | $19–49 | $49–99 | $150–300 |
| Address validation | Smarty / EasyPost — ~$0.01/lookup at checkout | $10–20 | $50–100 | $200–500 |
| Live chat / support | Crisp / Intercom — chat + email support channels | $25–50 | $75–150 | $200–500 |
| Auth / identity | Clerk / Auth0 — free tier at launch, pro as MAU grows | $0–25 | $25–50 | $100–200 |
| Background jobs / queue | 10-min cancellation timer, proof generation, production transfer jobs | $0–10 | $20–50 | $75–200 |
| Error monitoring | Sentry / Datadog | $0–20 | $30–80 | $100–300 |
| Domains (4 total) | BannersIn48.com + BannerIn48.com + SignsIn48.com + SignIn48.com | $5 | $5 | $5 |
| **Total** | | **~$175/mo** | **~$650/mo** | **~$3,000/mo** |

---

## Phase 2 and 3 Add-Ons (not included in totals above)

| Service | Phase | Launch | Growing | Scaled |
|---|---|---|---|---|
| Design editor SDK | Phase 2 | +$300–500/mo | +$300–500/mo | +$500–1,500/mo |
| AI API costs (Claude API) | Phase 3 | — | +$50–200/mo | +$500–2,000/mo |

**Design editor SDK candidates:** IMG.LY, Design Huddle, Customer's Canvas, PitchPrint (see Section 24 of structured plan). This is a flat monthly fee regardless of order volume — plan for it before committing to a Phase 2 timeline.

**AI API:** Claude API for copy generation, AI print check, AI redesign, and brand kit extraction. Costs scale with usage volume.

---

## Costs Excluded from Infrastructure Totals

### Payment processing
Stripe charges **2.9% + $0.30 per transaction**. This is a cost-of-revenue line, not infrastructure.

| Tier | Avg Order | Revenue/Month | Stripe Fees/Month |
|---|---|---|---|
| Launch | $100 | ~$10,000 | ~$290 |
| Growing | $100 | ~$75,000 | ~$2,175 |
| Scaled | $100 | ~$500,000 | ~$14,500 |

PayPal fees are similar (3.49% + $0.49 for standard transactions).

### FedEx API
FedEx API access is free. Per-shipment charges are a cost of goods — covered by the $10 flat shipping fee charged to the customer. Label generation, tracking, and address validation calls have no separate API fee.

---

## Key Cost Notes

1. **File storage accumulates.** Every customer's uploaded artwork and saved proofs stay in their account indefinitely. At launch this is negligible (<1GB), but at scale (25,000+ customer accounts with reorder history) CDN/storage costs grow significantly.

2. **Address validation scales linearly with orders.** Every checkout triggers at least one lookup. At 10,000 orders/month, budget $400–500/mo for validation alone.

3. **Tax calculation is a fixed floor cost.** TaxJar Starter covers most launch needs at ~$19–49/mo. Avalara is enterprise-tier and much more expensive — avoid it until revenue justifies it.

4. **Chat support adds seats at scale.** A single-seat Crisp/Intercom plan works at launch. At 1,000+ orders/month you'll need 2–3 support seats, which bumps this line to $150+/mo.

5. **Stripe fees will exceed infrastructure costs at real revenue.** At $100K/month revenue, Stripe alone is ~$2,900/mo — more than the full infrastructure bill at the Growing tier.

---

*Last updated: 2026-06-12*
*Based on: bannersin48-final-website-structured-plan.md*
