import { describe, it, expect } from "vitest";
import {
  normalizeFinishing,
  applyFinishingPatch,
  isWindSlitsEligible,
  windSlitsIneligibilityReason,
  clampGrommetPoint,
  generateGrommetPoints,
  dimensionsToInches,
  DEFAULT_FINISHING,
  type Finishing,
} from "./finishing";
import { pixelsToPrintInches, pixelsToDimensions, printInchesToDimensions } from "./artwork";
import { ADDON_RATES } from "./constants";

const base = (): Finishing => ({ ...DEFAULT_FINISHING });

describe("normalizeFinishing — pole pockets", () => {
  it("auto-removes welding and grommets when pole pockets are enabled", () => {
    const r = normalizeFinishing({
      ...base(),
      welding: true,
      grommets: true,
      polePockets: true,
      polePocketPlacement: "TOP",
      polePocketDepthIn: 2,
    });
    expect(r.finishing.welding).toBe(false);
    expect(r.finishing.grommets).toBe(false);
    expect(r.finishing.polePockets).toBe(true);
    expect(r.finishing.polePocketDepthIn).toBe(2);
    expect(r.message).toContain("Pole pockets require a different finishing method");
  });

  it("defaults pocket depth to 2 when pockets on without depth", () => {
    const r = normalizeFinishing({
      ...base(),
      welding: false,
      grommets: false,
      polePockets: true,
      polePocketPlacement: "TOP",
    });
    expect(r.finishing.polePocketDepthIn).toBe(2);
  });

  it("clears placement and depth when pockets off", () => {
    const r = normalizeFinishing({
      ...base(),
      polePockets: false,
      polePocketPlacement: "TOP",
      polePocketDepthIn: 3,
    });
    expect(r.finishing.polePocketPlacement).toBeUndefined();
    expect(r.finishing.polePocketDepthIn).toBeUndefined();
  });
});

describe("applyFinishingPatch — rope ⊥ grommets", () => {
  it("enabling rope clears grommets", () => {
    const r = applyFinishingPatch(base(), { rope: true });
    expect(r.finishing.rope).toBe(true);
    expect(r.finishing.grommets).toBe(false);
    expect(r.finishing.ropePlacement).toBe("TOP");
    expect(r.message).toMatch(/Rope and grommets/);
  });

  it("enabling grommets clears rope", () => {
    const current: Finishing = {
      ...base(),
      grommets: false,
      rope: true,
      ropePlacement: "BOTTOM",
    };
    const r = applyFinishingPatch(current, { grommets: true });
    expect(r.finishing.grommets).toBe(true);
    expect(r.finishing.rope).toBe(false);
    expect(r.finishing.ropePlacement).toBeUndefined();
  });
});

describe("wind slits eligibility", () => {
  it("eligible when both dims are between 24 and 120 exclusive", () => {
    // 4×8 ft = 48×96 in
    expect(isWindSlitsEligible({ widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 })).toBe(true);
  });

  it("ineligible when a dim is ≤ 24\"", () => {
    // 2×4 = 24×48 — width not strictly greater than 24
    expect(isWindSlitsEligible({ widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 })).toBe(false);
    expect(windSlitsIneligibilityReason({ widthFt: 2, widthIn: 0, heightFt: 4, heightIn: 0 })).toMatch(
      /greater than 24/,
    );
  });

  it("ineligible when a dim is ≥ 120\"", () => {
    // 10×10 = 120×120
    expect(isWindSlitsEligible({ widthFt: 10, widthIn: 0, heightFt: 10, heightIn: 0 })).toBe(false);
  });
});

describe("grommet points", () => {
  it("clamps points inside the banner with margin", () => {
    expect(clampGrommetPoint({ xIn: -5, yIn: 999 }, 48, 96)).toEqual({ xIn: 0.5, yIn: 95.5 });
  });

  it("generates corner points for CORNERS preset", () => {
    const pts = generateGrommetPoints(48, 96, "CORNERS", "EVERY_2_3FT");
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ xIn: 0.5, yIn: 0.5 });
  });

  it("generates top/bottom points for TOP_AND_BOTTOM", () => {
    const pts = generateGrommetPoints(48, 96, "TOP_AND_BOTTOM", "EVERY_2FT");
    expect(pts.length).toBeGreaterThan(4);
    expect(pts.every((p) => p.yIn === 0.5 || p.yIn === 95.5)).toBe(true);
  });
});

describe("dimensionsToInches", () => {
  it("converts ft/in to total inches", () => {
    expect(dimensionsToInches({ widthFt: 4, widthIn: 6, heightFt: 8, heightIn: 0 })).toEqual({
      widthIn: 54,
      heightIn: 96,
    });
  });
});

describe("DPI → print inches", () => {
  it("converts pixels at 150 DPI to inches", () => {
    // 600×900 px @ 150 dpi = 4×6 in
    expect(pixelsToPrintInches(600, 900, 150)).toEqual({ widthIn: 4, heightIn: 6 });
  });

  it("maps large artwork to ft/in dimensions", () => {
    // 1800×3600 @ 150 = 12×24 in = 1'0" × 2'0"
    const d = pixelsToDimensions(1800, 3600, 150);
    expect(d).toEqual({ widthFt: 1, widthIn: 0, heightFt: 2, heightIn: 0 });
  });

  it("clamps tiny prints up to at least 1 ft", () => {
    const d = printInchesToDimensions(4, 6);
    expect(d.widthFt).toBeGreaterThanOrEqual(1);
    expect(d.heightFt).toBeGreaterThanOrEqual(1);
  });
});

describe("ADDON_RATES.ROPE_PER_SQFT", () => {
  it("is 0.25", () => {
    expect(ADDON_RATES.ROPE_PER_SQFT).toBe(0.25);
  });
});
