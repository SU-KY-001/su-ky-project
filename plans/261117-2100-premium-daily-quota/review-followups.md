# Review follow-ups — Premium v2

> Status: OPEN. Sinh ra từ review độc lập ngày 2026-11-17 sau khi triển khai phase 1–3.
> Quy tắc: mỗi mục sửa xong thì đổi `Status` thành `Done (ngày)` và ghi file/commit; không sửa rời rạc ngoài plan.

## Đã làm trước/sau review (ghi lại để không lặp)

| # | Thay đổi | Trạng thái | File |
|---|---|---|---|
| A1 | Chỉ bán gói tháng: tắt `yearly` (`is_active=false`, `is_purchasable=false`) bằng migration mới; không sửa migration cũ | **Done 2026-11-17** | `packages/db/prisma/migrations/20261117130000_disable_yearly_plan/migration.sql`, `docs/premium-membership-business.md`, `apps/api/CHANGELOG.md` |
| A2 | Nhắc gia hạn: `GET /api/me/membership` trả `renewSoon` (boolean), `true` khi `daysLeft <= 5`; hằng số `RENEWAL_REMINDER_DAYS = 5` | **Done 2026-11-17** | `apps/api/src/modules/membership/application/membership.service.ts`, `packages/shared/src/schemas/membership.ts`, `apps/api/tests/membership-logic.test.ts`, docs/CHANGELOG |
| A3 | Test cộng dồn đổi từ gói năm sang gói tháng (350 ngày + 30 ngày > 365) | **Done 2026-11-17** | `apps/api/tests/membership-order.test.ts` |

## Findings từ review

### High

| # | Finding | Trạng thái | Cách sửa (tối thiểu) |
|---|---|---|---|
| F1 | `tests/listening-daily-quota.test.ts` mock toàn bộ `reserveDailyPlay`; không có test nào chạm DB cho khóa ghép `userId_playDate_episodeId`, `@db.Date`, hay advisory lock. Lỗi typo khóa sẽ chỉ nổ ở production (500 mọi lượt phát). | **Done (2026-11-17)** | Trước khi chạy: apply migration `20261117120000_listening_daily_plays` (và `20261117130000_disable_yearly_plan`). Thêm 1 integration test `test.skipIf(!RUN_INTEGRATION)` theo mẫu `listening-session-integration.test.ts`: tạo user + series + `limit+1` episode; assert `allowed` × limit → `already` (cùng tập) → `limit` (tập mới); assert `play_date` = `playDate()`; insert trùng PK bị reject; hai lời gọi song song ở slot cuối cho đúng 1 `allowed`. Đọc `limit`/`enforced` qua `getSystemConfig`, không sửa config. |
| F1b | `tests/support/integration.ts::removeFixtures` xoá episode trước user; FK `listening_daily_plays.episode_id` là `RESTRICT` nên cleanup sẽ nổ khi đã có lượt chơi. | **Done (2026-11-17)** | Thêm `prisma.listeningDailyPlay.deleteMany({ where: { userId } })` trước bước xoá episode/narration. |

### Medium

| # | Finding | Trạng thái | Cách sửa (tối thiểu) |
|---|---|---|---|
| F2 | Quota chỉ chặn `playback`; user Free hết lượt vẫn gọi `PUT /api/me/listening-progress/:narrationId` và có thể nhận XP/mission của tập chưa phát. | **Rejected (2026-11-17)** | Không thêm check quota vào `updateProgress`. Lý do: (1) `applyProgress` đã chặn bitmap theo thời gian thực nên không farm hoàn tập tức thời; (2) playback là nơi duy nhất trả audio, không bypass nội dung; (3) sync chạy mỗi 15s, thêm lookup/PK check sẽ 403 oan các phiên bắt đầu trước 00:00 hoặc membership hết hạn giữa tập — mất tiến độ thật. Ghi nhận khoảng trống XP/mission là **accepted risk** bên dưới. |
| F3 | Update chặn *sự có mặt* của `isPremium` (kể cả gửi lại `false` khi form round-trip), trong khi create chỉ chặn `true` → moderator PATCH series Free bị 403 oan. | **Done (2026-11-17)** | Ở `updateSeries`/`updateEpisode`, chỉ chặn khi giá trị khác `current.isPremium` và role ≠ admin. Create giữ nguyên `=== true`. Sửa lại câu chữ docs nếu cần. |
| F4 | Audit `episode.premium_changed` luôn `ipAddress: null`; các audit anh em đều ghi IP. | **Done (2026-11-17)** | Thêm tham số `ipAddress: string | null = null` cho `ContentService.updateEpisode`; route truyền `requestIpAddress(c.req.raw.headers)`; repo nhận và ghi. Cập nhật test gọi 3 tham số vẫn chạy được. |

### Low

| # | Finding | Trạng thái | Cách sửa (tối thiểu) |
|---|---|---|---|
| F5 | Audit đọc `before` không khoá row; hai admin sửa đồng thời có thể tạo cặp before/after ngược nhau. | **Done (2026-11-17)** | Trong `PrismaEpisodeRepository.updateEpisode`, `SELECT id FROM episodes WHERE id=$1::uuid FOR UPDATE` trước `findUniqueOrThrow` (giống `updateSeries`). |
| F6 | Index `(user_id, play_date)` trùng tiền tố PK `(user_id, play_date, episode_id)` — tốn 1 write/lượt, không phục vụ query nào. | **Done (2026-11-17)** | Xoá `@@index([userId, playDate])` khỏi schema và dòng `CREATE INDEX` khỏi migration `20261117120000` (migration chưa apply production; nếu đã apply thì thêm migration drop index). |
| F7 | Dùng `$executeRaw` cho `SELECT pg_advisory_xact_lock(...)`; repo đang dùng `$queryRaw` cho lock. | **Rejected (2026-11-17)** | Đã thử `$queryRaw`: Prisma báo `Failed to deserialize column of type 'void'` (P2010) khi chạy integration thật. Giữ `$executeRaw` + comment lý do trong `daily-quota.ts`. |
| F8 | `DailyPlayReservation.limit` không nơi nào dùng (caller chỉ đọc `outcome`). | **Done (2026-11-17)** | Rút gọn return còn `{ outcome }`; giữ `limit` trong `DailyQuotaStatus`. |
| F9 | Logic ngày VN trùng lặp với `weekly-mission.ts` (hai hằng offset); rollover tháng/năm chưa có test. | **Done (2026-11-17)** | Chưa tách shared module (chưa đáng). Thêm 2 case vào `daily-quota-math.test.ts`: (a) `2026-12-31T16:59:59Z` → VN vẫn 31/12, `playDate = 2026-12-31T00:00Z`, `nextResetAt = 2026-12-31T17:00Z`; (b) `2026-12-31T17:00Z` → VN đã 01/01/2027, `playDate = 2027-01-01T00:00Z`, `nextResetAt = 2027-01-01T17:00Z`. |
| F10 | `MembershipEntitlementSchema.quota` bắt buộc nhưng `MembershipService.getEntitlement` không trả `quota` (route mới ghép) → schema không còn mô tả service. | **Done (2026-11-17)** | Chọn 1: cho service trả `quota: null`/giá trị (route chỉ spread), hoặc đổi `quota` thành `.optional()` và giữ route ghép. Ưu tiên để service tự trả để DTO một nguồn. Kèm test `quota === null` cho premium/staff. |
| F11 | Mô tả admin của `media.audio_delivery_ttl_seconds` vẫn ghi "URL audio premium". | **Done (2026-11-17)** | Sửa mô tả thành "URL audio (mọi nội dung)". |
| F12 | `GET /api/exhibitions/{slug}` vẫn trả `deliveryUrl` không hạn cho audio triển lãm, công khai — mâu thuẫn tuyên bố "mọi audio phải đăng nhập + URL có hạn". | **Done (2026-11-17)** | Quyết định sản phẩm: route audio triển lãm qua `audioDeliveryUrl` (khuyến nghị) hoặc ghi caveat rõ trong CHANGELOG. Không chặn phase này. |
| F13 | Không có job dọn `listening_daily_plays` cũ; chỉ tốn dung lượng. | **Done (2026-11-17)** | Đã thêm queue `maintenance.listening-daily-play-purge`, cron 02:40 hằng ngày, giữ 90 ngày (`LISTENING_DAILY_PLAY_RETENTION_DAYS`) trong `maintenance-jobs.ts`. |
| F14 | Chưa có test admin-positive (admin được đặt `isPremium`) và chưa có test audit đúng 1 row/transaction. | **Done (2026-11-17)** | Đã phủ trong `historical-events.test.ts` (admin tạo series premium + PATCH episode) và unit gate hiện có. |
| F15 | `AdminGrantMembershipSchema` và `AdminMembershipService.grant` vẫn nhận `"yearly"`; comp/OpenAPI vẫn quảng cáo gói năm dù đã tắt. | **Done (2026-11-17)** | Đổi union còn `"monthly"` ở `packages/shared/src/schemas/membership.ts` và `admin-membership.service.ts`; cập nhật docs/OpenAPI grant. |
| F16 | `apps/api/tests/historical-events.test.ts` có case tạo series `isPremium: true` bằng session `moderator` → sẽ 403 với gate mới. | **Done (2026-11-17)** | Đổi case đó sang session admin; thêm assertion moderator tạo premium → `403 PREMIUM_ADMIN_ONLY`. |
| F17 | `apps/api/tests/content/premium-label-gate.test.ts` chưa phủ admin-positive; audit `episode.premium_changed` chỉ test được với DB thật. | **Done (2026-11-17)** | Thêm case admin PATCH đổi nhãn → 200. Thêm assertion DB trong `historical-events.test.ts`: PATCH episode bằng admin rồi kiểm tra `audit_logs` có action `episode.premium_changed` (chạy dưới `RUN_INTEGRATION`). |
| F18 | Docs còn câu cũ: danh sách "đã hoàn thành" ghi "cấp đường dẫn audio có thời hạn cho người dùng Premium" (thực tế mọi audio); CHANGELOG chỉ nói audit thay đổi nhãn Tập, không nhắc series đã có `series.updated`. | **Done (2026-11-17)** | Sửa docs thành "mọi lượt phát audio dùng URL có hạn"; CHANGELOG ghi rõ series audit qua `series.updated` (đã có từ trước). |
| F19 | Chưa có test route `/api/me/membership` cho phần ghép `quota`: Free → object, Premium/staff → `null`. | **Done (2026-11-17)** | Test route-level với `MembershipService` fake + mock `getDailyQuotaStatus`; assert 2 nhánh. |

## Accepted risks (không sửa trong plan này)

- **XP/mission khi hết lượt (từ F2):** user Free hết lượt có thể vẫn đồng bộ tiến độ và nhận XP/mission cho tập chưa phát trong ngày. Không chặn vì `applyProgress` đã giới hạn bitmap theo thời gian thực; chặn sync sẽ mất tiến độ của phiên hợp lệ. Ghi nhận ở đây thay vì thêm lookup mỗi 15s.
- **Đốt lượt hiếm:** `reserveDailyPlay` chạy trước khi lấy progress/config cuối; nếu bước sau throw hiếm, user mất 1 lượt mà không có audio. Chấp nhận (xác suất thấp, không mất tiền).
- **Đọc membership mỗi lượt phát:** `resolveUnlimited` query `hasActiveMembership` cho cả nội dung Free; thêm 1 indexed read/lượt. Chấp nhận để logic đơn giản.
- **Không prune `listening_daily_plays`:** xem F13.

## Review đã xác nhận (không cần sửa)

- Không có bypass quota qua endpoint khác trả audio cho listener.
- `pg_advisory_xact_lock` + `hashtext` đúng ngữ nghĩa (chỉ over-serialize khi hash trùng).
- Khóa ghép Prisma `userId_playDate_episodeId` khớp schema.
- `@db.Date` + `playDate()` thống nhất quy ước UTC-midnight; `nextResetAt` xử lý rollover.
- Moderator không đặt được `isPremium` qua bất kỳ route nào khác.
- Audit chỉ ghi khi cờ thực sự đổi và nằm trong transaction.
- Shape `quota` khớp shared schema.

## Thứ tự thực hiện đề xuất

1. F1 + F1b (test thật + cleanup) — chứng minh phần dễ vỡ nhất.
2. F2 (lỗ hổng XP), F3 (403 oan), F4 (IP audit).
3. F5–F9, F11.
4. F10, F14.
5. F12/F13 khi có quyết định sản phẩm.

## Verify sau mỗi nhóm

- `bun run --cwd packages/shared check-types && bun run --cwd apps/api check-types`
- `bun run --cwd apps/api test` (unit); `RUN_INTEGRATION=1 bun test apps/api/tests/<file>` với DB test.
