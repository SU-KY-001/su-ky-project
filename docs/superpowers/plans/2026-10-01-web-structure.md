# Web frontend structure implementation plan

> **For implementation panes:** Follow the accepted web spec at `docs/superpowers/specs/2026-10-01-web-structure.md`. Do not begin implementation until that spec is accepted.

**Owner:** Current pane (web)  
**Owned code:** `apps/web/**` only  
**Shared integration:** After both manifests are finalized, the coordinator/current pane alone updates the root `bun.lock` once. No concurrent installs.

## Coordination contract

- All workspaces and artifacts stay under `D:\FPT\ky8\WDP\su-ky-project`.
- Web pane owns `apps/web/**`; mobile pane owns `apps/mobile/**`. Neither pane edits the other's tree, API, shared package, root manifest, Turbo config, or lockfile.
- Preserve existing app and skill files. Do not delete or move files as part of structural refactoring; use compatibility re-exports where needed.
- The coordinator owns shared version entries in the root `package.json` Bun `catalog`; each workspace declares its own direct dependencies using `catalog:` references where versions are shared.
- Once both app manifests are ready, stop package installs and report the exact dependency changes. The coordinator runs one root Bun install to update the shared lockfile after the mobile pane is done.
- Do not run any Git command under the app skill permission rules without exact authorization. Do not commit as part of this plan.

## Task 1 — Record baseline and dependency mapping

**Files:** `apps/web/package.json`, `apps/web/src/**` (read-only initially)  
**Action:** Inventory existing routes/components, typed API usage, query setup, and skill-named libraries. Reuse installed dependencies; do not rewrite the API layer. Check the final accepted spec before proceeding.

**Done when:** The implementer has a short checklist of existing behavior that must survive and an explicit add/keep dependency list matching the spec.

## Task 2 — Establish app composition and route boundaries

**Files:** `apps/web/src/app/**`, `apps/web/src/App.tsx`, `apps/web/src/main.tsx`  
**Action:** Add app-level provider/route composition and React Router declarative routes for `/`, `/timeline`, `/series`, `/series/:slug`, `/episodes/:slug`, and `/search`, plus a not-found route. Keep `main.tsx` as the mount point and preserve the `App.tsx` public entry.

**Done when:** The application has one explicit route table and all paths render a route shell without bypassing global providers.

## Task 3 — Extract the existing home view and create page modules

**Files:** `apps/web/src/pages/{home,timeline,series,episode}/**`, `apps/web/src/features/system-health/**`, `apps/web/src/App.tsx`  
**Action:** Move the existing dashboard composition into the home page and feature modules without changing its displayed status cards, timeline preview, guidance, or mini-player placeholder. Add lightweight route page compositions for timeline, series listing/detail, and episode detail.

**Done when:** `/` retains the existing dashboard content and each planned route has a clear page module. New pages may use structural empty states where the underlying feature is not implemented.

## Task 4 — Separate shared UI and feature-owned logic

**Files:** `apps/web/src/features/**`, `apps/web/src/shared/{api,components,hooks,lib,schemas,styles,types}/**`, `apps/web/src/lib/{api,queryClient}.ts`  
**Action:** Assign feature-specific view code to `features`; keep API/query infrastructure and generic components in `shared`. Preserve `src/lib/api.ts` and `src/lib/queryClient.ts` as compatibility re-exports if canonical implementations move. Keep network DTOs and Zod schemas sourced from shared packages.

**Done when:** Pages mainly compose features, feature modules do not import another feature's private implementation, and current import paths remain compatible.

## Task 5 — Add skill-named web dependencies

**Files:** `apps/web/package.json`  
**Action:** Add `react-router`, `axios`, `zustand`, `zod` (if required directly), `yup`, `react-hook-form`, and `@hookform/resolvers`; retain React, Vite, Hono, Tailwind, Lucide, TanStack Query, and query devtools. Do not add a package for the unnamed `InfiniteScroll` JSX symbol. Use Bun 1.4 and compatible stable package versions. Do not run installation while the mobile manifest is still being edited.

**Done when:** The manifest explicitly declares every package the web code imports and the dependency list matches the accepted spec.

## Task 6 — Review boundaries and validate after lockfile integration

**Files:** `apps/web/**` (read/validation), root `bun.lock` (coordinator only, final shared step)  
**Action:** After both panes finish, the coordinator performs a single `bun install` at the repository root to reconcile manifests. Then run the web type check and production build from the root workspace context. Fix only issues within web ownership; report cross-workspace blockers to the coordinator.

**Validation commands:** `bun --filter @repo/web test`; `bun --filter @repo/web check-types`; `bun --filter @repo/web build` (confirm actual package name/scripts before running).

**Done when:** Type checking and build pass against the integrated lockfile, routes and home behavior are verified, and no mobile/API/shared files were changed by the web pane.

## Dependency order

Task 1 → Tasks 2 and 3 → Task 4 → Task 5. The mobile pane may work independently on `apps/mobile`. Shared lockfile integration and validation happen only after both panes report manifest completion.
