# Podcast Release Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production release workflow in which Admin schedules and assigns podcast work, moderators submit reviewed revisions, and a dedicated pg-boss worker publishes approved episodes automatically with recovery and an Admin-facing release tracker.

**Architecture:** A new release vertical slice owns scheduling, assignment, review and operational audit data. Both the Admin fallback action and pg-boss worker call the same idempotent publication service; delayed jobs are backed by a transactional outbox and a reconciliation schedule. Web workspaces compose role-specific navigation and data on top of shared dashboard primitives.

**Tech Stack:** Bun 1.4, TypeScript, Hono, Prisma/PostgreSQL, pg-boss, Zod, React 19, React Router 7, TanStack Query, Tailwind v4, bun:test.

**Spec:** `docs/superpowers/specs/2026-10-15-podcast-release-orchestration-design.md`

## Global Constraints

- Admin schedules and assigns work but does not edit podcast content.
- All valid schedules are automatically published; there is no manual/automatic mode field.
- Manual publish is an exception-recovery action and calls the same use case as the worker.
- Keep public visibility status (`DRAFT`, `PUBLISHED`, `HIDDEN`) separate from review and release status.
- Store timestamps as UTC `TIMESTAMPTZ`; display them in `Asia/Ho_Chi_Minh`.
- Reuse PostgreSQL and pg-boss; do not add Redis/BullMQ or another runtime dependency.
- Shared web dashboard components must not import from `features/moderator`.
- User-facing copy uses “Theo dõi phát hành”, “Tiến độ phát hành” and “Lịch sử phát hành”, never raw “Audit log”.
- Follow TDD for behavior changes. Migration and generated Prisma client are mechanical artifacts.
- Git commits are omitted because the user explicitly declined the proposed add/commit workflow.

## Review Focus

- A stale delayed job for an old schedule version must not publish after rescheduling.
- Two workers or an Admin action racing on one schedule must publish at most once.
- Editing content after approval must invalidate readiness instead of publishing an unreviewed revision.
- A due schedule without an approved, publishable episode must become `BLOCKED`, not retry forever.
- Worker restart or an outbox dispatch failure must be recovered by reconciliation without losing the schedule.

---

### Task 1: Shared contracts and release state policy

**Files:**
- Create: `packages/shared/src/schemas/release.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/src/modules/releases/domain/release.entity.ts`
- Create: `apps/api/src/modules/releases/domain/release-policy.ts`
- Test: `apps/api/tests/release-policy.test.ts`

**Interfaces:**
- Produces: `ReleaseScheduleStatusSchema`, `EpisodeReviewStatusSchema`, create/update/review DTO schemas and `evaluateReleaseReadiness(input, now): ReleaseReadiness`.
- Consumes: existing shared timestamp and UUID conventions.

- [ ] Write policy tests for ready, at-risk, blocked-at-due-time, stale revision and terminal schedules.
- [ ] Run `bun test tests/release-policy.test.ts` from `apps/api`; expect failure because the release policy does not exist.
- [ ] Add Zod contracts, domain types and the minimal pure policy implementation.
- [ ] Re-run the targeted test; expect all policy cases to pass.
- [ ] Run `bun run check-types` in `packages/shared` and `apps/api`.

### Task 2: Persistence schema and release repository

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20261015120000_release_orchestration/migration.sql`
- Create: `apps/api/src/modules/releases/domain/release.repository.ts`
- Create: `apps/api/src/modules/releases/infrastructure/prisma-release.repository.ts`
- Test: `apps/api/tests/release-repository.test.ts`
- Modify: `apps/api/tests/support/integration.ts`

**Interfaces:**
- Consumes: Task 1 statuses and DTO-aligned entity names.
- Produces: `ReleaseRepository` and `PrismaReleaseRepository` supporting schedules, assignments, reviews, atomic claim, audit/outbox persistence and dashboard queries.

- [ ] Write opt-in PostgreSQL integration tests for schedule creation, assignment replacement, review revision uniqueness, atomic claim and immutable audit history.
- [ ] Run the integration test against the test database when `RUN_INTEGRATION=1`; otherwise confirm it is explicitly skipped.
- [ ] Add enums/models/relations/indexes and a forward migration.
- [ ] Generate Prisma client with `bun run db:generate` from the repository root.
- [ ] Implement the repository methods required by the tests.
- [ ] Run repository tests and `bun run check-types` in `packages/db` and `apps/api`.

### Task 3: Scheduling, review and idempotent publication application service

**Files:**
- Create: `apps/api/src/modules/releases/application/release.service.ts`
- Create: `apps/api/src/modules/releases/application/release.mappers.ts`
- Modify: `apps/api/src/modules/content/infrastructure/historical-evidence.ts`
- Modify: `apps/api/src/modules/content/application/content.service.ts`
- Test: `apps/api/tests/release-service.test.ts`
- Modify: `apps/api/tests/podcast-core.test.ts`

**Interfaces:**
- Consumes: `ReleaseRepository`, Task 1 policy, existing publication checklist/evidence transaction.
- Produces: `ReleaseService.createSchedule`, `updateSchedule`, `replaceAssignees`, `submitReview`, `reviewEpisode`, `publishDueSchedule`, `publishNow`, `retrySchedule`, `cancelSchedule`, `listDashboard` and `listProgress`.

- [ ] Write service tests covering Admin-only scheduling, assigned moderator submission, self-review rejection, approved revision lock, blocked due schedule and publication race.
- [ ] Run targeted tests; expect missing service failures.
- [ ] Allow system publication audit with `actorId: null` while retaining lock/checklist rules.
- [ ] Implement scheduling/review methods and one shared publication path.
- [ ] Restrict direct episode publication to Admin so moderator publication must follow review/schedule flow.
- [ ] Re-run targeted tests and API type-check.

### Task 4: pg-boss outbox dispatcher, delayed worker and reconciliation

**Files:**
- Create: `apps/api/src/core/jobs/release-jobs.ts`
- Create: `apps/api/src/worker.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/core/jobs/maintenance-jobs.ts`
- Modify: `apps/api/package.json`
- Modify: `packages/shared/src/schemas/health.ts`
- Modify: `apps/api/src/routes/health.ts`
- Test: `apps/api/tests/release-jobs.test.ts`

**Interfaces:**
- Consumes: `ReleaseService.publishDueSchedule`, repository outbox/reconciliation queries.
- Produces: `startReleaseJobs`, `stopReleaseJobs`, `dispatchReleaseOutbox`, `reconcileReleaseSchedules` and standalone `bun run worker` entrypoint.

- [ ] Write tests with a fake clock/repository for `startAfter`, retry metadata, stale version, outbox recovery and blocked schedules.
- [ ] Run targeted tests; expect missing job functions.
- [ ] Implement queue creation, delayed send, worker handler and reconciliation schedule using pg-boss.
- [ ] Expose worker health separately from maintenance queue health.
- [ ] Re-run targeted tests and API type-check.

### Task 5: Hono routes and OpenAPI contract

**Files:**
- Create: `apps/api/src/modules/releases/presentation/release.routes.ts`
- Create: `apps/api/src/modules/releases/index.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/routes/docs/schemas.ts`
- Modify: `apps/api/src/routes/docs/paths/studio.ts`
- Modify: `apps/api/src/routes/docs/paths/system-auth.ts`
- Test: `apps/api/tests/release-http.test.ts`
- Modify: `apps/api/tests/openapi.test.ts`

**Interfaces:**
- Consumes: Task 1 request schemas and Task 3 service.
- Produces: Admin schedule/dashboard/history endpoints and moderator assignment/review endpoints through Hono RPC.

- [ ] Write HTTP tests for authentication, role boundaries, validation, schedule CRUD/actions, assigned work and progress history.
- [ ] Run targeted HTTP tests; expect 404/missing route failures.
- [ ] Add `/api/admin/releases/*` and `/api/studio/releases/*` routes with rate limiting and validation.
- [ ] Document every operation and response in OpenAPI.
- [ ] Re-run HTTP/OpenAPI tests and API type-check.

### Task 6: Shared dashboard shell and Admin overview

**Files:**
- Refactor: `apps/web/src/shared/components/dashboard/SharedDashboard.tsx`
- Create: `apps/web/src/shared/components/dashboard/WorkspaceShell.tsx`
- Create: `apps/web/src/shared/components/dashboard/DashboardOverview.tsx`
- Move/refactor: moderator dashboard cards/charts into `apps/web/src/shared/components/dashboard/`
- Modify: `apps/web/src/features/moderator/components/ModeratorShell.tsx`
- Modify: `apps/web/src/features/moderator/components/ModeratorDashboard.tsx`
- Create: `apps/web/src/features/admin-release/services/adminReleaseService.ts`
- Create: `apps/web/src/features/admin-release/hooks/useAdminReleases.ts`
- Create: `apps/web/src/features/admin-release/components/AdminReleaseDashboard.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx`
- Test: `apps/web/src/features/admin-release/components/AdminReleaseDashboard.test.tsx`
- Test: `apps/web/src/shared/components/dashboard/WorkspaceShell.test.tsx`

**Interfaces:**
- Consumes: Task 5 Hono RPC endpoints.
- Produces: role-neutral shell/dashboard primitives and Admin metrics “Sắp phát hành”, “Sẵn sàng phát hành”, “Có nguy cơ trễ”, “Cần xử lý”.

- [ ] Write rendering tests proving Admin and Moderator share the shell while preserving their own navigation/profile/logout behavior.
- [ ] Run targeted tests; expect missing shared shell/Admin overview failures.
- [ ] Extract role-neutral primitives without importing moderator feature code from shared files.
- [ ] Implement Admin query hooks and “Theo dõi phát hành” overview with loading/empty/error states.
- [ ] Re-run targeted tests and web type-check.

### Task 7: Admin release workspace and Moderator assigned work

**Files:**
- Create: `apps/web/src/features/admin-release/components/ReleaseScheduleForm.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseCalendar.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseProgressTimeline.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseHistory.tsx`
- Create: `apps/web/src/features/moderator/components/ModeratorAssignments.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx`
- Modify: `apps/web/src/pages/moderator/ModeratorWorkspacePage.tsx`
- Modify: `apps/web/src/features/moderator/navItems.ts`
- Modify: `apps/web/src/features/moderator/types.ts`
- Test: `apps/web/src/features/admin-release/components/ReleaseWorkspace.test.tsx`
- Test: `apps/web/src/features/moderator/components/ModeratorAssignments.test.tsx`

**Interfaces:**
- Consumes: Task 5 APIs and Task 6 shared shell.
- Produces: Admin create/reschedule/assign/retry/cancel/publish-now UI, progress/history views and Moderator “Nhiệm vụ của tôi” submission UI.

- [ ] Write interaction tests for schedule creation, exception actions, friendly progress copy and moderator submission permissions.
- [ ] Run targeted tests; expect missing workspace failures.
- [ ] Implement schedule form/list/calendar, progress timeline and release history.
- [ ] Implement Moderator assigned-work view and submit-for-review action.
- [ ] Re-run targeted tests and web type-check.

### Task 8: Production verification and documentation alignment

**Files:**
- Modify: `apps/api/CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-10-15-podcast-release-orchestration-design.md` only if implementation rulings require clarification.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified release slice and deployment instructions for separate API/worker processes.

- [ ] Run API, web, shared and database type-checks.
- [ ] Run complete API and web test suites and report every pre-existing failure by name.
- [ ] Run production builds.
- [ ] Confirm OpenAPI route coverage, worker graceful shutdown and health response.
- [ ] Document the new endpoints, worker command, migration and operational metrics in the changelog.
- [ ] Perform a final requirements review against the spec and record any deferred production integrations.
