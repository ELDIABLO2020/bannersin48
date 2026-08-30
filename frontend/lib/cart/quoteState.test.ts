import { describe, it, expect } from "vitest";
import type { QuoteResponse } from "@bannersin48/api-client";
import { DEFAULT_FINISHING } from "@bannersin48/shared";
import {
  applyQuote,
  beginRequote,
  canCheckout,
  cartTotals,
  configOf,
  displayedQuantity,
  failRequote,
  isQuoteExpired,
  markStale,
  normalizeCartLine,
  revertRequote,
  type CartLine,
} from "./quoteState";

const baseLine: CartLine = {
  id: "cart_1",
  product: "hd-banner",
  productId: "HD_BANNER",
  material: "VINYL_13OZ_SINGLE",
  dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
  finishing: DEFAULT_FINISHING,
  quantity: 1,
  artworkId: "art_1",
  quoteId: "q_1",
  quoteValidUntil: "2099-01-01T00:00:00Z",
  currency: "USD",
  unitProduct: 128,
  addons: 0,
  productSubtotal: 128,
  shipping: 10,
  totalBeforeTax: 138,
  tax: 0,
  billableSqFt: 32,
  billableDims: { widthFt: 8, heightFt: 4 },
  display: { requestedLabel: "8′ W × 4′ H", billableLabel: "8′ W × 4′ H" },
  quoteState: "confirmed",
  pendingConfig: null,
};

function quoteFor(overrides: Partial<QuoteResponse> = {}): QuoteResponse {
  return {
    quoteId: "q_2",
    validUntil: "2099-01-01T00:00:00Z",
    currency: "USD",
    lines: [
      {
        unitProduct: 128,
        addons: 0,
        unitSubtotal: 128,
        productSubtotal: 256,
        shipping: 20,
        totalBeforeTax: 276,
        billableSqFt: 32,
        billableDims: { widthFt: 8, heightFt: 4 },
        eligible: true,
        notes: [],
      },
    ],
    subtotal: 256,
    shipping: 20,
    tax: 0,
    total: 276,
    eligible: true,
    guaranteedDeliveryDate: "2099-01-07",
    guaranteedDeliveryDow: "Wednesday",
    cutoffInMs: 1000,
    cutoffAtEt: "2099-01-01T00:00:00Z",
    ...overrides,
  };
}

const qty2Config = {
  productId: "HD_BANNER",
  material: "VINYL_13OZ_SINGLE" as const,
  dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
  finishing: DEFAULT_FINISHING,
  quantity: 2,
  artworkId: "art_1",
};

describe("beginRequote", () => {
  it("marks refreshing and remembers the pending config without mutating the confirmed quote", () => {
    const next = beginRequote(baseLine, qty2Config);
    expect(next.quoteState).toBe("refreshing");
    expect(next.pendingConfig).toEqual(qty2Config);
    // Last confirmed config + quote are preserved until the new quote arrives.
    expect(next.quantity).toBe(1);
    expect(next.quoteId).toBe("q_1");
    expect(next.totalBeforeTax).toBe(138);
  });
});

describe("applyQuote", () => {
  it("atomically replaces config + quote so quantity and total can never disagree", () => {
    const next = applyQuote(baseLine, quoteFor(), qty2Config);
    expect(next.quantity).toBe(2);
    expect(next.quoteId).toBe("q_2");
    expect(next.productSubtotal).toBe(256);
    expect(next.shipping).toBe(20);
    expect(next.totalBeforeTax).toBe(276);
    expect(next.quoteState).toBe("confirmed");
    expect(next.pendingConfig).toBeNull();
  });

  it("a quantity-10 quote matches the server line totals exactly", () => {
    const qty10 = quoteFor({
      lines: [
        {
          unitProduct: 128,
          addons: 0,
          unitSubtotal: 128,
          productSubtotal: 1280,
          shipping: 100,
          totalBeforeTax: 1380,
          billableSqFt: 32,
          billableDims: { widthFt: 8, heightFt: 4 },
          eligible: true,
          notes: [],
        },
      ],
      subtotal: 1280,
      shipping: 100,
      total: 1380,
    });
    const next = applyQuote(baseLine, qty10, { ...qty2Config, quantity: 10 });
    expect(next.quantity).toBe(10);
    expect(next.productSubtotal).toBe(1280);
    expect(next.shipping).toBe(100);
    expect(next.totalBeforeTax).toBe(1380);
  });
});

describe("failRequote / revertRequote", () => {
  it("failure keeps the last confirmed quote and exposes retry/revert", () => {
    const refreshing = beginRequote(baseLine, qty2Config);
    const failed = failRequote(refreshing);
    expect(failed.quoteState).toBe("error");
    expect(failed.quantity).toBe(1); // confirmed value, never the pending 2 beside the old total
    expect(failed.quoteId).toBe("q_1");
    expect(failed.totalBeforeTax).toBe(138);
    expect(failed.pendingConfig).toEqual(qty2Config); // retained for Retry

    const reverted = revertRequote(failed);
    expect(reverted.quoteState).toBe("confirmed");
    expect(reverted.pendingConfig).toBeNull();
    expect(reverted.quantity).toBe(1);
  });

  it("markStale flags an expired quote awaiting revalidation", () => {
    const stale = markStale(baseLine);
    expect(stale.quoteState).toBe("stale");
  });
});

describe("isQuoteExpired", () => {
  it("detects expired and missing validity", () => {
    expect(isQuoteExpired({ quoteValidUntil: "2099-01-01T00:00:00Z" }, new Date("2026-01-01"))).toBe(false);
    expect(isQuoteExpired({ quoteValidUntil: "2020-01-01T00:00:00Z" }, new Date("2026-01-01"))).toBe(true);
    expect(isQuoteExpired({ quoteValidUntil: "" }, new Date("2026-01-01"))).toBe(true);
  });
});

describe("canCheckout", () => {
  it("allows checkout only when every line is confirmed and unexpired", () => {
    expect(canCheckout([baseLine])).toBe(true);
    expect(canCheckout([])).toBe(false);
    expect(canCheckout([{ ...baseLine, quoteState: "refreshing" }])).toBe(false);
    expect(canCheckout([{ ...baseLine, quoteState: "error" }])).toBe(false);
    expect(canCheckout([{ ...baseLine, quoteState: "stale" }])).toBe(false);
    expect(canCheckout([{ ...baseLine, quoteValidUntil: "2020-01-01T00:00:00Z" }])).toBe(false);
  });
});

describe("cartTotals", () => {
  it("sums product, shipping and tax across lines (multi-line)", () => {
    const line2: CartLine = {
      ...baseLine,
      id: "cart_2",
      quoteId: "q_3",
      productSubtotal: 95.5,
      shipping: 10,
      totalBeforeTax: 105.5,
      tax: 0,
    };
    const totals = cartTotals([baseLine, line2]);
    expect(totals.subtotal).toBe(223.5);
    expect(totals.shipping).toBe(20);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(243.5);
  });
});

describe("displayedQuantity / configOf / normalizeCartLine", () => {
  it("shows the pending quantity only while a requote is in flight", () => {
    expect(displayedQuantity(baseLine)).toBe(1);
    const refreshing = beginRequote(baseLine, qty2Config);
    expect(displayedQuantity(refreshing)).toBe(2);
    const failed = failRequote(refreshing);
    expect(displayedQuantity(failed)).toBe(1); // revert to confirmed after failure
  });

  it("configOf rebuilds the canonical quote input from a line", () => {
    expect(configOf(baseLine)).toEqual({
      productId: "HD_BANNER",
      material: "VINYL_13OZ_SINGLE",
      dimensions: baseLine.dimensions,
      finishing: baseLine.finishing,
      quantity: 1,
      artworkId: "art_1",
    });
  });

  it("normalizeCartLine fills the v4 defaults", () => {
    const raw = { ...baseLine } as Partial<CartLine>;
    delete raw.quoteState;
    delete raw.pendingConfig;
    delete raw.tax;
    delete raw.artwork;
    const normalized = normalizeCartLine(raw as CartLine);
    expect(normalized.quoteState).toBe("confirmed");
    expect(normalized.pendingConfig).toBeNull();
    expect(normalized.tax).toBe(0);
    expect(normalized.artwork).toBeNull();
  });
});
