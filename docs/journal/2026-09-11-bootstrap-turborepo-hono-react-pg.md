# Technical Journal: Bootstrap Turborepo Monorepo (Su-Ky)

- **Date**: 2026-09-11
- **Author**: Assistant
- **Skill**: ck:bootstrap

---

## 1. Context & Objectives
- Bootstrap a modern monorepo for "Su-Ky" (Sử Ký — Historical Podcast & Chronicle Platform, WDP301).
- Tech stack: Turborepo 2.x, Bun v1.4.0 (runtime & package manager), Hono v4 backend, React 19 frontend, Prisma ORM + PostgreSQL 17, and Zod shared contracts.
- Specific constraints:
  - Keep frontend minimal as standard scaffolding ("project khung") for the frontend team to build on.
  - Package manager exclusively Bun v1.4.0 with isolated linker.
  - Backend ORM using Prisma.

## 2. Key Technical Decisions & Solutions
1. **Isolated Workspace Linker**:
   - Configured `bunfig.toml` with `linker = "isolated"` and `linkWorkspacePackages = true`.
   - Prevented phantom dependency leaking across monorepo packages.
2. **End-to-End Type Safety via Hono RPC (`hc`)**:
   - `apps/api` chains routes and exports `type AppType = typeof routes` via package.json `./types` subpath.
   - `apps/web` imports `import type { AppType } from "@repo/api/types"` to instantiate `hc<AppType>`.
   - Guaranteed zero runtime code leakage from server into the Vite frontend bundle.
3. **Module Augmentation for Request ID**:
   - Added `declare module "hono" { interface ContextVariableMap { requestId: string; } }` in `requestId.ts`.
   - Eliminated manual type assertions for `c.get("requestId")` across all route handlers.
4. **PostgreSQL & Prisma Lifecycle**:
   - Configured `compose.yaml` with `postgres:17-alpine` container and healthcheck.
   - Initialized `packages/db` with Prisma schema, global singleton client pattern, and seed script containing initial historical periods, flagship series, and book citations (Đại Việt Sử Ký Toàn Thư, Cương Mục).
5. **Frontend Scaffolding**:
   - React 19 + Vite 6 + Tailwind CSS v4 (`@tailwindcss/vite`).
   - Integrated `@tanstack/react-query` and `@tanstack/react-query-devtools`.

## 3. Verification & Metrics
- `bun run check-types`: 5/5 packages passed with zero TypeScript errors.
- `bun test`: 14/14 tests passed (71 assertions) covering healthchecks, CORS preflight, Zod validation errors, and 404/500 handlers.
- `bun run build`: Built production bundles for both backend (`apps/api/dist/index.js`) and frontend (`apps/web/dist`) cleanly.
- Initial commit created on `main`: `7bc4d60`.
