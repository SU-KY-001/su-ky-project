# Su-Ky (Sử Ký) — Vietnamese History Podcast & Interactive Chronicle

> **WDP301 Capstone Project Monorepo**  
> An educational, audio-first historical platform connecting young Vietnamese audiences (18–34) with 4,000 years of national history through interactive timelines, podcast series, and verified scholarly citations.

---

## 1. System Overview & Tech Stack

Su-Ky is organized as a high-performance TypeScript monorepo powered by **Turborepo** and **Bun v1.4.0**, delivering end-to-end type safety from database models to frontend components.

```
PostgreSQL 17 ──> Prisma ORM ──> Hono v4 (Bun) ──[hc RPC]──> React 19 + TanStack Query
```

| Domain | Technology | Version | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **Runtime & PM** | [Bun](https://bun.sh) | `v1.4.0` | High-speed JavaScript runtime, package manager, and test runner |
| **Monorepo Engine**| [Turborepo](https://turbo.build) | `^2.4.4` | Pipeline orchestration, task hashing, and build caching |
| **Backend API** | [Hono](https://hono.dev) | `^4.7.2` | Lightweight web framework on Bun, providing typed RPC routes |
| **Frontend Web** | [React](https://react.dev) | `^19.0.0` | Single-page UI with concurrent rendering and modern hooks |
| **Web Bundler** | [Vite](https://vite.dev) | `^8.3.3` | Fast ESM development server and production bundler with the Tailwind CSS v4 Vite plugin |
| **Web UI & Styling** | [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Magic UI](https://magicui.design) | Tailwind `^4.1.14` | CSS-first web styling with source-owned shadcn/ui components and selected Magic UI registry components |
| **Mobile UI & Styling** | [Tamagui](https://tamagui.dev) | `^2.7.7` | Native component and styling system for mobile; shared root tokens/themes remain for Expo/Metro |
| **Mobile Runtime** | [Expo](https://expo.dev) + React Native | `~57.0.0` + `0.86.0` | Native app runtime and Expo Router, styled with Tamagui through Metro |
| **State & Cache** | [TanStack Query](https://tanstack.com/query) | `^5.66.0` | Asynchronous server-state caching, deduping, and refetching |
| **Database ORM** | [Prisma ORM](https://www.prisma.io) | `^6.4.1` | Schema modeling, PostgreSQL migration management, and type-safe client |
| **Database** | [PostgreSQL](https://www.postgresql.org) | `17-alpine` | Relational store for periods, series, episodes, citations, and figures |
| **Validation** | [Zod](https://zod.dev) | `^3.24.2` | Runtime schema validation and compile-time DTO type inference |

---

## 2. Monorepo Package Topology

```
su-ky-project/
├── apps/
│   ├── api/             # Hono v4 API service running on Bun (Port 3005)
│   │   ├── src/app.ts   # Hono app instance & chained RPC routes
│   │   ├── src/index.ts # Bun HTTP server entrypoint
│   │   └── src/routes/  # Modular route controllers: health, timeline, series, episodes, figures
│   ├── web/             # React 19 + Vite 8 + Tailwind CSS + shadcn/ui + Magic UI client application
│   └── mobile/          # Expo 57 + React Native + Tamagui client application
│       ├── src/lib/api.ts         # Type-safe RPC client (hc<AppType>)
│       ├── src/lib/queryClient.ts # TanStack Query client instance
│       └── src/App.tsx            # Interactive starter dashboard & health monitor
├── packages/
│   ├── db/              # Database persistence layer (@repo/db)
│   │   ├── prisma/schema.prisma  # Canonical relational database schema
│   │   ├── src/client.ts         # PrismaClient singleton with connection pooling
│   │   └── src/seed.ts           # Historical seed data generator
│   ├── shared/          # Shared contracts, DTOs, and schemas (@repo/shared)
│   │   ├── src/schemas/          # Zod validation schemas (timeline, podcast, figure, citation)
│   │   └── src/types/            # ApiResponse<T>, SystemHealthDto, and domain types
│   └── tsconfig/        # Shared TypeScript configs (@repo/tsconfig)
│       ├── base.json    # Strict TypeScript 5.8 baseline (bundler resolution, verbatimModuleSyntax)
│       ├── bun.json     # Extension for Bun server runtimes
│       └── react.json   # Extension for React JSX runtimes
├── compose.yaml         # Docker Compose configuration for PostgreSQL 17
├── turbo.json           # Turborepo task pipeline definition
└── bunfig.toml          # Bun workspace linker configuration (isolated linker)
```

---

## 3. Prerequisites

Ensure the following tools are installed on your host machine:

- **Bun**: `>= 1.4.0` ([Installation instructions](https://bun.sh/docs/installation))
- **Docker & Docker Compose**: For running the PostgreSQL 17 container
- **Node.js**: `>= 20.0.0` (Optional, for compatible tooling)

---

## 4. Quickstart Guide

Follow these steps to bootstrap the entire monorepo from scratch:

### Step 1: Install Dependencies
```bash
bun install
```
*Uses Bun's isolated workspace linker to install dependencies across all apps and packages.*

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```
Default local variables configured in `.env.example`:
```env
PORT=3005
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/suky_dev
CORS_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3005
BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VITE_API_URL=http://localhost:3005
```

### Step 3: Start PostgreSQL Container
```bash
docker compose up -d
```
*Launches `suky-postgres` on port `5432` with automated healthcheck (`pg_isready`).*

### Step 4: Generate Prisma Client & Push Schema
```bash
bun run db:generate
bun run db:push
```
*Generates TypeScript client bindings into `node_modules/@prisma/client` and synchronizes tables with PostgreSQL.*

### Step 5: Seed Historical Data
```bash
bun run db:seed
```
*Populates 9 historical periods, flagship series, sample episodes with transcripts, citations, and historical figures.*

### Step 6: Start All Applications in Development Mode
```bash
bun run dev
```
*Runs `apps/api` (with hot reloading via `bun --watch`) and `apps/web` (via Vite HMR) concurrently.*

- **Web Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3005](http://localhost:3005)
- **API Healthcheck**: [http://localhost:3005/health](http://localhost:3005/health)

---

## 5. Backend Authentication

The API uses Better Auth with PostgreSQL/Prisma sessions:

- Email/password: `POST /api/auth/sign-up/email` and `POST /api/auth/sign-in/email`
- Google OAuth: `POST /api/auth/sign-in/social` with `{ "provider": "google" }`
- Sign out and session lookup: `POST /api/auth/sign-out` and `GET /api/auth/get-session`
- Current user: `GET /api/me` (requires a valid session cookie or Bearer token)
- Admin check: `GET /api/admin` (Admin only)

Set `BETTER_AUTH_SECRET` to a persistent random secret in all environments. Google sign-in is enabled when both Google credentials are configured; set the Google OAuth callback URL to `http://localhost:3005/api/auth/callback/google` for local development. `CORS_ORIGIN` accepts a comma-separated list of frontend origins.

New registrations receive the default `user` role. Only admins can change roles or manage users through Better Auth's `/api/auth/admin/*` endpoints. Bootstrap the first admin using Better Auth's CLI after applying the schema, for example:

```bash
bun x auth@latest create-admin --email admin@example.com --name "Su-Ky Admin" --role admin
```

Apply the updated authentication tables using `bun run db:push` after `bun run db:generate`.

---

## 6. Command Reference

All root commands are coordinated via Turborepo (`turbo.json`) and run across matching workspaces.

| Command | Action | Workspaces Involved |
| :--- | :--- | :--- |
| `bun install` | Installs dependencies with strict isolation | Root & all workspaces |
| `docker compose up -d` | Launches PostgreSQL 17 daemon | Docker daemon |
| `bun run dev` | Runs API (`:3005`) and Web (`:5173`) in dev mode | `apps/api`, `apps/web` |
| `bun run build` | Compiles packages and production bundles | All workspaces (`^build`) |
| `bun run check-types` | Executes `tsc --noEmit` across all packages | All workspaces (`^build`) |
| `bun test` | Runs unit & integration tests using Bun Test | `apps/api` |
| `bun run db:generate` | Generates Prisma client types from schema | `packages/db` |
| `bun run db:migrate` | Runs database migrations interactively | `packages/db` |
| `bun run db:push` | Synchronizes Prisma schema directly to DB | `packages/db` |
| `bun run db:seed` | Seeds initial historical periods & episodes | `packages/db` |
| `bun run clean` | Purges build artifacts and node_modules | Root & all workspaces |

---

## 6. Architecture & Data Flow

```
[ PostgreSQL 17 Container ]
         │ (Connection Pool: 5432)
         ▼
[ packages/db (@repo/db) ]
   └── PrismaClient (Singleton, Type-safe CRUD)
         │
         ▼
[ apps/api (@repo/api) ]
   ├── Middleware: X-Request-Id, Logger, CORS, Error Handler
   ├── Zod Validation: Query, Param, Body (@repo/shared)
   └── Route Controllers: /health, /api/timeline, /api/series, /api/episodes, /api/figures
         │
         ▼ (Type Export: AppType)
[ apps/web (@repo/web) ]
   ├── Client: hc<AppType>(VITE_API_URL)
   ├── Cache: TanStack Query (@tanstack/react-query)
   └── Views: React 19 UI (Tailwind CSS + shadcn/ui + Magic UI)
```

1. **Request Lifecycle**: Every HTTP request receives a unique `X-Request-Id` (propagated to responses and structured logs).
2. **End-to-End Type Safety**: The web frontend imports `AppType` from `@repo/api/types`. The Hono RPC client (`hc<AppType>`) provides autocomplete and parameter validation for every endpoint without manual DTO mapping.
3. **Consistent Error Envelope**: All API errors return a uniform format:
   ```json
   {
     "success": false,
     "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} },
     "meta": { "requestId": "uuid", "timestamp": "ISO8601" }
   }
   ```

---

## 7. REST & RPC API Endpoints

| Method | Endpoint | Description | Validation / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System and PostgreSQL status check | None (returns `SystemHealthDto`) |
| `GET` | `/api/timeline` | List all historical periods in chronological order | None |
| `GET` | `/api/timeline/:slug` | Retrieve single period with related series and episodes | `slug` param |
| `GET` | `/api/series` | List podcast series with episode counts | None |
| `GET` | `/api/series/:slug` | Retrieve series details with ordered episode list | `slug` param |
| `GET` | `/api/episodes` | Filter and paginate podcast episodes | `period`, `category`, `search`, `page`, `limit` |
| `GET` | `/api/episodes/:slug` | Retrieve full episode with transcript and citations | `slug` param |
| `POST`| `/api/episodes/:slug/play`| Atomically increment play counter | `slug` param |
| `GET` | `/api/figures` | List historical figures with optional dynasty filter | `dynasty` query param |
| `GET` | `/api/figures/:id` | Retrieve single historical figure dossier | `id` param |

---

## 8. Documentation Index

For detailed architectural specifications, standards, and requirements, refer to:

- [Codebase Summary](./codebase-summary.md) — Comprehensive directory tree, exports, and package topology.
- [Product Development Requirements (PDR)](./project-overview-pdr.md) — Problem statement, target audience (18-34), 2-axis matrix, flagship series, and citations.
- [Code Standards](./code-standards.md) — Bun 1.4 conventions, TypeScript rules (no `any`), Zod schemas, and Prisma discipline.
- [System Architecture](./system-architecture.md) — In-depth architectural diagrams, sequence flows, and infrastructure models.
- [Design Guidelines](./design-guidelines.md) — Vietnamese cultural visual language, color tokens, and typography specifications.
- [Script Workflow API](./api-docs/script-workflow-api.md) — REST contract, schemas and error codes for the AI script workflow.
- [Script Workflow UX](./ux/script-workflow-ux.md) — Screens, states and behaviour for the script workflow frontend.
- [Interactive Wireframe](./wireframe/index.html) — Standalone prototype showcasing the timeline, audio dock, and chronicle views.
