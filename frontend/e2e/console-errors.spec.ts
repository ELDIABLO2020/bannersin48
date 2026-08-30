import { test, expect, type Page } from "@playwright/test";

/**
 * Wave 11 content/perf gate — console and network error assertions.
 *
 * Runs against a production server (see scripts/audit-ci.sh). Each primary
 * route must load with no uncaught exception, no app console.error, and no
 * failed request or 4xx/5xx subresource, modulo:
 *  - aborted requests (Next.js link prefetch / navigation cancellation), and
 *  - the browser's own "Failed to load resource" console line, which is a
 *    duplicate of a network response we capture (and allowlist) separately.
 */

interface CapturedError {
  kind: "console" | "pageerror" | "requestfailed" | "response";
  detail: string;
}

const ALLOWLIST: Array<RegExp> = [
  /\/favicon\.ico/, // legacy browser probe; Next serves app icons instead
];

function attachCollectors(page: Page, bucket: CapturedError[], currentPath: string) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/failed to load resource/i.test(text)) return; // duplicate of response/requestfailed
    bucket.push({ kind: "console", detail: text });
  });
  page.on("pageerror", (err) => {
    bucket.push({ kind: "pageerror", detail: err.message });
  });
  page.on("requestfailed", (req) => {
    const errorText = req.failure()?.errorText ?? "";
    if (errorText.includes("ERR_ABORTED")) return; // cancelled prefetch/navigation
    const url = req.url();
    if (ALLOWLIST.some((re) => re.test(url))) return;
    bucket.push({ kind: "requestfailed", detail: `${req.method()} ${url} — ${errorText}` });
  });
  page.on("response", (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (res.request().resourceType() === "document") return;
    if (new URL(url).pathname === currentPath) return; // the page navigation itself
    if (ALLOWLIST.some((re) => re.test(url))) return;
    bucket.push({ kind: "response", detail: `${res.status()} ${url}` });
  });
}

const ROUTES: Array<{ path: string; label: string }> = [
  { path: "/", label: "home" },
  { path: "/order", label: "order hub" },
  { path: "/sizes", label: "sizes" },
  { path: "/how-it-works", label: "how-it-works" },
  { path: "/help", label: "help" },
  { path: "/login", label: "login" },
  { path: "/register", label: "register" },
  { path: "/cart", label: "cart" },
  { path: "/checkout", label: "checkout" },
  { path: "/orders", label: "orders" },
  { path: "/dashboard", label: "dashboard" },
  { path: "/admin", label: "admin" },
  { path: "/not-a-real-route", label: "404" },
];

for (const route of ROUTES) {
  test(`${route.label} loads without console/network errors`, async ({ page }) => {
    const errors: CapturedError[] = [];
    attachCollectors(page, errors, route.path);
    await page.goto(route.path);
    // Let client queries (catalog, artwork, orders) settle before asserting.
    await page.waitForTimeout(2_500);
    expect(
      errors,
      `console/network errors on ${route.label}:\n${errors.map((e) => `${e.kind}: ${e.detail}`).join("\n")}`,
    ).toEqual([]);
  });
}
