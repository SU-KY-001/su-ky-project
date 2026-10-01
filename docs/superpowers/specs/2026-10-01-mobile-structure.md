# Mobile frontend structure specification

**Status:** Draft for review  
**Owner:** Other pane (mobile)  
**Workspace:** `apps/mobile`  
**Date:** 2026-10-01

## Goal

Create a maintainable native mobile app foundation that fits the monorepo's TypeScript contracts and leaves a clear path to the roadmap's offline audio, transcript, and lock-screen playback work. The current `apps/mobile` contains skill/reference documents but no application scaffold or package manifest; preserve those documents.

## Framework decision proposed for this draft

Use React Native with Expo SDK 57 stable and Expo Router. The roadmap leaves React Native/Expo and Flutter open; this draft recommends Expo because the repository is TypeScript/Bun-based and `packages/shared` already exports reusable Zod contracts. Expo SDK 58 was in beta on this spec date, so implementation should target the latest stable Expo SDK rather than a beta. Re-check the stable SDK when implementation begins and use `bun expo install` for Expo-managed native dependencies.

This is a proposed architecture for review, not permission to implement the app framework before the spec is accepted.

## Proposed structure

```text
apps/mobile/
  app/                       # Expo Router filesystem routes
    _layout.tsx              # providers and root stack
    (tabs)/
      _layout.tsx
      index.tsx              # home
      timeline.tsx
      catalog.tsx
    episodes/[slug].tsx      # episode detail
  src/
    app/                     # app-level providers and configuration
    features/
      timeline/
      catalog/
      episode-detail/
      audio-player/
      citations/
      search/
    shared/
      api/
      components/
      hooks/
      lib/
      schemas/
      theme/
      types/
  assets/
  app.json
  package.json
  tsconfig.json
```

Route files stay thin and delegate to feature screens. The feature modules own their UI and feature hooks; app-wide UI, theme, and API setup live under `src/shared`. Keep all files, generated output, caches, and package artifacts inside this repository's workspace.

## Navigation and data boundaries

- Expo Router provides native file-based navigation for home, timeline, catalog, and episode detail.
- Use React Native primitives and `FlatList`/`SectionList` for long or paginated content; do not use browser DOM elements or web-only infinite-scroll packages.
- Reuse `@repo/shared` Zod schemas and DTOs for API-boundary contracts. Do not fork shared network schemas into the app.
- Use TanStack Query for server state and cache; use Zustand for small cross-screen client state, especially the future player presentation state.
- Keep typed Hono RPC as the primary API client when its runtime and types are compatible with the native app. Axios may serve endpoints not covered by RPC; avoid maintaining two competing clients for the same endpoint.
- Expo Router and Expo-managed native packages must be installed at versions compatible with the selected stable Expo SDK via `bun expo install`.

## Dependency inventory

The user requested all explicit package libraries named by the frontend skill. Install the app-relevant packages as direct mobile dependencies, even if they are also used by web, because isolated workspace linking requires each app to declare what it imports. Reference shared versions from the root Bun `catalog`, then resolve all workspaces together with one root `bun install`.

| Library named by the skill | Mobile action |
| --- | --- |
| `@tanstack/react-query` | Add as a direct mobile dependency. |
| `axios` | Add as a direct mobile dependency for non-RPC endpoints. |
| `zustand` | Add as a direct mobile dependency. |
| `zod` | Add as a direct mobile dependency if required by isolated linking; prefer `@repo/shared` schemas for network contracts. |
| `yup` | Add as a direct mobile dependency for skill compatibility; avoid duplicate validation of API DTOs. |
| `react-hook-form` | Add as a direct mobile dependency. |
| `@hookform/resolvers` | Add as a direct mobile dependency. |
| `InfiniteScroll` | No package is named in the skill; use React Native `FlatList`/`SectionList` pagination. |

Also add Expo SDK-compatible versions of `expo`, `expo-router`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, and `expo-status-bar`. Expo and React Native version selection must be driven by the stable SDK's compatibility matrix rather than manually pinning arbitrary versions. Keep the web dependency manifest and shared root lockfile out of this pane's ownership.

## Acceptance criteria

1. The app has a documented Expo Router route tree for home, timeline, catalog, and episode detail.
2. Route files delegate to feature modules with app-wide infrastructure in `src/app` and `src/shared`.
3. The architecture reuses monorepo shared DTOs/Zod schemas and defines explicit server-state versus client-state responsibilities.
4. Long content uses native list primitives with pagination hooks.
5. Explicit frontend-skill package names are covered in the mobile manifest plan; no unnamed `InfiniteScroll` package is invented.
6. Existing skill/reference files under `apps/mobile` remain intact.
7. Offline downloads, audio playback, background service, and lock-screen controls have clean feature boundaries but are not implemented in this structural phase.
8. No project file outside the current repository is used as a workspace or artifact location.
9. No web, API, or database source files are changed by the mobile workstream.

## Out of scope

Functional audio streaming/downloads, offline storage, background audio, lock-screen controls, push notifications, backend/API changes, and implementation of the full product experience.

## References

- Project roadmap: `docs/project-roadmap.md`
- Product requirements: `docs/project-overview-pdr.md`
- Engineering rules: `docs/code-standards.md`
- Expo Bun guide: https://docs.expo.dev/guides/using-bun/
- Expo monorepos guide: https://docs.expo.dev/guides/monorepos/
- Expo Router overview: https://docs.expo.dev/router/introduction/
- Expo Router installation: https://docs.expo.dev/router/installation/
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Expo SDK 58 beta announcement: https://expo.dev/changelog/sdk-58-beta
- React Native lists: https://reactnative.dev/docs/using-a-listview
