"use client";

/**
 * Cart re-quote orchestration (Wave 3, P0-01).
 *
 * Wires the pure transitions in `quoteState.ts` to the API client so a
 * quantity/config change never mutates a derived total: mark refreshing →
 * request a new quote → atomically replace config+quote, or keep the last
 * confirmed quote and expose retry/revert on failure.
 */

import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import {
  configOf,
  isQuoteExpired,
  type CartConfigInput,
} from "./quoteState";

export async function requestQuote(config: CartConfigInput) {
  return getApiClient().quote({
    productId: config.productId,
    material: config.material,
    dimensions: config.dimensions,
    finishing: config.finishing,
    quantity: config.quantity,
  });
}

/** Re-quote a single line for a new config, atomically applying the result. */
export async function requoteLine(id: string, config: CartConfigInput): Promise<void> {
  const store = useCart.getState();
  const current = store.lines.find((l) => l.id === id);
  if (!current) return;
  if (current.quoteState === "refreshing") return; // coalesce in-flight requests

  store.beginRequote(id, config);
  try {
    const quote = await requestQuote(config);
    store.commitRequote(id, quote, config);
  } catch {
    store.failRequote(id);
  }
}

/** Retry the last failed/pending change for a line. */
export async function retryLine(id: string): Promise<void> {
  const line = useCart.getState().lines.find((l) => l.id === id);
  if (!line?.pendingConfig) return;
  await requoteLine(id, line.pendingConfig);
}

/** Revert a line to its last confirmed config/quote. */
export function revertLine(id: string): void {
  useCart.getState().revertLine(id);
}

/**
 * Revalidate quotes that have expired (e.g. on cart/checkout load). Expired
 * lines are marked stale then re-quoted against their current config so a
 * confirmed quote is always paired with a valid server quote.
 */
export async function revalidateQuotes(): Promise<void> {
  const store = useCart.getState();
  const expired = store.lines.filter(
    (l) => l.quoteState !== "refreshing" && isQuoteExpired(l),
  );
  if (expired.length === 0) return;

  expired.forEach((l) => store.markLineStale(l.id));
  await Promise.all(expired.map((l) => requoteLine(l.id, configOf(l))));
}
