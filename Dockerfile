# syntax=docker/dockerfile:1.7

ARG BUN_IMAGE=oven/bun:1.4.2-debian

# ---------- dependencies ----------
FROM ${BUN_IMAGE} AS deps
WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/ \
    TURBO_TELEMETRY_DISABLED=1
# Use the npmmirror registry for both npm and Bun.
RUN printf 'registry=https://registry.npmmirror.com/\n' > /root/.npmrc \
 && printf '[install]\nregistry = "https://registry.npmmirror.com"\n' > /root/.bunfig.toml
COPY package.json bun.lock ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
# --ignore-scripts skips the root postinstall (turbo build) until the sources exist.
RUN bun install --frozen-lockfile --ignore-scripts

# ---------- build ----------
FROM deps AS build
COPY . .
ENV NODE_ENV=production \
    CI=1 \
    TURBO_TELEMETRY_DISABLED=1
# Baked into the client bundle by Vite at build time. Empty means same-origin.
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN bun run build

# ---------- runtime ----------
FROM ${BUN_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["bun", "run", "server/src/index.ts"]
