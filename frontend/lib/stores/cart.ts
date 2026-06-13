"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderLine, Order } from "@bannersin48/shared";

export interface CartLine {
  id: string;
  product: "vinyl" | "retractable";
  material: OrderLine["material"];
  dimensions: OrderLine["dimensions"];
  finishing: OrderLine["finishing"];
  quantity: number;
  artworkId?: string;
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
  loadFromOrder: (order: Order) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) => set((state) => ({ lines: [...state.lines, line] })),
      updateLine: (id, patch) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      removeLine: (id) =>
        set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      loadFromOrder: (order) => {
        const lines: CartLine[] = order.lines.map((l) => ({
          id: `cart_${Date.now()}_${l.id}`,
          product: l.material === "RETRACTABLE" ? "retractable" : "vinyl",
          material: l.material,
          dimensions: l.dimensions,
          finishing: l.finishing,
          quantity: l.quantity,
          artworkId: l.artworkId,
          unitProduct: l.unitProduct,
          addons: l.addons,
          productSubtotal: l.productSubtotal,
          shipping: l.shipping,
          totalBeforeTax: l.totalBeforeTax,
          billableSqFt: l.billableSqFt,
          billableDims: l.billableDims,
          display: {
            requestedLabel: `${l.dimensions.widthFt}' ${l.dimensions.widthIn}" × ${l.dimensions.heightFt}' ${l.dimensions.heightIn}"`,
            billableLabel: `${l.billableDims.widthFt}' × ${l.billableDims.heightFt}'`,
          },
        }));
        set({ lines });
      },
    }),
    { name: "bi48.cart" },
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
