# Mobile frontend structure implementation plan

> **For implementation panes:** Follow the accepted mobile spec at `docs/superpowers/specs/2026-10-01-mobile-structure.md`. Do not scaffold the framework until the Expo/React Native proposal is accepted.

**Owner:** Other pane (mobile)  
**Owned code:** `apps/mobile/**` only  
**Shared integration:** Report the completed manifest; do not install packages or edit the shared root lockfile while the web pane is active.

## Coordination contract

- All workspaces and artifacts stay under `D:\FPT\ky8\WDP\su-ky-project`.
- Web pane owns `apps/web/**`; mobile pane owns `apps/mobile/**`. Neither pane edits the other's tree, API, shared package, root manifest, Turbo config, or lockfile.
- Preserve every existing skill/reference document under `apps/mobile`. Scaffold files individually; do not use a generator that overwrites existing content.
- Use root Bun catalog references for libraries shared with web/API while retaining direct dependency declarations in `apps/mobile/package.json`. Do not edit the root catalog.
- Do not run package installation while the web pane may still be changing its manifest. Once both manifests are ready, the coordinator/current web pane runs one root Bun install to update `bun.lock`.
- Do not run any Git command under the app skill permission rules without exact authorization. Do not commit as part of this plan.

## Task 1 — Confirm framework baseline and workspace compatibility

**Files:** `apps/mobile/**`, root `package.json`, `bunfig.toml`, shared package exports (read-only)  
**Action:** Verify the accepted spec, current stable Expo SDK, Bun workspace behavior, current shared package exports, and installed tool versions. Keep this task read-only until the architecture is accepted.

**Done when:** The implementation uses a stable Expo SDK compatible with installed Bun and does not alter root workspace configuration.

## Task 2 — Add the Expo application manifest and native configuration

**Files:** `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/tsconfig.json`, `apps/mobile/babel.config.js` (only if required by selected Expo SDK)  
**Action:** Create the app manifest and configuration for Expo SDK 57 stable (or the latest stable SDK at implementation time), Expo Router, TypeScript preset compatibility, and package name `@repo/mobile`. Declare direct workspace dependencies without editing root files.

**Done when:** The app is recognized as a workspace package and its configuration follows Expo's compatibility guidance while preserving existing files.

## Task 3 — Create Expo Router routes and app providers

**Files:** `apps/mobile/app/**`, `apps/mobile/src/app/**`  
**Action:** Add the root layout/provider composition and route files for home, timeline, catalog, and `episodes/[slug]`. Keep route files thin and delegate screens to feature modules. Add a simple unknown/not-found route if supported by the selected router setup.

**Done when:** Each route resolves to an app-owned screen composition and providers are initialized once at the root.

## Task 4 — Establish feature and shared module boundaries

**Files:** `apps/mobile/src/features/{timeline,catalog,episode-detail,audio-player,citations,search}/**`, `apps/mobile/src/shared/{api,components,hooks,lib,schemas,theme,types}/**`  
**Action:** Create the module boundaries, app theme, native shared primitives, typed API setup, query client, and state-store location. Use React Native components and `FlatList`/`SectionList`; import shared DTO/Zod contracts instead of duplicating them. Keep audio/offline modules as structural interfaces only.

**Done when:** Screens compose feature modules; shared infrastructure is separate; no browser-only UI or duplicate network schema is introduced.

## Task 5 — Add skill-named and Expo-compatible dependencies

**Files:** `apps/mobile/package.json`  
**Action:** Declare `expo`, `expo-router`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`, `@tanstack/react-query`, `axios`, `zustand`, `zod` (if required directly), `yup`, `react-hook-form`, and `@hookform/resolvers`. Keep Expo packages on versions compatible with the selected stable SDK, to be resolved with `bun expo install` at the coordinated install step. Do not add an unnamed `InfiniteScroll` package.

**Done when:** Every imported package is declared directly in the mobile manifest and native package versions match the chosen SDK.

## Task 6 — Report readiness for shared install and validate

**Files:** `apps/mobile/**` (read/validation), root `bun.lock` (coordinator only)  
**Action:** Report manifest completion and stop before installation. After the coordinator integrates both apps with one root Bun install, run Expo's project health check and the mobile type check/build supported by the chosen SDK. Resolve mobile-owned errors and report shared-workspace issues.

**Validation:** Expo Doctor plus TypeScript checking; use the exact commands available in the generated package scripts and selected Expo SDK. Do not claim a native device build unless the required platform toolchain is available.

**Done when:** Expo configuration and type checks pass after shared lockfile integration, existing skill documents remain intact, and the mobile pane has not changed files outside `apps/mobile`.

## Dependency order

Task 1 → Tasks 2 and 3 → Task 4 → Task 5 → report manifest readiness. The web pane can proceed independently. Root lockfile integration and any validations that require installed packages are serialized after both panes finish manifest edits.
