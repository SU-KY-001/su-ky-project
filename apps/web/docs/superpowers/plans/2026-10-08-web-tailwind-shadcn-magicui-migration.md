# Web Tailwind, shadcn/ui, and Magic UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Tamagui from `apps/web` and migrate the web app to Tailwind CSS v4, shadcn/ui, and Magic UI while keeping mobile on Tamagui.

**Architecture:** Configure Tailwind through Vite and CSS-first tokens in one global stylesheet. Generate source-owned shadcn/ui and Magic UI components, migrate each existing web area from Tamagui while preserving routes and interactions, then remove web-only Tamagui wiring and update current architecture docs. Keep root/mobile Tamagui configuration for Expo/Metro.

**Tech Stack:** Bun workspaces, React 19, Vite 8, Tailwind CSS v4, shadcn/ui registry, Magic UI registry, React Router, TanStack Query, Phosphor icons, GSAP, Lenis.

**Spec:** `apps/web/docs/superpowers/specs/2026-10-08-web-tailwind-shadcn-magicui-migration-design.md`

## Global Constraints

- Migrate `apps/web` only; keep `apps/mobile` on Tamagui.
- Use Tailwind CSS v4 with `@tailwindcss/vite` and CSS-first tokens; do not add a legacy Tailwind JavaScript config.
- Use source-owned shadcn/ui components under `apps/web/src/components/ui` and Magic UI `MagicCard` on the featured-series card.
- Keep Be Vietnam Pro site-wide and Manrope scoped to the moderator dashboard.
- Preserve routes, data, page content, visual identity, interactions, and accessibility behavior.
- Remove the HTML startup loader and all visible loading UI; retain independent route/section error states. Lazy landing sections wait blank, discovery filters update immediately, and moderator shows mock data immediately.
- Do not run browser agents or add/run automated tests.
- Run only the requested code-quality checks in this plan: web typecheck and production build.
- Do not run Git commands; `PERMISSION-RULES-SKILL.md` requires explicit approval for every Git command.

## Review Focus

1. Search, filters, tabs, carousel, learning card, narrative mode, newsletter controls, and moderator actions must keep their current local behavior after replacing Tamagui events with DOM events.
2. Existing responsive layouts, especially moderator drawer boundaries and the 1024 px grid changes, must still be represented by CSS breakpoints after removing `useMedia`.
3. Route errors must still render and retry without any startup-loader DOM or loader side effects.
4. Be Vietnam Pro must stay global; Manrope weights and their Latin, Latin Extended, and Vietnamese glyph subsets must remain scoped to moderator.
5. Tailwind scanning, component aliases, and shadcn CSS variables must resolve through the production Vite build in this Bun monorepo.

---

### Task 1: Establish Tailwind, CSS tokens, and shadcn foundation

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/styles/globals.css`
- Create: `apps/web/components.json`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/sheet.tsx`
- Create: `apps/web/src/components/ui/tooltip.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/separator.tsx`

**Interfaces:**
- `@/*` resolves to `apps/web/src/*` consistently in Vite, TypeScript, and shadcn configuration.
- `cn(...inputs: ClassValue[]): string` merges conditional and conflicting Tailwind classes.
- Global semantic utilities include `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, and Sử Ký palette utilities.

- [x] Add `tailwindcss` and `@tailwindcss/vite` from the `apps/web` workspace using Bun; configure the official Tailwind Vite plugin alongside React.
- [x] Add CSS-first Tailwind import, shadcn semantic variables, mapped Sử Ký palette tokens, font tokens, box sizing, base typography, focus-visible treatment, and reduced-motion rules to `src/styles/globals.css`.
- [x] Correct the stylesheet import in `src/main.tsx` to `./styles/globals.css` while preserving current font and Lenis imports.
- [x] Configure the `@/*` alias in `vite.config.ts`, `tsconfig.json`, and `components.json`; add the `cn` utility.
- [x] Initialize shadcn/ui for the existing Vite app and generate the listed source components under `src/components/ui`.
- [x] Confirm the Tailwind Vite plugin and CSS variables are represented in the config and that the web typecheck/build can resolve imports after this foundation is complete.

### Task 2: Remove startup loading and decouple route errors

**Files:**
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/pages/landing/LandingPage.tsx`
- Modify: `apps/web/src/app/routeConfig.tsx`
- Rename and modify: `apps/web/src/app/StartupErrorFallback.tsx` → `apps/web/src/app/RouteErrorFallback.tsx`
- Delete: `apps/web/src/app/useStartupLoader.ts`
- Delete: `apps/web/src/app/startupLoader.ts`

**Interfaces:**
- `RouteErrorFallback(): JSX.Element` remains the route error UI consumed by the router's `errorElement`.
- The root web entry renders `QueryProvider` and `App` without `TamaguiProvider` or a Tamagui config import.

- [x] Remove startup-loader DOM, inline CSS, retry UI, scripts, and startup-only root attributes from `index.html`; keep the standard document metadata and React root.
- [x] Remove Tamagui provider/config imports from `main.tsx` and retain the query provider.
- [x] Rename the route error component, remove its call to `finishStartupLoader`, and render the error state with Tailwind and shadcn `Button`.
- [x] Update `routeConfig.tsx` to import `RouteErrorFallback` and keep it as the React Router `errorElement`.
- [x] Remove the landing-page `useStartupLoader` call, remove both landing skeleton fallbacks, set lazy-section Suspense fallbacks to `null`, and keep failure UI in the independent error boundary; delete the two loader-only files.
- [x] Check that no startup-loader identifiers remain in active web HTML or source.

### Task 3: Migrate landing shell, hero, and shared layout

**Files:**
- Modify: `apps/web/src/features/landing/components/SectionFrame.tsx`
- Modify: `apps/web/src/features/landing/components/LandingHeader.tsx`
- Modify: `apps/web/src/features/landing/components/LandingFooter.tsx`
- Modify: `apps/web/src/features/landing/components/HeroCarousel.tsx`
- Modify: `apps/web/src/pages/landing/LandingContent.tsx`
- Modify: `apps/web/src/pages/landing/LandingPage.tsx`
- Modify: `apps/web/src/features/landing/hooks/useStickyHeader.ts`

**Interfaces:**
- Existing exported landing components and motion hooks keep their public props and behavior.
- `useStickyHeader` uses standard DOM element refs rather than `TamaguiElement`.
- Existing GSAP/Lenis motion hooks keep their current APIs.

- [x] Replace Tamagui layout, text, button, scroll, and image elements in the landing shell/header/footer/hero with semantic HTML, Tailwind classes, and shadcn controls.
- [x] Preserve header sticky behavior, anchor navigation, carousel controls, hero image loading behavior, reduced-motion behavior, and screen-reader labels.
- [x] Replace Tamagui element types in the sticky-header hook with DOM element types without changing its public return contract.
- [x] Keep GSAP/Lenis behavior and ensure no global font or color behavior changes.
- [x] Confirm all files in this area have no Tamagui imports.

### Task 4: Migrate landing discovery, timeline, and featured series

**Files:**
- Modify: `apps/web/src/features/landing/components/DiscoverySection.tsx`
- Modify: `apps/web/src/features/landing/components/GlobalTimeline.tsx`
- Modify: `apps/web/src/features/landing/components/TimelineDetailPanel.tsx`
- Modify: `apps/web/src/features/landing/components/FeaturedSeries.tsx`
- Create: `apps/web/src/components/ui/magic-card.tsx`

**Interfaces:**
- Existing search, filter, timeline selection, and series-selection state contracts remain local to their components.
- `MagicCard` is generated from the Magic UI registry and wraps the featured-series visual card with a subtle bronze/gold hover effect.

- [x] Replace Tamagui inputs, labels, buttons, images, layout elements, and responsive props with shadcn components and Tailwind classes.
- [x] Replace `useMedia` in `GlobalTimeline` with CSS responsive behavior and preserve timeline selection and selected-detail state.
- [x] Keep discovery query normalization, filters, empty presentation, lazy images, and reset behavior; remove the filter delay/loading state so updates are immediate.
- [x] Add Magic UI `MagicCard` using the shadcn CLI registry and use it only on the featured-series visual card.
- [x] Preserve tab semantics and selected states for the featured-series selector.
- [x] Confirm these components have no Tamagui imports and MagicCard styles remain within the existing palette.

### Task 5: Migrate landing citations, learning, and narrative controls

**Files:**
- Modify: `apps/web/src/features/landing/components/CitationsSection.tsx`
- Modify: `apps/web/src/features/landing/components/LearningSection.tsx`
- Modify: `apps/web/src/features/landing/components/NarrativeDemo.tsx`

**Interfaces:**
- Existing story-mode state, playback simulation, citation data, and learning-card state are preserved.

- [x] Replace Tamagui controls and layouts with Tailwind, semantic HTML, and shadcn `Button`/`Card` components.
- [x] Keep citation links opening safely in a new tab and retain accessible labels.
- [x] Keep narrative mode selection, word highlighting, interval cleanup, waveform state, and reduced-motion behavior.
- [x] Keep the learning card keyboard-operable and preserve its flip state and accessible name.
- [x] Confirm the global and moderator font scopes remain unaffected.

### Task 6: Migrate moderator dashboard and reusable presentation components

**Files:**
- Modify: `apps/web/src/features/moderator/components/ModeratorDashboard.tsx`
- Modify: `apps/web/src/features/moderator/components/ModeratorText.tsx`
- Modify: `apps/web/src/features/moderator/components/MetricCard.tsx`
- Modify: `apps/web/src/features/moderator/components/AreaChartPanel.tsx`
- Modify: `apps/web/src/features/moderator/components/IntegrationStatusCard.tsx`
- Modify: `apps/web/src/features/moderator/components/QuickActions.tsx`
- Modify: `apps/web/src/features/moderator/components/DashboardStates.tsx`
- Modify: `apps/web/src/features/moderator/hooks/useModeratorReducedMotion.ts`

**Interfaces:**
- Preserve public component props and the typed mock data contracts in `types.ts` and `data.ts`.
- Keep the moderator font applied through `ModeratorText` or equivalent Tailwind font utilities.

- [x] Replace Tamagui components/styles with Tailwind and shadcn `Button`, `Card`, `Badge`, `Sheet`, `Tooltip`, and `Separator` where appropriate; remove `DashboardSkeleton` and show mock data immediately without a loading state.
- [x] Rebuild the sidebar drawer with shadcn `Sheet`; retain Escape handling, focus return, backdrop close, anchor selection, and keyboard focus visibility.
- [x] Replace Tamagui media props with CSS breakpoints matching the approved 620/621 px, 980/981 px, and existing 1024 px grid boundaries.
- [x] Preserve metric data, SVG charts, Vietnamese tooltip formatting, null-point behavior, flat-zero rendering, integration statuses, immediate mock refresh, and preview toasts.
- [x] Retain Manrope weights with Latin, Latin Extended, and Vietnamese glyph coverage in the lazy moderator module and keep reduced-motion support.
- [x] Confirm the entire moderator feature has no Tamagui imports.

### Task 7: Remove web-only Tamagui dependencies and update architecture docs

**Files:**
- Modify: `apps/web/package.json`
- Modify: root `package.json`
- Modify: root `README.md`
- Modify: `docs/README.md`
- Modify: `docs/tech-stack.md`
- Modify: `docs/design-guidelines.md`
- Modify: `docs/codebase-summary.md`
- Modify: `docs/system-architecture.md`
- Modify: `docs/project-vision-and-scope.md`
- Modify: `docs/project-roadmap.md`
- Modify: `apps/web/docs/skill/ARCHITECTURE-FE-SKILL.md`
- Remove generated contents: `apps/web/.tamagui/`

**Interfaces:**
- Web package owns Tailwind/shadcn/Magic UI setup; mobile and root retain dependencies required by Tamagui/Metro.
- Current docs state Tailwind/shadcn/Magic UI for web and Tamagui for mobile.

- [x] Remove `tamagui`, `@tamagui/animations-css`, and `@tamagui/vite-plugin` from the web package; remove the unused `@tamagui/vite-plugin` catalog entry from the root manifest.
- [x] Keep root `tamagui.config.ts`, `tamagui.build.ts`, shared/root dependencies, mobile dependencies, and `apps/mobile/metro.config.js` intact.
- [x] Regenerate `bun.lock` through Bun after workspace dependency changes.
- [ ] Remove the now-empty generated cache directory `apps/web/.tamagui/`; its generated files have been removed, but the shell tool rejected directory removal.
- [x] Update current-state docs and `apps/web/docs/skill/ARCHITECTURE-FE-SKILL.md` to distinguish web and mobile styling systems; leave the pre-existing deleted mobile architecture skill file deleted.
- [x] Search web source/build configuration for Tamagui imports and remove all remaining runtime references.

### Task 8: Run static checks and production build

**Files:**
- Review: all files listed above

- [x] Run `bun run --cwd apps/web check-types`; resolve any type errors from replacing Tamagui prop/event types with DOM and shadcn types.
- [x] Run `bun run --cwd apps/web build`; resolve Vite/Tailwind/shadcn registry component or CSS issues.
- [x] Search `apps/web/src`, `apps/web/vite.config.ts`, and `apps/web/package.json` for `tamagui`, `@tamagui`, `TamaguiProvider`, and startup-loader identifiers; confirm none remain in active web runtime/config.
- [x] Confirm root and mobile Tamagui references remain intact for Expo/Metro.
- [x] Do not run automated test scripts or browser agents.

## Execution Notes

- `apps/mobile/skill/ARCHITECTURE-FE-SKILL.md` was already deleted in the worktree before this migration; it was not recreated. The current web architecture skill was updated.
- The prior moderator-redesign spec and plan paths listed in the initial draft were not present, so no historical docs were modified.
- Bun was not on `PATH`; Bun 1.4.0 was invoked from a temporary npm execution cache for install and verification. No machine-wide Bun installation was made.
- Only the previously approved `git status --short --branch` command was run; no additional Git commands were used.
- No automated tests or browser agents were run.
- The generated files inside `apps/web/.tamagui/` were removed. The directory is empty; the command to remove that directory was rejected by the shell safety review.
- Build verification generated `apps/web/dist/`; it is ignored build output.
