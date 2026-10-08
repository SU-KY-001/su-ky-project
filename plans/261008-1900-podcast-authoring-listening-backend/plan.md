---
title: "Backend: Moderator podcast authoring + basic listening"
description: "Implement backend for Moderator create podcast flow, Gate-2 AI import, and basic listening API"
status: pending
priority: P1
effort: 32h
branch: main
tags: [backend, prisma, hono, podcast, studio, listening, cloudinary]
blockedBy: []
blocks: []
created: 2026-10-08
---

# Backend: Moderator podcast authoring + basic listening (Sử Ký)

## Context

Implement the backend for the Moderator "create podcast" flow and the basic listening flow in `E:/FPT/Semester_8/WDP301/su-ky-project` (Bun 1.4 monorepo, Hono API `apps/api`, Prisma `packages/db`, Zod contracts `packages/shared`). Sources of truth:
- ERD: `E:/FPT/Semester_8/WDP301/su-ky-document/schema/schema_261008175553.dbml` (32 tables).
- API contract: `plans/reports/brainstorm-261008-api-contract-podcast-authoring-and-listening.md` (§0 conventions, §1–§8 endpoints/DTOs, §9 error codes, §11 decisions).
- Flow/import rules: `plans/reports/brainstorm-261008-content-schema-and-moderator-flow.md` §3.3 (Cloudinary), §3.4 (Gate-2 import mapping), §8 (success criteria).

Where this plan and those documents disagree, **this plan wins** (see "Deviations" below). Scope decided by the user: backend only; frontend gets only the minimal edits forced by the response-format cutover (studio/AI/player UI is built later by the FE team); dev DB is reset and the repo moves from `prisma db push` to `prisma migrate`; rate-limit counters live in Postgres; topics/historical periods come from seed data (no Admin CRUD).

End state: all endpoints in contract §1–§8 work with plain REST bodies + RFC 9457 problem+json, `Idempotency-Key` and rate limits enforced, Cloudinary upload/playback works, Gate-2 AI output imports into CMS tables in one transaction, listening progress awards XP once.

## Deviations from the design docs (binding)

ERD changes (apply in the Prisma schema; DBML is otherwise followed literally):
1. `series.start_year`, `series.end_year` are **nullable** (AI import creates Series without years). CHECKs: each year `<> 0` and `<= 1945` when not null; `start_year <= end_year` when both not null. Publish checklist item `YEAR_RANGE` requires both non-null.
2. `episode_narrations` gains `script_updated_at timestamptz(3)` (set only when `script_content` actually changes, and on import) and `audio_attached_at timestamptz(3)` (set when audio FK is set). They drive `SCRIPT_CHANGED_AFTER_AUDIO` (`script_updated_at > audio_attached_at`) and `origin.editedAfterImport` (`script_publication_id IS NOT NULL AND script_updated_at > created_at`). No hashing.
3. `idempotency_keys` gains `response_location varchar(2048)` (replayed 201s keep their `Location`).
4. `workflow_runs` gains `focus_hint text` (nullable).
5. New table `rate_limit_buckets(bucket_key varchar(255), window_start timestamptz(3), count int not null)`, PK `(bucket_key, window_start)`. Total 33 tables.
6. Every timestamp column is `@db.Timestamptz(3)` (millisecond precision so `baseUpdatedAt` equality works between JS `Date` and Postgres).
7. Trigram search uses an IMMUTABLE wrapper `immutable_unaccent(text)` (plain `unaccent()` is not IMMUTABLE and cannot be indexed). GIN trigram indexes on `immutable_unaccent(lower(title))` for `sources`, `series`, `episodes`, and on `immutable_unaccent(lower(name))` for `historical_entities`. Aliases are searched unindexed (`EXISTS (SELECT 1 FROM unnest(aliases) a WHERE immutable_unaccent(lower(a)) ILIKE …)`); the table is small.

Contract changes:
8. `scriptPublicationId`, `factCheckerVersionId` (= `step_versions.id`), `runId` are **integers**, not uuid.
9. XP for listening uses `xp_source_type = EPISODE_COMPLETION`, `source_id = episode_id`.
10. No `sources.accessedAt` field.
11. Media: `POST /studio/media-assets/:id/verify` takes **no body**; the server always calls Cloudinary Admin API. Code `MEDIA_SIGNATURE_INVALID` is dropped. Upload `fields` = `{ api_key, timestamp, signature, public_id, type, allowed_formats }`; `resource_type` is only in `upload.url` (`…/video/upload` for AUDIO, `…/image/upload` for IMAGE). AUDIO uses `type: "authenticated"`; IMAGE (covers) uses `type: "upload"` (public).
12. Error codes: `AUTH_REQUIRED` replaces `UNAUTHORIZED` for 401. Added: `BAD_REQUEST`(400), `PAYLOAD_TOO_LARGE`(413), `CONFLICT`(409, generic), `CONTENT_IN_TRASH`(409, mutation other than restore on trashed Series/Episode), `INVALID_STATE_TRANSITION`(409, e.g. hide a DRAFT), `IMPORT_NOT_AVAILABLE`(409, preview/import when FACT_CHECKER has no version), `SERVICE_UNAVAILABLE`(503), `INTERNAL_SERVER_ERROR`(500), `HTTP_ERROR`(other).
13. Import entity decisions: `action: "USE_EXISTING" | "CREATE" | "DROP"`; `CREATE` requires `entityType`; `itemKey` = `keyEntity.name.trim()`; duplicate names in `keyEntities` collapse to the first. A `catalogSourceId` that does not exist in `sources` is treated as "no catalogSourceId" (needs a decision).
14. `POST /script-workflows/:id/import`: first import → 201 + `Location: /api/script-workflows/:id/import`; repeat → 200 with the stored result. Only the run creator may import (existing run-ownership check); the "target series owner" alternative is dropped.
15. Trash: `DELETE` sets `status_before_delete = status`, `status = HIDDEN`, `deleted_at = now()`; restore sets `status = status_before_delete ?? DRAFT` and clears both. Hide from DRAFT → 409 `INVALID_STATE_TRANSITION`; publish/hide/restore already in target state → 200. `published_at` is set only when null.
16. `GET /api/me/listening-progress/:narrationId` with no row returns a zero DTO for the current audio asset (never 404 for "not started").
17. `GET /api/series/:slug` `viewer` = `null | { episodes: [{ episodeId, percent, isCompleted }] }`.
18. Listening bitmap encoding: second `i` is bit `i & 7` (LSB-first) of byte `i >> 3`; byte length = `ceil(ceil(durationMs/1000)/8)`; base64 standard alphabet.
19. THIRD_PERSON narration row is created together with every episode (empty `script_content`); it can never be deleted.

## Phases

| Phase | Name | File | Status |
|---|---|---|---|
| 1 | Database: schema rewrite, migrations, seed | [Phase 1](./phase-01-database-schema-migrations-seed.md) | Pending |
| 2 | HTTP core: problem+json cutover, config, rate limit, idempotency, slug | [Phase 2](./phase-02-http-core-infrastructure-rest-cutover.md) | Pending |
| 3 | Catalog + Series/Episode/Narration/Source/Tag CRUD | [Phase 3](./phase-03-content-studio-crud-api.md) | Pending |
| 4 | Media (Cloudinary), audio attach, cover URLs, cleanup jobs | [Phase 4](./phase-04-media-cloudinary-audio-cleanup.md) | Pending |
| 5 | AI Studio additions and Gate-2 import | [Phase 5](./phase-05-ai-studio-gate-2-import.md) | Pending |
| 6 | Listening (public browse, playback, progress, history, XP/missions) | [Phase 6](./phase-06-listening-public-playback-progress.md) | Pending |

## Critical files & anchors

- `packages/db/prisma/schema.prisma` — full rewrite; keep existing Prisma field names, add `@map`.
- `apps/api/src/core/middleware/errorHandler.ts` + `apps/api/src/app.ts` (lines 26-64 bodyLimit/notFound, 67-81 timeline stub, 83-90 mounts) — problem+json cutover and new mounts.
- `apps/api/src/modules/script-workflow/presentation/script-workflow.routes.ts` (`meta()` L37, `throwTransitionFailure` L42, every `success: true as const`) — envelope removal, import routes, seriesId filter.
- `apps/api/src/modules/script-workflow/application/workflow-command.service.ts` (`createRun` L23, `continueStep` L47 FACT_CHECKER branch L98-121) — reused inside the import transaction via tx-bound dependencies.
- `apps/api/src/modules/script-workflow/infrastructure/prisma-script-workflow.repository.ts` `getAncestry` (~L219-238) — raw SQL must move to snake_case columns with camelCase aliases, or the whole AI pipeline breaks after the `@map` rewrite.

## Verification

Prerequisites (repo root): `docker compose up -d postgres`; create test DB once: `docker exec suky-postgres createdb -U postgres suky_test`; copy `.env.test.example` → `.env.test`; `bun install`; `bun run --cwd packages/db db:test:reset` (applies migrations + seed to `suky_test`).

1. Phase 1: `packages/db/prisma/migrations/<ts>_init/migration.sql` exists and `bun run --cwd packages/db db:deploy` reports no pending migrations; `docker exec suky-postgres psql -U postgres -d suky_dev -c "\dt"` lists 33 tables + `_prisma_migrations`; `psql … -c "INSERT INTO series (id, owner_id, title, slug, start_year, end_year) VALUES (gen_random_uuid(), 'admin-default-id', 'x', 'x', 1950, 1960)"` fails with `series_year_range_check`; `SELECT immutable_unaccent('Đại Việt')` → `Dai Viet`.
2. Existing suite: `bun run test` (turbo) passes after every phase.
3. Integration tests (new), `apps/api/tests/integration/*.test.ts`, each `describe.skipIf(process.env.RUN_INTEGRATION !== "1")`, run with `cd apps/api && bun --env-file=../../.env.test test tests/integration`. Users are created through `POST /api/auth/sign-up/email` (bearer plugin returns `set-auth-token`), then `prisma.user.update({ role })`; requests send `Authorization: Bearer <token>`. Media tests mount `createMediaRoute` / narration audio routes with a fake `MediaStorageGateway`. Required cases (input → expected):
   - Lineage on snake_case columns (Phase 1): insert RESEARCHER → SOURCE_EVALUATOR → FACT_EXTRACTOR step versions chained by `parent_version_id`; `new LineageService(new PrismaScriptWorkflowRepository()).getAncestryLineage(<FACT_EXTRACTOR id>)` returns 3 nodes root-first with `stepType` and `outputJson` populated.
   - Internal parse failure is a 500: write an invalid value for `slug.max_length` into `system_configs`, `resetSystemConfigCache()`, create a series → 500 `INTERNAL_SERVER_ERROR` (not 400) and the idempotency row is deleted.
   - Problem format: `GET /api/studio/series` without auth → 401, `content-type: application/problem+json`, `code: "AUTH_REQUIRED"`, `requestId` equals `X-Request-Id`.
   - Idempotency: same key + body twice on `POST /api/studio/series` → second 201 with `Idempotent-Replayed: true`, same `id`, one row in `series`; same key, different title → 422 `IDEMPOTENCY_KEY_REUSED`; no key → 400 `IDEMPOTENCY_KEY_REQUIRED`.
   - Slug: two Series titled "Khởi nghĩa Hai Bà Trưng" → slugs `khoi-nghia-hai-ba-trung` and `khoi-nghia-hai-ba-trung-xxxx` (`/^khoi-nghia-hai-ba-trung-[a-z0-9]{4}$/`); PATCH slug after publish → 409 `SLUG_LOCKED`.
   - Rate limit: set `rate_limit.write` to `{limit:2,windowSeconds:60}` in `system_configs`, clear the config cache, 3 PATCHes → third 429 `RATE_LIMITED` with `Retry-After`.
   - Path A (no AI): create series (topic, period, years) → episode → PUT THIRD_PERSON script → add source → media create/verify (fake gateway returns duration 600s) → PUT audio → publish episode 200 → publish series 200 → `GET /api/episodes/:slug` as guest 200 without any audio URL; `GET /api/narrations/:id/playback` guest 401, logged-in 200 with URL.
   - Publish guard: episode without audio → 422 `EPISODE_NOT_PUBLISHABLE`, `checklist.items` has `THIRD_PERSON_AUDIO ok:false`.
   - Stale write: PATCH series with an old `baseUpdatedAt` → 409 `STALE_WRITE` with `current`.
   - Audio replace on published episode without confirm → 409 `REPLACE_CONFIRMATION_REQUIRED`; with confirm → 200 and old asset `detached_at` set; media cleanup handler with grace 0 calls fake `destroy` for the old asset only and marks it `DELETED`.
   - Import (Path B): seed a run directly in Postgres with step versions for all 7 steps (fixture JSON valid against `STEP_OUTPUT_SCHEMAS`: 10 sources of which 2 removed and one `custom-src-1` added via a DIRECT_EDIT version → 9 sources, one with a valid `catalogSourceId`), FACT_CHECKER `WAITING_FOR_HUMAN`. `POST /import` with decisions → 201, 3 DRAFT episodes with THIRD_PERSON scripts equal to ORALIZER text, each with 9 `episode_sources`, the `custom-src-1` rows `origin = MODERATOR`, no new row for the catalogued source; repeat with a new Idempotency-Key → 200 same result, still 3 episodes; missing decision → 422 `IMPORT_DECISIONS_INCOMPLETE` with `missingItemIds`.
   - Concurrent import: two `POST /import` with different Idempotency-Keys fired with `Promise.all` → one 201 and one 200 with the same `seriesId`; exactly 3 episodes exist.
   - Listening: PUT progress with bitmap covering 100% of a 600s audio immediately → only `ceil(15*2*1)` = 30 new seconds accepted; simulate elapsed time by setting `last_listened_at` back 10 minutes then PUT full bitmap → `completedAt` set, `completion.xpAwarded = 20`, `users.total_xp` +20; repeat → `completion: null`, XP unchanged; a COMPLETE_EPISODE weekly mission with target 1 active this week → `missions[0].completedNow: true`, `xpAwarded` = its reward. PUT with an old `assetId` → 409 `AUDIO_CHANGED`.
4. Manual Cloudinary smoke (real account; set `CLOUDINARY_*` in `.env`): `bun run dev`; with a moderator bearer token: `POST /api/studio/media-assets` (`Idempotency-Key`) → upload a small mp3 with `curl -F file=@sample.mp3 -F` each returned field to `upload.url` → `POST /:id/verify` → 200 READY with `durationMs` matching the file; open the `previewUrl` (plays); `curl -I -H "Range: bytes=0-1023" <previewUrl>` returns 206 (byte-range support for seeking on signed authenticated URLs; if it returns 200, record it in the PR description — playback still works, seeking may re-download).
5. Web: `bun run --cwd apps/web check-types` and open the home page with the API running — health grid shows "Online & Healthy", timeline section renders (empty list).

## Assumptions & contingencies

- If Better Auth sign-up via `app.request` does not return `set-auth-token` in tests, create the session row directly (`prisma.session.create` with a random token) and send it as `Authorization: Bearer <token>`; do not change auth configuration for tests.
- If `cloudinary.api.resource` does not return `duration` for authenticated audio on the account in use, request it with `media_metadata: true`; if still absent, treat as `MEDIA_INVALID` (do not trust client duration).
- If a pg-boss `schedule` call fails because the queue does not exist, call `createQueue` first (pg-boss ≥10 requires it); maintenance job failures must not stop request handling once started.
