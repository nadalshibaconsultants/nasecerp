# Multi-stage build for the Vite SPA → nginx static host with reverse proxy.
FROM node:20-alpine AS builder
WORKDIR /app

# Install root deps (frontend) — legacy-peer-deps mirrors local dev
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Build the SPA. VITE_API_BASE_URL is "/api/v1" so the frontend talks to the
# same origin and nginx proxies it onward to the api container.
ENV VITE_API_BASE_URL=/api/v1
COPY tsconfig.json tsconfig.node.json vite.config.ts components.json ./
COPY client ./client
COPY shared ./shared
RUN npm run build:client

# Runtime stage — tiny nginx with the built dist + our config
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/public /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q --spider http://127.0.0.1/healthz || exit 1
