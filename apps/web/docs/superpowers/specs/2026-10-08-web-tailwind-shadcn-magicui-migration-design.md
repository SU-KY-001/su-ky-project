# Web Tailwind, shadcn/ui, and Magic UI Migration

**Date:** 2026-10-08  
**Status:** Approved in chat, including the no-loading-UI refinement
**Scope:** Replace Tamagui in `apps/web` with Tailwind CSS, shadcn/ui, and selected Magic UI components.

## Context

The repository is a Bun monorepo with a Vite/React web app and an Expo/React Native mobile app. The web app currently imports Tamagui throughout the landing page and moderator dashboard, wraps its router in `TamaguiProvider`, and configures the Tamagui Vite plugin. The mobile app still uses Tamagui through its provider and Metro configuration.

The web app's global stylesheet is at `apps/web/src/styles/globals.css`; the entry point currently imports `./globals.css`, so the CSS import must be corrected as part of the migration. `apps/web/index.html` also contains an inline startup loader, retry UI, styles, and scripts. React Router has a separate error element that should remain available after it is decoupled from that loader.

## Goals

- Remove Tamagui usage, provider setup, and web-specific compiler integration from `apps/web`.
- Use Tailwind CSS v4 through the official Vite plugin, with CSS-first design tokens and a normalized global stylesheet.
- Configure shadcn/ui and generate only the source components used by the web app.
- Add and use Magic UI `MagicCard` with a restrained gold hover highlight on the featured-series card.
- Preserve existing routes, data, page content, visual identity, interactions, and accessibility behavior.
- Remove the HTML startup loader and its loading/retry state completely.
- Remove every visible loading UI: landing Suspense skeletons, discovery filter placeholders, and moderator dashboard skeletons. Lazy landing sections may remain blank until ready; independent error UI remains visible on failures. Discovery filters update immediately and moderator screens use mock data.
- Keep the React Router route-error screen, renamed and styled as a regular `RouteErrorFallback` with no startup-loader coupling.
- Keep Tamagui in `apps/mobile` and preserve the root/mobile configuration required by Expo and Metro.

## Out of Scope

- Migrating `apps/mobile` away from Tamagui or adding Tailwind/shadcn/Magic UI to React Native.
- Backend, API, database, route, or content-model changes.
- Replacing GSAP, Lenis, SVG charts, or existing application interactions.
- Adding or running automated tests, or running a browser agent.

## Approved Architecture

### Styling foundation

- Install `tailwindcss` and `@tailwindcss/vite` in `apps/web` and add the Tailwind Vite plugin to its Vite config.
- Keep `apps/web/src/styles/globals.css` as the single global stylesheet and import it from `src/main.tsx` using the correct path.
- Use Tailwind v4 CSS-first setup (`@import "tailwindcss"` and `@theme`) rather than a legacy JavaScript Tailwind config.
- Define shadcn semantic CSS variables and map them to Tailwind theme utilities. Preserve the existing Sử Ký paper, ink, vermilion, and bronze palette.
- Keep Be Vietnam Pro as the site-wide font and Manrope scoped to the moderator dashboard.
- Include a conventional reset, sensible base typography, visible `:focus-visible` styling, and reduced-motion handling in the global stylesheet.
- Configure the `@/*` alias consistently in Vite, TypeScript, and `components.json`.

### Component libraries

shadcn/ui and Magic UI components are generated into the repository from their registries rather than consumed as one monolithic runtime component package.

Generate and use the shadcn components needed by existing screens: `button`, `input`, `label`, `card`, `sheet`, `tooltip`, `badge`, and `separator`. Store them under `apps/web/src/components/ui` and use the `cn` helper from `apps/web/src/lib/utils.ts`.

Generate Magic UI `MagicCard` into the web app and use it for the featured-series visual card. Keep the hover highlight subtle and bronze/gold-toned so it supports the existing editorial design.

### Web migration

- Replace all Tamagui layout, typography, form, image, scroll, button, and responsive primitives under `apps/web/src` with semantic HTML and Tailwind classes or the generated shadcn components.
- Move responsive layout behavior to CSS breakpoints. Replace `useMedia` and Tamagui element types with CSS responsiveness and DOM element types.
- Keep business data, route structure, chart SVG, search/filter behavior, narrative controls, carousel behavior, moderator actions, and accessible labels intact.
- Remove `TamaguiProvider` and the root Tamagui config import from the web entry point.
- Remove the Tamagui Vite plugin and its environment/config wiring from `apps/web/vite.config.ts`.
- Remove web-only Tamagui package dependencies. Remove the unused web Vite plugin entry from the root catalog; retain root and mobile Tamagui packages/configuration used by Expo/Metro.

### Startup and route-error behavior

- Remove the startup loader markup, inline styles, retry button, and startup scripts from `apps/web/index.html`.
- Remove `useStartupLoader`, `startupLoader`, and their landing-page call site.
- Rename `StartupErrorFallback.tsx` to `RouteErrorFallback.tsx`, retain it as the React Router `errorElement`, and remove its dependency on startup-loader completion.
- Keep the route error screen's retry action, using the new web styling system.
- Keep lazy landing sections inside `Suspense` with `fallback={null}`; keep chunk/render errors in the separate error boundary UI.
- Remove discovery filter/query delay state and its loading presentation so results update immediately.
- Remove `DashboardSkeleton` and the moderator loading state; show mock dashboard data immediately while retaining a separate error presentation where applicable.

### Documentation

Update current architecture and stack documentation to describe Tailwind/shadcn/Magic UI for web and Tamagui for mobile. Do not recreate mobile architecture guidance already deleted in the worktree.

## Files and Areas

- Modify `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/src/main.tsx`, `apps/web/src/styles/globals.css`, and `apps/web/index.html`.
- Migrate Tamagui-using components and hooks under `apps/web/src/features/landing`, `apps/web/src/features/moderator`, `apps/web/src/app`, and `apps/web/src/pages/landing`.
- Add `apps/web/components.json`, `apps/web/src/lib/utils.ts`, and generated shadcn/Magic UI components under `apps/web/src/components`.
- Update the root catalog in `package.json` only for web-only Tamagui Vite integration.
- Update root current-state docs so web/mobile styling ownership is accurate. Do not recreate the pre-existing deleted `apps/mobile/skill/ARCHITECTURE-FE-SKILL.md`.
- Delete `apps/web/src/app/useStartupLoader.ts`, `apps/web/src/app/startupLoader.ts`, and the generated cache directory `apps/web/.tamagui/`; rename `apps/web/src/app/StartupErrorFallback.tsx` to `apps/web/src/app/RouteErrorFallback.tsx`.
- Keep root `tamagui.config.ts`, `tamagui.build.ts`, `.tamagui/`, and mobile Tamagui dependencies/config untouched.

## Acceptance Criteria

1. No web source component imports from `tamagui` or `@tamagui/*`; no web provider or Tamagui Vite plugin remains.
2. `apps/web` uses Tailwind CSS v4 through the Vite plugin and a single imported global stylesheet with Sử Ký/shadcn tokens.
3. shadcn/ui components are present in source and used by web screens; Magic UI `MagicCard` is used on the featured-series card.
4. Landing and moderator routes retain their current content, data, key interactions, responsive behavior, and accessibility affordances.
5. `index.html` no longer has startup-loader markup, styles, scripts, or retry behavior; the landing page has no startup loading state.
6. No visible loading UI remains for landing lazy sections, discovery filtering, or moderator dashboard; landing failures still show a separate error state and moderator uses mock data immediately.
7. React Router still renders a route-level error fallback that is independent of startup loading.
8. Mobile continues to use Tamagui; root/mobile configuration and dependencies remain in place.
9. Current architecture docs distinguish the web Tailwind stack from the mobile Tamagui stack.
10. `bun run --filter @repo/web check-types` and `bun run --filter @repo/web build` complete successfully. No automated tests are added or run.

## Review Risks

- The landing page uses Tamagui layout values, media props, and platform-specific component props extensively; all such behavior must map to responsive Tailwind classes and native DOM attributes.
- Existing font loading is split between the global entry and lazy moderator bundle; keep Manrope scoped while preserving Vietnamese glyph coverage.
- The CSS entry path is currently inconsistent with the file location and must be corrected in the same change.
- Deleting the HTML startup loader must not remove the separate React Router error screen.
- Root Tamagui packages are still needed by mobile and must not be accidentally removed with web-only dependencies.
