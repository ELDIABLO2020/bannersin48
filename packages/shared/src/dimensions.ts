import { z } from "zod";
import { MAX_BILLABLE_FT, MIN_BILLABLE_FT } from "./constants";

/**
 * Customer-entered dimensions in feet and inches.
 * Per the plan: 1 ft × 1 ft through 10 ft × 10 ft eligible.
 * Inches 0–11.
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

function fmtFt(d: Dimensions): string {
  const w = `${d.widthFt} ft${d.widthIn > 0 ? ` ${d.widthIn} in` : ""}`;
  const h = `${d.heightFt} ft${d.heightIn > 0 ? ` ${d.heightIn} in` : ""}`;
  return `${w} × ${h}`;
}

function fmtBillable(b: BillableDimensions): string {
  return `${b.widthFt}' × ${b.heightFt}'`;
}

export function dimensionsDisplay(d: Dimensions): DimensionsDisplay {
  const billable = billableDimensions(d);
  const eligible = billable.widthFt <= MAX_BILLABLE_FT && billable.heightFt <= MAX_BILLABLE_FT;
  return {
    requested: d,
    billable,
    requestedLabel: fmtFt(d),
    billableLabel: fmtBillable(billable),
    eligible,
    ineligibilityReason: eligible
      ? undefined
      : `Billable size ${fmtBillable(billable)} exceeds the 10 ft × 10 ft maximum. Please contact us for a custom quote.`,
  };
}
