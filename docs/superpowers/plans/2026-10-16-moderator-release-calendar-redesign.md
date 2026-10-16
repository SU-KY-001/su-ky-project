# Moderator Release Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Moderator schedule duplicate of “Nhiệm vụ của tôi” with a polished weekly timetable and monthly progress calendar built from real release assignments.

**Architecture:** Keep release fetching in the existing Moderator feature and add a pure schedule model for timezone-aware grouping and presentation status. A presentational calendar component renders the approved week/month interaction with shared shadcn primitives, while a small container owns the TanStack Query states. The workspace routes only the `schedule` section to this new component.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind CSS v4, shadcn/ui, Radix UI, react-day-picker, Phosphor Icons, bun:test.

**Spec:** `docs/superpowers/specs/2026-10-16-moderator-release-calendar-redesign.md`

## Global Constraints

- Preserve the existing Moderator navigation labels, routes and “Nhiệm vụ của tôi” behavior.
- Read release assignments through `moderatorReleaseService.assignments()`; do not add API calls or duplicate shared response types.
- Display and group timestamps in `Asia/Ho_Chi_Minh`; weeks start on Monday.
- Use only existing `--color-mod-*` tokens and the Moderator font; do not hardcode new colors or fonts.
- Use existing shared shadcn/ui source components and Phosphor Icons; add no dependency.
- Use the approved radius hierarchy: panel 16px, schedule card 14px, controls 10-12px.
- Pair every status color with visible status text and an icon.
- Do not render ticket information until ticket data exists in the application contract.
- Follow TDD for behavior changes and do not run git commands without separate user approval.

## Review Focus

- UTC timestamps near midnight must land on the correct Vietnam calendar day and session.
- Weeks crossing month or year boundaries must still show seven correct local dates.
- Empty days and empty months must preserve the timetable structure without fake events.
- `BLOCKED`, `FAILED`, overdue and near-deadline schedules must win marker priority over normal work on the same day.
- Narrow layouts must preserve all controls and details without clipping or relying on hover.

---

### Task 1: Timezone-aware schedule model

**Files:**
- Create: `apps/web/src/features/moderator/moderatorScheduleModel.ts`
- Test: `apps/web/src/features/moderator/moderatorScheduleModel.test.ts`

**Interfaces:**
- Consumes: `ModeratorAssignmentSummary` from the Moderator feature.
- Produces: `getVietnamDateKey(date)`, `getVietnamWeek(anchor)`, `getScheduleSession(date)`, `getSchedulePresentationState(assignment, now)` and `groupAssignmentsByDate(assignments)`.

- [x] **Step 1: Write failing model tests** for UTC-to-Vietnam day conversion, Monday week boundaries, all three sessions, status tone mapping, overdue and near-deadline priority.
- [x] **Step 2: Run the targeted model test** with `bun test src/features/moderator/moderatorScheduleModel.test.ts`; expect module-not-found failure.
- [x] **Step 3: Implement the pure helpers** with `Intl.DateTimeFormat` parts and immutable grouping.
- [x] **Step 4: Re-run the targeted model test**; expect all cases to pass.

### Task 2: Weekly timetable and monthly progress view

**Files:**
- Create: `apps/web/src/features/moderator/components/ModeratorReleaseSchedule.tsx`
- Test: `apps/web/src/features/moderator/components/ModeratorReleaseSchedule.test.tsx`
- Reuse: `apps/web/src/shared/components/ui/button.tsx`
- Reuse: `apps/web/src/shared/components/ui/card.tsx`
- Reuse: `apps/web/src/shared/components/ui/badge.tsx`
- Reuse: `apps/web/src/shared/components/ui/calendar.tsx`
- Reuse: `apps/web/src/shared/components/ui/tooltip.tsx`
- Reuse: `apps/web/src/shared/components/ui/skeleton.tsx`

**Interfaces:**
- Consumes: `ModeratorAssignmentSummary[]`, an optional deterministic `now` for tests, and the Task 1 helpers.
- Produces: `ModeratorReleaseScheduleView` and `ModeratorReleaseSchedule`.

- [x] **Step 1: Write failing view tests** asserting seven weekdays and three sessions, correct card placement, semantic status copy, week/month switching, selected-day agenda, empty state and accessible navigation labels.
- [x] **Step 2: Run the targeted component test**; expect missing component failure.
- [x] **Step 3: Implement the presentational view** with shared shadcn components, Moderator tokens, stable status styles and responsive week/month layouts.
- [x] **Step 4: Implement the query container states** for loading, error, empty and success using the existing assignment service.
- [x] **Step 5: Re-run the targeted component test**; expect all interaction and rendering cases to pass.

### Task 3: Workspace integration and release verification

**Files:**
- Modify: `apps/web/src/pages/moderator/ModeratorWorkspacePage.tsx`
- Modify: `apps/web/src/features/moderator/components/ModeratorReleaseSchedule.test.tsx`

**Interfaces:**
- Consumes: `ModeratorReleaseSchedule` from Task 2.
- Produces: distinct `assignments` and `schedule` workspace sections.

- [x] **Step 1: Add a failing integration assertion** proving the schedule screen renders “Thời khóa biểu” while the assignments screen retains “Nhiệm vụ của tôi”.
- [x] **Step 2: Run the targeted test**; expect schedule routing to fail because both sections still share `ModeratorAssignments`.
- [x] **Step 3: Route only `schedule` to `ModeratorReleaseSchedule`** and keep `assignments` unchanged.
- [x] **Step 4: Run targeted tests** for the model, schedule component and existing assignment component.
- [x] **Step 5: Run the complete web suite** with `bun test --pass-with-no-tests` and report any failure by name.
- [x] **Step 6: Run `bun run check-types` and `bun run build`** in `apps/web`; expect successful completion.
- [x] **Step 7: Perform the design pre-flight** for token use, radius consistency, status color/text pairing, keyboard focus, reduced motion, responsive behavior and absence of em/en dashes in visible copy.

## Self-review

- Spec coverage: all approved week, month, status, data-state and shared-component requirements map to Tasks 1-3.
- Type consistency: the model and view consume the existing `ModeratorAssignmentSummary`; no parallel API type is introduced.
- Review focus: each listed failure mode is assigned to a model or view test.
- Proportion: three independently testable tasks are sufficient; ticket and backend changes remain out of scope.
