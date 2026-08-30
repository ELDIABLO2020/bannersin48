/**
 * Shared crawler helpers for the Wave 11 audit scripts (audit-links.mjs and
 * audit-metadata.mjs). These run against a *running* production server whose
 * base URL is supplied via AUDIT_BASE_URL (default http://localhost:3100).
 */

export const BASE = (process.env.AUDIT_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

/** Seed routes crawled by the audit. Intentionally excludes the 404 probe. */
export const SEED_ROUTES = [
  "/",
  "/order",
  "/order/hd-banner",
  "/order/econostand",
  "/order/retractable",
  "/sizes",
  "/how-it-works",
  "/help",
  "/login",
  "/register",
  "/cart",
  "/checkout",
  "/orders",
  "/dashboard",
  "/admin",
];

export async function fetchText(url, { method = "GET" } = {}) {
  const res = await fetch(url, { method, redirect: "follow" });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

/** Extract href/src attribute values from HTML. */
export function extractRefs(html) {
  const refs = [];
  const attr = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = attr.exec(html)) !== null) refs.push(m[1]);
  return refs;
}

/** Resolve a reference against a base URL, returning null for non-HTTP targets. */
export function resolveRef(ref, baseUrl) {
  const trimmed = (ref ?? "").trim();
  if (!trimmed) return null;
  if (/^(javascript:|mailto:|tel:|data:|#)/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
}

/** True when the URL is same-origin and not an asset/API path handled elsewhere. */
export function isCrawlable(url, baseUrl) {
  const base = new URL(baseUrl);
  if (url.origin !== base.origin) return false;
  const path = url.pathname;
  if (path.startsWith("/api/")) return false; // proxied to the (possibly absent) backend
  if (path.startsWith("/_next/")) return false; // build artifacts
  return true;
}
