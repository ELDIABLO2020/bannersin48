import { describe, it, expect } from "vitest";
import { priceLine, priceOrder } from "./pricing";
import { billableDimensions } from "./dimensions";
import { normalizeFinishing } from "./finishing";

/**
 * The 5 plan pricing examples (plan §9.5) — these MUST match exactly.
 */
describe("priceLine — plan examples (must match §9.5)", () => {
  it("4' × 8' 13 oz, qty 1, no add-ons → $138", () => {
    const result = priceLine({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false },
      quantity: 1,
    });
    expect(result.productSubtotal).toBe(128);
    expect(result.shipping).toBe(10);
    expect(result.totalBeforeTax).toBe(138);
  });

  it("2'1\" × 4'7\" 13 oz, qty 1 → $70 (rounded to 3 × 5 = 15 sq ft)", () => {
    const result = priceLine({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 2, widthIn: 1, heightFt: 4, heightIn: 7 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false },
      quantity: 1,
    });
    expect(result.billableSqFt).toBe(15);
    expect(result.billableDims).toEqual({ widthFt: 3, heightFt: 5 });
    expect(result.productSubtotal).toBe(60);
    expect(result.shipping).toBe(10);
    expect(result.totalBeforeTax).toBe(70);
  });

  it("4' × 8' 13 oz with wind slits, qty 1 → $162", () => {
    const result = priceLine({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: true, polePockets: false },
      quantity: 1,
    });
    expect(result.productSubtotal).toBe(152); // 128 + 32*0.75
    expect(result.shipping).toBe(10);
    expect(result.totalBeforeTax).toBe(162);
  });

  it("4' × 8' 15 oz with pole pockets, qty 3 → $534", () => {
    const result = priceLine({
      material: "VINYL_15OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: { welding: false, grommets: false, windSlits: false, polePockets: true, polePocketPlacement: "TOP_AND_BOTTOM" },
      quantity: 3,
    });
    // Unit: 32 × $4.75 = $152 + 32 × $0.50 = $16 → $168; ×3 = $504; shipping $30
    expect(result.unitProduct).toBe(168);
    expect(result.productSubtotal).toBe(504);
    expect(result.shipping).toBe(30);
    expect(result.totalBeforeTax).toBe(534);
  });

  it("5' × 10' 18 oz double-sided, qty 2 → $770", () => {
    const result = priceLine({
      material: "VINYL_18OZ_DOUBLE",
      dimensions: { widthFt: 5, widthIn: 0, heightFt: 10, heightIn: 0 },
      finishing: { welding: true, grommets: true, windSlits: false, polePockets: false },
      quantity: 2,
    });
    // 50 × $7.50 = $375 unit; ×2 = $750; shipping $20
    expect(result.unitProduct).toBe(375);
    expect(result.productSubtotal).toBe(750);
    expect(result.shipping).toBe(20);
    expect(result.totalBeforeTax).toBe(770);
  });
});

describe("billableDimensions — plan rounding examples (§7.2)", () => {
  const cases: Array<[string, [number, number, number, number], [number, number, number], boolean]> = [
    ["2 ft 0 in × 4 ft 0 in", [2, 0, 4, 0], [2, 4, 8], true],
    ["2 ft 1 in × 4 ft 0 in", [2, 1, 4, 0], [3, 4, 12], true],
    ["2 ft 11 in × 4 ft 7 in", [2, 11, 4, 7], [3, 5, 15], true],
    ["5 ft 6 in × 7 ft 2 in", [5, 6, 7, 2], [6, 8, 48], true],
    ["10 ft 0 in × 10 ft 0 in", [10, 0, 10, 0], [10, 10, 100], true],
    ["10 ft 1 in × 10 ft 0 in", [10, 1, 10, 0], [11, 10, 110], false],
  ];
  for (const [label, [wf, wi, hf, hi], [bw, bh, sqft], eligible] of cases) {
    it(`${label} → ${bw}' × ${bh}' = ${sqft} sq ft (eligible: ${eligible})`, () => {
      const r = billableDimensions({ widthFt: wf, widthIn: wi, heightFt: hf, heightIn: hi });
      expect(r.widthFt).toBe(bw);
      expect(r.heightFt).toBe(bh);
      expect(r.sqFt).toBe(sqft);
    });
  }
});

describe("normalizeFinishing — pole pocket incompatibility (§8.2)", () => {
  it("auto-removes welding and grommets when pole pockets are enabled", () => {
    const r = normalizeFinishing({
      welding: true,
      grommets: true,
      windSlits: false,
      polePockets: true,
      polePocketPlacement: "TOP",
    });
    expect(r.finishing.welding).toBe(false);
    expect(r.finishing.grommets).toBe(false);
    expect(r.finishing.polePockets).toBe(true);
    expect(r.message).toContain("Pole pockets require a different finishing method");
  });

  it("preserves all options when pole pockets are off", () => {
    const r = normalizeFinishing({
      welding: true,
      grommets: true,
      windSlits: true,
      polePockets: false,
    });
    expect(r.finishing).toEqual({
      welding: true,
      grommets: true,
      windSlits: true,
      polePockets: false,
      polePocketPlacement: undefined,
    });
    expect(r.message).toBeUndefined();
  });
});

describe("priceOrder — multi-line aggregation", () => {
  it("sums subtotal, shipping, and total across lines", () => {
    const r = priceOrder([
      {
        material: "VINYL_13OZ_SINGLE",
        dimensions: { widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 },
        finishing: { welding: true, grommets: true, windSlits: false, polePockets: false },
        quantity: 1,
      },
      {
        material: "VINYL_13OZ_SINGLE",
        dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
        finishing: { welding: true, grommets: true, windSlits: false, polePockets: false },
        quantity: 2,
      },
    ]);
    expect(r.subtotal).toBe(32 + 144);
    expect(r.shipping).toBe(10 + 20);
    expect(r.total).toBe(206);
  });
});
