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

// Pricing rates (per billable square foot)
export const MATERIAL_RATES = {
  VINYL_13OZ_SINGLE: 4.0,
  VINYL_15OZ_SINGLE: 4.75,
  VINYL_18OZ_SINGLE: 5.25,
  VINYL_18OZ_DOUBLE: 7.5,
  RETRACTABLE: 0, // flat-priced
} as const;

// Add-on rates (per billable square foot)
export const ADDON_RATES = {
  WIND_SLITS_PER_SQFT: 0.75,
  POLE_POCKETS_PER_SQFT: 0.5,
} as const;

// Supported artwork file types
export const ARTWORK_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
] as const;
export const ARTWORK_MAX_BYTES_DEFAULT = 50 * 1024 * 1024; // 50 MB

// Cancellation window (in ms). Backend honors env override.
export const CANCELLATION_WINDOW_MS_DEFAULT = 10 * 60 * 1000;

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

/**
 * Standard quick-pick sizes (13 oz, single-sided, qty 1, no add-ons, +$10 shipping).
 * Source: bannersin48-final-website-structured-plan.md §7.3
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
  { id: "2x4", widthFt: 2, heightFt: 4, label: "2' × 4'", sqFt: 8, bannerPrice: 32, shipping: 10, total: 42 },
  { id: "2x6", widthFt: 2, heightFt: 6, label: "2' × 6'", sqFt: 12, bannerPrice: 48, shipping: 10, total: 58 },
  { id: "2x8", widthFt: 2, heightFt: 8, label: "2' × 8'", sqFt: 16, bannerPrice: 64, shipping: 10, total: 74 },
  { id: "3x6", widthFt: 3, heightFt: 6, label: "3' × 6'", sqFt: 18, bannerPrice: 72, shipping: 10, total: 82 },
  { id: "3x8", widthFt: 3, heightFt: 8, label: "3' × 8'", sqFt: 24, bannerPrice: 96, shipping: 10, total: 106 },
  { id: "4x6", widthFt: 4, heightFt: 6, label: "4' × 6'", sqFt: 24, bannerPrice: 96, shipping: 10, total: 106 },
  { id: "4x8", widthFt: 4, heightFt: 8, label: "4' × 8'", sqFt: 32, bannerPrice: 128, shipping: 10, total: 138 },
  { id: "5x8", widthFt: 5, heightFt: 8, label: "5' × 8'", sqFt: 40, bannerPrice: 160, shipping: 10, total: 170 },
  { id: "5x10", widthFt: 5, heightFt: 10, label: "5' × 10'", sqFt: 50, bannerPrice: 200, shipping: 10, total: 210 },
  { id: "10x10", widthFt: 10, heightFt: 10, label: "10' × 10'", sqFt: 100, bannerPrice: 400, shipping: 10, total: 410 },
];
