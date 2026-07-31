# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build Angular SSR production bundle
# Build context is the project root (see docker-compose.yml).
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# App source
COPY . .

# Backend API URL baked into the production environment at build time.
# Browser calls this host (use host machine IP/hostname if backend is not on the same machine).
ARG API_BASE_URL=http://localhost:3000
RUN sed -i "s|apiBaseUrl: '.*'|apiBaseUrl: '${API_BASE_URL}'|g" \
    src/environment/environment.production.ts \
    src/environment/environment.ts

# Production build (SSR + browser)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — runtime (Node + Express SSR server)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Production dependencies only (Express / SSR runtime if not fully bundled)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built app from the build stage
COPY --from=build /app/dist ./dist

# Non-root user for safer runtime
RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/ >/dev/null 2>&1 || exit 1

# Angular SSR entry (see package.json "serve:ssr:khata-frontend")
CMD ["node", "dist/khata-frontend/server/server.mjs"]
