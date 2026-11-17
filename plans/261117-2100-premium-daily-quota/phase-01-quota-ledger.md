# Phase 1 — Quota ledger + config

## Context Links

- `packages/db/prisma/schema.prisma:955` (`SystemConfig`), `:1216` (`Membership`)
- `apps/api/src/core/config/system-config.ts`
- `apps/api/src/modules/admin/admin.service.ts:40` (`configDescriptions`)
- `apps/api/src/modules/membership/application/entitlement.ts` (direct-prisma helper precedent)
- `plans/reports/research-261112-premium-membership.md` (superseded: monthly-only, daily quota)

## Overview

- Priority: P1
- Status: Done (2026-11-17, verified)
- Add the per-day play ledger and the two admin-editable config keys. No API behavior change yet.

## Key Insights

- Existing config infra (`system_configs` table + typed `SYSTEM_CONFIGS` + audit + 60s cache) covers requirement #3/#7 of the admin spec; do not add a table.
- `hashtext(text)` (Postgres) is enough as an advisory-lock key; no extra column.
- `DATE` column avoids timezone math on read; compute the VN day as a UTC-midnight `Date` and pass it consistently.

## Requirements

- Table `listening_daily_plays`, PK `(user_id, play_date, episode_id)`, FK cascade to `users` and `episodes`.
- Index `(user_id, play_date)` for the daily count.
- Config keys:
  - `premium.free_daily_plays`: int 1–50, default 4.
  - `premium.enforce_daily_quota`: bool, default true.
- Helper module `daily-quota.ts` exposing day math, reservation (transaction + advisory lock), and status read.

## Architecture

```
playback() ──> reserveDailyPlay(userId, episodeId)
                  ├─ config: enforce? limit?
                  ├─ tx: pg_advisory_xact_lock(hash(userId:day))
                  ├─ existing row?  -> already (free)
                  ├─ count(today) >= limit? -> limit (403)
                  └─ insert row -> allowed
/me/membership ──> getDailyQuotaStatus(userId)  (read only)
```

## Related Code Files

- Modify `packages/db/prisma/schema.prisma` — add `ListeningDailyPlay`; add relations on `User` and `Episode`.
- Create `packages/db/prisma/migrations/20261117120000_listening_daily_plays/migration.sql`.
- Modify `apps/api/src/core/config/system-config.ts` — 2 keys.
- Modify `apps/api/src/modules/admin/admin.service.ts` — 2 descriptions.
- Create `apps/api/src/modules/listening/application/daily-quota.ts`.

## Implementation Steps

1. Prisma model:

```prisma
model ListeningDailyPlay {
  userId    String   @map("user_id") @db.VarChar(36)
  playDate  DateTime @map("play_date") @db.Date
  episodeId String   @map("episode_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode   Episode  @relation(fields: [episodeId], references: [id], onDelete: Restrict)

  @@id([userId, playDate, episodeId])
  // Đã triển khai index này, nhưng review xác định nó trùng tiền tố PK: xoá theo follow-up F6.
  @@index([userId, playDate], map: "listening_daily_plays_user_date_idx")
  @@map("listening_daily_plays")
}
```

Add `listeningDailyPlays ListeningDailyPlay[]` to `User` and `Episode`.

2. Migration SQL matching existing style (snake_case columns, `timestamptz(3)`, named FKs).

3. `daily-quota.ts`:

```ts
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export function playDate(now = new Date()): Date;      // UTC midnight of the VN calendar day
export function nextResetAt(now = new Date()): Date;   // next VN midnight
export type DailyPlayOutcome = { outcome: "allowed" | "already" | "limit"; limit: number };
export async function reserveDailyPlay(userId: string, episodeId: string, now?: Date): Promise<DailyPlayOutcome>;
export async function getDailyQuotaStatus(userId: string, now?: Date): Promise<{
  enforced: boolean; limit: number | null; usedToday: number; remaining: number | null; resetsAt: Date;
}>;
```

Reservation runs inside `prisma.$transaction`: advisory xact lock `hashtext("<userId>:<YYYY-MM-DD>")`, then unique-row check, then count, then create. Never read config inside the transaction (cache call is outside).

4. Register both config keys with descriptions in `admin.service.ts`.

## Todo List

- [ ] Schema model + relations
- [ ] Migration SQL
- [ ] `bun run --cwd packages/db db:generate`
- [ ] Config keys + descriptions
- [ ] `daily-quota.ts`
- [ ] Apply migration locally

## Success Criteria

- `prisma validate` passes; migration applies on a clean DB.
- Inserting the same `(user, day, episode)` twice is rejected by the PK.
- `getDailyQuotaStatus` returns `remaining = max(0, limit - used)`.

## Risk Assessment

- Advisory lock is per user+day; contention is negligible (max a few plays/day/user).
- `@db.Date` round-trip: always construct with `new Date(Date.UTC(y, m, d))`, never local-time parsing.

## Security Considerations

- No cross-user read: every query filters `userId` from the session.
- Quota rows cascade-delete with the user; no PII beyond ids.

## Next Steps

- Phase 2 wires the helper into playback and gates premium labels.
