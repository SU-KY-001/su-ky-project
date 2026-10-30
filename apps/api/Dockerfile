# Build context = repo root:  docker build --no-cache -f apps/api/Dockerfile -t lgdlong/suky-api:latest .
# One image runs the HTTP API (default CMD) and the release worker (`bun src/worker.ts`).
ARG BUN_VERSION=1.4.4

# turbo prune keeps only @repo/api and its workspace deps, so web/mobile deps are never installed.
FROM oven/bun:${BUN_VERSION}-slim AS prune
WORKDIR /app
COPY . .
RUN bunx turbo@2.10.12 prune @repo/api --docker

FROM oven/bun:${BUN_VERSION}-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --filter @repo/api
COPY --from=prune /app/out/full/ ./
# Prisma Client is generated from schema.prisma; migrate needs the schema engine too, so fetch both now (no download at deploy time).
RUN cd packages/db && bun run db:generate && ./node_modules/.bin/prisma version

FROM oven/bun:${BUN_VERSION}-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build --chown=bun:bun /app /app
USER bun
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch(`http://localhost:${process.env.PORT ?? 3005}/health`); process.exit(r.ok ? 0 : 1)"]
CMD ["bun", "src/index.ts"]
