import { z } from "zod";
import { MAX_BILLABLE_FT, MIN_BILLABLE_FT } from "./constants";

/**
 * Canonical dimension semantics (locked decision D2):
 *   width  = horizontal, measured left-to-right
 *   height = vertical, measured top-to-bottom
 *
 * Industry-facing display is "height × width" (e.g. "4′ H × 8′ W"), while the
 * stored values are `width = 8` and `height = 4`.
 */
export const dimensionsSchema = z
  .object({
    widthFt: z
      .number()
      .int()
      .min(MIN_BILLABLE_FT, "Width must be at least 1 ft.")
      .max(MAX_BILLABLE_FT + 1, "Width exceeds the 10 ft maximum."),
    widthIn: z.number().int().min(0).max(11),
    heightFt: z
      .number()
      .int()
      .min(MIN_BILLABLE_FT, "Height must be at least 1 ft.")
      .max(MAX_BILLABLE_FT + 1, "Height exceeds the 10 ft maximum."),
    heightIn: z.number().int().min(0).max(11),
  })
  .strict();

export type Dimensions = z.infer<typeof dimensionsSchema>;

export interface BillableDimensions {
  widthFt: number;
  heightFt: number;
  sqFt: number;
}

export interface DimensionsDisplay {
  requested: Dimensions;
  billable: BillableDimensions;
  requestedLabel: string;
  billableLabel: string;
  eligible: boolean;
  ineligibilityReason?: string;
}

/**
 * Rounding rule from §7.1: any fractional measurement rounds UP to the next whole foot.
 *   widthFt = entered width, rounded up to next whole foot if inches > 0
 *   heightFt = entered height, rounded up to next whole foot if inches > 0
 *   sqFt = widthFt × heightFt
 */
export function billableDimensions(d: Dimensions): BillableDimensions {
  const widthFt = d.widthFt + (d.widthIn > 0 ? 1 : 0);
  const heightFt = d.heightFt + (d.heightIn > 0 ? 1 : 0);
  return { widthFt, heightFt, sqFt: widthFt * heightFt };
}

export type Orientation = "landscape" | "portrait" | "square";

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: "Landscape",
  portrait: "Portrait",
  square: "Square",
};

/** "8′" or "8′ 6″" — feet and optional inches, without axis labels. */
export function formatFeetInches(ft: number, inches: number): string {
  return inches > 0 ? `${ft}′ ${inches}″` : `${ft}′`;
}

/** "8′ W" or "8′ 6″ W" — a single axis with its label. */
export function formatAxis(label: "W" | "H", ft: number, inches: number): string {
  return `${formatFeetInches(ft, inches)} ${label}`;
}

/** "8′ W × 4′ H" — width × height with axis labels (canonical internal order). */
export function formatDimensionsWH(d: Dimensions): string {
  return `${formatAxis("W", d.widthFt, d.widthIn)} × ${formatAxis("H", d.heightFt, d.heightIn)}`;
}

/** "4′ H × 8′ W" — height × width with axis labels (industry-facing order). */
export function formatDimensionsHW(d: Dimensions): string {
  return `${formatAxis("H", d.heightFt, d.heightIn)} × ${formatAxis("W", d.widthFt, d.widthIn)}`;
}

/** "8′ W × 4′ H" for a whole-foot (billable) measurement. */
export function formatBillableWH(b: Pick<BillableDimensions, "widthFt" | "heightFt">): string {
  return `${b.widthFt}′ W × ${b.heightFt}′ H`;
}

/** "33.5″ W × 80″ H" for fixed-size (inch) products such as banner stands. */
export function formatInchesWH(widthIn: number, heightIn: number): string {
  return `${widthIn}″ W × ${heightIn}″ H`;
}

/** Orientation from raw inch measurements. */
export function orientationOfInches(widthIn: number, heightIn: number): Orientation {
  if (widthIn > heightIn) return "landscape";
  if (heightIn > widthIn) return "portrait";
  return "square";
}

/** Orientation for a Dimensions value. */
export function orientationOf(d: Dimensions): Orientation {
  return orientationOfInches(d.widthFt * 12 + d.widthIn, d.heightFt * 12 + d.heightIn);
}

/** Human-readable orientation word. */
export function orientationLabel(o: Orientation): string {
  return ORIENTATION_LABELS[o];
}

export function dimensionsDisplay(d: Dimensions): DimensionsDisplay {
  const billable = billableDimensions(d);
  const eligible = billable.widthFt <= MAX_BILLABLE_FT && billable.heightFt <= MAX_BILLABLE_FT;
  return {
    requested: d,
    billable,
    requestedLabel: formatDimensionsWH(d),
    billableLabel: formatBillableWH(billable),
    eligible,
    ineligibilityReason: eligible
      ? undefined
      : `Billable size ${formatBillableWH(billable)} exceeds the 10 ft × 10 ft maximum. Please contact us for a custom quote.`,
  };
}

export interface ResolvedSize {
  widthFt: number;
  heightFt: number;
  /** True when the size came from a legacy `w`/`h` parameter (axes swapped). */
  legacy: boolean;
}

/**
 * Resolve a builder size from query parameters.
 *
 * Canonical parameters are `width` and `height` (width = horizontal, height =
 * vertical), matching the locked D2 semantics. Legacy `w`/`h` parameters used
 * the pre-fix convention where popular sizes stored the first number as width
 * (e.g. "4′ × 8′" was `w=4&h=8` while the physical banner is 8′ wide × 4′
 * high). Those legacy axes are swapped so a legacy link resolves to the same
 * physical banner under the corrected semantics.
 *
 * Canonical `width`/`height` take precedence over legacy `w`/`h`.
 */
export function resolveSizeParams(params: {
  width?: string | null;
  height?: string | null;
  w?: string | null;
  h?: string | null;
}): ResolvedSize | null {
  const canonicalW = parseInt(params.width ?? "", 10);
  const canonicalH = parseInt(params.height ?? "", 10);
  if (Number.isFinite(canonicalW) && Number.isFinite(canonicalH)) {
    return { widthFt: canonicalW, heightFt: canonicalH, legacy: false };
  }

  const legacyW = parseInt(params.w ?? "", 10);
  const legacyH = parseInt(params.h ?? "", 10);
  if (Number.isFinite(legacyW) && Number.isFinite(legacyH)) {
    return { widthFt: legacyH, heightFt: legacyW, legacy: true };
  }

  return null;
}
