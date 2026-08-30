#!/usr/bin/env bash
# Wave 11 release E2E orchestration (`npm run e2e:real`).
#
# Runs the canonical customer scenarios against the REAL NestJS backend backed
# by Postgres 16 + Redis 7 (backend/docker-compose.yml). Lifecycle:
#
#   1. preflight (docker + daemon reachable)
#   2. docker compose up (postgres + redis)
#   3. prisma migrate deploy + idempotent seed
#   4. build + start the Nest API (PORT 3001)
#   5. build + start the Next frontend WITHOUT mocks (PORT 3000)
#   6. playwright -c playwright.real.config.ts
#
# If an external piece is missing (e.g. Docker/Postgres), it prints a precise
# blocker and exits 2 so CI can distinguish "blocked" from "failed".
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$(cd .. && pwd)"

API_PORT="${REAL_API_PORT:-3001}"
FRONTEND_PORT="${REAL_FRONTEND_PORT:-3000}"
API_URL="http://localhost:${API_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do kill "${pid}" 2>/dev/null || true; done
  docker compose -f "${REPO_ROOT}/backend/docker-compose.yml" stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "── Wave 11 release E2E against the real backend ──"

# 1. Preflight: docker + reachable daemon.
if ! command -v docker >/dev/null 2>&1; then
  echo "BLOCKER: docker is not installed. e2e:real requires Postgres 16 + Redis 7" >&2
  echo "         (see backend/docker-compose.yml). Install Docker and retry." >&2
  exit 2
fi
if ! docker info >/dev/null 2>&1; then
  echo "BLOCKER: the Docker daemon is not running (docker info failed)." >&2
  echo "         Start Docker Desktop / the docker daemon, then retry e2e:real." >&2
  echo "         Until then only the MSW-backed suite (npm run e2e) is runnable." >&2
  exit 2
fi

# Load the backend's local env so `ts-node prisma/seed.ts` and the Nest API see
# DATABASE_URL/JWT_SECRET/etc. (the Prisma CLI auto-loads .env, but ts-node and
# the built API do not).
set -a
# shellcheck disable=SC1091
source "${REPO_ROOT}/backend/.env"
set +a

# 2. Infra.
echo "Starting Postgres + Redis…"
docker compose -f "${REPO_ROOT}/backend/docker-compose.yml" up -d
for i in $(seq 1 60); do
  if docker compose -f "${REPO_ROOT}/backend/docker-compose.yml" exec -T postgres \
       pg_isready -U banners -d bannersin48 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Migrate + seed (idempotent).
(
  cd "${REPO_ROOT}/backend"
  npx prisma migrate deploy
  npm run seed
)

# 4. Start the Nest API via ts-node. The backend and its @bannersin48/shared
# workspace dependency are consumed from TypeScript source, so the compiled
# `node dist` path cannot resolve the shared package. `start:dev` (ts-node) is
# the documented local run mode (see backend/scripts/smoke.sh).
(
  cd "${REPO_ROOT}/backend"
  PORT="${API_PORT}" npm run start:dev &
  PIDS+=("$!")
)
for i in $(seq 1 60); do
  if curl -sf "${API_URL}/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -sf "${API_URL}/health" >/dev/null 2>&1 || {
  echo "Backend did not become ready on ${API_URL}." >&2
  exit 1
}
echo "Nest API ready on ${API_URL}"

# 5. Build + start the Next frontend without mocks.
# Always rebuild: the existing .next may be an MSW/mock build (the default for
# `npm run e2e`), whose client bundle has NEXT_PUBLIC_ENABLE_MOCKS baked in at
# build time. Reusing it would silently run the browser journey against mocks
# instead of the real backend.
echo "Building the frontend (real API, no mocks)…"
# Clean the previous build first: a stale .next can reference chunk hashes from
# an earlier MSW/mock build, which then 400 on the production server and break
# hydration of the page under test.
rm -rf .next
NEXT_PUBLIC_ENABLE_MOCKS= NEXT_PUBLIC_API_BASE_URL="${API_URL}" \
  NEXT_PUBLIC_COMMERCE_MODE=internal_manual NEXT_PUBLIC_SITE_URL="${FRONTEND_URL}" \
  npm run build
NEXT_PUBLIC_ENABLE_MOCKS= NEXT_PUBLIC_API_BASE_URL="${API_URL}" \
  NEXT_PUBLIC_COMMERCE_MODE=internal_manual NEXT_PUBLIC_SITE_URL="${FRONTEND_URL}" \
  PORT="${FRONTEND_PORT}" npm run start &
PIDS+=("$!")
for i in $(seq 1 90); do
  if curl -sf "${FRONTEND_URL}" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -sf "${FRONTEND_URL}" >/dev/null 2>&1 || {
  echo "Frontend did not become ready on ${FRONTEND_URL}." >&2
  exit 1
}
echo "Frontend ready on ${FRONTEND_URL}"

# 6. Run the release suite.
REAL_API_BASE_URL="${API_URL}" PLAYWRIGHT_BASE_URL="${FRONTEND_URL}" \
  npx playwright test --config=playwright.real.config.ts

echo "── Wave 11 release E2E passed ✅ ──"
