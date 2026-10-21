# Release Reassignment Tickets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one active Moderator per release schedule and add the complete reassignment-ticket workflow for Moderator and Admin.

**Architecture:** Keep `ProductionAssignment` as immutable assignment history while enforcing one active row per schedule. Add `ReleaseReassignmentTicket` inside the releases module; ticket approval atomically resolves the ticket and changes the active assignment. React surfaces use the existing Hono RPC client, TanStack Query, Moderator tokens and shadcn/ui primitives.

**Tech Stack:** Bun, TypeScript, Hono, Prisma/PostgreSQL, Zod, React 19, TanStack Query, Tailwind v4, Radix/shadcn/ui, bun:test.

**Spec:** `docs/superpowers/specs/2026-10-15-podcast-release-orchestration-design.md`

## Global Constraints

- Exactly one active Moderator per release schedule.
- The current assignment and edit access stay unchanged while a ticket is pending or rejected.
- Approval requires a different active Moderator and changes assignment in one transaction.
- Rejection requires a reason; a Moderator may edit or cancel only their own pending ticket.
- No new runtime dependency and no ownership transfer of the linked episode.
- User-visible timestamps use `Asia/Ho_Chi_Minh` and UI uses existing Moderator tokens/components.
- Do not run git commands or apply a database migration without explicit permission.

## Review Focus

- Concurrent create requests cannot leave two pending tickets for one schedule.
- Concurrent approval cannot leave two active assignments.
- A stale or already-resolved ticket cannot be edited, cancelled, approved or rejected.
- A replacement cannot be the requester, banned, or outside the Moderator role.
- Failed approval leaves the old assignment and ticket state intact.

---

### Task 1: Shared contracts and persistence

**Files:**
- Modify: `packages/shared/src/schemas/release.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20261016120000_release_reassignment_tickets/migration.sql`
- Test: `apps/api/tests/release-http.test.ts`

**Interfaces:**
- Produces: single `moderatorId` schedule inputs plus ticket status, request, decision and record schemas.
- Produces: database ticket model and partial unique indexes for pending tickets and active assignments.

- [x] Write failing schema/HTTP tests for single assignment and ticket validation.
- [x] Run the targeted tests and confirm expected failures.
- [x] Add shared contracts, Prisma model and forward migration.
- [x] Generate Prisma Client and rerun targeted tests/type checks.

### Task 2: Ticket domain, repository, service and API

**Files:**
- Modify: `apps/api/src/modules/releases/domain/release.repository.ts`
- Modify: `apps/api/src/modules/releases/infrastructure/prisma-release.repository.ts`
- Modify: `apps/api/src/modules/releases/application/release.service.ts`
- Modify: `apps/api/src/modules/releases/presentation/release.routes.ts`
- Modify: `apps/api/src/routes/docs/paths/releases.ts`
- Modify: `apps/api/src/routes/docs/schemas.ts`
- Test: `apps/api/tests/release-service.test.ts`
- Test: `apps/api/tests/release-http.test.ts`

**Interfaces:**
- Produces: list/create/update/cancel Moderator ticket methods and list/approve/reject Admin methods.
- Consumes: Task 1 contracts and persistence types.

- [x] Add failing service tests for permission, state transitions and atomic reassignment contract.
- [x] Implement repository and service methods with audit records.
- [x] Add routes and OpenAPI operations.
- [x] Run API tests, OpenAPI test and type check.

### Task 3: Single Moderator Admin scheduling UI

**Files:**
- Modify: `apps/web/src/features/admin-release/services/adminReleaseService.ts`
- Modify: `apps/web/src/features/admin-release/hooks/useAdminReleases.ts`
- Modify: `apps/web/src/features/admin-release/components/ReleaseScheduleForm.tsx`
- Modify: `apps/web/src/features/admin-release/components/ReleaseScheduleDialog.tsx`
- Test: `apps/web/src/features/admin-release/components/ReleaseWorkspace.test.tsx`

**Interfaces:**
- Produces: one `moderatorId` draft and a select dropdown for assignment.

- [x] Write the failing form/workspace interaction test.
- [x] Replace the checkbox grid and plural mutation with single-value contracts.
- [x] Run targeted tests and web type check.

### Task 4: Moderator Ticket workspace and schedule markers

**Files:**
- Modify: `apps/web/src/features/moderator/services/moderatorReleaseService.ts`
- Create: `apps/web/src/features/moderator/hooks/useReleaseTickets.ts`
- Create: `apps/web/src/features/moderator/components/ModeratorTickets.tsx`
- Modify: `apps/web/src/features/moderator/components/ModeratorReleaseSchedule.tsx`
- Modify: `apps/web/src/features/moderator/navItems.ts`
- Modify: `apps/web/src/features/moderator/types.ts`
- Modify: `apps/web/src/pages/moderator/ModeratorWorkspacePage.tsx`
- Test: `apps/web/src/features/moderator/components/ModeratorTickets.test.tsx`

**Interfaces:**
- Produces: Ticket table/dialog, pending edit/cancel actions and semantic schedule markers.

- [x] Write failing ticket view tests for rows, dialog and pending-only actions.
- [x] Add service/hooks and the Ticket workspace.
- [x] Merge ticket state into the weekly/monthly release schedule.
- [x] Run targeted tests and web type check.

### Task 5: Admin Ticket inbox

**Files:**
- Create: `apps/web/src/features/admin-notifications/services/adminTicketService.ts`
- Create: `apps/web/src/features/admin-notifications/hooks/useAdminTickets.ts`
- Modify: `apps/web/src/features/admin-notifications/components/AdminNotifications.tsx`
- Test: `apps/web/src/features/admin-notifications/components/AdminNotifications.test.tsx`

**Interfaces:**
- Produces: filtered Ticket list, approve-with-replacement dialog and reject-with-reason dialog.

- [x] Write failing view and interaction tests.
- [x] Implement loading/error/empty/success states and mutations.
- [x] Invalidate notification, release and workload queries after decisions.
- [x] Run targeted tests and web type check.

### Task 6: Admin user action menu and final verification

**Files:**
- Modify: `apps/web/src/features/admin-users/components/AdminUsersView.tsx`
- Modify: `apps/web/src/features/admin-users/components/AdminUsersView.test.tsx`
- Modify: `docs/superpowers/specs/2026-10-15-podcast-release-orchestration-design.md`

**Interfaces:**
- Produces: one accessible row action menu containing edit, lock/unlock and delete.

- [x] Write the failing menu interaction test.
- [x] Implement the menu with Radix DropdownMenu and Phosphor icons.
- [x] Run full API/web tests, all type checks and production builds.
- [x] Audit visible copy, focus states, responsive layout and ticket state colors.
