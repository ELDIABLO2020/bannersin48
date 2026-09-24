import {
  ADDON_RATES,
  SHIPPING_FLAT_PER_UNIT_USD,
  WEBBING_PER_WIDTH_FT_PER_EDGE_USD,
} from "./constants";
import { billableDimensions, type Dimensions } from "./dimensions";
import type { Material } from "./material";
import type { Finishing } from "./finishing";
import type { Quantity } from "./quantity";
import { PRODUCTS, productIdForMaterial, validateProductSize, type ProductId } from "./product";

/**
 * Pricing engine.
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
  productId?: ProductId;
  material: Material;
  dimensions: Dimensions;
  finishing: Finishing;
  quantity: Quantity;
}

/**
 * Optional DB-loaded rates. When omitted the engine falls back to the shipped
 * constants — the backend passes admin-editable catalog rates here so pricing
 * control takes effect on new quotes/orders without code changes.
 */
export interface PricingRates {
  materialRatePerSqft?: Partial<Record<Material, number>>;
  flatPriceUsdByProduct?: Partial<Record<ProductId, number>>;
  addonPerSqft?: {
    windSlits?: number;
    polePockets?: number;
    rope?: number;
  };
  webbingPerWidthFtPerEdge?: number;
  shippingFlatPerUnit?: number;
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

export function priceLine(input: PricingInput, rates?: PricingRates): PricingLine {
  const notes: string[] = [];
  const productId = input.productId ?? productIdForMaterial(input.material);
  const config = PRODUCTS[productId];

  if (config.sizeMode === "fixed") {
    const unitProduct =
      rates?.flatPriceUsdByProduct?.[productId] ?? config.flatPriceUsd ?? 0;
    const productSubtotal = unitProduct * input.quantity;
    const shipping = input.quantity * SHIPPING_FLAT_PER_UNIT_USD;
    const note =
      productId === "RETRACTABLE"
        ? `${config.fixedSizeIn?.widthIn ?? 33.5}" × ${config.fixedSizeIn?.heightIn ?? 80}" retractable, hardware + carrying case included.`
        : `33.5" × 80" banner stand, hardware included.`;
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
      notes: [note],
    };
  }

  const billable = billableDimensions(input.dimensions);
  const validation = validateProductSize(config, input.dimensions);
  const eligible = validation.ok;
  if (!eligible) {
    notes.push(validation.message);
  }

  const defaultRate = config.ratePerSqFt(input.material);
  const rate = rates?.materialRatePerSqft?.[input.material] ?? defaultRate;
  const productBase = billable.sqFt * rate;

  const windSlits =
    config.dock.windSlits && input.finishing.windSlits
      ? billable.sqFt * (rates?.addonPerSqft?.windSlits ?? ADDON_RATES.WIND_SLITS_PER_SQFT)
      : 0;
  const polePockets =
    config.dock.polePockets && input.finishing.polePockets
      ? billable.sqFt * (rates?.addonPerSqft?.polePockets ?? ADDON_RATES.POLE_POCKETS_PER_SQFT)
      : 0;
  const rope =
    config.dock.rope && input.finishing.rope ? billable.sqFt * (rates?.addonPerSqft?.rope ?? ADDON_RATES.ROPE_PER_SQFT) : 0;
  const webbing =
    config.dock.webbing && input.finishing.webbing
      ? billable.widthFt * (rates?.webbingPerWidthFtPerEdge ?? WEBBING_PER_WIDTH_FT_PER_EDGE_USD) * 2
      : 0;
  const addons = windSlits + polePockets + rope + webbing;

  const unitProduct = productBase + addons;
  const productSubtotal = unitProduct * input.quantity;
  const shipping = input.quantity * (rates?.shippingFlatPerUnit ?? SHIPPING_FLAT_PER_UNIT_USD);
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
    ineligibilityReason: eligible ? undefined : validation.message,
    notes,
  };
}

export function priceOrder(lines: PricingInput[], rates?: PricingRates): PricingResult {
  const priced = lines.map((l) => priceLine(l, rates));
  const subtotal = round2(priced.reduce((acc, l) => acc + l.productSubtotal, 0));
  const shipping = round2(priced.reduce((acc, l) => acc + l.shipping, 0));
  const total = round2(subtotal + shipping);
  return { lines: priced, subtotal, shipping, total };
}
