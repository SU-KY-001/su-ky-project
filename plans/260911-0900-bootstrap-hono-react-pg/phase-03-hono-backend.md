# Phase 3: Hono Backend Service (`apps/api`)

## Goal
Build a high-performance, type-safe REST & RPC API backend using Hono v4 running natively on Bun v1.4.

## Files to Create
1. `apps/api/package.json`:
   - Name: `@repo/api`
   - Dependencies: `hono`, `@hono/zod-validator`, `@repo/shared`, `@repo/db`, `postgres`
   - Exports: `".": "./src/index.ts"`, `"./types": "./src/app.ts"`
2. `apps/api/tsconfig.json`:
   - Extends `@repo/tsconfig/bun.json`
3. `apps/api/src/middleware/`:
   - `requestId.ts`: Context request ID injection.
   - `logger.ts`: Structured latency and status logger.
   - `cors.ts`: Configurable CORS handler.
   - `errorHandler.ts`: Centralized error envelope `{ success: false, error: ... }`.
4. `apps/api/src/routes/`:
   - `health.ts`: System healthcheck (Bun v1.4.0 runtime info, database ping, timestamp).
   - `timeline.ts`: GET `/api/timeline` — list historical eras and periods.
   - `series.ts`: GET `/api/series` — list podcast series.
   - `episodes.ts`: GET `/api/episodes` & GET `/api/episodes/:slug` — list & detail with citations and transcript.
   - `figures.ts`: GET `/api/figures` — list historical figures.
5. `apps/api/src/app.ts`:
   - Route chaining for RPC type inference:
   ```typescript
   export const app = new Hono()
     .use('*', requestId())
     .use('*', logger())
     .use('*', corsMiddleware());
   export const routes = app
     .route('/health', healthRoute)
     .route('/api/timeline', timelineRoute)
     .route('/api/series', seriesRoute)
     .route('/api/episodes', episodesRoute)
     .route('/api/figures', figuresRoute);
   export type AppType = typeof routes;
   ```
6. `apps/api/src/index.ts`:
   - Bun entrypoint: `export default { port: Number(process.env.PORT || 3000), fetch: app.fetch }`.
7. `apps/api/src/api.test.ts`:
   - Bun test suite verifying health endpoint and route contracts.

## Verification
- `bun test` in `apps/api` passes 100%.
