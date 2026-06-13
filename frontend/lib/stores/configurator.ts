"use client";

import { create } from "zustand";
import {
  type Material,
  type Finishing,
  DEFAULT_FINISHING,
  normalizeFinishing,
  type PolePocketPlacement,
  MAX_BILLABLE_FT,
  MAX_QUANTITY_PER_LINE,
} from "@bannersin48/shared";

export type ProductKind = "vinyl" | "retractable";

export interface SizeState {
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
}

export interface ConfiguratorState {
  product: ProductKind;
  material: Material;
  size: SizeState;
  finishing: Finishing;
  quantity: number;
  artworkId: string | null;
  artworkFileName: string | null;
  /** Set by the configurator reducer when a finishing normalization produced a
   *  user-facing message (e.g. pole pockets disabled welding & grommets). */
  lastFinishingMessage: string | null;

  setProduct: (p: ProductKind) => void;
  setMaterial: (m: Material) => void;
  setSize: (s: Partial<SizeState>) => void;
  applySize: (widthFt: number, heightFt: number) => void;
  setFinishing: (f: Partial<Finishing>) => void;
  togglePolePockets: (enabled: boolean, placement?: PolePocketPlacement) => void;
  setQuantity: (q: number) => void;
  setArtwork: (id: string | null, name: string | null) => void;
  clearFinishingMessage: () => void;
  reset: () => void;
}

const DEFAULT_SIZE: SizeState = { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 };

export const useConfigurator = create<ConfiguratorState>((set) => ({
  product: "vinyl",
  material: "VINYL_13OZ_SINGLE",
  size: DEFAULT_SIZE,
  finishing: DEFAULT_FINISHING,
  quantity: 1,
  artworkId: null,
  artworkFileName: null,
  lastFinishingMessage: null,

  setProduct: (p) =>
    set(() => {
      if (p === "retractable") {
        return {
          product: p,
          material: "RETRACTABLE",
          size: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
          finishing: DEFAULT_FINISHING,
        };
      }
      return { product: p, material: "VINYL_13OZ_SINGLE" };
    }),

  setMaterial: (m) => set({ material: m }),

  setSize: (s) => set((state) => ({ size: { ...state.size, ...s } })),

  applySize: (widthFt, heightFt) =>
    set({ size: { widthFt, widthIn: 0, heightFt, heightIn: 0 } }),

  setFinishing: (f) =>
    set((state) => {
      const next = { ...state.finishing, ...f };
      const { finishing, message } = normalizeFinishing(next);
      return { finishing, lastFinishingMessage: message ?? null };
    }),

  togglePolePockets: (enabled, placement) =>
    set((state) => {
      const next: Finishing = {
        ...state.finishing,
        polePockets: enabled,
        polePocketPlacement: enabled ? placement ?? state.finishing.polePocketPlacement ?? "TOP" : undefined,
      };
      const { finishing, message } = normalizeFinishing(next);
      return { finishing, lastFinishingMessage: message ?? null };
    }),

  setQuantity: (q) =>
    set(() => ({
      quantity: Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(q) || 1)),
    })),

  setArtwork: (id, name) => set({ artworkId: id, artworkFileName: name }),

  clearFinishingMessage: () => set({ lastFinishingMessage: null }),

  reset: () =>
    set({
      product: "vinyl",
      material: "VINYL_13OZ_SINGLE",
      size: DEFAULT_SIZE,
      finishing: DEFAULT_FINISHING,
      quantity: 1,
      artworkId: null,
      artworkFileName: null,
      lastFinishingMessage: null,
    }),
}));

export { MAX_BILLABLE_FT, MAX_QUANTITY_PER_LINE };
