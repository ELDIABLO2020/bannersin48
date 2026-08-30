import { z } from "zod";
import type { Material } from "./material";
import type { Finishing } from "./finishing";
import { DEFAULT_FINISHING } from "./finishing";
import type { Dimensions } from "./dimensions";
import { billableDimensions } from "./dimensions";
import { dimensionsToInches } from "./finishing";
import {
  RETRACTABLE,
  PRODUCT_RATES,
  ECONOSTAND_FLAT_USD,
  MATERIAL_RATES,
  MIN_SIZE_MSG,
  MAX_SHORT_SIDE_MSG,
} from "./constants";

export const productIdSchema = z.enum([
  "HD_BANNER",
  "HDPE",
  "CANVAS",
  "MESH",
  "POSTER",
  "NO_CURL",
  "ECONOSTAND",
  "RETRACTABLE",
]);
export type ProductId = z.infer<typeof productIdSchema>;

export interface ProductDockFlags {
  material: boolean;
  sides: boolean;
  welding: boolean;
  webbing: boolean;
  rope: boolean;
  grommets: boolean;
  polePockets: boolean;
  windSlits: boolean;
}

export interface ProductConfig {
  id: ProductId;
  slug: string;
  title: string;
  subtitle: string;
  hasMoreInfo: boolean;
  sizeMode: "custom" | "fixed";
  fixedSizeIn?: { widthIn: number; heightIn: number };
  flatPriceUsd?: number;
  materials: ReadonlyArray<Material>;
  ratePerSqFt: (m: Material) => number;
  printSides: "singleOnly" | "doubleOn18oz";
  dock: ProductDockFlags;
  defaultFinishing: Finishing;
  defaultSize: { widthFt: number; widthIn: number; heightFt: number; heightIn: number };
  limits: { minAxisIn: number; maxShortSideIn?: number; maxBillableFt: number };
  hubCopy: { commonUses: string[]; environment: string[]; options: string[] };
}

const NONE_FINISHING: Finishing = {
  welding: false,
  grommets: false,
  windSlits: false,
  polePockets: false,
  polePocketPlacement: undefined,
  polePocketDepthIn: undefined,
  rope: false,
  ropePlacement: undefined,
  grommetPreset: undefined,
  grommetSpacing: undefined,
  grommetPoints: undefined,
  webbing: false,
};

const DOCK_NONE: ProductDockFlags = {
  material: false,
  sides: false,
  welding: false,
  webbing: false,
  rope: false,
  grommets: false,
  polePockets: false,
  windSlits: false,
};

// Locked D2: "4′ H × 8′ W" = width (horizontal) 8, height (vertical) 4.
const SIZE_4X8 = { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 };
const SIZE_FIXED = { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 };
const FIXED_33_5_X_80 = { widthIn: 33.5, heightIn: 80 };

const vinylRate = (m: Material): number => MATERIAL_RATES[m] ?? 0;
const constantRate =
  (rate: number) =>
  (_m: Material): number =>
    rate;

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  HD_BANNER: {
    id: "HD_BANNER",
    slug: "hd-banner",
    title: "HD Banner",
    subtitle: "Premium vinyl banner in 13, 15, and 18 oz",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["VINYL_13OZ_SINGLE", "VINYL_15OZ_SINGLE", "VINYL_18OZ_SINGLE", "VINYL_18OZ_DOUBLE"],
    ratePerSqFt: vinylRate,
    printSides: "doubleOn18oz",
    dock: {
      material: true,
      sides: true,
      welding: true,
      webbing: false,
      rope: true,
      grommets: true,
      polePockets: true,
      windSlits: true,
    },
    defaultFinishing: { ...DEFAULT_FINISHING },
    defaultSize: { ...SIZE_4X8 },
    limits: { minAxisIn: 12, maxBillableFt: 10 },
    hubCopy: {
      commonUses: [
        "Business promotions",
        "Sports and school events",
        "Trade shows",
        "Celebrations",
        "Directional signage",
      ],
      environment: ["Indoor and outdoor", "Short to medium term"],
      options: [
        "13, 15, or 18 oz vinyl",
        "Single or double-sided (18 oz)",
        "Welded edges, grommets, rope, pole pockets, wind slits",
      ],
    },
  },
  HDPE: {
    id: "HDPE",
    slug: "hdpe",
    title: "HDPE Banner",
    subtitle: "Lightweight water- and tear-resistant banner",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["HDPE"],
    ratePerSqFt: constantRate(PRODUCT_RATES.HDPE),
    printSides: "singleOnly",
    dock: { ...DOCK_NONE },
    defaultFinishing: { ...NONE_FINISHING },
    defaultSize: { ...SIZE_4X8 },
    limits: { minAxisIn: 12, maxShortSideIn: 52, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Outdoor events", "Retail and pop-ups", "Community events", "Directional signage"],
      environment: ["Indoor and outdoor", "Short-term"],
      options: ["Single-sided", "Custom size"],
    },
  },
  CANVAS: {
    id: "CANVAS",
    slug: "canvas",
    title: "Canvas",
    subtitle: "Poly-cotton canvas for stretching and framing",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["CANVAS_11OZ"],
    ratePerSqFt: constantRate(PRODUCT_RATES.CANVAS_11OZ),
    printSides: "singleOnly",
    dock: { ...DOCK_NONE },
    defaultFinishing: { ...NONE_FINISHING },
    defaultSize: { ...SIZE_4X8 },
    limits: { minAxisIn: 12, maxShortSideIn: 49, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Home decor", "Portraits and art reproduction", "Business displays"],
      environment: ["Indoor"],
      options: ["Single-sided", 'Custom size up to 49" on the shorter side'],
    },
  },
  MESH: {
    id: "MESH",
    slug: "mesh",
    title: "Mesh Banner",
    subtitle: "Perforated banner that lets wind pass through",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["MESH_8OZ"],
    ratePerSqFt: constantRate(PRODUCT_RATES.MESH_8OZ),
    printSides: "singleOnly",
    dock: {
      material: false,
      sides: false,
      welding: true,
      webbing: true,
      rope: true,
      grommets: true,
      polePockets: true,
      windSlits: false,
    },
    defaultFinishing: { ...DEFAULT_FINISHING, webbing: false },
    defaultSize: { ...SIZE_4X8 },
    limits: { minAxisIn: 12, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Fence signage", "Construction sites", "Outdoor events and festivals"],
      environment: ["Indoor and outdoor", "Windy locations"],
      options: [
        "Single-sided",
        "Welded edges, grommets, rope, pole pockets",
        "Webbing reinforcement",
      ],
    },
  },
  POSTER: {
    id: "POSTER",
    slug: "poster",
    title: "Poster",
    subtitle: "Smooth satin poster paper for short-term indoor use",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["POSTER_8MIL"],
    ratePerSqFt: constantRate(PRODUCT_RATES.POSTER_8MIL),
    printSides: "singleOnly",
    dock: { ...DOCK_NONE },
    defaultFinishing: { ...NONE_FINISHING },
    defaultSize: { ...SIZE_4X8 },
    limits: { minAxisIn: 12, maxShortSideIn: 52, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Indoor signage", "Retail promotions", "POP displays", "School events"],
      environment: ["Indoor", "Short-term"],
      options: ["Single-sided", "Custom size"],
    },
  },
  NO_CURL: {
    id: "NO_CURL",
    slug: "no-curl",
    title: "No-Curl Banner",
    subtitle: "Lays flat and stays flat, indoors or out",
    hasMoreInfo: true,
    sizeMode: "custom",
    materials: ["NO_CURL_8MIL"],
    ratePerSqFt: constantRate(PRODUCT_RATES.NO_CURL_8MIL),
    printSides: "singleOnly",
    dock: { ...DOCK_NONE },
    defaultFinishing: { ...NONE_FINISHING },
    // Locked D2: "2′ H × 6′ W" = width 6, height 2.
    defaultSize: { widthFt: 6, widthIn: 0, heightFt: 2, heightIn: 0 },
    limits: { minAxisIn: 12, maxShortSideIn: 35, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Trade shows", "Retail promotion", "Posters that must lay flat"],
      environment: ["Indoor and outdoor"],
      options: ["Single-sided", 'Minimum 12" × 12"', 'Shorter side up to 35"'],
    },
  },
  ECONOSTAND: {
    id: "ECONOSTAND",
    slug: "econostand",
    title: "Econostand",
    subtitle: "All-in-one 33.5″ × 80″ banner stand",
    hasMoreInfo: true,
    sizeMode: "fixed",
    fixedSizeIn: { ...FIXED_33_5_X_80 },
    flatPriceUsd: ECONOSTAND_FLAT_USD,
    materials: ["ECONOSTAND"],
    ratePerSqFt: constantRate(0),
    printSides: "singleOnly",
    dock: { ...DOCK_NONE },
    defaultFinishing: { ...NONE_FINISHING },
    defaultSize: { ...SIZE_FIXED },
    limits: { minAxisIn: 12, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Trade shows", "Retail floors", "Lobby and reception displays"],
      environment: ["Indoor"],
      options: ['Fixed 33.5" × 80"', "Stand and graphic included", "Flat-priced"],
    },
  },
  RETRACTABLE: {
    id: "RETRACTABLE",
    slug: "retractable",
    title: "Retractable Banner",
    subtitle: "Portable stand with printed graphic",
    hasMoreInfo: true,
    sizeMode: "fixed",
    fixedSizeIn: { widthIn: RETRACTABLE.widthIn, heightIn: RETRACTABLE.heightIn },
    flatPriceUsd: RETRACTABLE.priceUsd,
    materials: ["RETRACTABLE"],
    ratePerSqFt: constantRate(0),
    dock: { ...DOCK_NONE },
    printSides: "singleOnly",
    defaultFinishing: { ...NONE_FINISHING },
    defaultSize: { ...SIZE_FIXED },
    limits: { minAxisIn: 12, maxBillableFt: 10 },
    hubCopy: {
      commonUses: ["Trade shows", "Presentations", "Retail and events"],
      environment: ["Indoor"],
      options: ['Fixed 33.5" × 80"', "Stand, graphic, and carrying case included", "Flat-priced"],
    },
  },
};

export const BANNER_HUB_ORDER: ProductId[] = [
  "HD_BANNER",
  "HDPE",
  "CANVAS",
  "MESH",
  "POSTER",
  "NO_CURL",
  "ECONOSTAND",
];

export function productBySlug(slug: string): ProductConfig | undefined {
  return Object.values(PRODUCTS).find((p) => p.slug === slug);
}

/** Legacy inference for bodies without productId. */
export function productIdForMaterial(m: Material): ProductId {
  if (m.startsWith("VINYL_")) return "HD_BANNER";
  if (m === "RETRACTABLE") return "RETRACTABLE";
  if (m === "HDPE") return "HDPE";
  if (m === "CANVAS_11OZ") return "CANVAS";
  if (m === "MESH_8OZ") return "MESH";
  if (m === "POSTER_8MIL") return "POSTER";
  if (m === "NO_CURL_8MIL") return "NO_CURL";
  return "ECONOSTAND";
}

export type SizeValidation = { ok: true } | { ok: false; message: string };

export function validateProductSize(config: ProductConfig, d: Dimensions): SizeValidation {
  if (config.sizeMode === "fixed") return { ok: true };
  const { widthIn, heightIn } = dimensionsToInches(d);
  if (widthIn < config.limits.minAxisIn || heightIn < config.limits.minAxisIn) {
    return { ok: false, message: MIN_SIZE_MSG };
  }
  const shorter = Math.min(widthIn, heightIn);
  if (config.limits.maxShortSideIn && shorter > config.limits.maxShortSideIn) {
    return { ok: false, message: MAX_SHORT_SIDE_MSG(config.title, config.limits.maxShortSideIn) };
  }
  const billable = billableDimensions(d);
  if (billable.widthFt > config.limits.maxBillableFt || billable.heightFt > config.limits.maxBillableFt) {
    return {
      ok: false,
      message: `Billable size ${billable.widthFt}' × ${billable.heightFt}' exceeds the ${config.limits.maxBillableFt} ft maximum.`,
    };
  }
  return { ok: true };
}

export function finishingSummary(
  productId: ProductId,
  finishing: Pick<
    Finishing,
    "welding" | "grommets" | "windSlits" | "polePockets" | "polePocketPlacement" | "webbing" | "rope"
  >,
): string | null {
  const dock = PRODUCTS[productId].dock;
  if (
    !dock.welding &&
    !dock.grommets &&
    !dock.windSlits &&
    !dock.polePockets &&
    !dock.webbing &&
    !dock.rope
  ) {
    return null;
  }
  const parts: string[] = [];
  if (dock.polePockets && finishing.polePockets) {
    parts.push(
      `Pole pockets${finishing.polePocketPlacement ? ` (${finishing.polePocketPlacement})` : ""}`,
    );
  } else {
    if (dock.welding) parts.push(finishing.welding ? "Welded" : "No welding");
    if (dock.grommets) parts.push(finishing.grommets ? "Grommets" : "No grommets");
  }
  if (dock.webbing) parts.push(finishing.webbing ? "Webbing" : "No webbing");
  if (dock.rope && finishing.rope) parts.push("Rope");
  if (dock.windSlits && finishing.windSlits) parts.push("Wind slits");
  return parts.length > 0 ? parts.join(" · ") : null;
}
