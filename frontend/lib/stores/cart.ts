"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReorderResponse } from "@bannersin48/api-client";
import {
  PRODUCTS,
  formatDimensionsWH,
  formatBillableWH,
  type ProductId,
} from "@bannersin48/shared";
import {
  applyQuote,
  beginRequote,
  canCheckout,
  cartTotals,
  configOf,
  failRequote,
  markStale,
  normalizeCartLine,
  revertRequote,
  type CartConfigInput,
  type CartLine,
  type QuoteState,
} from "@/lib/cart/quoteState";
import type { QuoteResponse } from "@bannersin48/api-client";

export type { CartLine, QuoteState, CartConfigInput };
export { canCheckout, cartTotals, configOf };

/**
 * Migrate a pre-fix (v2 and below) cart line to the locked D2 dimension
 * semantics. Legacy lines stored "4′ × 8′" as width 4 / height 8; the corrected
 * semantics are width 8 / height 4 (horizontal × vertical). Fixed-size stands
 * keep their zeroed dimensions and existing labels. Exported for unit tests.
 */
export function migrateLegacyCartLine(line: CartLine): CartLine {
  const normalized = normalizeCartLine(line);
  const config = normalized.productId ? PRODUCTS[normalized.productId as ProductId] : undefined;
  if (config?.sizeMode === "fixed") return normalized;

  const dimensions = {
    widthFt: normalized.dimensions.heightFt,
    widthIn: normalized.dimensions.heightIn,
    heightFt: normalized.dimensions.widthFt,
    heightIn: normalized.dimensions.widthIn,
  };
  const billableDims = {
    widthFt: normalized.billableDims.heightFt,
    heightFt: normalized.billableDims.widthFt,
  };
  return {
    ...normalized,
    dimensions,
    billableDims,
    display: {
      requestedLabel: formatDimensionsWH(dimensions),
      billableLabel: formatBillableWH(billableDims),
    },
  };
}

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  loadFromReorder: (reorder: ReorderResponse) => void;
  beginRequote: (id: string, config: CartConfigInput) => void;
  commitRequote: (id: string, quote: QuoteResponse, config: CartConfigInput) => void;
  failRequote: (id: string) => void;
  revertLine: (id: string) => void;
  markLineStale: (id: string) => void;
}

function patchLine(state: CartState, id: string, fn: (line: CartLine) => CartLine): CartLine[] {
  return state.lines.map((l) => (l.id === id ? fn(l) : l));
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) =>
        set((state) => ({
          lines: [...state.lines, normalizeCartLine(line)],
        })),
      removeLine: (id) =>
        set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      loadFromReorder: (reorder) => {
        const lines: CartLine[] = reorder.lines.map((line) => {
          const productId = line.productId as ProductId;
          const priced = line.quote.lines[0]!;
          return normalizeCartLine({
            id: `cart_${Date.now()}_${line.sourceOrderLineId}`,
            product: PRODUCTS[productId].slug,
            productId,
            material: line.material,
            dimensions: line.dimensions,
            finishing: line.finishing,
            quantity: line.quantity,
            artworkId: line.artworkId,
            quoteId: line.quote.quoteId,
            quoteValidUntil: line.quote.validUntil,
            currency: line.quote.currency,
            unitProduct: priced.unitProduct,
            addons: priced.addons,
            productSubtotal: priced.productSubtotal,
            shipping: priced.shipping,
            totalBeforeTax: priced.totalBeforeTax,
            tax: line.quote.tax ?? 0,
            billableSqFt: priced.billableSqFt,
            billableDims: priced.billableDims,
            display: {
              requestedLabel: formatDimensionsWH(line.dimensions),
              billableLabel: formatBillableWH(priced.billableDims),
            },
          });
        });
        set({ lines });
      },
      beginRequote: (id, config) =>
        set((state) => ({ lines: patchLine(state, id, (l) => beginRequote(l, config)) })),
      commitRequote: (id, quote, config) =>
        set((state) => ({ lines: patchLine(state, id, (l) => applyQuote(l, quote, config)) })),
      failRequote: (id) =>
        set((state) => ({ lines: patchLine(state, id, (l) => failRequote(l)) })),
      revertLine: (id) =>
        set((state) => ({ lines: patchLine(state, id, (l) => revertRequote(l)) })),
      markLineStale: (id) =>
        set((state) => ({ lines: patchLine(state, id, (l) => markStale(l)) })),
    }),
    {
      name: "bi48.cart",
      // v4 adds the quote state machine (quoteState/pendingConfig/tax/artwork).
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<CartState>;
        return {
          ...state,
          // Pre-quote-ID carts cannot be submitted safely. Discard them rather
          // than pairing a stale price with a new order contract. Surviving
          // lines are normalized to the v4 shape and have axes migrated.
          lines: Array.isArray(state.lines)
            ? state.lines
                .filter((line) => Boolean(line.quoteId && line.artworkId))
                .map((line) => normalizeCartLine(migrateLegacyCartLine(line)))
            : [],
        };
      },
    },
  ),
);
