/**
 * Pure cart quote-state transitions (Wave 3, P0-01).
 *
 * The frontend never derives a price from a mutable quantity/config — every
 * quantity or configuration change produces a new server quote. This module is
 * a pure function layer (no zustand, no network) so the state machine is
 * unit-testable in isolation; `requote.ts` wires it to the API client.
 */

import type { QuoteResponse } from "@bannersin48/api-client";
import {
  PRODUCTS,
  productIdForMaterial,
  formatDimensionsWH,
  formatBillableWH,
  formatInchesWH,
  type Dimensions,
  type Finishing,
  type Material,
  type ProductId,
} from "@bannersin48/shared";

export type QuoteState = "confirmed" | "refreshing" | "stale" | "error";

/**
 * The canonical, quoteable configuration snapshot for a cart line. Artwork is
 * part of the snapshot (D3: every line carries a valid artwork id) but is not
 * part of the pricing request.
 */
export interface CartConfigInput {
  productId?: string;
  material: Material;
  dimensions: Dimensions;
  finishing: Finishing;
  quantity: number;
  artworkId: string;
}

/** Artwork metadata used by the Wave 4 uploaded-file review at checkout. */
export interface CartArtworkMeta {
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
}

export interface CartLine {
  id: string;
  product: string;
  productId?: string;
  material: Material;
  dimensions: Dimensions;
  finishing: Finishing;
  quantity: number;
  artworkId: string;
  /** Optional artwork metadata for the uploaded-file review (Wave 4). */
  artwork?: CartArtworkMeta | null;
  quoteId: string;
  quoteValidUntil: string;
  currency: "USD";
  unitProduct: number;
  addons: number;
  productSubtotal: number;
  shipping: number;
  totalBeforeTax: number;
  tax?: number;
  billableSqFt: number;
  billableDims: { widthFt: number; heightFt: number };
  display: {
    requestedLabel: string;
    billableLabel: string;
  };
  quoteState?: QuoteState;
  /**
   * The config the user is attempting to apply while a quote is refreshing or
   * has errored. On success it is atomically applied and cleared; on failure it
   * is retained so the UI can offer Retry / Revert. The line's own config +
   * quote fields always describe the last *confirmed* state.
   */
  pendingConfig?: CartConfigInput | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function configOf(line: CartLine): CartConfigInput {
  return {
    productId: line.productId,
    material: line.material,
    dimensions: line.dimensions,
    finishing: line.finishing,
    quantity: line.quantity,
    artworkId: line.artworkId,
  };
}

export function isQuoteExpired(
  line: Pick<CartLine, "quoteValidUntil">,
  now: Date = new Date(),
): boolean {
  if (!line.quoteValidUntil) return true;
  const t = new Date(line.quoteValidUntil).getTime();
  return !Number.isFinite(t) || t <= now.getTime();
}

function resolveProductId(line: CartLine, config: CartConfigInput): ProductId {
  return (config.productId as ProductId | undefined) ??
    (line.productId as ProductId | undefined) ??
    productIdForMaterial(config.material);
}

function computeDisplay(
  config: CartConfigInput,
  productId: ProductId,
  billableDims: { widthFt: number; heightFt: number },
): CartLine["display"] {
  const product = PRODUCTS[productId];
  if (product.sizeMode === "fixed" && product.fixedSizeIn) {
    return {
      requestedLabel: formatInchesWH(product.fixedSizeIn.widthIn, product.fixedSizeIn.heightIn),
      billableLabel: "Fixed size",
    };
  }
  return {
    requestedLabel: formatDimensionsWH(config.dimensions),
    billableLabel: formatBillableWH(billableDims),
  };
}

/** Mark a line as refreshing and remember the attempted config for retry/revert. */
export function beginRequote(line: CartLine, config: CartConfigInput): CartLine {
  return { ...line, quoteState: "refreshing", pendingConfig: config };
}

/**
 * Atomically replace the line's config + quote from a fresh server quote.
 * `config` is the same input that produced `quote`, so config and price can
 * never disagree.
 */
export function applyQuote(
  line: CartLine,
  quote: QuoteResponse,
  config: CartConfigInput,
): CartLine {
  const priced = quote.lines[0];
  const productId = resolveProductId(line, config);
  const billableDims = priced?.billableDims ?? line.billableDims;
  return {
    ...line,
    productId,
    material: config.material,
    dimensions: config.dimensions,
    finishing: config.finishing,
    quantity: config.quantity,
    artworkId: config.artworkId,
    quoteId: quote.quoteId,
    quoteValidUntil: quote.validUntil,
    currency: quote.currency,
    unitProduct: priced?.unitProduct ?? line.unitProduct,
    addons: priced?.addons ?? line.addons,
    productSubtotal: priced?.productSubtotal ?? quote.subtotal,
    shipping: priced?.shipping ?? quote.shipping,
    totalBeforeTax: priced?.totalBeforeTax ?? quote.total,
    tax: quote.tax ?? 0,
    billableSqFt: priced?.billableSqFt ?? line.billableSqFt,
    billableDims,
    display: computeDisplay(config, productId, billableDims),
    quoteState: "confirmed",
    pendingConfig: null,
  };
}

/** Keep the last confirmed config/quote and surface the failure for retry/revert. */
export function failRequote(line: CartLine): CartLine {
  return { ...line, quoteState: "error" };
}

/** Revert to the last confirmed config/quote (drops the pending change). */
export function revertRequote(line: CartLine): CartLine {
  return { ...line, quoteState: "confirmed", pendingConfig: null };
}

/** Mark a line whose quote has expired and must be revalidated. */
export function markStale(line: CartLine): CartLine {
  return { ...line, quoteState: "stale" };
}

/** Fill defaults for a freshly loaded line (migration / reorder / add-to-cart). */
export function normalizeCartLine(line: CartLine): CartLine {
  return {
    ...line,
    productId: line.productId,
    finishing: { ...line.finishing, webbing: line.finishing.webbing ?? false },
    tax: line.tax ?? 0,
    artwork: line.artwork ?? null,
    quoteState: line.quoteState ?? "confirmed",
    pendingConfig: line.pendingConfig ?? null,
  };
}

/** The last confirmed quantity a line displays (pending only while refreshing). */
export function displayedQuantity(line: CartLine): number {
  return line.quoteState === "refreshing" || line.quoteState === "stale"
    ? (line.pendingConfig?.quantity ?? line.quantity)
    : line.quantity;
}

/** Checkout is only allowed when every line has a confirmed, non-expired quote. */
export function canCheckout(lines: CartLine[]): boolean {
  return (
    lines.length > 0 &&
    lines.every((l) => (l.quoteState ?? "confirmed") === "confirmed" && !isQuoteExpired(l))
  );
}

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((acc, l) => acc + l.productSubtotal, 0);
  const shipping = lines.reduce((acc, l) => acc + l.shipping, 0);
  const tax = lines.reduce((acc, l) => acc + (l.tax ?? 0), 0);
  return {
    subtotal: round2(subtotal),
    shipping: round2(shipping),
    tax: round2(tax),
    total: round2(subtotal + shipping + tax),
  };
}
