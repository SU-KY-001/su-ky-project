# Phase 2: Shared Contracts & Database Layer

## Goal
Build `@repo/shared` for cross-boundary Zod schemas and `@repo/db` for PostgreSQL schema, migrations, connection pool, and seed data.

## Packages & Files to Create
1. `packages/shared`:
   - `package.json`: Private workspace module exporting `./src/index.ts`
   - `tsconfig.json`: Extends `@repo/tsconfig/base.json`
   - `src/schemas/timeline.ts`: Zod schemas for Timeline Period, Era.
   - `src/schemas/podcast.ts`: Zod schemas for Series, Episode, Category.
   - `src/schemas/figure.ts`: Zod schemas for Historical Figure.
   - `src/schemas/citation.ts`: Zod schemas for Historical Citations.
   - `src/index.ts`: Central barrel export.

2. `packages/db`:
   - `package.json`: Private workspace module exporting `.`, `./schema`, `./client`
   - `tsconfig.json`: Extends `@repo/tsconfig/bun.json`
   - `drizzle.config.ts`: Drizzle Kit configuration pointing to `src/schema/index.ts`
   - `src/schema/index.ts`: Consolidates all tables:
     - `periodsTable`: id, name, slug, startYear, endYear, description, orderIndex
     - `seriesTable`: id, title, slug, description, coverImage, eraId, category, createdAt
     - `episodesTable`: id, seriesId, periodId, title, slug, audioUrl, durationSeconds, transcript, summary, orderNumber, playCount, publishedAt
     - `figuresTable`: id, name, dynasty, birthYear, deathYear, biography, avatarUrl
     - `citationsTable`: id, episodeId, bookTitle, volume, chapter, passage, quote
   - `src/client.ts`: Singleton Drizzle client instance via `postgres.js` with pooling.
   - `src/seed.ts`: Seed initial flagship series ("Hành Trình Dựng Nước") and historical data.
   - `src/index.ts`: Re-exports `db`, tables, and types.

## Verification
- `bun run --filter @repo/shared build` / type checks pass.
- Schema exports match types.
