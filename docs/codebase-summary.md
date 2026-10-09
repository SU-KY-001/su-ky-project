# Su-Ky Monorepo — Codebase Architecture & Package Summary

> **Comprehensive Codebase Directory, Package Topology, and Contract Specifications**  
> **Repository:** `su-ky-monorepo`  
> **Core Stack:** Turborepo 2.4 + Bun 1.4.0 + Hono 4.7 + React 19 + Prisma 6.4 + PostgreSQL 17  
> **Date:** 2026-09-11 | **Status:** Verified against repository source

---

## 1. Executive Summary

The Su-Ky codebase is an enterprise-grade full-stack TypeScript monorepo architected for speed, modularity, and compile-time contract enforcement. Managed via **Turborepo** with **Bun workspaces**, the repository isolates business domain contracts into reusable packages while keeping application endpoints clean, thin, and declarative.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Turborepo Orchestrator                        │
├────────────────────────────┬───────────────────────────────────────────┤
│        Applications        │                 Packages                  │
│  ┌───────────────────────┐ │ ┌───────────────┐ ┌─────────────────────┐ │
│  │       apps/api        │ │ │packages/shared│ │     packages/db     │ │
│  │ (Hono v4 + Bun + RPC) │ │ │ (Zod & DTOs)  │ │(Prisma 6 + Postgres)│ │
│  └───────────┬───────────┘ │ └───────┬───────┘ └──────────┬──────────┘ │
│              │ AppType               │ Schemas            │ Client     │
│              ▼                       ▼                    │            │
│  ┌───────────────────────┐           │                    │            │
│  │       apps/web        │◄──────────┴────────────────────┘            │
│  │(React 19 + Vite + TQ5)│ ┌─────────────────────────────────────────┐ │
│  └───────────────────────┘ │            packages/tsconfig            │ │
│                            │      (Strict TS 5.8 Base/Bun/React)     │ │
│                            └─────────────────────────────────────────┘ │
└────────────────────────────┴───────────────────────────────────────────┘
```

---

## 2. Directory Tree & File Inventory

Below is the verified inventory of all source, configuration, and infrastructure files:

```
su-ky-project/
├── .env.example                         # Environment variable definitions template
├── .gitignore                           # Git ignore patterns (node_modules, dist, cache)
├── bun.lock                             # Bun lockfile with pinned dependency graph
├── bunfig.toml                          # Bun workspace config with isolated linker
├── compose.yaml                         # Docker Compose service for PostgreSQL 17 Alpine
├── package.json                         # Root package manifest & Turborepo script triggers
├── repomix-output.xml                   # Codebase compaction artifact
├── turbo.json                           # Turborepo task pipeline & cache hashing
│
├── apps/
│   ├── api/                             # Backend API Microservice
│   │   ├── package.json                 # Dependencies: Hono, Zod Validator, @repo/db, @repo/shared
│   │   ├── tsconfig.json                # Extends @repo/tsconfig/bun.json
│   │   └── src/
│   │       ├── index.ts                 # Bun HTTP server entrypoint (listening on PORT)
│   │       ├── app.ts                   # Hono app instance, middleware stack, route mounting
│   │       ├── api.test.ts              # Unit/integration test suite (Bun Test)
│   │       ├── middleware/
│   │       │   ├── cors.ts              # Origin verification with localhost dev allowances
│   │       │   ├── errorHandler.ts      # Structured error normalization (Zod, HTTP, 500)
│   │       │   ├── logger.ts            # High-resolution latency logging (JSON)
│   │       │   └── requestId.ts         # X-Request-Id header propagation / UUID generation
│   │       └── routes/
│   │           ├── health.ts            # /health (System telemetry + PostgreSQL live ping)
│   │           ├── timeline.ts          # /api/timeline (Historical periods + episode counts)
│   │           ├── series.ts            # /api/series (Podcast series catalog & details)
│   │           ├── episodes.ts          # /api/episodes (Zod-validated search, citations, play count)
│   │           └── figures.ts           # /api/figures (Historical figures by dynasty/ID)
│   │
│   └── web/                             # Frontend Single-Page Application
│       ├── index.html                   # HTML entrypoint with font preconnects
│       ├── package.json                 # Dependencies: React 19, TanStack Query, Tailwind, shadcn/ui, Magic UI
│       ├── tsconfig.json                # Extends @repo/tsconfig/react.json
│       ├── vite.config.ts               # Vite 8 config with React & Tailwind CSS v4 plugin
│       └── src/
│           ├── main.tsx                 # React 19 DOM bootstrap with QueryClientProvider
│           ├── App.tsx                  # Dashboard with real-time health checks & timeline demo
│           ├── styles/globals.css       # Tailwind v4 import, design tokens, and global reset
│           └── lib/
│               ├── api.ts               # Type-safe Hono RPC client (`client = hc<AppType>(...)`)
│               └── queryClient.ts       # TanStack Query client configuration with sensible defaults
│
├── packages/
│   ├── db/                              # Persistence Layer Package (@repo/db)
│   │   ├── package.json                 # Dependencies: @prisma/client, prisma, @repo/shared
│   │   ├── tsconfig.json                # Extends @repo/tsconfig/bun.json
│   │   ├── prisma/
│   │   │   └── schema.prisma            # Canonical Prisma schema (5 relational models)
│   │   └── src/
│   │       ├── client.ts                # PrismaClient singleton with globalThis dev reuse
│   │       ├── index.ts                 # Package exports (prisma, PrismaClient, models)
│   │       └── seed.ts                  # Idempotent database seeder with historical data
│   │
│   ├── shared/                          # Universal Contracts & Validation (@repo/shared)
│   │   ├── package.json                 # Dependencies: Zod
│   │   ├── tsconfig.json                # Extends @repo/tsconfig/base.json
│   │   └── src/
│   │       ├── index.ts                 # Package root barrel export
│   │       ├── schemas/
│   │       │   ├── citation.ts          # CitationSchema & CitationDto
│   │       │   ├── figure.ts            # FigureSchema & FigureDto
│   │       │   ├── podcast.ts           # SeriesSchema, EpisodeSchema, EpisodeFilterQuerySchema
│   │       │   └── timeline.ts          # PeriodSchema, CreatePeriodSchema, PeriodDto
│   │       └── types/
│   │           └── index.ts             # ApiResponse<T>, SystemHealthDto interfaces
│   │
│   └── tsconfig/                        # Shared Compiler Settings (@repo/tsconfig)
│       ├── package.json                 # File listings for distribution
│       ├── base.json                    # Strict baseline: ESNext, bundler, verbatimModuleSyntax
│       ├── bun.json                     # Extends base.json with bun-types
│       └── react.json                   # Extends base.json with DOM libs & react-jsx
│
└── docs/                                # Technical Documentation & Architecture
    ├── README.md                        # Master project guide & quickstart (<= 300 LOC)
    ├── codebase-summary.md              # File structure, exports, and package topology
    ├── project-overview-pdr.md          # Product Development Requirements for WDP301
    ├── code-standards.md                # Code discipline, zero `any`, Zod, Hono RPC, Prisma rules
    ├── system-architecture.md           # End-to-end data flow and architectural models
    ├── tech-stack.md                    # Detailed tech stack justification
    ├── design-guidelines.md             # Vietnamese cultural visual language & UI tokens
    ├── project-roadmap.md               # Delivery milestones (P0, P1, P2)
    └── wireframe/
        └── index.html                   # Standalone interactive wireframe demonstration
```

---

## 3. Package Topology & Workspace Deep Dive

### 3.1 Root Workspace (`su-ky-monorepo`)
- **`package.json`**:
  - Enforces `packageManager: "bun@1.4.0"`.
  - Configures workspaces: `apps/*` and `packages/*`.
  - Exposes pipeline scripts: `dev`, `build`, `check-types`, `test`, `clean`, `db:generate`, `db:migrate`, `db:push`, `db:seed`.
- **`bunfig.toml`**:
  - Sets `linker = "isolated"` to prevent phantom dependencies across packages.
  - Enables `linkWorkspacePackages = true` with public hoisting for `@repo/*`.
- **`turbo.json`**:
  - Defines topological build pipeline (`"dependsOn": ["^build"]`).
  - Registers global environment variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `VITE_API_URL`.
- **`compose.yaml`**:
  - Runs container `suky-postgres` using image `postgres:17-alpine`.
  - Configures container healthcheck via `pg_isready -U postgres -d suky_dev`.

---

### 3.2 `@repo/tsconfig` (`packages/tsconfig`)
Provides zero-duplication TypeScript compiler configurations for all monorepo packages.

| File | Extended From | Target / Module | Libs | Distinct Settings |
| :--- | :--- | :--- | :--- | :--- |
| `base.json` | None | `ESNext` / `ESNext` | None | `strict: true`, `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true` |
| `bun.json` | `./base.json` | Inherited | `ESNext` | `types: ["bun-types"]` |
| `react.json`| `./base.json` | Inherited | `DOM`, `DOM.Iterable`, `ESNext` | `jsx: "react-jsx"` |

---

### 3.3 `@repo/shared` (`packages/shared`)
The single source of truth for runtime validation and static TypeScript contracts across frontend and backend.

- **Exports**: `.` points to `./src/index.ts`.
- **Schemas & Inferred DTOs**:
  - `PeriodSchema`: Validates historical eras (id, name, slug, startYear, endYear, description, orderIndex).
  - `CreatePeriodSchema`: Omits `id` for creation operations.
  - `PodcastCategoryEnum`: Strict enum (`quan-su`, `van-hoa`, `nhan-vat`, `dung-nuoc`).
  - `SeriesSchema`: Validates series metadata, title, slug, coverImage, category, and periodId.
  - `EpisodeSchema`: Validates episode duration, audioUrl, transcript, summary, orderNumber, playCount.
  - `EpisodeFilterQuerySchema`: Validates query string params with coercion (`period`, `category`, `search`, `page`, `limit <= 50`).
  - `FigureSchema`: Validates historical figure entries (name, dynasty, birthYear, deathYear, biography, avatarUrl).
  - `CitationSchema`: Validates scholarly references (episodeId, bookTitle, volume, chapter, passage, quote).
- **Core Interfaces (`types/index.ts`)**:
  - `ApiResponse<T>`: Uniform envelope (`success`, `data`, `error: { code, message, details }`, `meta: { requestId, total, page, limit, timestamp }`).
  - `SystemHealthDto`: Health check payload (`status`, `service`, `version`, `runtime`, `bunVersion`, `database`, `uptimeSeconds`, `timestamp`).

---

### 3.4 `@repo/db` (`packages/db`)
Encapsulates PostgreSQL database access, Prisma schema definitions, migrations, and seed scripts.

- **Exports**:
  - `.`: Re-exports `prisma`, `PrismaClient`, and all `@prisma/client` types.
  - `./client`: Direct access to `client.ts`.
- **Prisma Schema (`prisma/schema.prisma`)**:
  - `Period`: 1-to-many with `Series` and `Episode`. Maps to `periods`.
  - `Series`: Belongs to `Period` (`onDelete: SetNull`), 1-to-many with `Episode`. Maps to `series`.
  - `Episode`: Belongs to `Series` (`onDelete: Cascade`) and `Period` (`onDelete: SetNull`), 1-to-many with `Citation`. Maps to `episodes`.
  - `Citation`: Belongs to `Episode` (`onDelete: Cascade`). Maps to `citations`.
  - `Figure`: Standalone historical entity. Maps to `figures`.
- **Singleton Client (`src/client.ts`)**:
  - Binds client to `globalThis.prisma` during non-production runs to prevent connection exhaustion during hot reloading.
  - Configures conditional query/error logging based on `NODE_ENV`.
- **Seeder (`src/seed.ts`)**:
  - Idempotently populates 9 canonical Vietnamese historical periods via `upsert`.
  - Seeds 2 podcast series (*Hành Trình Dựng Nước* and *Những Trận Thủy Chiến Lừng Lẫy Non Sông*).
  - Seeds sample episodes with multi-paragraph timestamped transcripts.
  - Attaches verified scholarly citations (*Đại Việt Sử Ký Toàn Thư*, *Khâm Định Việt Sử Thông Giám Cương Mục*).
  - Seeds historical figures (*Ngô Quyền*, *Trần Hưng Đạo*, *Lý Thường Kiệt*).

---

### 3.5 `@repo/api` (`apps/api`)
Lightweight, zero-cold-start web service built natively on Bun using Hono v4.

- **Exports**:
  - `.`: Points to `./src/index.ts`.
  - `./types`: Points to `./src/app.ts` (exposing `AppType` and `AppEnv` for RPC consumption).
- **Runtime Execution**:
  - `src/index.ts` reads `PORT` (defaults to 3000) and exports Bun server object (`{ port, fetch: app.fetch }`).
- **Middleware Pipeline (`src/app.ts`)**:
  1. `requestId()`: Generates UUID or propagates client `X-Request-Id`. Sets response header.
  2. `requestLogger()`: Measures duration with `performance.now()`. Emits structured JSON logs.
  3. `corsConfig()`: Enforces origin whitelisting (`CORS_ORIGIN`), allows localhost origins during development, exposes `X-Request-Id`.
  4. `errorHandler()`: Normalizes `ZodError` (400), `HTTPException` (400-502), and unhandled runtime errors (500).
- **Route Modules**:
  - `healthRoute` (`GET /health`): Probes PostgreSQL via `prisma.$queryRaw\`SELECT 1\`` with 2000ms timeout race. Returns 200 (ok) or 503 (degraded).
  - `timelineRoute` (`GET /api/timeline`, `GET /api/timeline/:slug`): Retrieves chronological periods with episode counts and related series.
  - `seriesRoute` (`GET /api/series`, `GET /api/series/:slug`): Retrieves series catalog and ordered episode sequences.
  - `episodesRoute`:
    - `GET /api/episodes`: Validated via `zValidator("query", EpisodeFilterQuerySchema)`. Supports full-text title/summary search, era filtering, category filtering, and pagination.
    - `GET /api/episodes/:slug`: Retrieves episode with transcript and ordered citations.
    - `POST /api/episodes/:slug/play`: Atomically increments `playCount` via Prisma `increment: 1`.
  - `figuresRoute` (`GET /api/figures`, `GET /api/figures/:id`): Retrieves historical figures with optional dynasty filter.
- **Automated Test Suite (`src/api.test.ts`)**:
  - Executes with Bun Test (`bun test`).
  - Validates healthcheck response envelope, custom request ID preservation, CORS preflight headers, 400 validation boundaries (invalid query parameters), 404 error envelopes, and `onError` exception handling.

---

### 3.6 `@repo/web` (`apps/web`)
React 19 single-page application bundled with Vite 8 and styled with Tailwind CSS v4, source-owned shadcn/ui components, and selected Magic UI components. The root Tamagui config remains for the Expo mobile app through Metro.

- **RPC Client (`src/lib/api.ts`)**:
  - Creates type-safe client: `client = hc<AppType>(import.meta.env.VITE_API_URL || "http://localhost:3000")`.
  - Client has complete type knowledge of all backend route paths, parameters, queries, and return schemas without any manual interface declarations.
- **Query Cache (`src/lib/queryClient.ts`)**:
  - Initialized with `staleTime: 1000 * 60` (1 minute) and `retry: 1`.
- **Application Views (`src/App.tsx`)**:
  - Live system health telemetry monitor (polling `/health` via RPC every 10 seconds).
  - Dynamic display of historical periods retrieved from `client.api.timeline.$get()`.
  - Architectural guidance cards for the development team.
  - Sticky bottom audio player dock placeholder.

---

## 4. Cross-Package Import Contracts & Matrix

The matrix below illustrates dependencies and consumption boundaries:

| Consumer Workspace | `@repo/tsconfig` | `@repo/shared` | `@repo/db` | `@repo/api` | External Core Dependencies |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`packages/shared`** | Extends `base.json` | — | — | — | `zod` |
| **`packages/db`** | Extends `bun.json` | Imports DTOs/enums | — | — | `@prisma/client`, `prisma` |
| **`apps/api`** | Extends `bun.json` | Imports schemas & DTOs | Imports `prisma` | — | `hono`, `@hono/zod-validator`, `zod` |
| **`apps/web`** | Extends `react.json`| Imports DTOs/enums | — | Imports `AppType` (dev) | `react`, `react-dom`, `@tanstack/react-query`, `tailwindcss`, shadcn/ui source components |

---

## 5. Environment Variables & Runtime Parameters

| Variable | Target Workspace | Default in `.env.example` | Production Usage |
| :--- | :--- | :--- | :--- |
| `PORT` | `apps/api` | `3000` | Port on which the Bun HTTP server listens. |
| `DATABASE_URL` | `packages/db`, `apps/api` | `postgresql://postgres:postgres@localhost:5432/suky_dev` | Connection string for PostgreSQL database instance. |
| `CORS_ORIGIN` | `apps/api` | `http://localhost:5173` | Allowed origin header for cross-origin browser requests. |
| `VITE_API_URL` | `apps/web` | `http://localhost:3000` | Base URL used by `hc<AppType>` RPC client. |
| `NODE_ENV` | Global | `development` | Dictates logging verbosity, Prisma client pooling, and stack traces. |
