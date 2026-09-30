# Banners In 48 API image.
#
# Build context is the REPOSITORY ROOT (the backend depends on the
# @bannersin48/shared workspace package):
#
#   docker build -f backend/Dockerfile -t bannersin48-api .
#
# Stages:
#   build      full install (dev deps), prisma generate, compile backend + shared
#   prod-deps  production-only node_modules (lockfile-verified, no install scripts)
#              + the generated Prisma client + the Prisma CLI (for `migrate deploy`)
#   runtime    minimal image, runs as the non-root `node` user (uid 1000)
#
# The same image serves two compose services:
#   api      node dist/src/main.js
#   migrate  node /app/node_modules/prisma/build/index.js migrate deploy

# Pinned by version AND digest (multi-arch index). Bump both together:
#   docker buildx imagetools inspect node:24-bookworm-slim
ARG NODE_IMAGE=node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
# openssl: Prisma detects libssl to pick its engine build (debian-openssl-3.0.x).
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app

# Every workspace manifest is needed so `npm ci` can verify package-lock.json,
# even though only the backend (and its shared dependency) is installed.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY frontend/package.json frontend/

# ---------------------------------------------------------------------------
FROM manifests AS build
# Install scripts run here, subject to the root package.json `allowScripts`
# allowlist (npm >= 11): @prisma/engines downloads and checksums the engines.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w backend --include-workspace-root

COPY packages/shared/ packages/shared/
COPY backend/ backend/

# 1. Prisma client (+ query engine) into node_modules/.prisma/client. The CLI
#    also fetches any engine an install script did not. The runtime containers
#    have no internet access, so fail the build if an engine is missing.
RUN node node_modules/prisma/build/index.js generate --schema backend/prisma/schema.prisma \
 && ls node_modules/@prisma/engines/schema-engine-* \
       node_modules/.prisma/client/libquery_engine-*.so.node >/dev/null

# 2. Backend -> backend/dist/src/main.js (and dist/prisma/seed.js)
RUN npm run build -w backend \
 && test -f backend/dist/src/main.js

# 3. @bannersin48/shared is consumed as TypeScript source in dev (main: src/index.ts).
#    Node cannot run that, so compile it to CommonJS for the image only and point
#    its package.json at the output. The repository files are not changed.
#    (node16 emits CommonJS here because the package has no "type": "module".)
RUN node_modules/.bin/tsc \
      --outDir packages/shared/dist --rootDir packages/shared/src \
      --module node16 --moduleResolution node16 --target ES2022 \
      --strict --esModuleInterop --skipLibCheck --declaration false \
      packages/shared/src/index.ts \
 && node -e ' \
      const fs = require("fs"); \
      const p = JSON.parse(fs.readFileSync("packages/shared/package.json", "utf8")); \
      p.main = "./dist/index.js"; p.exports = { ".": "./dist/index.js" }; \
      delete p.types; delete p.scripts; delete p.devDependencies; \
      fs.writeFileSync("/tmp/shared-package.json", JSON.stringify(p, null, 2) + "\n");' \
 && node -e 'require("/app/packages/shared/dist/index.js")'

# 4. The Prisma CLI is a devDependency. Collect exactly the lockfile-installed
#    `prisma` package and its dependency closure (incl. @prisma/engines with the
#    schema engine) so the runtime image can run `migrate deploy` offline.
RUN npm query '#prisma, #prisma *' \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const l=[...new Set(JSON.parse(s).map(n=>n.location))];if(!l.includes("node_modules/prisma"))process.exit(1);console.log(l.join("\n"))})' \
      > /tmp/prisma-cli.txt \
 && tar -cf /tmp/prisma-cli.tar -T /tmp/prisma-cli.txt

# ---------------------------------------------------------------------------
FROM manifests AS prod-deps
# --ignore-scripts: nothing in the production tree needs an install script
# (the Prisma client is generated in `build` and copied below).
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w backend --omit=dev --ignore-scripts \
 && mkdir -p backend/node_modules
# `npm ci --omit=dev -w` still leaves some dev-only packages of other workspaces
# (e.g. typescript). Remove every top-level package that is not in the backend's
# production tree, then prove each declared dependency still resolves.
RUN (npm ls -w backend --omit=dev --all --parseable || true) > /tmp/needed.txt \
 && node -e ' \
      const fs = require("fs"), path = require("path"); \
      const need = new Set(fs.readFileSync("/tmp/needed.txt", "utf8").split("\n").filter(Boolean).map(p => path.relative("/app", p))); \
      if (!need.has("node_modules/@prisma/client")) { console.error("npm ls output looks wrong"); process.exit(1); } \
      for (const e of fs.readdirSync("node_modules")) { \
        if (e.startsWith(".")) continue; \
        const names = e.startsWith("@") ? fs.readdirSync("node_modules/" + e).map(s => e + "/" + s) : [e]; \
        for (const n of names) if (!need.has("node_modules/" + n)) { fs.rmSync("node_modules/" + n, { recursive: true, force: true }); console.log("pruned", n); } \
      }' \
 && rm -rf node_modules/.bin /tmp/needed.txt \
 && node -e ' \
      const fs = require("fs"); \
      for (const d of Object.keys(require("./backend/package.json").dependencies)) \
        if (![`backend/node_modules/${d}`, `node_modules/${d}`].some(p => fs.existsSync(p + "/package.json"))) { console.error("missing", d); process.exit(1); }'
COPY --from=build /app/node_modules/.prisma/ node_modules/.prisma/
COPY --from=build /tmp/prisma-cli.tar /tmp/prisma-cli.tar
RUN tar -xf /tmp/prisma-cli.tar && rm /tmp/prisma-cli.tar \
 && test -f node_modules/prisma/build/index.js

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="bannersin48-api" \
      org.opencontainers.image.source="https://github.com/ELDIABLO2020/bannersin48" \
      org.opencontainers.image.revision="${GIT_SHA}"

# NO_COLOR: plain Nest log lines (no ANSI escapes) in `docker logs`.
ENV NODE_ENV=production \
    PORT=3001 \
    NO_COLOR=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_CACHE=/tmp/.npm \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    GIT_SHA=${GIT_SHA}

# Application files are owned by root and read-only for the `node` user.
WORKDIR /app
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules/ ./node_modules/
# Dependencies npm could not hoist (version conflicts with other workspaces) live
# here; the prod-deps check above accepts them, so the runtime must have them too.
COPY --from=prod-deps /app/backend/node_modules/ ./backend/node_modules/
COPY --from=build /tmp/shared-package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist/ ./backend/dist/
COPY --from=build /app/backend/prisma/schema.prisma ./backend/prisma/schema.prisma
COPY --from=build /app/backend/prisma/migrations/ ./backend/prisma/migrations/

WORKDIR /app/backend
USER node
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "dist/src/main.js"]
