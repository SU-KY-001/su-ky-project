# Release Workspace Kanban Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate release calendar and production-coordination screens with one Admin release workspace offering a four-column Kanban view, a traditional table view, direct edit dialogs, and policy-safe drag transitions.

**Architecture:** Keep release state transitions in the API domain service and expose commands rather than a generic status setter. The web layer uses one workspace controller for queries, filters, selection and mutations, then passes normalized data into separate Kanban and table presentation components. Existing dashboard tokens, `CardBadge`, Radix dialog primitives and release audit infrastructure remain authoritative.

**Tech Stack:** Bun, TypeScript, React 19, React Query, Hono, Zod, Prisma, Tailwind CSS v4, Radix UI, Phosphor Icons.

**Spec:** `docs/superpowers/specs/2026-10-15-release-workspace-kanban-redesign.md`

## Global Constraints

- Kanban has exactly four columns: `SCHEDULED`, `READY_TO_PUBLISH`, `PUBLISHING`, `RELEASED`.
- `BLOCKED` and `FAILED` render in “Cần xử lý”; `CANCELLED` is available through table/history filtering.
- Clicking a Kanban card or table row opens the edit form directly; there is no view-only dialog mode.
- Do not add a generic set-status endpoint or allow Admin to force `PUBLISHING → RELEASED`.
- Drag uses native browser drag events and must have a keyboard/touch action-menu fallback; add no drag-and-drop dependency.
- Same-column drag is a no-op because manual card order is not persisted.
- Keep the current Be Vietnam Pro typography, moderator/admin color tokens and shared UI primitives; do not copy global CSS or navigation from `client`.
- The linked podcast is shown read-only in the first edit iteration; moderator linking remains the existing studio workflow.
- Every behavior change follows red-green-refactor and every task ends with focused verification.

## Review Focus

- A stale approval revision or incomplete checklist must reject readiness, keep the card in `SCHEDULED`, and explain the reason; Task 1 pins this with service tests and Task 7 pins UI rollback/refetch.
- A worker changing a schedule while an Admin edits or drags it must result in conflict/refetch rather than overwriting newer state; Tasks 1, 3 and 6 test stale/invalid transitions.
- Keyboard and touch users must be able to execute every allowed drag command through the card action menu; Task 4 tests the fallback.
- A board column with more than 50 records must expose its own pagination/load-more state instead of silently truncating data; Tasks 2, 3 and 4 test totals and page changes.
- `BLOCKED`, `FAILED` and `CANCELLED` must never disappear when the four-column board is active; Tasks 5 and 7 test attention and table/history access.

---

### Task 1: Add the policy-safe readiness command

**Files:**
- Modify: `apps/api/src/modules/releases/application/release.service.ts`
- Modify: `apps/api/src/modules/releases/presentation/release.routes.ts`
- Modify: `apps/api/src/routes/docs/paths/releases.ts`
- Test: `apps/api/tests/release-service.test.ts`
- Test: `apps/api/tests/release-http.test.ts`
- Test: `apps/api/tests/openapi.test.ts`

**Interfaces:**
- Consumes: existing `evaluateReleaseReadiness`, `ReleaseRepository.findLatestReview`, `ReleaseRepository.setStatus`, and `ReleasePublisher.checklistReady`.
- Produces: `ReleaseService.checkReadiness(session: Session, scheduleId: string, correlationId: string): Promise<ReleaseScheduleEntity>` and `POST /api/admin/releases/:id/check-readiness` returning the refreshed schedule.

- [ ] **Step 1: Write failing service tests for readiness transitions**

Add tests named:

- `moves an approved current revision from scheduled to ready and audits the Admin command`
- `rejects readiness when the approval revision is stale`
- `rejects readiness when the publication checklist is incomplete`
- `rejects readiness when the schedule is no longer scheduled`

Assert the successful transition uses `to: "READY_TO_PUBLISH"`, `actorType: "ADMIN"` and `action: "release.manual_ready"`. Assert rejected cases return `409` with `CONTENT_NOT_READY` or `INVALID_STATE_TRANSITION` and do not append a transition.

- [ ] **Step 2: Run the service tests and verify RED**

Run: `bun test tests/release-service.test.ts` from `apps/api`

Expected: FAIL because `checkReadiness` does not exist.

- [ ] **Step 3: Implement `ReleaseService.checkReadiness`**

Require Admin, require current status `SCHEDULED`, load latest review and checklist state, call `evaluateReleaseReadiness`, and transition atomically only when `canPublish` is true. Return a freshly loaded schedule after the transition; map stale approval/checklist failures to `CONTENT_NOT_READY` without mutating state.

- [ ] **Step 4: Run the service tests and verify GREEN**

Run: `bun test tests/release-service.test.ts` from `apps/api`

Expected: all release service tests PASS.

- [ ] **Step 5: Write the failing HTTP and OpenAPI tests**

Assert `POST /api/admin/releases/{uuid}/check-readiness` calls `checkReadiness` with the Admin session, UUID and request ID, returns `200`, and appears in the generated OpenAPI document.

- [ ] **Step 6: Run HTTP/OpenAPI tests and verify RED**

Run: `bun test tests/release-http.test.ts tests/openapi.test.ts` from `apps/api`

Expected: FAIL with the route/documentation missing.

- [ ] **Step 7: Register and document the readiness route**

Add the static command route before generic `/:id` handling and document its success plus `403`, `404` and `409` responses. Do not add a request-body schema or a generic status field.

- [ ] **Step 8: Run focused API tests**

Run: `bun test tests/release-service.test.ts tests/release-http.test.ts tests/openapi.test.ts` from `apps/api`

Expected: PASS with zero failures.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/releases/application/release.service.ts apps/api/src/modules/releases/presentation/release.routes.ts apps/api/src/routes/docs/paths/releases.ts apps/api/tests/release-service.test.ts apps/api/tests/release-http.test.ts apps/api/tests/openapi.test.ts
git commit -m "feat(api): add release readiness command"
```

### Task 2: Add production-grade release filtering and workload aggregation

**Files:**
- Modify: `packages/shared/src/schemas/release.ts`
- Modify: `apps/api/src/modules/releases/domain/release.repository.ts`
- Modify: `apps/api/src/modules/releases/infrastructure/prisma-release.repository.ts`
- Modify: `apps/api/src/modules/releases/application/release.service.ts`
- Modify: `apps/api/src/modules/releases/presentation/release.routes.ts`
- Modify: `apps/api/src/routes/docs/schemas.ts`
- Modify: `apps/api/src/routes/docs/paths/releases.ts`
- Test: `apps/api/tests/release-repository.test.ts`
- Test: `apps/api/tests/release-service.test.ts`
- Test: `apps/api/tests/release-http.test.ts`

**Interfaces:**
- Consumes: existing release pagination and moderator assignment relations.
- Produces: `ReleaseScheduleQuerySchema` fields `q?: string` and `moderatorId?: string`; `ReleaseModeratorWorkloadSchema`; `ReleaseRepository.listModeratorWorkload(now, nearDeadlineBefore)`; `ReleaseService.workload(session)`; `GET /api/admin/releases/workload`.

- [ ] **Step 1: Write failing schema/HTTP tests for filters and workload**

Assert query validation accepts trimmed `q` up to 255 characters and a moderator ID, and the workload endpoint returns `{ items: [{ moderatorId, name, open, nearDeadline }] }` only for Admin.

- [ ] **Step 2: Write failing repository integration tests**

Create records with distinct titles, moderators and deadlines. Assert `listSchedules` filters by case-insensitive title query and active moderator assignment, and workload excludes `RELEASED`/`CANCELLED` while counting deadlines within 24 hours.

- [ ] **Step 3: Run focused tests and verify RED**

Run from `apps/api` after confirming `.env.test` points to a database whose name contains `test`:

```powershell
$env:RUN_INTEGRATION='1'; bun test tests/release-http.test.ts tests/release-service.test.ts tests/release-repository.test.ts; Remove-Item Env:RUN_INTEGRATION
```

Expected: FAIL because query fields and workload methods/routes are missing.

- [ ] **Step 4: Extend shared schemas and repository interfaces**

Add exact query fields and export `ReleaseModeratorWorkload`, `ReleaseModeratorWorkloadSchema` and `ReleaseModeratorWorkloadListSchema`. Extend `ReleaseScheduleListFilter` and add the workload repository method with the signature in Interfaces.

- [ ] **Step 5: Implement Prisma filters and aggregation**

Build one Prisma `where` combining status/time, title `contains` with insensitive mode, and active assignment `some`. Aggregate workload from active assignments on non-terminal schedules, returning deterministic moderator-name order.

- [ ] **Step 6: Implement service, route and API documentation**

`ReleaseService.workload` requires Admin and passes `clock()` plus `clock() + 24h` to the repository. Register `/workload` before `/:id` and document the shared response schema.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run from `apps/api`:

```powershell
$env:RUN_INTEGRATION='1'; bun test tests/release-http.test.ts tests/release-service.test.ts tests/release-repository.test.ts; Remove-Item Env:RUN_INTEGRATION
```

Expected: PASS with the repository integration suite executed, not skipped.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/schemas/release.ts apps/api/src/modules/releases apps/api/src/routes/docs apps/api/tests/release-http.test.ts apps/api/tests/release-service.test.ts apps/api/tests/release-repository.test.ts
git commit -m "feat(releases): add workspace filters and workload"
```

### Task 3: Build the frontend release workspace model and data hooks

**Files:**
- Create: `apps/web/src/features/admin-release/releaseWorkspaceModel.ts`
- Create: `apps/web/src/features/admin-release/releaseWorkspaceModel.test.ts`
- Modify: `apps/web/src/features/admin-release/services/adminReleaseService.ts`
- Create: `apps/web/src/features/admin-release/services/adminReleaseService.test.ts`
- Modify: `apps/web/src/features/admin-release/hooks/useAdminReleases.ts`
- Create: `apps/web/src/features/admin-release/hooks/useAdminReleases.test.tsx`

**Interfaces:**
- Consumes: shared release schemas from Tasks 1–2 and existing React Query client.
- Produces: `ReleaseWorkspaceViewMode = "kanban" | "table"`; `ReleaseBoardStatus`; `RELEASE_BOARD_COLUMNS`; `groupReleaseSchedules(items)`; `getReleaseDropCommand(from, to): "check-readiness" | "publish-now" | null`; filtered service methods and React Query hooks for board columns, attention records, table, workload, update, assignees and readiness.

- [ ] **Step 1: Write failing pure-model tests**

Assert:

- the four columns and Vietnamese labels are exact;
- each main status enters its matching column sorted by `scheduledAt`;
- `BLOCKED`/`FAILED` enter attention and `CANCELLED` enters neither board nor attention;
- only `SCHEDULED → READY_TO_PUBLISH` and `READY_TO_PUBLISH → PUBLISHING` return commands;
- same-column, reverse and terminal transitions return `null`.

- [ ] **Step 2: Run model tests and verify RED**

Run: `bun test src/features/admin-release/releaseWorkspaceModel.test.ts` from `apps/web`

Expected: FAIL because the model module does not exist.

- [ ] **Step 3: Implement the pure workspace model**

Keep grouping, labels, derived warnings and drop-command selection framework-independent so Kanban and table consume identical decisions.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `bun test src/features/admin-release/releaseWorkspaceModel.test.ts` from `apps/web`

Expected: PASS.

- [ ] **Step 5: Write failing service/hook boundary tests**

Test that filters serialize `q`, `moderatorId`, `from`, `to`, `page`, `limit`; readiness parses `ReleaseScheduleRecordSchema`; workload parses `ReleaseModeratorWorkloadListSchema`; and action success invalidates the release root key.

- [ ] **Step 6: Implement service and hooks**

Add:

- `adminReleaseService.checkReadiness(id: string)`
- `adminReleaseService.workload()`
- filter serialization for `q` and `moderatorId`
- update and replace-assignee mutations in `useAdminReleaseActions`
- `useAdminReleaseWorkload()`
- `useAdminReleaseBoard(filters, pages)` using `useQueries`, one paginated query per board status, preserving each response `total`.
- `useAdminReleaseAttention(filters)` using separate `BLOCKED` and `FAILED` queries so exceptions are never truncated by the four board queries.

- [ ] **Step 7: Run focused web tests**

Run: `bun test src/features/admin-release` from `apps/web`

Expected: PASS with zero failures.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/admin-release/releaseWorkspaceModel.ts apps/web/src/features/admin-release/releaseWorkspaceModel.test.ts apps/web/src/features/admin-release/services/adminReleaseService.ts apps/web/src/features/admin-release/services/adminReleaseService.test.ts apps/web/src/features/admin-release/hooks/useAdminReleases.ts apps/web/src/features/admin-release/hooks/useAdminReleases.test.tsx
git commit -m "feat(web): add release workspace data model"
```

### Task 4: Implement the four-column Kanban and safe drag behavior

**Files:**
- Create: `apps/web/src/features/admin-release/components/ReleaseKanbanBoard.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseKanbanColumn.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseKanbanCard.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseKanbanBoard.test.tsx`

**Interfaces:**
- Consumes: `RELEASE_BOARD_COLUMNS`, `getReleaseDropCommand`, `ReleaseScheduleRecord`, `CardBadge` and per-column pagination metadata from Task 3.
- Produces: `ReleaseKanbanBoard({ columns, pendingIds, onOpenEdit, onTransition, onPageChange })`; `onTransition(schedule, command, targetStatus)` fires only for allowed commands.

- [ ] **Step 1: Write failing render and interaction tests**

Assert the board renders exactly four labeled columns with server totals, names as separate badges, dates and warnings; clicking or pressing Enter on a card calls `onOpenEdit`.

- [ ] **Step 2: Write failing drag-policy tests**

Simulate data transfer and assert:

- scheduled-to-ready calls `onTransition` with `check-readiness`;
- ready-to-publishing calls `onTransition` with `publish-now`;
- publishing-to-released, reverse and same-column drops do nothing;
- the component does not mutate its input column arrays while a transition callback is pending or rejected.

- [ ] **Step 3: Write the failing fallback and pagination tests**

Assert the card action menu exposes the same allowed commands without dragging, invalid actions are absent, and a column whose `total` exceeds loaded items exposes “Tải thêm” calling `onPageChange` for that column only.

- [ ] **Step 4: Run tests and verify RED**

Run: `bun test src/features/admin-release/components/ReleaseKanbanBoard.test.tsx` from `apps/web`

Expected: FAIL because Kanban components do not exist.

- [ ] **Step 5: Implement the Kanban components**

Use semantic sections/articles, native drag events, a visible drop indicator, horizontal overflow below desktop widths, Radix dropdown primitives for fallback actions and existing dashboard tokens. Do not maintain a separate status map inside presentation components.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `bun test src/features/admin-release/components/ReleaseKanbanBoard.test.tsx` from `apps/web`

Expected: PASS with zero failures.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/admin-release/components/ReleaseKanbanBoard.tsx apps/web/src/features/admin-release/components/ReleaseKanbanColumn.tsx apps/web/src/features/admin-release/components/ReleaseKanbanCard.tsx apps/web/src/features/admin-release/components/ReleaseKanbanBoard.test.tsx
git commit -m "feat(web): add release kanban board"
```

### Task 5: Implement the table, toolbar, attention and workload views

**Files:**
- Create: `apps/web/src/features/admin-release/components/ReleaseWorkspaceToolbar.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseScheduleTable.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseAttentionPanel.tsx`
- Create: `apps/web/src/features/admin-release/components/ModeratorWorkloadFilter.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseWorkspaceViews.test.tsx`

**Interfaces:**
- Consumes: `ReleaseWorkspaceViewMode`, filtered schedule pages, workload items, `CardBadge`, existing button/input/select/table primitives.
- Produces: controlled presentation components whose callbacks update view, search, filters, page, selection and exception commands without owning server state.

- [ ] **Step 1: Write failing toolbar tests**

Assert tab semantics and exact labels “Kanban”/“Bảng”, search input, moderator/date/status filters and “Tạo lịch phát hành” callback. Verify `aria-selected` follows the controlled view prop.

- [ ] **Step 2: Write failing table tests**

Assert required columns, separate moderator badges, state badge, schedule/deadline formatting, pagination and row click opening edit. Include `CANCELLED` when supplied through the table filter.

- [ ] **Step 3: Write failing attention/workload tests**

Assert `BLOCKED` exposes edit, readiness-check, publish-now and cancel; `FAILED` exposes edit, retry, publish-now and cancel; workload displays open/near-deadline counts without duplicating the old navigation section.

- [ ] **Step 4: Run view tests and verify RED**

Run: `bun test src/features/admin-release/components/ReleaseWorkspaceViews.test.tsx` from `apps/web`

Expected: FAIL because the components do not exist.

- [ ] **Step 5: Implement the four controlled views**

Match the compact action-row and restrained Kanban surfaces from `client`, translated into current Tailwind tokens. Keep all copy in Vietnamese and all actions reachable by keyboard.

- [ ] **Step 6: Run view tests and verify GREEN**

Run: `bun test src/features/admin-release/components/ReleaseWorkspaceViews.test.tsx` from `apps/web`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/admin-release/components/ReleaseWorkspaceToolbar.tsx apps/web/src/features/admin-release/components/ReleaseScheduleTable.tsx apps/web/src/features/admin-release/components/ReleaseAttentionPanel.tsx apps/web/src/features/admin-release/components/ModeratorWorkloadFilter.tsx apps/web/src/features/admin-release/components/ReleaseWorkspaceViews.test.tsx
git commit -m "feat(web): add release workspace table and controls"
```

### Task 6: Replace inline creation and detail panels with direct edit/create dialogs

**Files:**
- Create: `apps/web/src/features/admin-release/components/ReleaseScheduleDialog.tsx`
- Modify: `apps/web/src/features/admin-release/components/ReleaseScheduleForm.tsx`
- Create: `apps/web/src/features/admin-release/components/ReleaseScheduleDialog.test.tsx`

**Interfaces:**
- Consumes: existing shared `Dialog`, release actions/progress hooks and moderator list.
- Produces: `ReleaseScheduleDialog({ mode: "create" | "edit", schedule, moderators, progress, open, busy, error, onOpenChange, onCreate, onUpdate, onRetry, onPublishNow, onCancel })`; `ReleaseScheduleForm` accepts initial values and emits the same `ReleaseScheduleDraft` shape for create/edit.

- [ ] **Step 1: Write failing create-dialog tests**

Assert the toolbar action opens a dialog titled “Tạo lịch phát hành”, validates production deadline before release time and at least one moderator, and closes only after successful create.

- [ ] **Step 2: Write failing edit-dialog tests**

Assert card/row selection opens directly on editable inputs with title, dates and assignees prefilled. Assert there is no view-only state and no intermediate “Chỉnh sửa” button.

- [ ] **Step 3: Write failing conflict and exception-action tests**

Assert `STALE_WRITE` keeps entered values and displays a reload message; retry/publish-now/cancel are separated from “Lưu thay đổi”; linked podcast is displayed read-only; progress events render in a collapsible section.

- [ ] **Step 4: Run dialog tests and verify RED**

Run: `bun test src/features/admin-release/components/ReleaseScheduleDialog.test.tsx` from `apps/web`

Expected: FAIL because direct edit/create dialog behavior is missing.

- [ ] **Step 5: Refactor `ReleaseScheduleForm` for create/edit values**

Add controlled initialization keyed by schedule ID, preserve existing validation and emit dates as local datetime strings. Do not clear form state on failed mutation.

- [ ] **Step 6: Implement `ReleaseScheduleDialog`**

Use one dialog shell with create/edit headings, an edit status summary, read-only linked podcast, collapsible progress, and exception actions. Keep focus return and Escape behavior from Radix.

- [ ] **Step 7: Run dialog tests and verify GREEN**

Run: `bun test src/features/admin-release/components/ReleaseScheduleDialog.test.tsx` from `apps/web`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/admin-release/components/ReleaseScheduleDialog.tsx apps/web/src/features/admin-release/components/ReleaseScheduleForm.tsx apps/web/src/features/admin-release/components/ReleaseScheduleDialog.test.tsx
git commit -m "feat(web): add release create and edit dialogs"
```

### Task 7: Integrate the workspace controller and remove the separate coordination screen

**Files:**
- Create: `apps/web/src/features/admin-release/hooks/useReleaseWorkspace.ts`
- Create: `apps/web/src/features/admin-release/hooks/useReleaseWorkspace.test.tsx`
- Modify: `apps/web/src/features/admin-release/components/ReleaseWorkspace.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.test.tsx`
- Modify: `apps/web/src/features/admin-release/components/ReleaseWorkspace.test.tsx`
- Delete: `apps/web/src/features/admin-release/components/ReleaseCalendar.tsx`
- Modify: `apps/web/src/features/admin-release/components/ReleaseCards.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–6 APIs and components.
- Produces: `useReleaseWorkspace()` as the sole owner of view preference, deferred search, filters, independent board pages, table page, selected schedule/dialog mode, transition confirmation and mutation/refetch behavior; `ReleaseWorkspaceView` as the pure composition boundary used by component tests.

- [ ] **Step 1: Write failing controller/integration tests**

Assert:

- default view is Kanban and key `admin-release-workspace-view` restores a valid saved view;
- malformed storage falls back to Kanban;
- switching views preserves filters and writes the preference;
- search/filter values feed both board and table queries;
- a transition error refetches server data and reports the error;
- selecting a card or row opens edit directly.

- [ ] **Step 2: Write failing navigation tests**

Assert Admin navigation contains “Lịch phát hành” but no “Điều phối sản xuất”, and the review queue section remains available.

- [ ] **Step 3: Run integration tests and verify RED**

Run: `bun test src/features/admin-release/components/ReleaseWorkspace.test.tsx src/pages/admin/AdminDashboardPage.test.tsx` from `apps/web`

Expected: FAIL against the old calendar/coordination layout.

- [ ] **Step 4: Implement `useReleaseWorkspace`**

Use `useDeferredValue` for search, validate local-storage values, keep board page state per status, route drag commands to readiness/publish-now, confirm publish-now before mutation, and invalidate/refetch all release queries after success or failure.

- [ ] **Step 5: Compose the new `ReleaseWorkspace`**

Render header, toolbar, workload/filter panel, attention panel, selected Kanban/table view and one create/edit dialog. Preserve loading, empty and error states without stacking obsolete panels.

- [ ] **Step 6: Remove the old coordination navigation and calendar component**

Delete the `coordination` section and workload rendering from `AdminDashboardPage`; keep the independent review queue. Remove `ReleaseCalendar` and narrow its former test file to release-history behavior or rename it if clearer.

- [ ] **Step 7: Run integration tests and verify GREEN**

Run: `bun test src/features/admin-release src/pages/admin/AdminDashboardPage.test.tsx` from `apps/web`

Expected: PASS with zero failures.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/admin-release apps/web/src/pages/admin/AdminDashboardPage.tsx apps/web/src/pages/admin/AdminDashboardPage.test.tsx
git commit -m "feat(admin): integrate release kanban workspace"
```

### Task 8: Verify the complete release workspace

**Files:**
- Modify only files required to fix failures found by the commands below.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a type-safe, tested release workspace with no regression in worker publication, moderator production or Admin navigation.

- [ ] **Step 1: Run all release backend tests**

Run: `bun test tests/release-policy.test.ts tests/release-service.test.ts tests/release-http.test.ts tests/release-content-collaboration.test.ts tests/release-jobs.test.ts` from `apps/api`

Expected: PASS with zero failures.

- [ ] **Step 2: Run all web tests**

Run: `bun test --pass-with-no-tests` from `apps/web`

Expected: PASS with zero failures; report any pre-existing React `act(...)` warnings separately.

- [ ] **Step 3: Run workspace typecheck**

Run: `bun run check-types` from repository root

Expected: every Turbo package exits `0`.

- [ ] **Step 4: Run production builds**

Run: `bun run build` from repository root

Expected: API and web production builds exit `0`.

- [ ] **Step 5: Perform manual browser verification**

Verify desktop and narrow layouts for:

- Kanban/table switch and persisted preference;
- four-column horizontal board behavior;
- allowed/disabled drag targets and keyboard fallback;
- create/edit dialogs and stale-write preservation;
- attention panel commands;
- worker-driven movement through publishing/released;
- cancelled schedules in table/history.

- [ ] **Step 6: Commit verification fixes**

```bash
git add apps/api apps/web packages/shared
git commit -m "test: verify release workspace redesign"
```
