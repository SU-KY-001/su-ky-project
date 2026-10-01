# Web frontend structure specification

**Status:** Draft for review  
**Owner:** Current pane (web)  
**Workspace:** `apps/web`  
**Date:** 2026-10-01

## Goal

Reshape the existing web app into a feature-oriented React application that can support the approved P0 product surface without discarding the current dashboard behavior. This is a structure and dependency foundation; it does not implement the product roadmap features in full.

## Product context

The web app is the P0 product surface. Its route model must accommodate the home dashboard, history timeline, series/catalog, and episode detail. Episode pages will eventually host citations/transcript and the persistent audio player. The existing status cards, timeline preview, guidance, and mini-player placeholder remain reachable on the home route while code is organized behind the new structure.

## Proposed structure

```text
apps/web/src/
  app/                     # app composition, providers, route table
  pages/
    home/
    timeline/
    series/
    episode/
  features/
    system-health/
    timeline/
    catalog/
    episode-detail/
    audio-player/
    citations/
    search/
  shared/
    api/                    # typed Hono client and API adapters
    components/             # app-wide UI primitives and shell
    hooks/
    lib/                    # query client and general utilities
    schemas/                # form/local schemas only; network schemas stay shared
    styles/
    types/
  App.tsx                    # stable compatibility entry, delegates to app root
  lib/api.ts                 # stable compatibility re-export for typed client
  lib/queryClient.ts         # stable compatibility re-export for query client
```

Feature modules own feature-specific components, hooks, and view models. Pages compose features and should not become a second home for business logic. Cross-feature UI and infrastructure live under `shared`; API DTOs and network Zod schemas continue to come from `@repo/shared` and `@repo/api/types`.

## Routing and composition

Add React Router declarative routing because the product has several distinct P0 pages. Define `/` (home), `/timeline`, `/series`, `/series/:slug`, `/episodes/:slug`, and `/search`; unknown routes render a not-found page. Preserve the existing Vite entry point and `App.tsx` export so current startup behavior remains intact. `main.tsx` remains responsible for mounting the application and global providers; route configuration belongs under `src/app`.

The app shell owns navigation and a persistent player slot. The player can remain a visual placeholder in this structural phase; audio playback behavior is out of scope. Route pages must be responsive and use the design tokens and accessibility rules in `docs/design-guidelines.md`.

## Data and state boundaries

- TanStack Query remains the server-state/cache layer and owns API loading, retries, and query invalidation.
- The typed Hono client remains the primary monorepo API integration. Keep `VITE_API_URL` behavior and avoid duplicating API DTO definitions.
- Zustand is reserved for cross-route client state such as player UI state; it must not mirror query results.
- Zod remains the canonical network-boundary schema source in `packages/shared`. Local forms may use Zod or Yup, but do not maintain parallel validators for the same API contract.
- Axios is available for endpoints that cannot use the typed Hono RPC client (for example, a future external media service); do not rewrite existing Hono calls solely to use Axios.
- Use TanStack `useInfiniteQuery` for paginated feeds. The frontend skill shows an `InfiniteScroll` JSX component but names no package, so implement any small observer wrapper locally if needed; do not infer an unnamed dependency.

## Dependency inventory

The user requested installation of all libraries named in the frontend skill. The implementation plan must account for each explicit package name and avoid duplicate versions where the workspace already provides the package.

| Library named by the skill | Web action |
| --- | --- |
| `@tanstack/react-query` | Keep existing dependency. |
| `axios` | Add as a direct web dependency. |
| `zustand` | Add as a direct web dependency. |
| `zod` | Add as a direct web dependency if required by isolated linking; use shared exported schemas for network contracts. |
| `yup` | Add as a direct web dependency for skill compatibility; use only for local form schemas where chosen. |
| `react-hook-form` | Add as a direct web dependency. |
| `@hookform/resolvers` | Add as a direct web dependency. |
| `InfiniteScroll` | No package is named in the skill; use native TanStack pagination and a local wrapper if required. |

Keep existing React, Vite, Hono, Tailwind, Lucide, and query-devtools dependencies. Add `react-router` for the route model. Shared versions live in the root `package.json` Bun `catalog`; each workspace still declares every package it imports in its own manifest. Resolve and lock all workspaces together with one root `bun install`. Use Bun 1.4 only.

## Acceptance criteria

1. The project has a documented feature-oriented web source layout with explicit page, feature, shared, API, and app-composition boundaries.
2. Existing dashboard content remains the home page; it is reorganized rather than removed.
3. The route table supports home, timeline, series listing/detail, episode detail, and not-found states.
4. The persistent-player region is part of the shell, with playback implementation deferred.
5. TanStack Query and typed Hono RPC remain the existing server-data path; shared Zod schemas remain the network contract source.
6. All explicit frontend-skill package names are covered in the web manifest plan, including the distinction between existing and newly added packages.
7. No project file outside the current repository is used as a workspace or artifact location.
8. No API, database, or mobile source files are changed by the web workstream.

## Out of scope

Full timeline/catalog/search implementation, transcript rendering, citation resolution, functional audio playback, backend/API changes, visual redesign beyond fitting the existing design system, and mobile behavior.

## References

- Project roadmap: `docs/project-roadmap.md`
- Product requirements: `docs/project-overview-pdr.md`
- Design rules: `docs/design-guidelines.md`
- Engineering rules: `docs/code-standards.md`
- React Router declarative installation: https://reactrouter.com/start/declarative/installation
- React Router modes: https://reactrouter.com/start/modes
