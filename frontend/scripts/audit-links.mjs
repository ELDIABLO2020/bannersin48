/**
 * Broken internal link/image crawl for the Wave 11 release gate.
 *
 * Fetches every seed route, extracts internal href/src targets (links, images,
 * preload hints), and verifies each returns a 2xx/3xx response. External URLs
 * and /_next/ + /api/ paths are out of scope. Exits non-zero on any breakage.
 *
 * Usage: AUDIT_BASE_URL=http://localhost:3100 node scripts/audit-links.mjs
 */
import { BASE, SEED_ROUTES, fetchText, extractRefs, resolveRef, isCrawlable } from "./audit-crawl.mjs";

const results = { checked: 0, ok: 0, broken: [] };

async function statusOf(url) {
  // HEAD is cheapest; fall back to GET when a server rejects HEAD.
  const head = await fetch(url, { method: "HEAD", redirect: "follow" }).catch(() => null);
  if (head && head.status !== 405 && head.status !== 501) return head.status;
  const get = await fetch(url, { method: "GET", redirect: "follow" }).catch(() => null);
  return get ? get.status : 0;
}

async function main() {
  console.log(`Crawling internal links/images on ${BASE}`);
  const seedStatus = {};
  const targets = new Set();

  for (const route of SEED_ROUTES) {
    const url = `${BASE}${route}`;
    const { status, text } = await fetchText(url);
    seedStatus[route] = status;
    if (status >= 400) {
      results.broken.push(`SEED ${route} → ${status}`);
      continue;
    }
    for (const ref of extractRefs(text)) {
      const resolved = resolveRef(ref, url);
      if (resolved && isCrawlable(resolved, BASE)) {
        // Drop hashes/fragments for dedupe; keep query for image optimization URLs.
        targets.add(`${resolved.origin}${resolved.pathname}${resolved.search}`);
      }
    }
  }

  for (const target of targets) {
    const rel = target.slice(BASE.length) || "/";
    results.checked += 1;
    const status = await statusOf(target);
    if (status >= 400) {
      results.broken.push(`${rel} → ${status}`);
    } else {
      results.ok += 1;
    }
  }

  console.log(`Checked ${results.checked} internal targets (${results.ok} ok).`);
  if (results.broken.length > 0) {
    console.error("Broken internal links/images found:\n- " + results.broken.join("\n- "));
    process.exit(1);
  }
  console.log("Broken internal link/image crawl passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
