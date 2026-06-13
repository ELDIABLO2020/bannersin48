import { z } from "zod";
import { MATERIAL_RATES, ADDON_RATES, SHIPPING_FLAT_PER_UNIT_USD, MAX_BILLABLE_FT, RETRACTABLE } from "./constants";
import { billableDimensions, type Dimensions } from "./dimensions";
import type { Material } from "./material";
import type { Finishing } from "./finishing";
import type { Quantity } from "./quantity";

/**
 * Pricing engine from the plan §9.
 *   Unit Product Price = (Billable Sq Ft × Material Rate) + add-ons per sq ft
 *   Line Product Subtotal = Unit Product Price × Quantity
 *   Line Shipping = Quantity × $10
 *   Line Total Before Tax = Line Product Subtotal + Line Shipping
 *   Final Total = Line Total Before Tax + applicable tax − rewards/discounts
 *
 * The frontend never computes a price — it always calls the API.
 * This module is the pure-function source of truth shared with backend & frontend.
 */

export interface PricingInput {
  material: Material;
  dimensions: Dimensions;
  finishing: Finishing;
  quantity: Quantity;
}

export interface PricingLine {
  unitProduct: number;
  addons: number;
  unitSubtotal: number;
  productSubtotal: number;
  shipping: number;
  totalBeforeTax: number;
  billableSqFt: number;
  billableDims: { widthFt: number; heightFt: number };
  eligible: boolean;
  ineligibilityReason?: string;
  notes: string[];
}

export interface PricingResult {
  lines: PricingLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function priceLine(input: PricingInput): PricingLine {
  const notes: string[] = [];

  // Retractable is a flat-priced product
  if (input.material === "RETRACTABLE") {
    const unitProduct = RETRACTABLE.priceUsd;
    const productSubtotal = unitProduct * input.quantity;
    const shipping = input.quantity * SHIPPING_FLAT_PER_UNIT_USD;
    return {
      unitProduct,
      addons: 0,
      unitSubtotal: unitProduct,
      productSubtotal,
      shipping,
      totalBeforeTax: productSubtotal + shipping,
      billableSqFt: 0,
      billableDims: { widthFt: 0, heightFt: 0 },
      eligible: true,
      notes: [
        `${RETRACTABLE.widthIn}\" × ${RETRACTABLE.heightIn}\" retractable, hardware + carrying case included.`,
      ],
    };
  }

  const billable = billableDimensions(input.dimensions);
  const eligible = billable.widthFt <= MAX_BILLABLE_FT && billable.heightFt <= MAX_BILLABLE_FT;
  if (!eligible) {
    notes.push("Billable size exceeds the 10 ft × 10 ft maximum — custom quote required.");
  }

  const rate = MATERIAL_RATES[input.material];
  const productBase = billable.sqFt * rate;

  const windSlits = input.finishing.windSlits ? billable.sqFt * ADDON_RATES.WIND_SLITS_PER_SQFT : 0;
  const polePockets = input.finishing.polePockets ? billable.sqFt * ADDON_RATES.POLE_POCKETS_PER_SQFT : 0;
  const addons = windSlits + polePockets;

  const unitProduct = productBase + addons;
  const productSubtotal = unitProduct * input.quantity;
  const shipping = input.quantity * SHIPPING_FLAT_PER_UNIT_USD;
  const totalBeforeTax = productSubtotal + shipping;

  return {
    unitProduct: round2(unitProduct),
    addons: round2(addons),
    unitSubtotal: round2(unitProduct),
    productSubtotal: round2(productSubtotal),
    shipping: round2(shipping),
    totalBeforeTax: round2(totalBeforeTax),
    billableSqFt: billable.sqFt,
    billableDims: { widthFt: billable.widthFt, heightFt: billable.heightFt },
    eligible,
    ineligibilityReason: eligible
      ? undefined
      : `Billable size ${billable.widthFt}' × ${billable.heightFt}' exceeds the 10 ft maximum.`,
    notes,
  };
}

export function priceOrder(lines: PricingInput[]): PricingResult {
  const priced = lines.map(priceLine);
  const subtotal = round2(priced.reduce((acc, l) => acc + l.productSubtotal, 0));
  const shipping = round2(priced.reduce((acc, l) => acc + l.shipping, 0));
  const total = round2(subtotal + shipping);
  return { lines: priced, subtotal, shipping, total };
}

/**
 * Zod schema for a quote request, used by both backend pipes and frontend forms.
 */
export const pricingRequestSchema = z
  .object({
    material: z.enum([
      "VINYL_13OZ_SINGLE",
      "VINYL_15OZ_SINGLE",
      "VINYL_18OZ_SINGLE",
      "VINYL_18OZ_DOUBLE",
      "RETRACTABLE",
    ]),
    dimensions: z
      .object({
        widthFt: z.number().int().min(1),
        widthIn: z.number().int().min(0).max(11),
        heightFt: z.number().int().min(1),
        heightIn: z.number().int().min(0).max(11),
      })
      .strict(),
    finishing: z
      .object({
        welding: z.boolean(),
        grommets: z.boolean(),
        windSlits: z.boolean(),
        polePockets: z.boolean(),
        polePocketPlacement: z
          .enum(["RIGHT", "LEFT", "LEFT_AND_RIGHT", "BOTTOM", "TOP", "TOP_AND_BOTTOM"])
          .optional(),
      })
      .strict(),
    quantity: z.number().int().min(1).max(10),
  })
  .strict();
