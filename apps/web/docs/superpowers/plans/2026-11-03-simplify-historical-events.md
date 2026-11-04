# Simplify Historical Events Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, task by task.

**Goal:** Remove event evidence/review persistence and series publication dependencies while keeping the existing historical creation form and independent podcast sources.

**Architecture:** Preserve event creation inputs and technical revision/parent metadata. Strip removed fields from shared event contracts, remove event evidence/review endpoints, update persistence and publication queries, then adapt all event consumers and the six-column event table.

**Tech Stack:** React 19, Hono, Zod, Prisma, Bun.

**Spec:** `apps/web/docs/superpowers/specs/2026-11-03-simplify-historical-events-design.md`, with the user's clarification: existing creation fields and flow must remain unchanged in FE and backend.

## Global Constraints

- Existing Tạo nội dung lịch sử form remains the creation entry point with unchanged input attributes.
- Keep independent sources/documents and review requirements in the podcast flow.
- Event table columns: Sự kiện, Thời kỳ, Giai đoạn, Mốc thời gian, Podcast, Thao tác.
- Use DashboardRowActions detail button and a popup; no expandable event rows.
- Prepare, do not apply, destructive data migration. No git mutation or autonomous browser worker required.

## Review Focus

- Event with no citation or review must not block series publication.
- Removed citation ownership must not delete source documents or pinned podcast source revisions.
- Unknown/approximate historical time accepted by the existing create form remains accepted on save.
- Row click cannot open an expansion; detail buttons target the correct event.
- Stale versions and deleted/inactive parents remain protected.

### Task 1: API, persistence and publication

**Files:** shared historical schemas; catalog domain/service/presenter/repository/routes; content historical evidence; Prisma schema and a new migration; API tests and OpenAPI.

**Interfaces:** Keep HistoricalEntityInputSchema/PatchHistoricalEntitySchema inputs; HistoricalEntityDetailSchema no longer exposes source/review fields. Preserve versioned event links and standalone podcast evidence.

- [x] Add and run regression tests for event response fields and publication without event sources/review.
- [x] Remove event review writes/routes and event source routes; remove source/review fields from event responses and storage schema.
- [x] Prepare migration removing obsolete event evidence and preserving source/podcast records.
- [x] Adapt public events and series publication to independent event validity checks; retain podcast source checks.
- [x] Update OpenAPI and run targeted API/shared tests.

### Task 2: Frontend consumers

**Files:** HistoricalCatalogList, HistoricalEventDetail, HistoricalBranchContent, HistoricalLibraryWorkspace, historicalCatalogService, PodcastWorkspace, public event detail and associated tests/fixtures.

**Interfaces:** Consume simplified shared DTO; use existing historical create inputs and shared dashboard/dialog controls.

- [x] Add and run regression test for six table columns, no expansion, detail dialog and no source/review requests.
- [x] Replace event table expansion with detail popup; remove review filter and removed fields.
- [x] Adapt tree/detail/public/podcast event consumers without modifying podcast sources or create behavior.
- [x] Run focused frontend tests and type checks.

### Task 3: Verification and review

- [x] Run repository test suites and type checks; report existing failures separately if found.
- [x] Fresh independent review of changed files, fix important findings, and rerun affected checks.
- [x] Record migration and browser-verification limitations accurately.

## Execution ledger

- Ruling: Implement directly in the current authorized workspace, with no automatic commits/worktree changes; the user approved immediate implementation and project permission rules restrict git operations.
- Ruling: The two clarification questions are exhausted and implementation is explicitly approved; no additional plan approval round.
- Task 1: complete in source. Simplified shared DTO/public event contracts, removed event review writes/routes and Prisma review columns, rejected EVENT citation writes while retaining FIGURE/taxonomy citation support, updated series publication SQL and docs. Prepared migration; not applied to the live database.
- Task 2: complete. Six-column event table with direct detail dialog and ordinary rows; no event source/review requests. Kept creation inputs/handlers. Adapted public web and mobile event consumers and podcast event summary.
- Ruling: Entity citation endpoints remain available for FIGURE compatibility but explicitly reject EVENT in service and repository; the source-less event contract is enforced rather than disabling unrelated figure citations.
- Fresh independent review: found a mobile consumer still reading event citations; removed its obsolete source section. Removed duplicate citation-owner guards and corrected the obsolete event draft toast. No remaining Critical/Important findings reported.
- Verification: full web suite 259 passed, 0 failed. Focused API/OpenAPI/database suite 16 passed, 0 failed, including actual series publication without event sources/review and preservation of independent source verification. Migration passed in an isolated test schema with complete transaction rollback and preserved source/document/revision data.
- Verification: API typecheck passed; Prisma schema validation passed. Web typecheck has two unrelated implicit-this errors in ExhibitionExperience.test.tsx:26–27. Mobile typecheck has two existing missing expo-image module declarations; its navigation tests passed (2/2).
- Broader API checks: nonintegration suite 332 passed, 148 skipped, 3 failed (DomainError code/status consistency and two studio role-isolation tests). Full integration run also encountered outdated test DB (missing episode_narrations.dialogue) and fake PDF/provider failures; do not report the entire API suite as green.
- Browser verification not performed: project rules prohibit autonomous browser execution without an explicit browser request. DOM interaction tests cover table/detail behavior.
- Production migration status: only 20261103060000_simplify_historical_events is pending. Applying it deletes obsolete event citations/review fields and needs the final database approval specified in the design.
