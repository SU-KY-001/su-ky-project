# Phase 4 — Khoá nội dung premium, docs, kiểm thử

## Context Links

- Phase 1–3: schema, service, webhook/admin
- Playback: `apps/api/src/modules/listening/application/listening.service.ts`
- Repo: `apps/api/src/modules/listening/infrastructure/prisma-listening.repository.ts`
- Studio mapper: `apps/api/src/modules/content/application/content.mappers.ts`
- Docs: `apps/api/src/routes/docs/index.ts`, `apps/api/src/routes/docs/operation.ts`, `apps/api/src/routes/docs/paths/`
- Test mẫu: `apps/api/tests/listening-session-integration.test.ts`, `apps/api/tests/support/integration.ts`

## Overview

Priority: P1. Cuối cùng mới nối entitlement vào đường phát audio (nơi duy nhất trả URL audio), thêm cờ premium vào Studio/public DTO, viết docs + test. Không đổi logic publish/release.

## Key Insights

- Audio URL chỉ lộ ở `ListeningService.playback()` qua `storage.deliveryUrl`. Nhưng URL audio hiện **không có hạn**: `cloudinary.gateway.ts:105-121` chỉ `sign_url: true`, không `expires_at` → chia sẻ 1 lần là xem mãi. Spec §3 yêu cầu TTL, nên premium phải phát URL có hạn.
- `getEpisodeDetail` trả `scriptContent` khi audio READY → nội dung kịch bản cũng phải ẩn khi khoá (premium trả tiền).
- `findPublicNarration` chỉ include `audioAsset`; cần thêm `episode.isPremium` + `episode.series.isPremium` rồi gộp thành `isPremium` trên `NarrationWithAudio`.
- Moderator/admin phải nghe được nội dung premium để duyệt (spec §3): truyền `session.user.role` từ route vào service, không chỉ `userId`.
- `openapi.test.ts` fail nếu thiếu docs **hoặc** docs thừa route → phải điền docs cùng lúc với wire route.
- `RateLimitPolicy` và `RatePolicy` (docs) là 2 union riêng, cùng phải thêm `"membership_order"`.
- Entitlement chỉ query DB khi nội dung có cờ premium (tránh 1 query thừa cho mọi lượt nghe free).

## Requirements

### Content flags

1. Thêm `isPremium` vào `SeriesEntity`, `EpisodeEntity` và các composite (`SeriesDetailEntity`, `EpisodeWithNarrations`, `SeriesWithCoverAndCount`).
2. Studio:
   - `SeriesPatch`/`EpisodePatch` thêm `isPremium?: boolean`;
   - `PatchSeriesSchema`/`PatchEpisodeSchema` thêm `isPremium: z.boolean().optional()`;
   - `mapSeriesDetail` + `mapWorkspace` trả `isPremium`;
   - audit diff tự có vì patch object được serialize.
3. Public:
   - `GET /api/series`, `/series/:slug`, `/episodes/:slug` trả `isPremium`;
   - thêm `locked: boolean` theo viewer (true khi `isPremium` và viewer không phải premium member).
   - `listSeries` nhận thêm `userId` (route đã có `attachSession`) để tính `locked`.

### Premium audio TTL

- Thêm method **additive** vào gateway, không đổi `deliveryUrl` (15 call site):
  `audioDeliveryUrl(asset, ttlSeconds): string`.
- Cơ chế ưu tiên: `cloudinary.utils.generate_auth_token({ start_time, expires_at })` + `cloudinary.url(..., { type: "authenticated", auth_token })` — đây là đường Cloudinary hỗ trợ cho **authenticated delivery**; `private_download_url` chỉ dành cho `private`/raw và có thể 404 hoặc ép download với video/audio authenticated, nên **không** dùng làm mặc định.
- Chỉ dùng ở nhánh premium trong `playback`; audio free giữ `deliveryUrl` hiện tại.
- Config `media.audio_delivery_ttl_seconds` (đã thêm phase 1).
- **Bắt buộc verify bằng asset thật** trước khi chốt: upload 1 mp3, gọi `playback` với user premium, mở URL trong `<audio>` (behavior, không chỉ `fetch 200`), chờ > TTL rồi thử lại phải bị từ chối. Nếu URL không phát được: fallback giữ `deliveryUrl` hiện tại + ghi rõ rủi ro "URL chia sẻ vĩnh viễn" trong plan; **không** giả định TTL hoạt động khi chưa nghe thử.
- Test tự động: assert URL chứa tham số token/expiry và `it.skipIf(!RUN_INTEGRATION)` cho phần fetch thật.

### Gating

- `playback(narrationId, userId, role)`: nếu `narration.isPremium`:
  - `role` là `admin|moderator` → cho qua (review);
  - ngược lại `!(await hasActiveMembership(userId))` → 403 `PREMIUM_REQUIRED`;
  - nếu qua → URL audio lấy bằng `audioDeliveryUrl(asset, ttl)`; free giữ `deliveryUrl`.
- `updateProgress(...)`: cùng điều kiện quyền (admin/mod bỏ qua), kiểm tra **sau** khi tìm narration, **trước** các kiểm tra asset/bitmap.
- `getEpisodeDetail`/`getSeriesDetail`: episode/narration locked → `scriptContent: null`, `locked: true`; vẫn trả metadata + progress (không lộ audio).
- User chưa đăng nhập: `locked` luôn `true` cho nội dung premium (không 401 ở trang chi tiết).

### Docs

- `membershipPaths` đủ 19 operation (7 user/public + 1 webhook + 11 admin – gộp chung file), tag mới `Membership` (thêm vào `TAGS` + `TAG_GROUPS` nhóm "Người nghe").
- Webhook: `responseOverrides` cho body `{success:true}` và security scheme `Apikey` mô tả riêng trong description (không đưa vào `securitySchemes` nếu không muốn client hiểu nhầm session auth).
- `RatePolicy` thêm `"membership_order"` kèm mô tả.
- Mọi schema response/request dùng `component()` tên duy nhất.

## Files

Sửa:
- `packages/shared/src/schemas/content/series.ts`, `episode.ts` — `isPremium`
- `apps/api/src/modules/content/domain/content.entity.ts`, `content.repository.ts` — field + patch type
- `apps/api/src/modules/content/application/content.mappers.ts` — trả `isPremium`
- `apps/api/src/modules/content/infrastructure/prisma-content.repository.ts` — nếu patch spread đã đủ thì không sửa; kiểm tra `updateSeries/updateEpisode` nhận `isPremium`
- `apps/api/src/modules/listening/domain/listening.entity.ts` — `isPremium` trên `NarrationWithAudio`, `SeriesEntity`, `EpisodeEntity`
- `apps/api/src/modules/listening/infrastructure/prisma-listening.repository.ts` — include/select cờ + map
- `apps/api/src/modules/listening/application/listening.service.ts` — `locked`, gating playback/progress, ẩn script
- `apps/api/src/modules/listening/presentation/listening.routes.ts` — truyền `userId` + `role` vào `listSeries`/detail/playback/progress
- `apps/api/src/modules/listening/index.ts` — truyền dependency entitlement (hoặc để default param) vào `ListeningService`
- `apps/api/src/modules/media/domain/media.repository.ts` + `infrastructure/cloudinary.gateway.ts` — thêm `audioDeliveryUrl`
- `apps/api/src/core/middleware/rate-limit.ts` — `RateLimitPolicy` thêm `"membership_order"`
- `apps/api/src/routes/docs/operation.ts` — `RatePolicy` + `RATE_DOC`
- `apps/api/src/routes/docs/index.ts` — import/spread `membershipPaths`, thêm tag
- `apps/api/src/routes/docs/paths/membership.ts` — điền toàn bộ operation

Tạo:
- `apps/api/tests/membership-order.test.ts`
- `apps/api/tests/sepay-webhook.test.ts`
- `apps/api/tests/membership-entitlement.test.ts`
- `apps/api/tests/premium-audio-ttl.test.ts` (unit gateway — chỉ cần khi không mock storage)

## Test cases bắt buộc

`membership-order.test.ts` (integration, `RUN_INTEGRATION`; **tạo row thật + cleanup tay**, không dùng transaction-rollback vì cần 2 connection cho khoá):
1. Tạo đơn 3 lần cùng user+plan → 1 đơn, cùng `transferContent`.
2. Hai "tab" concurrent (`Promise.all`) → 1 đơn pending.
3. Membership còn 350 ngày + gói năm → 422 `STACK_LIMIT_REACHED`; còn 300 ngày + gói tháng → OK, `startsAt` = hạn cũ.
4. `planCode: "free"` và plan `isPurchasable=false` → 422 `PLAN_NOT_PURCHASABLE`; code lạ → 404 `PLAN_NOT_FOUND`.
5. User A `getOrder` đơn user B → 404.
6. Proof: gắn asset → `proofUploaded=true`; asset của user khác → **404** (`mediaService.verify` trả 404).
6b. Snapshot giá: tạo đơn pending → admin đổi `price_vnd` → `GET` đơn cũ vẫn giá cũ; tạo đơn mới (sau khi reject đơn cũ) dùng giá mới.
6c. Hai kích hoạt đồng thời cho cùng user (đơn A webhook, đơn B admin duyệt) → không chồng lấn, tổng hạn ≤ trần.

`sepay-webhook.test.ts` (integration):
7. Sai key → 401; thiếu key cấu hình → 503.
8. Payload hợp lệ đơn `pending` → đơn `paid`, 1 membership, tx `matched`, 1 audit.
9. Gọi lại cùng `sepay_id` 3 lần → không nhân đôi membership.
10. `sepay_id` mới + cùng mã CK khi đơn đã `paid` → tx `needs_review` `ORDER_ALREADY_PAID`.
11. Lệch tiền (10.000 vs 20.000) → tx `needs_review` `AMOUNT_MISMATCH`, đơn vẫn `pending`.
12. Đơn đã duyệt tay (`paid`, `bankTransactionId=null`) rồi webhook → tx `matched`, gán mã, không tạo kỳ hạn thứ 2.
13. `transferType="out"` → tx `ignored`, không đụng đơn.
14. Retry sau lỗi pha 2 (mô phỏng bằng row `unmatched` sẵn có): gọi lại → kích hoạt, `matched`. Không phải test crash thật.
15. Report: 2 đơn paid ở 2 ngày VN khác nhau + 1 comp + 1 pending + 1 tx unmatched → bucket đúng biên 23:59/00:00, `revenueVnd` loại comp, response serialize (không BigInt).
16. Grant → revoke → mua gói tháng: `tier=premium` ngay (không bị đẩy `startsAt` sang năm sau).
17. Proof retention: gắn proof → chạy `cleanupDetachedMedia` với cutoff cũ → asset vẫn `READY`.

`membership-entitlement.test.ts` (service + stub repo/storage hoặc integration):
15. Series premium, user free → `playback` 403 `PREMIUM_REQUIRED`; user có membership active → 200 có `audio.url`.
16. Tập premium trong series free: chỉ tập đó khoá; tập khác vẫn phát.
17. `updateProgress` trên nội dung khoá → 403, không tạo progress.
18. `getEpisodeDetail`: locked → `scriptContent=null`, `locked=true`; không lộ URL audio (DTO không có field url).
19. Moderator/admin: `playback` nội dung premium → 200 dù không có membership.

Smoke cuối (tay, ghi vào PR description):
- `GET /docs` render spec mới; `bun test apps/api/tests/openapi.test.ts` pass.
- Luồng thật: tạo đơn → QR → webhook (curl) → `GET /api/me/membership` premium → phát audio premium OK; revoke → 403.

## Implementation Steps

1. Schema + entity + mapper + patch type cho `isPremium` (Studio trước, chạy typecheck).
2. Listening repo: thêm cờ vào query; cập nhật `NarrationWithAudio`/map.
3. Listening service: `locked` ở list/detail; gating playback + updateProgress; ẩn script.
4. Routes: truyền `userId` cho `listSeries`.
5. Docs: điền `membershipPaths`, tag, rate policy union.
6. Viết 3 test file; chạy `bun test` toàn bộ apps/api.
7. Chạy smoke tay ở trên; cập nhật plan status.

## Todo List

- [ ] Cờ premium Studio (schema/entity/patch/mapper)
- [ ] Cờ premium + `locked` ở public DTO
- [ ] Gating playback/updateProgress + ẩn script
- [ ] Verify audio TTL bằng asset thật trong `<audio>` (hoặc ghi nhận fallback)
- [ ] `RateLimitPolicy`/`RatePolicy` thêm policy
- [ ] Docs 19 operation + tag
- [ ] 3 test file
- [ ] `bun test` + `check-types` + smoke

## Success Criteria

- User free mở trang tập premium: thấy metadata, `locked=true`, không có URL audio, không có script.
- User premium: `playback` 200, audio URL hoạt động; hết hạn giữa chừng → lần playback sau 403.
- `openapi.test.ts` pass (không thiếu/thừa route).
- Toàn bộ test apps/api pass; integration pass khi bật `RUN_INTEGRATION=1` và DB test.
- Không có route nào trả 200 kèm lỗi; mọi lỗi dùng `DomainError` + code đã chốt.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Gating chặn nhầm nội dung free | `isPremium` default false; chỉ query entitlement khi cờ true; test case 16 |
| Ẩn script làm hỏng UI hiện tại | DTO vẫn có field (null) — không phải breaking type |
| Premium hết hạn giữa phiên nghe | **Chỉ đúng nếu** URL TTL đã verify chạy với asset thật: URL cũ chết sau TTL; nếu fallback URL vĩnh viễn thì người đã lấy URL vẫn nghe được — ghi rõ residual risk, không quảng cáo TTL |
| Docs thiếu operation | `openapi.test.ts` chặn ngay |
| Test integration phụ thuộc DB thật | Giữ pattern `skipIf(!RUN_INTEGRATION)` + transaction rollback như test listening |

## Security Considerations

- Không trả URL audio (kể cả signed) trong DTO chi tiết khi locked.
- `locked` tính server-side, không tin client gửi `isPremium`.
- Không log `sepay` key hay payload chứa PII ở mức info.
- Test dùng user/asset fixtures riêng, rollback sau mỗi test.

## Next Steps

Sau phase 4: UI web/mobile (paywall, trang QR, polling, banner) là việc riêng — plan này không bao gồm. Nếu leader cần doanh thu trên dashboard admin, thêm block `finance` vào `AdminDashboardSchema` ở plan sau.
