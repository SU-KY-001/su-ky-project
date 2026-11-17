---
title: "Premium: daily listen quota + admin-only premium labels"
description: "Free tier listens N episodes/day (admin-configurable), playback requires auth, premium labels are admin-only with audit."
status: in-progress
priority: P1
effort: 6h + review follow-ups
branch: dev
tags: [backend, database, api, premium, security]
blockedBy: []
blocks: []
created: 2026-11-17
---

# Premium v2 — daily quota + admin-only premium

## Overview

Align API with the renegotiated business rules:

- Free users: max `N` episodes/day (`premium.free_daily_plays`, default 4; `premium.enforce_daily_quota` kill switch). Reset at 00:00 Asia/Ho_Chi_Minh. Same episode again in the same day is free; the next day it costs one play again (no permanent lock).
- Playback requires login (anonymous browse stays public, playback does not).
- Audio URLs are time-limited for **all** audio (quota cannot be bypassed by sharing a CDN link).
- Premium series/episode labels can only be set by **admin**; moderator attempts get `403 PREMIUM_ADMIN_ONLY`. Every premium change is audited.
- Premium/staff bypass quota. Premium content gate stays as-is (expired membership re-locks premium content, free content follows quota).
- API only. No web/mobile changes in this plan.

## Cross-Plan Dependencies

None. Existing premium spec `plans/reports/research-261112-premium-membership.md` and `docs/premium-membership-business.md` act 3 (moderator can toggle) is superseded by this plan.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Quota ledger + config](./phase-01-quota-ledger.md) | Done (2026-11-17, verified) |
| 2 | [Playback gating + admin-only labels](./phase-02-api-gating.md) | Done (2026-11-17, verified) |
| 3 | [Contracts, docs, tests](./phase-03-contracts-tests-docs.md) | Done (2026-11-17, verified) |
| 4 | [Review follow-ups](./review-followups.md) | Done — F2/F7 rejected có lý do, còn lại đã code/test |

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Quota key = `(userId, playDate, episodeId)` | One episode can have two narrations; keying by narration would charge twice |
| 2 | Calendar day, fixed Asia/Ho_Chi_Minh (UTC+7, no DST) | Not configurable; timezone bugs are worse than flexibility |
| 3 | Same episode twice in a day = free; next day = 1 new play | No permanent unlock (prevents catalog hoarding), no permanent lock (no punitive UX) |
| 4 | Quota checked at `playback` only | Playback is the only source of an audio URL; `updateProgress` cannot leak audio |
| 5 | Advisory lock per `(userId, day)` inside one transaction | Two concurrent different-episode plays can otherwise both pass `count < limit` |
| 6 | No new config table | `system_configs` + `PATCH /api/admin/configs/:key` already audits and caches |
| 7 | No per-feature access-mode engine | Only one limited feature exists; offline/ads/playlist limits are not in the product |
| 8 | Episode premium cannot be set at create | Admin PATCH right after create; avoids widening the append path for one flag |
| 9 | ~~Yearly plan stays code-supported~~ **Superseded 2026-11-17:** chỉ bán gói tháng | Leader chốt lại: không dùng gói năm. Tắt bằng migration `20261117130000_disable_yearly_plan` (`is_active=false`, `is_purchasable=false`); giữ row để tra đơn cũ |
| 10 | `renewSoon` = `daysLeft <= 5` | Nhắc gia hạn trong 5 ngày cuối; ngưỡng là hằng số backend, FE chỉ hiện banner khi cờ bật |
| 11 | Quota chỉ chặn ở `playback`; **không** chặn `updateProgress` | Đã cân nhắc lại: `applyProgress` giới hạn bitmap theo thời gian thực, playback là nơi duy nhất trả audio; thêm check quota mỗi 15s sẽ 403 oan phiên qua 00:00 hoặc membership hết hạn giữa tập. Khoảng trống XP/mission ghi nhận là accepted risk (F2) |

## Business updates sau review (2026-11-17)

- **Chỉ gói tháng:** `yearly` bị tắt hoàn toàn; `GET /api/membership/plans` không trả gói năm; admin vẫn thấy trong danh sách quản trị ở trạng thái tắt. Ghi ở CHANGELOG + docs.
- **Nhắc gia hạn:** `GET /api/me/membership` trả `renewSoon` (boolean, `true` khi còn ≤ 5 ngày); Free luôn `false`.
- Đã có test biên 5/6 ngày trong `apps/api/tests/membership-logic.test.ts`; test cộng dồn đổi sang gói tháng.

## Review 2026-11-17

Review độc lập không phát hiện lỗi critical (không bypass auth, không rò audio, không mất dữ liệu). Các mục High/Medium/Low được ghi đầy đủ, kèm cách sửa tối thiểu, tại [review-followups.md](./review-followups.md). Không sửa rời trước khi cập nhật plan.

### Verification status (2026-11-17)

- `bun run --cwd packages/shared check-types` + `bun run --cwd apps/api check-types`: pass.
- `bun run --cwd apps/api test`: **483 pass, 208 skip, 0 fail** (691 tests/114 files).
- Migration `20261117120000_listening_daily_plays` + `20261117130000_disable_yearly_plan`: đã apply lên `suky_test` và `suky_project` local.
- Integration (`RUN_INTEGRATION=1`): `daily-quota-integration.test.ts` + `historical-events.test.ts` → **4 pass, 0 fail**.
- Phát hiện khi chạy thật: `$queryRaw` không đọc được `pg_advisory_xact_lock` (void, P2010) → giữ `$executeRaw` (F7 rejected).
- Dev server API đã restart tại `http://localhost:3005`.
- Typecheck: 2 lỗi đã sửa (`role` nullable ở entitlement, `isPremium` so sánh giá trị hiện tại).

## Out of scope

- Frontend (web/mobile) paywall, quota UI, login redirect on playback.
- Offline downloads, ads, playlist limits, feature-entitlement matrix, `confirmTightening` API flag.
- Quota analytics dashboards (ledger prune 90 ngày đã làm, không có báo cáo riêng).
- Deleting `archive/`, `Seed-rv3/`, `tmp/`, one-off scripts (separate cleanup task).

## Dependencies

- Postgres available for migration apply (`bunx prisma migrate deploy` or `migrate dev`).
- `CLOUDINARY_AUTH_TOKEN_KEY` must be set in real environments, otherwise signed URLs degrade to public links (existing warning).
