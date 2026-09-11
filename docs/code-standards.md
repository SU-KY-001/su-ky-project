# Su-Ky Monorepo — Engineering & Code Standards

> **Production Standards, Type-Safety Protocols, and Architectural Discipline**  
> **Target:** All engineers contributing to `apps/*` and `packages/*`  
> **Status:** Strictly Enforced Baseline

---

## 1. Package Management & Runtime Standards

### 1.1 Strict Bun 1.4.0 Requirement
The Su-Ky monorepo strictly pins its runtime and package manager to **Bun v1.4.0**.
- The root `package.json` specifies `"packageManager": "bun@1.4.0"`.
- Developers must not run `npm`, `yarn`, or `pnpm` inside this repository; running other package managers invalidates `bun.lock` and corrupts workspace links.

### 1.2 Isolated Linker Configuration (`bunfig.toml`)
To prevent **phantom dependencies** (where a package silently relies on a transitive dependency installed by a sibling package), `bunfig.toml` configures an isolated linker:

```toml
[install]
# Strict isolated linker to prevent phantom dependencies
linker = "isolated"
linkWorkspacePackages = true
publicHoistPattern = ["@repo/*"]
```

**Rule:** If an application requires a dependency, it must declare it explicitly in its own `package.json`. Never assume a dependency exists just because it is installed in another workspace.

### 1.3 Turborepo Pipeline Discipline (`turbo.json`)
All workspace build and verification tasks must be routed through Turborepo:
- **Build Topological Order:** `"dependsOn": ["^build"]` ensures packages are built before consuming apps.
- **Environment Tracking:** Any environment variable accessed during build must be declared in `"globalEnv"`.
- **Cache Integrity:** Never mark mutating tasks (`db:generate`, `db:seed`, `db:push`) as cacheable.

---

## 2. TypeScript & Type-Safety Discipline

### 2.1 The Zero `any` Policy
The use of `any` is strictly prohibited across the monorepo:
- **Forbidden:**
  ```ts
  // REJECTED: Disables type checking
  function processData(data: any) { ... }
  const result = response as any;
  ```
- **Required:**
  - For unknown external payloads, use `unknown` and validate via Zod schema before consumption.
  - For polymorphic structures, use TypeScript generics with constraints (`<T extends Record<string, unknown>>`).
  - Derive static types from Zod schemas using `z.infer<typeof Schema>`.

### 2.2 Verbatim Module Syntax & Bundler Resolution
All tsconfig files inherit from `@repo/tsconfig/base.json`:
- `"verbatimModuleSyntax": true`: Enforces explicit `import type` for type-only imports. This prevents unused imports from lingering in runtime bundles and avoids circular reference bugs.
- `"moduleResolution": "bundler"`: Matches the native resolution mechanics of Vite and Bun.

```ts
// CORRECT: Explicit type import
import type { EpisodeDto, ApiResponse } from "@repo/shared";
import { EpisodeSchema } from "@repo/shared";

// REJECTED: Mixed import without type modifier
import { EpisodeDto, EpisodeSchema } from "@repo/shared";
```

### 2.3 Shared TSConfig Inheritance
Never create standalone compiler options from scratch. Always extend the appropriate preset from `@repo/tsconfig`:

| Workspace | Extends | Target Environment |
| :--- | :--- | :--- |
| `packages/shared` | `@repo/tsconfig/base.json` | Pure TypeScript contracts |
| `packages/db`, `apps/api` | `@repo/tsconfig/bun.json` | Bun server runtime with `bun-types` |
| `apps/web` | `@repo/tsconfig/react.json` | React 19 browser environment (`jsx: "react-jsx"`) |

---

## 3. Zod Validation & Schema Discipline

### 3.1 Single Source of Truth (`packages/shared`)
All data contracts spanning network boundaries must be defined as Zod schemas inside `packages/shared/src/schemas/`:
- Never declare ad-hoc validation logic inside route controllers.
- Schemas must export both the Zod validator and the inferred TypeScript DTO:

```ts
// packages/shared/src/schemas/podcast.ts
import { z } from "zod";

export const EpisodeSchema = z.object({
  id: z.string().uuid().optional(),
  seriesId: z.string().uuid(),
  title: z.string().min(1, "Episode title is required"),
  slug: z.string().min(1, "Slug is required"),
  audioUrl: z.string().min(1, "Audio URL is required"),
  durationSeconds: z.number().int().positive().default(600),
  playCount: z.number().int().default(0),
});

export type EpisodeDto = z.infer<typeof EpisodeSchema>;
```

### 3.2 Network Boundary Validation with `@hono/zod-validator`
Validate every request parameter, query string, and body payload before it enters route logic:
- Use `z.coerce` for query parameters (since HTTP query strings are strings).
- Provide custom error formatting that preserves the monorepo's uniform `ApiResponse` envelope:

```ts
// apps/api/src/routes/episodes.ts
export const episodesRoute = new Hono<{ Variables: { requestId: string } }>()
  .get(
    "/",
    zValidator("query", EpisodeFilterQuerySchema, (result, c) => {
      if (!result.success) {
        const reqId = c.get("requestId") ?? "unknown";
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid query parameters",
              details: result.error.flatten(),
            },
            meta: {
              requestId: reqId,
              timestamp: new Date().toISOString(),
            },
          },
          400
        );
      }
    }),
    async (c) => {
      const { period, category, page, limit } = c.req.valid("query");
      // Business logic with guaranteed type-safe parameters
    }
  );
```

---

## 4. Hono RPC Type Sharing & API Contract

### 4.1 Route Chaining for Complete Type Inference
Hono RPC relies on TypeScript's compiler inferring the full type graph through method chaining.
- **Rule:** When registering routes in `apps/api/src/app.ts`, chain `.route(...)` calls directly on the app instance.
- **Rule:** Never assign an intermediate un-chained route or cast with `as unknown as Hono`.

```ts
// apps/api/src/app.ts
export const app = new Hono<AppEnv>()
  .use("*", requestId())
  .use("*", requestLogger())
  .use("*", corsConfig())
  .onError(errorHandler);

export const routes = app
  .route("/health", healthRoute)
  .route("/api/timeline", timelineRoute)
  .route("/api/series", seriesRoute)
  .route("/api/episodes", episodesRoute)
  .route("/api/figures", figuresRoute);

export type AppType = typeof routes;
```

### 4.2 Type Export Without Runtime Leakage
`apps/api/package.json` exposes its TypeScript type definitions without requiring `apps/web` to bundle the backend code:

```json
// apps/api/package.json
{
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/app.ts"
  }
}
```

### 4.3 Type-Safe Client Consumption (`apps/web`)
In `apps/web/src/lib/api.ts`, initialize the client with `hc<AppType>`:

```ts
// apps/web/src/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "@repo/api/types";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const client = hc<AppType>(apiUrl);
```

**Client Calling Convention:**
```ts
// Client call with automatic type inference, autocomplete, and parameter checking
const res = await client.api.episodes.$get({
  query: {
    period: "trieu-tran",
    limit: 10,
    page: 1,
  },
});

if (res.ok) {
  const payload = await res.json(); // Type is fully inferred as ApiResponse<Episode[]>
}
```

---

## 5. Prisma ORM & Database Discipline

### 5.1 Schema Conventions (`schema.prisma`)
1. **Model Names:** PascalCase singular (`Period`, `Series`, `Episode`, `Citation`, `Figure`).
2. **Field Names:** camelCase (`orderIndex`, `durationSeconds`, `birthYear`).
3. **Database Table Mapping:** Always use `@@map("snake_case_plural")`:
   ```prisma
   model Episode {
     id       String @id @default(uuid())
     seriesId String
     // ...
     @@map("episodes")
   }
   ```
4. **Relational Deletion Discipline:**
   - Use `onDelete: Cascade` when children have no lifecycle independent of the parent (e.g., `Episode` -> `Citation`).
   - Use `onDelete: SetNull` for optional associations where child records should persist if the parent is removed (e.g., `Period` -> `Series`).

### 5.2 Prevention of N+1 Queries
Sequential queries within loops are forbidden. Always utilize Prisma's relation inclusions, selections, and count aggregations:

```ts
// CORRECT: Single batch query with relation inclusion and aggregations
const series = await prisma.series.findMany({
  include: {
    period: { select: { id: true, name: true, slug: true } },
    _count: { select: { episodes: true } },
  },
  orderBy: { createdAt: "desc" },
});

// FORBIDDEN: Looping over results and executing individual child queries
for (const s of series) {
  const count = await prisma.episode.count({ where: { seriesId: s.id } }); // N+1 query!
}
```

### 5.3 Singleton Prisma Client Pattern (`packages/db/src/client.ts`)
In development, module reloading creates new instances of `PrismaClient`, quickly exhausting PostgreSQL's connection pool. The client must be attached to `globalThis`:

```ts
// packages/db/src/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export default prisma;
```

### 5.4 Database Seeder Discipline (`packages/db/src/seed.ts`)
- Seed operations must be **idempotent**: use `upsert` with unique slugs or `createMany` with `skipDuplicates: true`.
- Always ensure connection teardown inside a `finally` block:
  ```ts
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  ```

---

## 6. Code Hygiene & Production Checklist

Before any pull request or merge:

1. **No Temporary Markers:** No `TODO`, `FIXME`, `HACK`, or `XXX` in production code.
2. **No Dead Code:** Delete commented-out code blocks immediately.
3. **Structured JSON Logs:** All backend request logs must emit JSON with `timestamp`, `reqId`, `method`, `path`, `status`, and `latencyMs`.
4. **Correlation ID Tracking:** Every client request must carry or receive an `X-Request-Id` UUID header.
5. **Standard Error Envelope:** Every API failure must conform to `ApiResponse<never>` with standard error codes (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`).
