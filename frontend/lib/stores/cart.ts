"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderLine, ProductId } from "@bannersin48/shared";
import type { ReorderResponse } from "@bannersin48/api-client";
import { PRODUCTS, productBySlug, productIdForMaterial } from "@bannersin48/shared";

export interface CartLine {
  id: string;
  product: string;
  productId?: string;
  material: OrderLine["material"];
  dimensions: OrderLine["dimensions"];
  finishing: OrderLine["finishing"];
  quantity: number;
  artworkId: string;
  quoteId: string;
  quoteValidUntil: string;
  currency: "USD";
  unitProduct: number;
  addons: number;
  productSubtotal: number;
  shipping: number;
  totalBeforeTax: number;
  billableSqFt: number;
  billableDims: { widthFt: number; heightFt: number };
  display: {
    requestedLabel: string;
    billableLabel: string;
  };
}

interface CartState {
  lines: CartLine[];
  addLine: (line: CartLine) => void;
  updateLine: (id: string, patch: Partial<CartLine>) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  loadFromReorder: (reorder: ReorderResponse) => void;
}

export function normalizeCartLine(line: CartLine): CartLine {
  const product = line.product === "vinyl" ? "hd-banner" : line.product;
  const fromSlug = productBySlug(product)?.id;
  const productId =
    (line.productId as ProductId | undefined) ??
    fromSlug ??
    productIdForMaterial(line.material);
  return {
    ...line,
    product,
    productId,
    finishing: { ...line.finishing, webbing: line.finishing.webbing ?? false },
  };
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) => set((state) => ({ lines: [...state.lines, normalizeCartLine(line)] })),
      updateLine: (id, patch) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.id === id ? normalizeCartLine({ ...l, ...patch }) : l)),
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
            billableSqFt: priced.billableSqFt,
            billableDims: priced.billableDims,
            display: {
              requestedLabel: `${line.dimensions.widthFt}' ${line.dimensions.widthIn}" × ${line.dimensions.heightFt}' ${line.dimensions.heightIn}"`,
              billableLabel: `${priced.billableDims.widthFt}' × ${priced.billableDims.heightFt}'`,
            },
          });
        });
        set({ lines });
      },
    }),
    {
      name: "bi48.cart",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as CartState;
        return {
          ...state,
          // Pre-quote-ID carts cannot be submitted safely. Discard them rather
          // than pairing a stale price with a new order contract.
          lines: Array.isArray(state.lines)
            ? state.lines.filter((line) => Boolean(line.quoteId && line.artworkId)).map(normalizeCartLine)
            : [],
        };
      },
    },
  ),
);

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((acc, l) => acc + l.productSubtotal, 0);
  const shipping = lines.reduce((acc, l) => acc + l.shipping, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round((subtotal + shipping) * 100) / 100,
  };
}
