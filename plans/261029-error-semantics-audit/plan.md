---
title: "Chuẩn hóa ngữ nghĩa mã lỗi API và bổ sung xử lý lỗi còn thiếu"
description: "Rà 66 error code / 286 DomainError: sửa status sai nghĩa, thay CONFLICT chung chung, map lỗi Prisma một chỗ, tách frontend khỏi phụ thuộc theo status"
status: completed
priority: P2
effort: 6 phase; phase 5 (details validation) tùy chọn
mode: hard
created: 2026-10-29
blockedBy: []
blocks: []
---

# Chuẩn hóa mã lỗi

Nguồn: khảo sát trong phiên 2026-10-29 (không có file report riêng). Cross-plan scan: `plans/` chỉ có `261027-two-person-podcast` (completed). Không chặn ai, không bị chặn.

## Quy ước status (chốt, áp dụng cho mọi phase)

| Status | Dùng khi |
|---|---|
| 400 | Sai cú pháp / schema request (zod, JSON hỏng, thiếu header) |
| 401 | Chưa đăng nhập / phiên hết hạn |
| 403 | Đã đăng nhập nhưng không có quyền với tài nguyên **có thật** (đã làm cho content: `loadSeriesForRead`, `loadEpisodeForRead`) |
| 404 | Tài nguyên không tồn tại |
| 409 | Xung đột với trạng thái hiện tại: stale write, chuyển trạng thái sai, trùng, đang được dùng, trong thùng rác |
| 422 | Request hợp lệ về cú pháp nhưng vi phạm quy tắc nghiệp vụ / chưa đủ điều kiện (checklist, publish gate, `CONTENT_NOT_READY`) |
| 429 | Vượt hạn mức; luôn kèm `Retry-After` nếu biết |
| 502 | Upstream trả lỗi |
| 503 | Chính dịch vụ này (hoặc cấu hình) chưa sẵn sàng / quá tải |
| 504 | Upstream hết giờ |

## Phát hiện và phase xử lý

| Mã | Vấn đề | Phase |
|---|---|---|
| S1 | `HASH_MISMATCH` 422 (compose) vs 409 (content repo); `CONTENT_NOT_READY` 422 vs 409 (release.service); `VALIDATION_ERROR` 400 vs 422 | 3 |
| S2 | 408 `HTTP_ERROR` cho client hủy (`compose-failure.ts:28`) | 3 |
| S3 | `CONFLICT` thay cho `STALE_WRITE` / code cụ thể (quiz-authoring, admin email) | 3 |
| S4 | 503 cho lỗi upstream ở TTS và PDF | 4 |
| S5 | 403 cho vi phạm quy trình (`content.service.ts` ~645) | 3 |
| S6 | `HTTPException` 405/415/429... rơi vào `HTTP_ERROR` | 2 |
| S7 | Không phải chủ → 404 ở angle, historical-catalog | Quyết định D1 |
| H1 | Lỗi Prisma không map ở handler (6 chỗ tự map riêng) | 2 |
| H2 | Validation không trả field nào sai | 5 (tùy chọn) |
| H3 | 2 `zValidator` thiếu `throwOnInvalid` (`public-historical.routes.ts:11,30`) | 2 |
| H4 | `Error` thường ở runtime AI → 500 (`structured-agent-runner.ts:136,141`) | 4 |
| H5 | `OutboxPayloadSchema.parse` trong worker: retry vô ích? chưa xác minh | 6 |
| F0 | Frontend quyết định theo status thay vì code | 1 (làm trước) |
| F1 | Web so `errorCode` bằng chuỗi thô (`ApiError.errorCode: string \| null`); gõ sai/đổi tên code không báo lỗi lúc build | 1 |
| F2 | Không có nguồn duy nhất cho status của từng code; cùng code bị ném với hai status | 3 (test bắt buộc; bảng `ERROR_STATUS` chỉ làm nếu D4 = có) |

## Phụ thuộc frontend (đã kiểm tra)

`apps/mobile` không gọi API nào (axios client tạo sẵn nhưng không được import) — blast radius = web.

| Vị trí web | Phụ thuộc | Ràng buộc cho backend |
|---|---|---|
| `aiCheck/messages.ts` | 409 → "đang chạy"; 422 + `NO_READABLE_SOURCE`; 429; 503 | Sau phase 1 chỉ còn code-first |
| `compose/composeMessages.ts` | 429/502/504/503+`AI_DISABLED`; 422 + `HASH_MISMATCH`/`SCRIPT_TOO_LONG` | **Phase 1 phải xong trước khi `HASH_MISMATCH` sang 409** |
| `angles/AngleManagePage.tsx` | 409 → tên trùng | Sau phase 1: theo `ANGLE_NAME_TAKEN` |
| `ImageUploadDropzone.tsx` | code `MEDIA_TYPE_NOT_ALLOWED`/`MEDIA_INVALID` (mảng `.includes`), `MEDIA_TOO_LARGE`; status 401/403/429/503 | **Giữ `MEDIA_PROVIDER_UNAVAILABLE` ở 503** |
| `apiError.ts` `isRetryable` → `canReuseIdempotencyKey` | 429 hoặc ≥500 → gửi lại cùng Idempotency-Key | Không được chuyển code qua lại ranh giới 4xx/5xx mà không rà (xem bảng ở phase 2, 3, 4) |
| `useVoiceJob.ts` | 404 → job hết hạn | Không đổi 404 của endpoint poll |
| `currentUserService.ts` | 401 → chưa đăng nhập | Không đổi 401 của `/me` |
| `adminReleaseService.health` | 503 có body hợp lệ | Không đụng `/health` |
| `STALE_WRITE` (2 dialog), `SERIES_NOT_PUBLISHABLE` | code | Giữ nguyên |

Lưu ý khác: `RouteErrorFallback` chỉ xử lý `ErrorResponse` của react-router nên 401/403/404 của `ApiError` hiện chỉ hiện message thô (`PodcastCreation.tsx:55`). Ngoài scope; nếu muốn thì làm plan riêng. Message của server đang hiển thị thẳng cho người dùng nên đổi chữ trong message = đổi UI.

## Quyết định cần chốt

- **D1 (S7):** angle và historical-catalog giữ 404 hay đổi 403. Mặc định: content/catalog → 403, angle giữ 404 (dữ liệu cá nhân). Test `historical-catalog-permissions.test.ts`, `angle.*` đang pin 404.
- **D2 (S2):** client hủy trả 499 hay 400. Mặc định: 499 nếu `ContentfulStatusCode` của Hono cho phép, không thì 400. Cả hai không đổi hành vi retry của web (408 hiện cũng không retry).
- **D3 (H2):** có làm phase 5 không. Mặc định: có, vì web đang hiện "Request validation failed" thô.
- **D4 (F2):** thêm `ERROR_STATUS` + đổi chữ ký `DomainError` (đụng 286 chỗ), hay chỉ dùng test "mỗi code một status". Mặc định: chỉ test.

## Baseline kiểm thử (trước khi sửa)

- `bun test` (apps/api, không DB): 3 fail có sẵn — `series checklist ... phase and at least one source`, `studio role isolation` (2 test).
- `RUN_INTEGRATION=1` trên DB `suky_project_test` (rỗng, migrate từ SQL): 25 fail có sẵn (publish checklist, quiz idempotency, release repository, historical evidence...), không do thay đổi này. Tên DB phải chứa "test".
- Mục tiêu: sau mỗi phase, danh sách fail **không tăng** so với baseline; chạy cả hai chế độ.

## Phase

1. `phase-01-web-code-first.md` — frontend quyết định theo code, kiểu `ErrorCode` từ `@repo/shared`
2. `phase-02-error-handler.md` — Prisma/HTTPException/throwOnInvalid
3. `phase-03-status-corrections.md` — S1, S2, S3, S5, test "mỗi code một status"
4. `phase-04-upstream-errors.md` — S4, H4
5. `phase-05-validation-details.md` — H2 (tùy chọn)
6. `phase-06-docs-and-followups.md` — docs, H5, D1

Thứ tự: 1 → (2, 4 song song được) → 3 → 5 → 6. Phase 3 chỉ bắt đầu sau phase 1.

## Rủi ro chung

- Đổi status/code động tới bốn nơi: `ERROR_CODES` (`packages/shared/src/schemas/problem.ts`), OpenAPI (`apps/api/src/routes/docs/paths/*`), `RETRYABLE_ERROR_CODES`, web. Mỗi phase phải cập nhật đủ cả bốn.
- Test cũ pin status 404/422 (xem baseline); đổi kỳ vọng cùng commit, không re-pin hành vi cũ.
- Mobile chưa dùng API; khi dùng phải theo hợp đồng này (ghi trong docs phase 6).

## Kết quả thực hiện (2026-10-29)

Quyết định: D1 đổi sang 403, D2 dùng 400 `REQUEST_ABORTED` (Hono `ContentfulStatusCode` không có 499), D3 làm, D4 chỉ viết test.

Lệch khỏi kế hoạch, kèm lý do:

| Mục | Kế hoạch | Thực tế |
|---|---|---|
| H3 | 2 `zValidator` thiếu `throwOnInvalid` | Sai: grep theo dòng bỏ sót do format nhiều dòng; cả hai đã có. Không sửa |
| S5 | 403 vi phạm quy trình → 409 | Giữ 403: điều kiện là `role !== "admin"` (thiếu quyền), không phải sai trạng thái |
| S4 | TTS và PDF: 503 → 502/504 | Chỉ sửa TTS: hết giờ → 504 `AI_TIMEOUT`, không có âm thanh → 502 `AI_BAD_OUTPUT`. Giữ 503 `AI_UNAVAILABLE` và `MEDIA_PROVIDER_UNAVAILABLE` vì test "mỗi code một status" và quy ước "dịch vụ phụ thuộc chưa sẵn sàng = 503" của compose/media; web upload ảnh dựa vào 503 |
| S3 | Thay mọi `CONFLICT` | Chỉ thay chỗ có code đúng: `EMAIL_TAKEN`, `STALE_WRITE` (quiz), `INVALID_STATE_TRANSITION` (giọng chưa xong), `VALIDATION_ERROR` 422 (người thay thế). `CONFLICT` còn lại là xung đột thật chưa có code riêng |
| H5 | Có thể cần `safeParse` | Không đổi: outbox đã bắt lỗi parse và `markOutboxFailed`; `ReleaseJobDataSchema.parse` chỉ gặp payload do chính dispatcher tạo, queue giới hạn số lần retry |
| D1 | content/catalog → 403, angle giữ 404 | `catalog.service` (nguồn, thực thể) và `historical-catalog.service` → 403; angle giữ 404 |

Thêm so với kế hoạch: `WRITE_CONFLICT`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_ABORTED`, `EMAIL_TAKEN` trong `ERROR_CODES`; `ErrorDetailSchema`, `MAX_ERROR_DETAILS`; `ApiError.is`, `ApiError.details`.

Kiểm thử: api 369 pass / 25 fail (cùng 25 test fail như trước khi sửa trên DB `suky_project_test` rỗng); `error-code-status.test.ts` fail trước khi sửa S1, pass sau. Web `bun test` và `tsc` của api/web/shared xem báo cáo cuối phiên.

Chưa làm: web chưa hiển thị `details` theo từng trường (chỉ nhận và lưu trên `ApiError`); trang 401/403/404 riêng cho `ApiError`.
