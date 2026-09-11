# Technical Report: Turborepo + Bun 1.4 Architecture & Workspace Configuration
- Date: 2026-09-11
- Target: Turborepo 2.x + Bun 1.4 Monorepo Architecture

## 1. Executive Summary & Architectural Fit
- **Stack**: Turborepo 2.x, Bun v1.4.0 (`isolated` linker), Hono v4 (backend runtime), React 19 + Vite (frontend), Drizzle ORM.
- **Philosophy**: Zero-boilerplate JIT package sharing, strict boundary encapsulation, end-to-end type safety via Hono RPC (`hc<AppType>`).
- **Fit**: Bun 1.4 executes TS natively in backend/packages; Vite transpiles TS JIT for frontend. Eliminates build-before-run steps for internal packages.

## 2. Monorepo Directory Structure
```
├── apps/
│   ├── api/              # Hono v4 API server (Bun runtime; exports type AppType)
│   └── web/              # React 19 + Vite + Tailwind v4 frontend
├── packages/
│   ├── db/               # Drizzle ORM schema, client, drizzle-kit migrations
│   ├── shared/           # Pure TS domain types, Zod DTO validation schemas
│   └── tsconfig/         # Shared configs: base.json, bun.json, react.json
├── bunfig.toml           # Bun 1.4 workspace, linker, & hoist settings
├── package.json          # Root workspace definition & lifecycle scripts
└── turbo.json            # Turborepo 2.x pipeline & caching rules
```

## 3. Package Management & Configuration Snippets

### `bunfig.toml` (Bun 1.4 Optimized)
```toml
[install]
linker = "isolated"            # Strict dependency isolation (prevents phantom deps)
linkWorkspacePackages = true   # Auto-symlink internal workspace packages
publicHoistPattern = ["@repo/*"]
```

### Root `package.json`
```json
{
  "name": "root",
  "private": true,
  "packageManager": "bun@1.4.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "check-types": "turbo check-types",
    "clean": "turbo clean && rm -rf node_modules apps/*/node_modules packages/*/node_modules"
  },
  "devDependencies": {
    "turbo": "^2.9.16",
    "typescript": "^5.8.2"
  }
}
```

### Root `turbo.json` (Turborepo 2.x Schema)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "PORT", "DATABASE_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "check-types": {
      "dependsOn": ["^build"]
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

### Shared Package Linking (`packages/shared/package.json`)
```json
{
  "name": "@repo/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*"
  }
}
```

### Type-Safe Base Preset (`packages/tsconfig/base.json`)
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

## 4. Dev Tooling & Pipelines
- **Development (`bun run dev`)**: Launches `turbo dev`. Parallel persistent runners: `apps/api` runs `bun --watch src/index.ts`, `apps/web` runs `vite`.
- **Environment Management**: Turborepo strict env hashing tracks `globalEnv` (`DATABASE_URL`, `PORT`, `NODE_ENV`). Bun natively loads `.env` and `.env.local` without `dotenv` in `apps/api`. Vite loads `VITE_*` in `apps/web`.
- **Hono RPC Integration**: `apps/api/package.json` exposes `"exports": { "./types": "./src/index.ts" }`. `apps/web` imports `import type { AppType } from "@repo/api/types"`. Zero server runtime bundle leakage into client.

## 5. Pitfalls to Avoid with Bun 1.4 in Turborepo
1. **Lockfile Desync (`bun.lock` vs `bun.lockb`)**: Bun 1.2+ uses text-format `bun.lock`. Do not commit binary `bun.lockb`. Configure `.gitignore` to prevent duplicate lockfile confusion.
2. **Phantom Dependencies under Isolated Linker**: Bun 1.4 defaults to `linker = "isolated"`. Workspace packages cannot resolve undeclared transitives. Always explicitly declare direct deps in consumer `package.json`.
3. **Turborepo Dev Process Hanging**: Omitting `"persistent": true` and `"cache": false` on `dev` tasks causes Turborepo to hang waiting for processes to terminate or inappropriately cache hot-reload servers.
4. **TS Resolution Failures**: Omitting `"moduleResolution": "bundler"` breaks package exports pointing to raw `.ts` files. Always use bundler resolution across root and workspaces.
5. **Accidental Server Bundling in Web**: Importing non-type exports from `@repo/api` pulls Bun/Hono server internals into Vite. Enforce `import type { AppType }` via ESLint or `"verbatimModuleSyntax": true`.

## 6. Unresolved Questions
- None. Monorepo architecture, DTO sharing, Drizzle DB exports, and RPC contracts fully validated with subagents.
