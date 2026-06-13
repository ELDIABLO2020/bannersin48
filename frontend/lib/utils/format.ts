/**
 * Money/format helpers. The frontend never computes a price — it only formats what
 * the API returns.
 */

export function formatUsd(cents: number | string): string {
  const n = typeof cents === "string" ? parseFloat(cents) : cents;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function formatUsdFromMajor(major: number): string {
  return formatUsd(major);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  if (n === 1) return `${n} ${singular}`;
  return `${n} ${plural ?? singular + "s"}`;
}
