# Phase 3 — Sửa status/code sai nghĩa

Điều kiện: phase 1 đã merge. Mỗi mục cập nhật: nơi ném, `ERROR_CODES` nếu thêm code, docs OpenAPI, test.

## S1 — Thống nhất

| Code | Hiện tại | Sau | Nơi |
|---|---|---|---|
| `HASH_MISMATCH` | 422 (`compose.service.ts:164`), 409 (`prisma-content.repository.ts` ~1031) | 409 cả hai | docs ai-assist + studio |
| `CONTENT_NOT_READY` | 422 (catalog, evidence), 409 (`release.service.ts` 4 chỗ: ~255, 315, 421, 696) | 422 cả | docs releases |
| `VALIDATION_ERROR` | 400 (zod), 422 (service) | giữ cả hai, ghi rõ trong docs: 400 sai schema, 422 vi phạm nghiệp vụ | `routes/docs/index.ts` |

## S2 — Client hủy

`compose-failure.ts:28`: thay `408 HTTP_ERROR` bằng code mới `REQUEST_ABORTED`, status theo D2 (499 nếu type cho phép, không thì 400). Không retry ở web (408 trước đó cũng không).

## S3 — Thay `CONFLICT` chung chung

| Nơi | Thành |
|---|---|
| `quiz-authoring.service.ts:61,78` (revision lệch) | `STALE_WRITE` |
| `admin.service.ts:166` "Email đã được sử dụng" | `EMAIL_TAKEN` (409, code mới) |
| `catalog.service.ts:185` "Source could not be created" | `SOURCE_ISBN_TAKEN` nếu do trùng ISBN, không thì giữ `CONFLICT` + message rõ |
| `release.service.ts` 137, 225, 233; `quiz-authoring` 43, 86; `gamification` 112, 164; `voice.service.ts:135`; `prisma-historical-catalog` 768, 934; `admin.service` 197, 227, 844 | Đọc từng chỗ: nếu là chuyển trạng thái sai → `INVALID_STATE_TRANSITION`; trùng → code cụ thể có sẵn; không rõ → giữ `CONFLICT` |

`CONFLICT` còn lại chỉ là fallback.

## S5 — 403 vi phạm quy trình

`content.service.ts` (~645, `publishEpisode`): "Podcast phải được gửi duyệt…" → 409 `INVALID_STATE_TRANSITION`. Giữ 403 cho `CONTENT_LOCKED`, `SELF_REVIEW_FORBIDDEN`, "chỉ admin", "chỉ chủ series".

## Ranh giới 4xx/5xx

Tất cả mục trên nằm trong nhóm 4xx → không ảnh hưởng `canReuseIdempotencyKey`.

## Test

Cập nhật kỳ vọng ở test pin status cũ (grep `422`/`409` trong `apps/api/tests`); thêm test cho từng đổi status ở nơi chưa có. Web: `composeMessages` test của phase 1 phải vẫn pass.

## Mỗi code một status (F2)

Bắt buộc: `apps/api/tests/error-code-status.test.ts` đọc `apps/api/src/**/*.ts` (không cần DB), bóc mọi `new DomainError(<status>, "<CODE>"` kể cả dạng nhiều dòng (file CRLF nên dùng `\r?\n`), khẳng định mỗi `CODE` chỉ có một status. Ngoại lệ phải khai báo trong test kèm lý do (kỳ vọng: không có). Test fail trước khi sửa S1 (`HASH_MISMATCH`, `CONTENT_NOT_READY`), pass sau: đó là bằng chứng hồi quy.

D4 (mặc định **không**): thêm `ERROR_STATUS: Record<ErrorCode, ContentfulStatusCode>` ở api và đổi `DomainError` nhận `(code, message)`. Chỉ làm nếu test trên không đủ. `VALIDATION_ERROR` hợp lệ ở hai status vì 400 đến từ zod qua `RequestValidationError`, không phải `DomainError`.

## Chấp nhận

`bun test` cả hai chế độ không tăng fail; `bun test` web + `tsc` hai app sạch; smoke: gọi 3 endpoint đại diện (compose HASH_MISMATCH, release CONTENT_NOT_READY, quiz stale) qua API local và đối chiếu status/code với bảng.
