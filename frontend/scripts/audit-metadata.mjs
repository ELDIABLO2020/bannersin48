/**
 * Metadata snapshot for the Wave 11 release gate.
 *
 * Fetches every seed route from a running production server and snapshots
 * <title>, meta description, canonical, robots, and Open Graph fields into
 * audit/metadata.json (gitignored). It then asserts the invariants the audit
 * requires: no duplicated "| Banners In 48 | Banners In 48" brand suffix, and
 * a noindex robots directive for the internal/manual V1 deployment.
 *
 * Usage: AUDIT_BASE_URL=http://localhost:3100 node scripts/audit-metadata.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { BASE, SEED_ROUTES, fetchText } from "./audit-crawl.mjs";

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : null;
}

function title(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

function canonical(html) {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  return m ? m[1] : null;
}

async function main() {
  console.log(`Snapshotting metadata for ${SEED_ROUTES.length} routes on ${BASE}`);
  const snapshot = {};
  const problems = [];

  for (const route of SEED_ROUTES) {
    const { status, text } = await fetchText(`${BASE}${route}`);
    const t = title(text);
    const description = meta(text, "description");
    const robots = meta(text, "robots");
    const ogTitle = meta(text, "og:title");
    const ogDescription = meta(text, "og:description");
    const canonicalUrl = canonical(text);

    snapshot[route] = {
      status,
      title: t,
      description,
      robots,
      ogTitle,
      ogDescription,
      canonical: canonicalUrl,
    };

    if (status >= 400) {
      problems.push(`${route}: HTTP ${status}`);
      continue;
    }
    if (!t) {
      problems.push(`${route}: missing <title>`);
    } else if (/\|\s*Banners In 48\s*\|\s*Banners In 48/i.test(t)) {
      problems.push(`${route}: duplicated brand suffix in title "${t}"`);
    }
    if (robots && !/noindex/i.test(robots)) {
      problems.push(`${route}: robots directive is not noindex in internal mode ("${robots}")`);
    }
  }

  const outDir = path.resolve("audit");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "metadata.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf8",
  );
  console.log(`Snapshot written to ${path.join(outDir, "metadata.json")}`);

  if (problems.length > 0) {
    console.error("Metadata invariants violated:\n- " + problems.join("\n- "));
    process.exit(1);
  }
  console.log("Metadata snapshot passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
