/**
 * Money/format helpers. The frontend never computes a price — it only formats what
 * the API returns.
 */

export function formatUsd(cents: number | string): string {
  const n = typeof cents === "string" ? parseFloat(cents) : cents;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
