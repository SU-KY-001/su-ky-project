# Tech Stack Specification

- **Project**: Su-Ky Project Monorepo
- **Date**: 2026-09-11
- **Status**: Approved (Auto Workflow)

---

## 1. Core Architecture & Monorepo Engine

| Component | Technology | Version | Purpose & Justification |
| :--- | :--- | :--- | :--- |
| **Runtime & PM** | Bun | `v1.4.0` | High-performance JS/TS runtime, fast package manager, native TypeScript execution without transpilation delay. |
| **Monorepo Build** | Turborepo | `^2.4.0` | Caching build orchestrator, deterministic task dependency graphs (`^build`), environment variable tracking. |
| **Workspace Linker** | Bun Workspaces | `isolated` | Configured in `bunfig.toml` for strict dependency isolation, preventing phantom dependencies across packages. |
| **Type System** | TypeScript | `^5.8.2` | Strict compile-time safety, `verbatimModuleSyntax`, `moduleResolution: bundler`. |

---

## 2. Backend Services (`apps/api`)

| Component | Technology | Version | Purpose & Justification |
| :--- | :--- | :--- | :--- |
| **Web Framework** | Hono | `^4.7.0` | Ultra-lightweight, zero-cold-start web framework built natively for web standards and Bun. |
| **RPC & Type Export** | Hono RPC (`hc`) | `^4.7.0` | Derives complete client typing directly from route definitions (`AppType`), eliminating manual DTO duplication. |
| **Validation** | Zod + `@hono/zod-validator` | `^3.24.2` | Runtime request body/param/query validation with automatic compile-time inference in RPC. |
| **Middleware** | Hono standard middleware | Built-in | Request ID (`X-Request-Id`), structured latency logger, CORS with origin validation, security headers. |
| **Testing** | Bun Test | Built-in | Fast native test runner for route handlers, validation guards, and service logic. |

---

## 3. Frontend Applications (`apps/web`, `apps/mobile`)

| Component | Technology | Version | Purpose & Justification |
| :--- | :--- | :--- | :--- |
| **UI Library** | React | `^19.0.0` | Modern React with Server Actions / Client hooks, concurrent features. |
| **Web styling** | Tailwind CSS + shadcn/ui + Magic UI | Tailwind `^4.1.14`; source-owned components | Tailwind v4 CSS-first styling, shadcn/ui source components, and selected Magic UI registry components in `apps/web`. |
| **Mobile UI & Styling** | Tamagui | `^2.7.7` | Native component and styling system for mobile; root tokens and Metro configuration remain for Expo. |
| **Mobile Runtime** | Expo + React Native | Expo `~57.0.0`, RN `0.86.0` | Expo Router navigation and native runtime, styled through Tamagui and configured with Metro. |
| **Icons** | Lucide React | `^0.475.0` | Consistent, accessible icon set. |
| **Data Fetching** | TanStack Query | `^5.66.0` | Asynchronous cache management, deduplication, optimistic updates, query status management. |
| **API Client** | Hono Client (`hc<AppType>`) | `^4.7.0` | End-to-end typed fetch client connected to backend `AppType`. |

---

## 4. Database & Persistence Layer (`packages/db`)
| **ORM & Query Builder** | Prisma ORM | `^6.4.0` | Production-grade schema modeling, type-safe query client, migrations (`prisma migrate`), and introspection. |
| **Database Driver** | PostgreSQL 18 container | `postgres:18-alpine` | PostgreSQL 18 Alpine containerized via `compose.yaml` with healthcheck. |
| **Migration Tool** | Prisma CLI | `^6.4.0` | `prisma migrate dev`, `prisma db push`, `prisma generate`. |

---

## 5. Monorepo Package Topology

```
su-ky-project/
├── apps/
│   ├── api/                    # Hono backend API
│   │   ├── src/
│   │   │   ├── middleware/     # CORS, error handler, logger, requestId
│   │   │   ├── routes/         # Modular route controllers (health, items, users)
│   │   │   ├── app.ts          # Hono app instance & route chaining
│   │   │   └── index.ts        # Bun server entrypoint
│   │   └── package.json        # Exports "./types": "./src/app.ts"
│   ├── web/                    # React 19 + Vite + Tailwind CSS + shadcn/ui + Magic UI
│   └── mobile/                 # Expo + React Native + Tamagui frontend
│       ├── src/
│       │   ├── lib/            # Hono RPC client (`api`) & Query client
│       │   ├── components/     # Reusable UI components
│       │   ├── App.tsx         # Root application component
│       │   └── main.tsx        # React entrypoint
│       └── package.json
├── packages/
│   ├── db/                     # Database package (@repo/db)
│   │   ├── src/
│   │   │   ├── schema/         # Drizzle schemas
│   │   │   ├── client.ts       # Connection pool & Drizzle instance
│   │   │   └── index.ts
│   │   └── drizzle.config.ts
│   ├── shared/                 # Shared contracts (@repo/shared)
│   │   ├── src/
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   └── types/          # Domain types & constants
│   │   └── package.json
│   └── tsconfig/               # Shared TypeScript configurations (@repo/tsconfig)
│       ├── base.json
│       ├── bun.json
│       └── react.json
├── compose.yaml                # PostgreSQL 17 Docker service
├── bunfig.toml                 # Bun 1.4 workspace settings
├── turbo.json                  # Turborepo 2.x pipeline
└── package.json                # Monorepo root scripts & dev dependencies
```
