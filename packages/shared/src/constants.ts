/**
 * Business constants for Banners In 48.
 * Source: bannersin48-final-website-structured-plan.md
 */

export const CUTOFF_HOUR_ET = 21; // 9:00 PM Eastern Time
export const CUTOFF_MINUTE_ET = 0;
export const TIMEZONE_ET = "America/New_York";
export const DELIVERY_HOUR_LOCAL = 12; // 12:00 PM noon (local FedEx delivery)
export const DELIVERY_MINUTE = 0;

export const MAX_BILLABLE_FT = 10;
export const MIN_BILLABLE_FT = 1;
export const MAX_QUANTITY_PER_LINE = 10;
export const SHIPPING_FLAT_PER_UNIT_USD = 10;

export const RETRACTABLE = {
  widthIn: 33.5,
  heightIn: 80,
  priceUsd: 175,
} as const;

// PLACEHOLDER — pending pricing decision (D1/D2)
export const PRODUCT_RATES = {
  HDPE: 4.5, // per billable sqft
  CANVAS_11OZ: 15.0,
  MESH_8OZ: 7.25,
  POSTER_8MIL: 6.0,
  NO_CURL_8MIL: 9.0,
} as const;
export const ECONOSTAND_FLAT_USD = 135; // per item
export const WEBBING_PER_WIDTH_FT_PER_EDGE_USD = 2; // webbing = billableWidthFt × this × 2 (top + bottom)

// Pricing rates (per billable square foot)
export const MATERIAL_RATES = {
  VINYL_13OZ_SINGLE: 4.0,
  VINYL_15OZ_SINGLE: 4.75,
  VINYL_18OZ_SINGLE: 5.25,
  VINYL_18OZ_DOUBLE: 7.5,
  RETRACTABLE: 0, // flat-priced
  HDPE: PRODUCT_RATES.HDPE,
  CANVAS_11OZ: PRODUCT_RATES.CANVAS_11OZ,
  MESH_8OZ: PRODUCT_RATES.MESH_8OZ,
  POSTER_8MIL: PRODUCT_RATES.POSTER_8MIL,
  NO_CURL_8MIL: PRODUCT_RATES.NO_CURL_8MIL,
  ECONOSTAND: 0,
} as const;

// Add-on rates (per billable square foot)
export const ADDON_RATES = {
  WIND_SLITS_PER_SQFT: 0.75,
  POLE_POCKETS_PER_SQFT: 0.5,
  ROPE_PER_SQFT: 0.25,
} as const;

/** Wind slits: both dimensions must be strictly greater than min and strictly less than max (inches). */
export const WIND_SLITS_MIN_IN = 24;
export const WIND_SLITS_MAX_IN = 120;

// Supported artwork file types
export const ARTWORK_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;
export const ARTWORK_MAX_BYTES_DEFAULT = 50 * 1024 * 1024; // 50 MB
export const ARTWORK_DEFAULT_DPI = 150;


/**
 * The 6 cutoff cycles from the plan §5.1.
 * Order approval cutoff (in ET) → guaranteed FedEx delivery (ET day, local time).
 * Indexed 0..5.
 */
export type CutoffCycleIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const CUTOFF_CYCLES: ReadonlyArray<{
  index: CutoffCycleIndex;
  label: string;
  startDow: number; // 0 = Sunday, 1 = Monday, ...
  startHourEt: number;
  startMinuteEt: number;
  endDow: number;
  endHourEt: number;
  endMinuteEt: number;
  deliveryDow: number;
  deliveryHourLocal: number;
  deliveryMinute: number;
  deliveryLabel: string; // human-readable weekday
}> = [
  {
    index: 0,
    label: "Monday 12:00 AM – Monday 9:00 PM",
    startDow: 1,
    startHourEt: 0,
    startMinuteEt: 0,
    endDow: 1,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 3,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Wednesday",
  },
  {
    index: 1,
    label: "Tuesday 12:00 AM – Tuesday 9:00 PM",
    startDow: 2,
    startHourEt: 0,
    startMinuteEt: 0,
    endDow: 2,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 4,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Thursday",
  },
  {
    index: 2,
    label: "Wednesday 12:00 AM – Wednesday 9:00 PM",
    startDow: 3,
    startHourEt: 0,
    startMinuteEt: 0,
    endDow: 3,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 5,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Friday",
  },
  {
    index: 3,
    label: "Thursday 12:00 AM – Thursday 9:00 PM",
    startDow: 4,
    startHourEt: 0,
    startMinuteEt: 0,
    endDow: 4,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 1,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Monday",
  },
  {
    index: 4,
    label: "Thursday 9:01 PM – Sunday 9:00 PM",
    startDow: 4,
    startHourEt: 21,
    startMinuteEt: 1,
    endDow: 0,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 2,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Tuesday",
  },
  {
    index: 5,
    label: "Sunday 9:01 PM – Monday 9:00 PM",
    startDow: 0,
    startHourEt: 21,
    startMinuteEt: 1,
    endDow: 1,
    endHourEt: 21,
    endMinuteEt: 0,
    deliveryDow: 3,
    deliveryHourLocal: 12,
    deliveryMinute: 0,
    deliveryLabel: "Wednesday",
  },
];

export const POLE_POCKET_INCOMPAT_MESSAGE =
  "Pole pockets require a different finishing method, so grommets and welding have been removed.";

export const ROPE_GROMMET_INCOMPAT_MESSAGE =
  "Rope and grommets cannot be combined — the other option has been turned off.";

export const COLOR_MATCH_DELAY_MESSAGE =
  "PMS color matching may add 24–48 hours to production time.";

export const WEBBING_HELP =
  "Webbing reinforces the top and bottom welds. Recommended for mesh banners wider than 8 ft.";
export const ROPE_HELP = "Nylon cord welded into the banner edge with slack on both ends.";
export const POCKET_DIAMETER_HELP =
  "Pole pocket size is the diameter of the pole. We add the material needed to fit that pole; the pocket is welded.";
export const DS_WELD_BORDER_MSG =
  'Double-sided banners include a 1.5" white border on all edges for welding. We automatically adjust your artwork to fit.';
export const DS_POCKETS_BLEED_MSG =
  "Double-sided banners with pole pockets are finished at the ordered size with bleed.";
export const MIN_SIZE_MSG = 'The minimum size is 12" × 12".';
export function MAX_SHORT_SIDE_MSG(title: string, inches: number): string {
  return `The shorter side of a ${title} can be at most ${inches}".`;
}
export const UPLOAD_REJECT = "Only JPEG, PNG, and PDF files are supported.";
export const HUB_TITLE = "Order banners";
export const HUB_SUBTITLE = "Pick a product to start building. Every banner ships on our 48-hour schedule.";

/**
 * Standard quick-pick sizes (13 oz, single-sided, qty 1, no add-ons, +$10 shipping).
 * Source: bannersin48-final-website-structured-plan.md §7.3
 *
 * Locked D2 convention: labels are industry-facing "height × width" and the
 * stored `widthFt`/`heightFt` follow the canonical semantics (width = horizontal,
 * height = vertical). So "4′ H × 8′ W" is stored as widthFt 8 / heightFt 4.
 */
export interface PopularSize {
  id: string;
  widthFt: number;
  heightFt: number;
  label: string;
  sqFt: number;
  bannerPrice: number;
  shipping: number;
  total: number;
}

export const POPULAR_SIZES: ReadonlyArray<PopularSize> = [
  { id: "2x4", widthFt: 4, heightFt: 2, label: "2′ H × 4′ W", sqFt: 8, bannerPrice: 32, shipping: 10, total: 42 },
  { id: "2x6", widthFt: 6, heightFt: 2, label: "2′ H × 6′ W", sqFt: 12, bannerPrice: 48, shipping: 10, total: 58 },
  { id: "2x8", widthFt: 8, heightFt: 2, label: "2′ H × 8′ W", sqFt: 16, bannerPrice: 64, shipping: 10, total: 74 },
  { id: "3x6", widthFt: 6, heightFt: 3, label: "3′ H × 6′ W", sqFt: 18, bannerPrice: 72, shipping: 10, total: 82 },
  { id: "3x8", widthFt: 8, heightFt: 3, label: "3′ H × 8′ W", sqFt: 24, bannerPrice: 96, shipping: 10, total: 106 },
  { id: "4x6", widthFt: 6, heightFt: 4, label: "4′ H × 6′ W", sqFt: 24, bannerPrice: 96, shipping: 10, total: 106 },
  { id: "4x8", widthFt: 8, heightFt: 4, label: "4′ H × 8′ W", sqFt: 32, bannerPrice: 128, shipping: 10, total: 138 },
  { id: "5x8", widthFt: 8, heightFt: 5, label: "5′ H × 8′ W", sqFt: 40, bannerPrice: 160, shipping: 10, total: 170 },
  { id: "5x10", widthFt: 10, heightFt: 5, label: "5′ H × 10′ W", sqFt: 50, bannerPrice: 200, shipping: 10, total: 210 },
  { id: "10x10", widthFt: 10, heightFt: 10, label: "10′ × 10′", sqFt: 100, bannerPrice: 400, shipping: 10, total: 410 },
];
