# Feature-Based Frontend Architecture (Web)

> **Status:** Project frontend standard  
> **Applies to:** `apps/web`  
> **Last updated:** 2026-11-17  
> **Audience:** Developers and AI agents changing the web application  
> **Runtime model:** Client-rendered React single-page application (SPA)

## 1. Purpose and how to use this document

This document defines where frontend code belongs, which dependencies are allowed, how data and authentication flow through the application, and how to make changes without weakening existing boundaries.

Treat **MUST** statements as required. Treat **SHOULD** statements as the default; an exception is acceptable when it has a concrete reason and does not create an unsafe dependency or duplicate source of truth. For a lasting architectural exception, record the context and trade-off in an Architecture Decision Record (ADR).

When implementing a task, an AI agent MUST:

1. Inspect the relevant feature, its public exports, the route entry point, and existing services before editing.
2. Reuse the app's existing libraries and conventions. Do not introduce an alternate API client, state container, validation library, or styling system for convenience.
3. Keep changes within the requested scope. Do not perform broad migrations as an incidental part of a feature task.
4. Preserve server-side authorization and validation assumptions. Client-side guards and schemas improve UX and reliability; they do not secure the server.
5. If current code conflicts with a rule in this document, follow the rule for new code and make a focused migration when touching the conflicting code. Do not claim the whole repository already conforms.

## 2. Actual `apps/web` technology baseline

The following baseline was read from the workspace manifests and source. Versions are manifest/catalog declarations and may resolve to newer compatible patch releases in `bun.lock`.

| Concern | Current technology | Notes |
|---|---|---|
| Package manager and monorepo | Bun workspaces, Bun 1.4.0, Turborepo 2.x | Use Bun workspace scripts and dependencies. |
| UI runtime | React and React DOM 19.3.0 | React 19 SPA; no Next.js or SSR assumptions. |
| Build and dev server | Vite `^8.3.3`, `@vitejs/plugin-react` | Vite config loads root-level env files and aliases `@` to `apps/web/src`. |
| Language | TypeScript `~6.0.3` | Extends `@repo/tsconfig/react.json`; keep strict typing and existing compiler settings. |
| Routing | `react-router` `^7.0.0` | Uses `createBrowserRouter`, route objects, lazy route modules, and `RouterProvider` from `react-router/dom`. |
| Server data | TanStack Query v5 | A shared `QueryClient` is provided in `src/app/providers/QueryProvider.tsx`. |
| API transport | Hono typed client (`hc<AppType>`) and native `fetch` | `src/lib/client.ts` creates the typed Hono client; `src/lib/apiRequest.ts` provides schema-parsed requests. |
| API contract and schemas | `@repo/api/types`, `@repo/shared`, Zod | Hono route types provide compile-time API typing; Zod parses responses where `apiRequest` is used. |
| API errors | Project `ApiError` in `src/lib/apiError.ts` | Retains HTTP status, code, request ID, retry-after, and validation details. |
| Authentication | Cookie-backed server session | Requests include credentials; `/api/me` treats HTTP 401 as an anonymous session. No browser-readable token is required. |
| Styling | Tailwind CSS `^4.1.14` with `@tailwindcss/vite` | CSS-first theme and tokens live in `src/styles/globals.css`. |
| UI primitives | Source-owned shadcn/Radix-based components | Component alias points to `src/shared/components/ui`; selected Magic UI registry components are available. |
| Forms | React Hook Form with Zod resolver | Zod is the default for new forms. Yup is installed but is not the default for new work. |
| Client state | React state and context; Zustand `^5.0.3` is installed | Use Zustand only when shared client-only state needs it; do not add a store by default. |
| Tests | Bun Test with `happy-dom` available | Follow the existing tests and scripts in `apps/web`; do not assume an uninstalled test framework. |

Axios is present in the dependency manifest, but the current web API path is Hono client plus `fetch`; Axios is **not** the canonical transport in this standard. Do not add Axios interceptors or move requests to Axios without an explicit architecture decision. The repository currently has no web ESLint/boundary configuration visible in the app configuration; boundary rules below describe required behavior and must be enforced by CI tooling as that tooling is introduced.

### 2.1 Environment and deployment assumptions

- Read browser-visible configuration from Vite's `import.meta.env`, using the `VITE_` prefix. The current API URL is `VITE_API_URL`, with a local fallback in `src/lib/client.ts`.
- Values prefixed with `VITE_` are public and MUST NOT contain secrets.
- The Vite config sets `envDir` to the monorepo root. Keep this in mind when adding or documenting environment variables.
- This application is an SPA. If the product adopts SSR, a different router mode, or a different runtime, update environment handling, data loading, authentication, and caching through an ADR before applying server-rendering patterns.

## 3. Architectural shape and dependency rules

Organize application code by business capability. Keep application wiring, route-level composition, reusable cross-domain code, and feature internals distinguishable.

```text
apps/web/src/
├── app/                         # App bootstrap, providers, route composition, route guards
├── pages/                       # Route modules; compose feature APIs into page experiences
├── features/
│   ├── auth/
│   ├── quiz/
│   ├── historical-library/
│   └── ...
├── shared/                      # Cross-feature UI, hooks, layouts, and domain-neutral helpers
├── lib/                         # App-wide technical integrations: API client, errors, query client
├── styles/                      # Global CSS and Tailwind theme
└── test/                        # Shared test fixtures and setup
```

The intended dependency direction is:

```text
app and pages  →  feature public APIs  →  shared and lib
feature A      →  feature B public API (only when explicitly justified)
shared and lib →  no app, page, or feature imports
```

Rules:

1. `shared/` and `lib/` MUST NOT import from `app/`, `pages/`, or `features/`.
2. Features MUST NOT import from `app/` or `pages/`.
3. A page or app module may compose features, but it MUST import a feature through that feature's public entry point.
4. A feature importing another feature is an exception, not the default. It MUST use the other feature's public entry point and the dependency graph MUST remain acyclic. Prefer composition in `pages/` or `app/` when two capabilities need to be coordinated.
5. Imports between files inside the same feature may use internal paths. Imports from outside the feature MUST NOT reach into its internal folders.
6. A public entry point exports only the stable components, hooks, types, or helpers needed by another module. Do not re-export an entire feature for convenience.
7. Cross-feature reusable code belongs in `shared/` only when it is domain-neutral. Do not move feature business rules to `shared/` merely to bypass a boundary.

Example public entry point:

```ts
// src/features/auth/index.ts
export { AccountProfile } from "./components/AccountProfile";
export { useCurrentUser } from "./hooks/useCurrentUser";
export type { CurrentUser } from "./types";
```

Feature-to-feature imports create a directed graph. Before adding one, check that it does not create a cycle and that the dependency reflects real domain ownership. A public entry point limits access to internals; it does not make a circular dependency safe.

### 3.1 Enforce boundaries

Architecture rules MUST be checked automatically in CI, not left to code review alone. Configure an import-boundary tool such as `eslint-plugin-boundaries` or `dependency-cruiser` to enforce the rules above, including `@/` aliases and relative imports. Add checks for cycles and for external imports that bypass a feature's public entry point. Ensure the checker runs on the same source tree and aliases as Vite and TypeScript.

Because existing code predates this document and includes direct cross-feature imports and shared-to-feature references, apply enforcement in a migration-aware way: block new violations first, then migrate existing references in focused changes. In particular, route guards are application composition and should live under `app/guards/`, not `shared/`; shared layouts or dashboards that compose an auth-owned component should move that composition to `app/` or `pages/`. Do not hide old violations with broad ignore rules.

## 4. Feature organization and component responsibilities

A feature is a business capability with clear ownership of its queries, mutations, UI, validation, and types. Use only the subfolders that provide value; a small feature does not need empty folders or a one-file-per-layer structure.

```text
features/<feature-name>/
├── index.ts                 # Public API for outside consumers
├── components/              # Feature UI; presentational or feature-connected
├── hooks/                   # Feature queries, mutations, and reusable behavior
├── services/                # Feature API calls and response/domain mapping
├── schemas/                 # Feature-owned Zod schemas
├── queries.ts               # Query keys and reusable query options, when useful
├── types.ts                 # Feature-owned domain types
└── ...                      # Local utilities or subdomains when justified
```

Do not create `screens/` or `containers/` mechanically. `pages/` already contains the app's route modules. A complex feature may provide a screen-level component, but the route module remains the place that connects routing concerns to that feature.

### 4.1 Two valid component types

Do not classify every component as either a “container” or a pure view. There are two useful component types, and both are allowed:

| Component type | Responsibility | Allowed dependencies |
|---|---|---|
| **Presentational component** | Renders props and reports user actions through callbacks. It can be reused, tested, or previewed independently. | React, shared UI primitives, formatting helpers, props. It MUST NOT fetch API data or read global feature state. |
| **Feature-connected component** | Owns a cohesive feature interaction, such as a form, data table, or dialog. It composes feature hooks with its markup. | Hooks and services exposed inside its own feature, plus shared UI. It MUST NOT call `fetch`/API clients directly. |

A route module in `pages/` or a feature-level screen may compose hooks and components. Keep it focused on route setup, data orchestration, and page composition; move reusable or substantial business behavior to a feature hook/service. A component may use local state or React Hook Form even when it is presentational in the data-flow sense; “presentational” does not mean “contains no React state.”

Use a presentational component when a UI needs different data sources, independent interaction tests, reuse across contexts, or has become difficult to understand because markup and orchestration are intertwined. Do not split a component into multiple files solely to satisfy a pattern.

### 4.2 Hooks

- Name custom hooks with the `use` prefix and place feature hooks in their owning feature. Put broadly reusable, domain-neutral hooks in `shared/hooks/`.
- Hooks return data, state, and actions; they do not return JSX as a substitute for a component.
- A hook may use TanStack Query, local React state, or a feature service. It MUST NOT duplicate server data into Zustand or another local store.
- Exported hooks and functions in a public API MUST have clear inferred or explicit types. Avoid verbose annotations that merely repeat TypeScript's precise inference.

### 4.3 Passing data through the tree

Prefer explicit props and composition. Use context for state shared by a bounded subtree or compound component. Use Zustand only for client-only state that genuinely needs shared access beyond a local tree. Do not add a global store merely because a prop passes through a few layers, and do not use context or Zustand as a second server-data cache.

## 5. State ownership and server data

Choose the lowest-level source of truth that satisfies the use case.

| State | Source of truth | Examples |
|---|---|---|
| Server state | TanStack Query | Current user, catalog entries, quiz records, admin data |
| Shareable navigation state | URL and React Router location/search params | Search term, selected page, shareable filters, selected tab |
| Form state | React Hook Form plus Zod | Input values, field errors, touched state |
| Local UI state | `useState` or `useReducer` | Open dialog, expanded row, temporary selection |
| Subtree state | React context | Compound component coordination or a bounded widget |
| Global client-only state | Zustand when justified | Durable app-wide UI preferences or interaction state |

Server responses MUST NOT be copied into `useState`, context, or Zustand to make them easier to pass around. Components that need the same server data should use the same query key so TanStack Query can share the cached result.

### 5.1 Query keys and query options

New query definitions SHOULD use a feature-owned key factory and reusable query options where they are shared by hooks, route loaders, prefetching, or invalidation. Keys must include all variables that change the response and must be stable and serializable.

```ts
// features/historical-library/queries.ts
export const historicalCatalogKeys = {
  all: ["historical-catalog"] as const,
  lists: () => [...historicalCatalogKeys.all, "list"] as const,
  list: (filters: CatalogFilters) => [...historicalCatalogKeys.lists(), filters] as const,
  details: () => [...historicalCatalogKeys.all, "detail"] as const,
  detail: (id: string) => [...historicalCatalogKeys.details(), id] as const,
};
```

Use `useQueryClient()` inside hooks and feature logic. Do not import a query client singleton into components to perform feature mutations. Invalidate the narrowest affected keys after a successful mutation. Use optimistic updates only when the action is reversible, the expected result is predictable, and the UX benefit is meaningful. A rollback must handle an absent previous cache value; concurrent mutations must not restore a stale snapshot over newer data.

### 5.2 Query retries

There must be one intentional retry policy. Do not add a retry loop in a service while TanStack Query is also retrying. The current `QueryClient` retries queries once by default and disables window-focus refetching; keep global policy in `src/lib/queryClient.ts`.

For new or revised policy, retry only transient failures and only when repeating the operation is safe. Do not retry validation, authorization, or other permanent 4xx responses. Treat aborts/timeouts deliberately. Mutations default to no retry unless the operation is known to be idempotent or carries a stable idempotency key. Honor `Retry-After` when the API provides it. Do not add retries to login or other credential-submission mutations.

### 5.3 Zustand

Zustand is available but is not the default home for application data. Use it only for global client state that cannot be kept local or in a bounded context. Do not put current-user/session data, API results, or network actions in a Zustand store. Select only the state a component needs; use shallow selection when reading several fields together. Keep a store in its owning feature unless its state is genuinely app-wide and domain-neutral.

## 6. API transport, contracts, and errors

### 6.1 Use the existing transport path

`src/lib/client.ts` owns the Hono typed client created from `@repo/api/types`. It includes browser credentials and uses `VITE_API_URL`. `src/lib/apiRequest.ts` is the schema-parsing `fetch` helper, and `src/lib/apiError.ts` defines the structured `ApiError` used for non-success responses.

- Feature services own endpoint calls. Components MUST NOT call `fetch`, the Hono client, or `apiRequest` directly.
- Use the typed Hono client where its inferred request and response types make the call clear.
- Use `apiRequest` when the response needs runtime parsing with a Zod schema or when request semantics such as idempotency keys and abort signals require it.
- Do not create a second global client or add an Axios interceptor as a shortcut. If the transport needs to change, document and migrate it through an ADR.
- Pass TanStack Query's `AbortSignal` through to the transport when the call supports cancellation.
- Treat Hono client typing as compile-time contract typing, not runtime validation. Parse untrusted or structurally important responses at the network boundary with the shared or feature-owned Zod schema.

Feature services should return the shape the feature consumes. Keep generated/shared API contracts distinct from feature-specific view models when a transformation is useful. Do not add DTO-to-domain mapper boilerplate if the server contract already is the domain shape and no isolation benefit exists. Keep dates in the API's stable wire representation unless the feature has a clear typed date-handling boundary; serialization alone does not prohibit `Date` objects.

### 6.2 Structured API errors

`ApiError` carries `status`, `errorCode`, `requestId`, `retryAfterSeconds`, and validation details. Preserve this structure through query and mutation errors. Feature UI should map known error codes and field details to safe, localized user messages. Do not display stack traces, raw response payloads, or internal diagnostic details. Include `requestId` in support/reporting context when available.

Do not force every error into a generic `AppError` type that discards API-specific information. If a broader app-level error abstraction is introduced, it must preserve the original status, code, request ID, retry metadata, details, and cause.

## 7. Authentication and HTTP 401 policy

Authentication uses a server-managed cookie session. Browser requests use `credentials: "include"`; the client does not read or attach a bearer token from Web Storage. The server remains responsible for authorization on every protected endpoint. A route guard exists only to provide appropriate client navigation and feedback.

Use this explicit 401 policy:

1. **Current-session lookup (`GET /api/me`):** HTTP 401 means there is no authenticated session. `fetchCurrentUser()` returns `null`; it MUST NOT turn this expected anonymous result into a query error.
2. **Sign-in, sign-up, and password-reset requests:** HTTP 401 or validation failures are form/action errors. They MUST NOT globally clear the current-user cache or redirect the browser. Authentication mutations remain non-retrying by default.
3. **A protected feature request:** preserve the `ApiError` and render or report the operation failure. If it indicates an expired session, trigger a current-session revalidation only for requests explicitly identified as requiring authentication. After revalidation returns `null`, the protected route guard redirects to login and preserves the intended destination.
4. **Public requests:** a 401 MUST NOT log the user out merely because the response status is 401; public endpoints may use 401 for endpoint-specific behavior.

Do not implement “on every 401, set current user to null” in a global fetch/Axios interceptor. That conflates invalid credentials with an expired session and can log out a user who simply mistyped a password. Do not directly write `null` into the session query from a transport callback; let the current-session query remain the authority for session state.

If an app-wide revalidation callback is needed, register it at application/query-client construction time, not from a component `useEffect`. Mark authenticated queries and mutations explicitly with TanStack Query metadata such as `requiresAuth: true`; the centralized callback may invalidate the current-user query only when that metadata is present and the error is an HTTP 401. Credential mutations and public calls must not carry that marker. The route guard should own redirect behavior, not the transport layer.

Cookie `SameSite`, `Secure`, CORS, and CSRF behavior must match the actual frontend/API site topology and be configured with the backend. Do not assume `SameSite=Lax` works for cross-site XHR. Any cross-site cookie setup requires the corresponding credentialed CORS policy and CSRF protection. These controls cannot be implemented by the frontend alone.

## 8. Routing and access control

The app uses React Router v7 route objects in `src/app/router.tsx`. Add route-level code splitting with lazy route modules for substantial pages, following the current router patterns. Keep route definitions, guards, and provider wiring in `app/`; keep route modules in `pages/`; feature UI and behavior remain feature-owned.

- Protected route guards wait for the current-user query, show a loading state while pending, redirect anonymous users to login, and preserve the original destination where appropriate.
- Role guards provide UX only. The API MUST enforce role and ownership checks for every protected operation.
- Route error boundaries and not-found routes should use the existing app patterns. Do not duplicate access checks inside every leaf component when a route boundary already covers them.
- URL state belongs in the route/search params when it should survive refresh, be shareable, or participate in browser navigation. Do not put secrets or sensitive personal data in a URL.

## 9. Effects and asynchronous UI states

Use `useEffect` to synchronize React with an external system: browser APIs, subscriptions, timers, or an imperative third-party library. Do not use an Effect to fetch server data, calculate state that can be derived during render, validate a form, or handle a user action.

For a query-backed view, handle the states that apply: initial pending, error, empty result, and success. Distinguish the initial loading state from background fetching so existing data stays visible during a refresh. Empty is derived from the successful result; it is not a separate mutable status.

Mutations have their own lifecycle: pending, success, and error. Do not force an `empty` state onto actions that do not return a collection. Use `isPlaceholderData` when previous data is intentionally displayed during pagination or filter transitions.

```tsx
function CatalogList({ filters }: { filters: CatalogFilters }) {
  const query = useHistoricalCatalog(filters);

  if (query.isPending) return <CatalogSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.items.length === 0) return <CatalogEmptyState />;

  return (
    <>
      {query.isFetching && <RefreshIndicator />}
      <CatalogGrid items={query.data.items} />
    </>
  );
}
```

## 10. Errors and error boundaries

Handle expected API failures in query/mutation UI and feature actions. Use route or component error boundaries for unexpected render failures and lazy-module failures. The existing route fallback is the default pattern for route-level recovery.

Error boundaries do not catch event-handler errors or arbitrary asynchronous promise rejections. Catch or surface those through mutation state, an explicit `try/catch`, or the app notification system. If a query is intended to reach an error boundary, configure that query's throw behavior deliberately; a boundary alone does not make TanStack Query errors throw. Reset the relevant query state when offering a retry from a boundary.

Report unexpected errors with useful context such as route, release/build identifier, and request ID when present. Avoid logging credentials, session cookies, or unnecessary personal data.

## 11. UI, styling, and forms

### 11.1 UI and CSS

- Use semantic HTML and the existing Tailwind CSS v4 setup, CSS variables, and tokens in `src/styles/globals.css`.
- Put shared source-owned UI primitives under `src/shared/components/ui/`, matching `components.json`. Put domain-specific UI in its feature.
- Use the existing `cn()` utility and `class-variance-authority` for class composition and meaningful variants. Keep Magic UI additions selective and consistent with the product design.
- Prefer existing design tokens over one-off color, spacing, radius, or breakpoint values. Keep dark mode and theme behavior token-driven.
- Do not create a second styling framework, global CSS system, or arbitrary `@apply` abstraction for a single repeated class string.
- Use accessible names, labels, visible focus styles, keyboard operation, appropriate contrast, and correct button/link semantics.

### 11.2 Forms and validation

Use React Hook Form with Zod and `@hookform/resolvers/zod` for new forms. Keep feature schemas near the form or in the shared-contract package when the schema is intentionally shared with the API. Infer form types from schemas where possible. Yup remains installed for existing code but SHOULD NOT be introduced into new forms without a concrete compatibility reason.

Client validation improves feedback but does not replace API validation. Map structured server validation details back to the relevant fields where possible. Use mutation state for submission and avoid duplicating form submission status in local component state.

## 12. TypeScript and naming

- Preserve strict TypeScript settings. Do not introduce `any`; accept `unknown` at untrusted boundaries and narrow or parse it.
- Use shared API types and schemas instead of duplicating server contracts in the web app.
- Type component props, mutation inputs, and public exports. Let TypeScript infer local values and TanStack Query result types when inference is precise.
- Prefer `type` for unions and aliases; use `interface` for object shapes when extension or declaration merging is useful. Consistency within a feature matters more than syntax dogma.
- Do not add redundant aliases or explicit return annotations that make inferred library types harder to read.

| Artifact | Convention | Example |
|---|---|---|
| Component/page module | PascalCase | `CatalogGrid.tsx`, `AdminDashboardPage.tsx` |
| Hook | camelCase with `use` prefix | `useHistoricalCatalog.ts` |
| Service | camelCase with `Service` suffix | `historicalCatalogService.ts` |
| Query definitions | `queries.ts` or feature-specific query module | `features/historical-library/queries.ts` |
| Store | camelCase with `Store` suffix | `playerStore.ts` (only when justified) |
| Schema | descriptive camelCase | `catalogSchema.ts` |
| Public feature API | `index.ts` | `features/auth/index.ts` |
| API contract type | Follow `@repo/shared` naming | Avoid redefining a second web-only DTO |

## 13. Quality attributes

### Testing

Use the existing Bun Test and `happy-dom` setup for web tests. Test pure transformations and schemas directly, hooks/components through observable behavior, and important API flows at the feature boundary. Prefer realistic network/API behavior over mocking implementation details. Add or change tests when the task asks for them or when a change needs regression coverage under the project workflow.

### Performance

- Lazy-load substantial routes and feature modules where it reduces initial bundle cost.
- Measure before adding `memo`, `useMemo`, or `useCallback` broadly.
- Virtualize genuinely long lists and use query pagination/infinite-query patterns that match the API.
- Optimize image size, format, loading priority, and layout stability.
- Use the existing motion/animation libraries only where the interaction benefits from them; clean up imperative animations and subscriptions.

### Security

- Never store session tokens or secrets in `localStorage` or `sessionStorage`.
- Avoid `dangerouslySetInnerHTML`; if unavoidable, sanitize untrusted markup with a reviewed sanitizer.
- Keep authorization and input validation on the server. Treat client payloads and query results as untrusted until validated at the appropriate boundary.
- Keep request IDs useful for diagnostics, but never include credentials or sensitive payloads in logs.
- Coordinate CSP, CORS, cookie, and CSRF policy with the API and deployment configuration.

### Observability and resilience

Preserve API request IDs and error codes through UI reporting. Provide retry only when the request is safe to repeat. Give users a recoverable state for network failures without hiding useful cached content. Avoid noisy global notifications for errors already shown inline.

## 14. Implementation checklist

Before considering a frontend change complete, check the relevant items:

### Architecture

- [ ] Code belongs to the owning feature, route module, `shared/`, or `lib/` as defined above.
- [ ] No import points upward from `shared/` or `lib/` into app, page, or feature code.
- [ ] Cross-feature imports use the public entry point and do not create a cycle.
- [ ] New boundaries are covered by automated CI checks or recorded as a tooling gap.

### Components and state

- [ ] Component type is clear: presentational or feature-connected.
- [ ] API calls live in feature services, not UI components.
- [ ] Server data remains in TanStack Query; URL, form, local, and global client state have distinct ownership.
- [ ] Query keys include response-changing variables; mutations update or invalidate the correct keys.
- [ ] Optimistic updates include safe rollback behavior and are appropriate for the operation.

### API and authentication

- [ ] Uses the existing Hono/fetch transport and preserves cancellation where possible.
- [ ] Response parsing is runtime-validated where required; API errors retain useful structured fields.
- [ ] `/api/me` treats 401 as anonymous; sign-in 401 is not a global logout event.
- [ ] Protected-request session revalidation is limited to explicitly authenticated operations.
- [ ] Client-side role checks are not treated as server authorization.

### User experience and quality

- [ ] Query-backed views handle pending, error, empty, and success as applicable.
- [ ] Mutations expose pending and error feedback and avoid unsafe retries.
- [ ] Route and render failures have a recovery path.
- [ ] Form validation uses the established Zod/RHF pattern for new code.
- [ ] Semantic HTML, keyboard support, accessible names, and focus behavior are covered.
- [ ] Changes follow existing project checks and any task-specific verification request.

## 15. Architecture changes and maintenance

Changes to the router runtime, rendering model, API transport, authentication model, state ownership strategy, or cross-feature dependency policy require an ADR. Keep this document aligned with the actual manifests and source; update the stack table when dependencies or runtime behavior change. Code examples must match current TanStack Query v5 and React Router v7 APIs before being copied into production code.

When migrating existing code, prefer a sequence of small, reviewable changes: establish the public API, update consumers, then enforce the boundary in CI. Do not make an AI agent infer an exception from an old violation; state the exception explicitly or follow this document for new code.
