# Phase 1: Monorepo Foundation & Tooling

## Goal
Establish a clean, modern Turborepo monorepo configured specifically for Bun v1.4.0.

## Files to Create
1. `package.json` (Root):
   - `"packageManager": "bun@1.4.0"`
   - `"workspaces": ["apps/*", "packages/*"]`
   - Scripts: `dev`, `build`, `check-types`, `db:generate`, `db:migrate`, `db:push`, `db:seed`, `test`, `clean`
   - DevDependencies: `turbo`, `typescript`
2. `bunfig.toml`:
   - `[install]` with `linker = "isolated"`
   - `linkWorkspacePackages = true`
3. `turbo.json`:
   - Schema v2
   - Tasks: `build`, `dev`, `check-types`, `test`, `db:generate`, `db:migrate`
   - Env passing: `DATABASE_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`
4. `.gitignore`:
   - Node modules, dist, build, .env, .env.local, .turbo, logs, docker volumes
5. `.env.example`:
   - `PORT=3000`, `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/suky_dev`, `CORS_ORIGIN=http://localhost:5173`
6. `compose.yaml`:
   - PostgreSQL 17 alpine container with persistent volume, credentials, and healthcheck.
7. `packages/tsconfig/`:
   - `package.json` (`@repo/tsconfig`)
   - `base.json`: Strict mode, ESNext, bundler resolution
   - `bun.json`: Extends base, types for bun
   - `react.json`: Extends base, jsx: react-jsx, dom lib

## Verification
- Valid JSON and config files.
