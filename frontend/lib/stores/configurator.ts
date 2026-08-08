"use client";

import { create } from "zustand";
import {
  type Material,
  type Finishing,
  type ColorMatching,
  type GrommetPoint,
  type PolePocketPlacement,
  type PolePocketDepthIn,
  DEFAULT_FINISHING,
  applyFinishingPatch,
  generateGrommetPoints,
  dimensionsToInches,
  pixelsToDimensions,
  isWindSlitsEligible,
  MAX_QUANTITY_PER_LINE,
  MAX_BILLABLE_FT,
} from "@bannersin48/shared";

export type ProductKind = "vinyl" | "retractable";
export type FitMode = "fit" | "center";

export interface SizeState {
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
}

export interface SignDraft {
  id: string;
  size: SizeState;
  material: Material;
  finishing: Finishing;
  quantity: number;
  artworkId: string | null;
  artworkFileName: string | null;
  artworkPreviewUrl: string | null;
  colorMatching?: ColorMatching;
  fitMode: FitMode;
  aspectLocked: boolean;
}

export type DockPanel =
  | null
  | "images"
  | "size"
  | "material"
  | "sides"
  | "welding"
  | "rope"
  | "grommets"
  | "pockets"
  | "wind";

export interface ConfiguratorState {
  product: ProductKind;
  signs: SignDraft[];
  activeSignId: string;
  lastFinishingMessage: string | null;
  activeDockPanel: DockPanel;
  pickerOpen: boolean;
  colorMatchOpen: boolean;
  mobileDockOpen: boolean;

  /** Flattened active-sign mirrors for existing consumers (PriceSummary, retractable). */
  material: Material;
  size: SizeState;
  finishing: Finishing;
  quantity: number;
  artworkId: string | null;
  artworkFileName: string | null;
  artworkPreviewUrl: string | null;
  colorMatching?: ColorMatching;
  fitMode: FitMode;
  aspectLocked: boolean;

  setProduct: (p: ProductKind) => void;
  setMaterial: (m: Material) => void;
  setSize: (s: Partial<SizeState>) => void;
  applySize: (widthFt: number, heightFt: number) => void;
  setFinishing: (f: Partial<Finishing>) => void;
  togglePolePockets: (enabled: boolean, placement?: PolePocketPlacement, depth?: PolePocketDepthIn) => void;
  setQuantity: (q: number) => void;
  setArtwork: (
    id: string | null,
    name: string | null,
    previewUrl?: string | null,
    meta?: { widthPx?: number; heightPx?: number; dpi?: number; autoSize?: boolean },
  ) => void;
  setColorMatching: (notes: string | null) => void;
  setFitMode: (mode: FitMode) => void;
  setAspectLocked: (locked: boolean) => void;
  setGrommetPoints: (points: GrommetPoint[]) => void;
  clearFinishingMessage: () => void;

  addSign: () => void;
  removeSign: (id: string) => void;
  selectSign: (id: string) => void;
  duplicateActiveSign: () => void;

  setActiveDockPanel: (panel: DockPanel) => void;
  setPickerOpen: (open: boolean) => void;
  setColorMatchOpen: (open: boolean) => void;
  setMobileDockOpen: (open: boolean) => void;

  reset: () => void;
}

const DEFAULT_SIZE: SizeState = { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 };

function newSignId(): string {
  return `sign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultSign(partial?: Partial<SignDraft>): SignDraft {
  return {
    id: newSignId(),
    size: { ...DEFAULT_SIZE },
    material: "VINYL_13OZ_SINGLE",
    finishing: { ...DEFAULT_FINISHING },
    quantity: 1,
    artworkId: null,
    artworkFileName: null,
    artworkPreviewUrl: null,
    colorMatching: undefined,
    fitMode: "fit",
    aspectLocked: true,
    ...partial,
  };
}

function mirrorFromSign(sign: SignDraft) {
  return {
    material: sign.material,
    size: sign.size,
    finishing: sign.finishing,
    quantity: sign.quantity,
    artworkId: sign.artworkId,
    artworkFileName: sign.artworkFileName,
    artworkPreviewUrl: sign.artworkPreviewUrl,
    colorMatching: sign.colorMatching,
    fitMode: sign.fitMode,
    aspectLocked: sign.aspectLocked,
  };
}

function updateActive(
  state: ConfiguratorState,
  patch: Partial<SignDraft>,
  extras?: Partial<ConfiguratorState>,
): Partial<ConfiguratorState> {
  const signs = state.signs.map((s) => (s.id === state.activeSignId ? { ...s, ...patch } : s));
  const active = signs.find((s) => s.id === state.activeSignId)!;
  return { signs, ...mirrorFromSign(active), ...extras };
}

function persistSession(signs: SignDraft[], activeSignId: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem("bi48.builder", JSON.stringify({ signs, activeSignId }));
  } catch {
    // ignore quota / private mode
  }
}

function loadSession(): { signs: SignDraft[]; activeSignId: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("bi48.builder");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { signs: SignDraft[]; activeSignId: string };
    if (!Array.isArray(parsed.signs) || parsed.signs.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

const initialSign = createDefaultSign({ id: "sign_initial" });
const session = typeof window !== "undefined" ? loadSession() : null;
const bootSigns = session?.signs ?? [initialSign];
const bootActiveId = session?.activeSignId ?? bootSigns[0]!.id;
const bootActive = bootSigns.find((s) => s.id === bootActiveId) ?? bootSigns[0]!;

export const useConfigurator = create<ConfiguratorState>((set, get) => ({
  product: "vinyl",
  signs: bootSigns,
  activeSignId: bootActive.id,
  lastFinishingMessage: null,
  activeDockPanel: null,
  pickerOpen: false,
  colorMatchOpen: false,
  mobileDockOpen: false,
  ...mirrorFromSign(bootActive),

  setProduct: (p) =>
    set((state) => {
      if (p === "retractable") {
        const patch = updateActive(state, {
          material: "RETRACTABLE",
          size: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
          finishing: { ...DEFAULT_FINISHING },
        });
        return { product: p, ...patch };
      }
      const { widthIn, heightIn } = dimensionsToInches(state.size);
      const size = widthIn > 0 && heightIn > 0 ? state.size : { ...DEFAULT_SIZE };
      const patch = updateActive(state, { material: "VINYL_13OZ_SINGLE", size });
      return { product: p, ...patch };
    }),

  setMaterial: (m) =>
    set((state) => {
      let material = m;
      // Double-sided only via 18oz double material
      if (m === "VINYL_18OZ_DOUBLE") material = "VINYL_18OZ_DOUBLE";
      const next = updateActive(state, { material });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setSize: (s) =>
    set((state) => {
      const size = { ...state.size, ...s };
      let finishing = state.finishing;
      let lastFinishingMessage = state.lastFinishingMessage;
      // Auto-disable wind slits when size leaves the eligibility band
      if (finishing.windSlits && !isWindSlitsEligible(size)) {
        finishing = { ...finishing, windSlits: false };
        lastFinishingMessage = "Wind slits were turned off because this size is outside the eligible range.";
      }
      const next = updateActive(state, { size, finishing }, { lastFinishingMessage });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  applySize: (widthFt, heightFt) => get().setSize({ widthFt, widthIn: 0, heightFt, heightIn: 0 }),

  setFinishing: (f) =>
    set((state) => {
      // Gate wind slits by size
      if (f.windSlits === true && !isWindSlitsEligible(state.size)) {
        return {
          lastFinishingMessage:
            "Wind slits require both dimensions greater than 24\" and less than 120\".",
        };
      }
      const { finishing, message } = applyFinishingPatch(state.finishing, f);
      // Regenerate grommet points when preset/spacing changes on a sized banner
      if (finishing.grommets && (f.grommetPreset || f.grommetSpacing) && finishing.grommetPreset !== "CUSTOM") {
        const { widthIn, heightIn } = dimensionsToInches(state.size);
        finishing.grommetPoints = generateGrommetPoints(
          widthIn,
          heightIn,
          finishing.grommetPreset ?? "TOP_AND_BOTTOM",
          finishing.grommetSpacing ?? "EVERY_2_3FT",
        );
      }
      const next = updateActive(state, { finishing }, { lastFinishingMessage: message ?? null });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  togglePolePockets: (enabled, placement, depth) =>
    set((state) => {
      const { finishing, message } = applyFinishingPatch(state.finishing, {
        polePockets: enabled,
        polePocketPlacement: enabled ? placement ?? state.finishing.polePocketPlacement ?? "TOP" : undefined,
        polePocketDepthIn: enabled ? depth ?? state.finishing.polePocketDepthIn ?? 2 : undefined,
      });
      const next = updateActive(state, { finishing }, { lastFinishingMessage: message ?? null });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setQuantity: (q) =>
    set((state) => {
      const quantity = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(q) || 1));
      const next = updateActive(state, { quantity });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setArtwork: (id, name, previewUrl = null, meta) =>
    set((state) => {
      let size = state.size;
      if (meta?.autoSize && meta.widthPx && meta.heightPx) {
        const d = pixelsToDimensions(meta.widthPx, meta.heightPx, meta.dpi);
        size = d;
      }
      const next = updateActive(state, {
        artworkId: id,
        artworkFileName: name,
        artworkPreviewUrl: previewUrl ?? state.artworkPreviewUrl,
        size,
      });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setColorMatching: (notes) =>
    set((state) => {
      const colorMatching = notes && notes.trim() ? { pmsNotes: notes.trim() } : undefined;
      const next = updateActive(state, { colorMatching });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setFitMode: (fitMode) =>
    set((state) => {
      const next = updateActive(state, { fitMode });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setAspectLocked: (aspectLocked) =>
    set((state) => {
      const next = updateActive(state, { aspectLocked });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  setGrommetPoints: (points) =>
    set((state) => {
      const finishing: Finishing = {
        ...state.finishing,
        grommets: true,
        rope: false,
        ropePlacement: undefined,
        grommetPreset: "CUSTOM",
        grommetPoints: points,
      };
      const next = updateActive(state, { finishing });
      persistSession(next.signs as SignDraft[], state.activeSignId);
      return next;
    }),

  clearFinishingMessage: () => set({ lastFinishingMessage: null }),

  addSign: () =>
    set((state) => {
      const active = state.signs.find((s) => s.id === state.activeSignId) ?? state.signs[0]!;
      const created = createDefaultSign({
        size: { ...active.size },
        material: active.material,
        finishing: { ...active.finishing, grommetPoints: active.finishing.grommetPoints?.slice() },
      });
      const signs = [...state.signs, created];
      persistSession(signs, created.id);
      return {
        signs,
        activeSignId: created.id,
        ...mirrorFromSign(created),
      };
    }),

  removeSign: (id) =>
    set((state) => {
      if (state.signs.length <= 1) return state;
      const signs = state.signs.filter((s) => s.id !== id);
      const activeSignId = state.activeSignId === id ? signs[0]!.id : state.activeSignId;
      const active = signs.find((s) => s.id === activeSignId)!;
      persistSession(signs, activeSignId);
      return { signs, activeSignId, ...mirrorFromSign(active) };
    }),

  selectSign: (id) =>
    set((state) => {
      const active = state.signs.find((s) => s.id === id);
      if (!active) return state;
      persistSession(state.signs, id);
      return { activeSignId: id, ...mirrorFromSign(active) };
    }),

  duplicateActiveSign: () => get().addSign(),

  setActiveDockPanel: (panel) => set({ activeDockPanel: panel }),
  setPickerOpen: (open) => set({ pickerOpen: open }),
  setColorMatchOpen: (open) => set({ colorMatchOpen: open }),
  setMobileDockOpen: (open) => set({ mobileDockOpen: open }),

  reset: () => {
    const sign = createDefaultSign({ id: "sign_initial" });
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem("bi48.builder");
      } catch {
        // ignore
      }
    }
    set({
      product: "vinyl",
      signs: [sign],
      activeSignId: sign.id,
      lastFinishingMessage: null,
      activeDockPanel: null,
      pickerOpen: false,
      colorMatchOpen: false,
      mobileDockOpen: false,
      ...mirrorFromSign(sign),
    });
  },
}));

export { MAX_BILLABLE_FT, MAX_QUANTITY_PER_LINE };
