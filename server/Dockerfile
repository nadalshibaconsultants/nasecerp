# API server. Runs via tsx so TypeScript ESM is loaded directly — no tsc build
# step, no transpiled dist. Keeps schema import paths consistent across runtime
# and drizzle-kit tooling. For a service this size the tsx overhead is fine.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Wget for healthchecks
RUN apk add --no-cache wget

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY scripts ./scripts

# Storage volume for local file driver (overridden when STORAGE_DRIVER=s3)
RUN mkdir -p /data/files && chown -R node:node /data/files /app
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -q --spider http://localhost:4000/health || exit 1

# Apply migrations + RLS on container start, then launch the API.
CMD sh -c "npx tsx src/db/migrate.ts && npx tsx src/index.ts"
