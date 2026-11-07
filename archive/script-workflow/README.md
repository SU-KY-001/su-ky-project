# Archived: AI-first script workflow (v1)

Static snapshot, **not buildable as-is**. Nothing under `archive/` is imported by `apps/` or `packages/`,
and test files carry a `.test.ts.txt` suffix so `bun test` never runs them.

Runnable version: git tag `archive/script-workflow-v1` (the commit right before the Phase 0 cutover).

## What was here
A 7-step AI pipeline (researcher, source evaluator, fact extractor, story planner, script writer, oralizer, fact checker)
with 3 moderator approval gates, a pg-boss job queue, six DB tables, an importer that wrote results into the CMS
(series/episodes/narrations), publication records and the moderator UI.

| Folder | Content |
|---|---|
| `api/` | Former `apps/api/src/modules/script-workflow` (minus the engine files) plus `docs-paths-script-workflow.ts` (OpenAPI paths) |
| `api-tests/` | Former API tests, renamed `*.test.ts.txt` |
| `shared/` | Former `packages/shared/src/schemas/script-workflow/**` and `schemas/content/import.ts` |
| `web/` | Former `features/script-workflow` and `pages/moderator/script-workflows` |
| `db/` | `schema.fragment.prisma` (5 models + `AudioProvider` + the narration/relations to re-add) and `create.sql` (DDL to restore the tables/columns) |
| `docs/` | Former REST contract and UX docs |
| `deps.md` | Env vars and dependencies the workflow used |

## Relation to `ai-engine`
The generic LLM part (Pi runtime, `runStructuredAgent`, schema-retry, tracer) stayed live in
`apps/api/src/modules/ai-engine`. The archived `pi-step-agent.ts` called the old signature
`runStructuredAgent(systemPrompt, userPrompt, schema, options)` and a tracer that persisted into `workflow_events`;
the engine now takes one request object (`{ systemPrompt, userPrompt, schema, tools, label, onEvent }`) and only logs/calls back.

## Restoring
1. Move `api/` back to `apps/api/src/modules/script-workflow`, `shared/` to `packages/shared/src/schemas`, `web/` to `apps/web/src`.
2. Add `db/schema.fragment.prisma` to `schema.prisma`, and apply `db/create.sql` as a new migration.
3. Patch the importer: it targets `EpisodeSource`/`historicalPeriodId`, which later phases replace with `SeriesSource`/`historicalPhaseId`.
4. Re-wire route, queue start/stop, health and docs paths; adapt `pi-step-agent.ts` and `pi-tracer` usage to the engine API.
