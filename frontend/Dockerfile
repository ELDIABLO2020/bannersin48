# Banners In 48 storefront image (Next.js standalone server).
#
# Build context is the REPOSITORY ROOT (the frontend depends on the workspace
# packages under packages/):
#
#   docker build -f frontend/Dockerfile -t bannersin48-web \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com .
#
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`, so
# changing one means rebuilding the image (deploy.sh does this every deploy).
#
# Stages:
#   build    full install, build the workspace packages + `next build`
#   runtime  .next/standalone + static assets, runs as the non-root `node` user

# Same pinned Node image as backend/Dockerfile. Bump both together:
#   docker buildx imagetools inspect node:24-bookworm-slim
ARG NODE_IMAGE=node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Every workspace manifest is needed so `npm ci` can verify package-lock.json,
# even though the backend is not installed.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY frontend/package.json frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w @bannersin48/frontend -w @bannersin48/shared -w @bannersin48/api-client \
      -w @bannersin48/design-tokens --include-workspace-root

COPY packages/ packages/
COPY frontend/ frontend/

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_COMMERCE_MODE=internal_manual
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" && test -n "$NEXT_PUBLIC_SITE_URL" \
 || { echo "NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_SITE_URL build args are required" >&2; exit 1; }
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_COMMERCE_MODE=${NEXT_PUBLIC_COMMERCE_MODE}

# Root `build` = workspace packages, then the frontend (its prebuild runs the
# commerce/content validators). Tracing from the repo root nests the app at
# .next/standalone/frontend/.
RUN npm run build \
 && test -f frontend/.next/standalone/frontend/server.js \
 && node -e 'require.resolve("sharp", { paths: ["frontend/.next/standalone/frontend"] })'

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="bannersin48-web" \
      org.opencontainers.image.source="https://github.com/ELDIABLO2020/bannersin48" \
      org.opencontainers.image.revision="${GIT_SHA}"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    GIT_SHA=${GIT_SHA}

# Application files are owned by root and read-only for the `node` user. The
# image-optimizer cache (.next/cache) is a tmpfs in docker-compose.prod.yml.
WORKDIR /app
COPY --from=build /app/frontend/.next/standalone/ ./
COPY --from=build /app/frontend/.next/static/ ./frontend/.next/static/
COPY --from=build /app/frontend/public/ ./frontend/public/

WORKDIR /app/frontend
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "server.js"]
