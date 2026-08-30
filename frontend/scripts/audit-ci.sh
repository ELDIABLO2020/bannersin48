#!/usr/bin/env bash
# Wave 11 release content gate (`npm run audit:ci`).
#
# Runs, against a production build served locally:
#   1. production unsafe-content scan + commerce-config scan
#   2. broken internal link/image crawl
#   3. metadata snapshot + invariants
#   4. console/network error assertions (Playwright)
#
# The frontend production build is produced first when it is missing. Catalog
# data is served through MSW so the audit is self-contained (no real backend
# required). Set AUDIT_BASE_URL / AUDIT_PORT to override defaults.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${AUDIT_PORT:-3100}"
BASE_URL="${AUDIT_BASE_URL:-http://localhost:${PORT}}"

echo "── Wave 11 audit: content, links, metadata, console/network ──"

# 1. Production unsafe-content + commerce-config scans (source level).
npm run validate:content
npm run validate:commerce

# 2. Build the production app if it does not already exist (mock-backed catalog).
if [ ! -d ".next" ]; then
  echo "No .next build found; producing one (NEXT_PUBLIC_ENABLE_MOCKS=1)…"
  NEXT_PUBLIC_ENABLE_MOCKS=1 npm run build
fi

# 3. Serve the production build and wait for readiness.
echo "Serving production build on ${BASE_URL}…"
NEXT_PUBLIC_ENABLE_MOCKS=1 PORT="${PORT}" npm run start &
SERVER_PID=$!
cleanup() { kill "${SERVER_PID}" 2>/dev/null || true; }
trap cleanup EXIT

ready=0
for _ in $(seq 1 90); do
  if curl -sf "${BASE_URL}" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "${ready}" -ne 1 ]; then
  echo "Production server did not become ready on ${BASE_URL}." >&2
  exit 1
fi

export AUDIT_BASE_URL="${BASE_URL}"

# 4. Broken link/image crawl + metadata snapshot.
node scripts/audit-links.mjs
node scripts/audit-metadata.mjs

# 5. Console/network error assertions against the production server.
npx playwright test --config=playwright.audit.config.ts

echo "── Wave 11 audit passed ✅ ──"
