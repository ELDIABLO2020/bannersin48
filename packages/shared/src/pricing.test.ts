import { describe, it, expect } from "vitest";
import { priceLine, priceOrder } from "./pricing";
import { billableDimensions } from "./dimensions";
import { normalizeFinishing, DEFAULT_FINISHING } from "./finishing";

const fin = (patch: Partial<typeof DEFAULT_FINISHING> = {}) => ({ ...DEFAULT_FINISHING, ...patch });

/**
 * The 5 plan pricing examples (plan §9.5) — these MUST match exactly.
 */
describe("priceLine — plan examples (must match §9.5)", () => {
  it("4' × 8' 13 oz, qty 1, no add-ons → $138", () => {
    const result = priceLine({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: fin(),
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
      finishing: fin(),
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
      finishing: fin({ windSlits: true }),
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
      finishing: fin({
        welding: false,
        grommets: false,
        polePockets: true,
        polePocketPlacement: "TOP_AND_BOTTOM",
        polePocketDepthIn: 2,
        grommetPreset: undefined,
        grommetSpacing: undefined,
      }),
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
      finishing: fin(),
      quantity: 2,
    });
    // 50 × $7.50 = $375 unit; ×2 = $750; shipping $20
    expect(result.unitProduct).toBe(375);
    expect(result.productSubtotal).toBe(750);
    expect(result.shipping).toBe(20);
    expect(result.totalBeforeTax).toBe(770);
  });

  it("4' × 8' 13 oz with rope → adds $0.25/sqft", () => {
    const result = priceLine({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: fin({
        grommets: false,
        rope: true,
        ropePlacement: "TOP",
        grommetPreset: undefined,
        grommetSpacing: undefined,
      }),
      quantity: 1,
    });
    // 128 + 32*0.25 = 136 product; +10 ship = 146
    expect(result.addons).toBe(8);
    expect(result.productSubtotal).toBe(136);
    expect(result.totalBeforeTax).toBe(146);
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
      ...DEFAULT_FINISHING,
      welding: true,
      grommets: true,
      windSlits: false,
      polePockets: true,
      polePocketPlacement: "TOP",
      polePocketDepthIn: 2,
    });
    expect(r.finishing.welding).toBe(false);
    expect(r.finishing.grommets).toBe(false);
    expect(r.finishing.polePockets).toBe(true);
    expect(r.message).toContain("Pole pockets require a different finishing method");
  });

  it("preserves all options when pole pockets are off", () => {
    const r = normalizeFinishing({
      ...DEFAULT_FINISHING,
      welding: true,
      grommets: true,
      windSlits: true,
      polePockets: false,
    });
    expect(r.finishing.welding).toBe(true);
    expect(r.finishing.grommets).toBe(true);
    expect(r.finishing.windSlits).toBe(true);
    expect(r.finishing.polePockets).toBe(false);
    expect(r.finishing.polePocketPlacement).toBeUndefined();
    expect(r.message).toBeUndefined();
  });
});

describe("priceOrder — multi-line aggregation", () => {
  it("sums subtotal, shipping, and total across lines", () => {
    const r = priceOrder([
      {
        material: "VINYL_13OZ_SINGLE",
        dimensions: { widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 },
        finishing: fin(),
        quantity: 1,
      },
      {
        material: "VINYL_13OZ_SINGLE",
        dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
        finishing: fin(),
        quantity: 2,
      },
    ]);
    expect(r.subtotal).toBe(32 + 144);
    expect(r.shipping).toBe(10 + 20);
    expect(r.total).toBe(206);
  });
});

describe("priceLine — BANNER catalog products", () => {
  const size3x6 = { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 };
  const size2x6 = { widthFt: 2, widthIn: 0, heightFt: 6, heightIn: 0 };
  const size2x2 = { widthFt: 2, widthIn: 0, heightFt: 2, heightIn: 0 };
  const size4x8 = { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 };

  it("HD Banner 4×8 13oz remains $138", () => {
    const result = priceLine({
      productId: "HD_BANNER",
      material: "VINYL_13OZ_SINGLE",
      dimensions: size4x8,
      finishing: fin(),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(128);
    expect(result.totalBeforeTax).toBe(138);
  });

  it("HDPE 3×6 → $91", () => {
    const result = priceLine({
      productId: "HDPE",
      material: "HDPE",
      dimensions: size3x6,
      finishing: fin({ welding: false, grommets: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(81);
    expect(result.totalBeforeTax).toBe(91);
  });

  it("Canvas 3×6 → $280", () => {
    const result = priceLine({
      productId: "CANVAS",
      material: "CANVAS_11OZ",
      dimensions: size3x6,
      finishing: fin({ welding: false, grommets: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(270);
    expect(result.totalBeforeTax).toBe(280);
  });

  it("Mesh 3×6 defaults → $140.50", () => {
    const result = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size3x6,
      finishing: fin({ webbing: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(130.5);
    expect(result.totalBeforeTax).toBe(140.5);
  });

  it("Mesh 3×6 + webbing → $152.50", () => {
    const result = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size3x6,
      finishing: fin({ webbing: true }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(142.5);
    expect(result.totalBeforeTax).toBe(152.5);
  });

  it("Mesh webbing delta is $12 at 3×6 and $8 at 2×2", () => {
    const off3 = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size3x6,
      finishing: fin({ webbing: false }),
      quantity: 1,
    });
    const on3 = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size3x6,
      finishing: fin({ webbing: true }),
      quantity: 1,
    });
    expect(on3.unitProduct - off3.unitProduct).toBe(12);

    const off2 = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size2x2,
      finishing: fin({ webbing: false }),
      quantity: 1,
    });
    const on2 = priceLine({
      productId: "MESH",
      material: "MESH_8OZ",
      dimensions: size2x2,
      finishing: fin({ webbing: true }),
      quantity: 1,
    });
    expect(on2.unitProduct - off2.unitProduct).toBe(8);
  });

  it("Poster 3×6 → $118", () => {
    const result = priceLine({
      productId: "POSTER",
      material: "POSTER_8MIL",
      dimensions: size3x6,
      finishing: fin({ welding: false, grommets: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(108);
    expect(result.totalBeforeTax).toBe(118);
  });

  it("No Curl 2×6 → $118", () => {
    const result = priceLine({
      productId: "NO_CURL",
      material: "NO_CURL_8MIL",
      dimensions: size2x6,
      finishing: fin({ welding: false, grommets: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(108);
    expect(result.totalBeforeTax).toBe(118);
  });

  it("ignores vinyl adders on HDPE", () => {
    const result = priceLine({
      productId: "HDPE",
      material: "HDPE",
      dimensions: size3x6,
      finishing: fin({
        welding: false,
        grommets: false,
        rope: true,
        ropePlacement: "TOP",
        windSlits: true,
        polePockets: true,
        polePocketPlacement: "TOP",
        polePocketDepthIn: 2,
      }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(81);
    expect(result.addons).toBe(0);
  });

  it("legacy body without productId still prices 15oz 3×6 as 18 × $4.75", () => {
    const result = priceLine({
      material: "VINYL_15OZ_SINGLE",
      dimensions: size3x6,
      finishing: fin(),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(85.5);
    expect(result.totalBeforeTax).toBe(95.5);
  });

  it("Econostand qty 2 → productSubtotal 270, shipping 20", () => {
    const result = priceLine({
      productId: "ECONOSTAND",
      material: "ECONOSTAND",
      dimensions: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
      finishing: fin({ welding: false, grommets: false }),
      quantity: 2,
    });
    expect(result.unitProduct).toBe(135);
    expect(result.productSubtotal).toBe(270);
    expect(result.shipping).toBe(20);
    expect(result.totalBeforeTax).toBe(290);
  });

  it("Retractable remains $175 flat", () => {
    const result = priceLine({
      material: "RETRACTABLE",
      dimensions: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
      finishing: fin({ welding: false, grommets: false }),
      quantity: 1,
    });
    expect(result.unitProduct).toBe(175);
    expect(result.totalBeforeTax).toBe(185);
    expect(result.notes[0]).toMatch(/retractable, hardware \+ carrying case included/);
  });
});
