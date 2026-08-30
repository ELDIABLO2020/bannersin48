import { describe, it, expect } from "vitest";
import { migrateLegacyCartLine, type CartLine } from "./cart";
import { DEFAULT_FINISHING } from "@bannersin48/shared";

const baseLine: CartLine = {
  id: "cart_1",
  product: "hd-banner",
  productId: "HD_BANNER",
  material: "VINYL_13OZ_SINGLE",
  dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
  finishing: DEFAULT_FINISHING,
  quantity: 1,
  artworkId: "art_1",
  quoteId: "q_1",
  quoteValidUntil: "2026-09-01T00:00:00Z",
  currency: "USD",
  unitProduct: 128,
  addons: 0,
  productSubtotal: 128,
  shipping: 10,
  totalBeforeTax: 138,
  billableSqFt: 32,
  billableDims: { widthFt: 4, heightFt: 8 },
  display: { requestedLabel: '4\' 0" × 8\' 0"', billableLabel: "4' × 8'" },
};

describe("migrateLegacyCartLine — dimension-semantics migration", () => {
  it("swaps legacy axes so a 4×8 line becomes landscape width 8 × height 4", () => {
    const line = migrateLegacyCartLine(baseLine);
    expect(line.dimensions).toEqual({ widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 });
    expect(line.billableDims).toEqual({ widthFt: 8, heightFt: 4 });
    expect(line.display.requestedLabel).toBe("8′ W × 4′ H");
    expect(line.display.billableLabel).toBe("8′ W × 4′ H");
  });

  it("swaps fractional-inch axes too", () => {
    const line = migrateLegacyCartLine({
      ...baseLine,
      dimensions: { widthFt: 2, widthIn: 1, heightFt: 4, heightIn: 7 },
      billableDims: { widthFt: 3, heightFt: 5 },
      billableSqFt: 15,
      display: { requestedLabel: '2\' 1" × 4\' 7"', billableLabel: "3' × 5'" },
    });
    expect(line.dimensions).toEqual({ widthFt: 4, widthIn: 7, heightFt: 2, heightIn: 1 });
    expect(line.billableDims).toEqual({ widthFt: 5, heightFt: 3 });
    expect(line.display.requestedLabel).toBe("4′ 7″ W × 2′ 1″ H");
    expect(line.display.billableLabel).toBe("5′ W × 3′ H");
  });

  it("leaves fixed-size stand lines unchanged", () => {
    const stand: CartLine = {
      ...baseLine,
      product: "retractable",
      productId: "RETRACTABLE",
      material: "RETRACTABLE",
      dimensions: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
      billableSqFt: 0,
      billableDims: { widthFt: 0, heightFt: 0 },
      display: { requestedLabel: "33.5″ W × 80″ H", billableLabel: "Fixed size" },
    };
    const line = migrateLegacyCartLine(stand);
    expect(line.dimensions).toEqual({ widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 });
    expect(line.billableDims).toEqual({ widthFt: 0, heightFt: 0 });
    expect(line.display.requestedLabel).toBe("33.5″ W × 80″ H");
    expect(line.display.billableLabel).toBe("Fixed size");
  });
});
