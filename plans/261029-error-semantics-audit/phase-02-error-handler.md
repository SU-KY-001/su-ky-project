# Phase 2 — Handler toàn cục: Prisma, HTTPException, validation

File: `apps/api/src/core/middleware/errorHandler.ts`, `apps/api/src/modules/catalog/presentation/public-historical.routes.ts`, `packages/shared/src/schemas/problem.ts`, `apps/api/src/routes/docs/*`.

## H1 — Map lỗi Prisma một chỗ

Thêm nhánh trước khối 500, dùng `Prisma.PrismaClientKnownRequestError`:

| Prisma | Status | Code | Ghi chú |
|---|---|---|---|
| P2002 (unique) | 409 | `CONFLICT` | message trung tính, không lộ tên cột |
| P2025 (không thấy bản ghi) | 404 | `NOT_FOUND` | |
| P2003 (FK) | 409 | `CONFLICT` | |
| P2034 (write conflict / deadlock) | 409 | `CONFLICT` | thêm vào retryable (xem dưới) |
| P1001, P1002, P1008, P1017 | 503 | `SERVICE_UNAVAILABLE` | `Retry-After` |

Giữ nguyên các map riêng cần message cụ thể (`admin.service` `mapPrismaError`, `angle.repository`, hai repo catalog, `prisma-release.repository:955`): chúng chạy trước handler. Ở production không bao giờ trả `error.message` của Prisma (đã đúng ở nhánh 500, kiểm tra cho nhánh mới).

Log mức `warn` cho 4xx map được, `error` cho 503, kèm `reqId`, `userId`, `path` như nhánh hiện có.

## S6 — HTTPException

Bổ sung `HTTP_ERROR_CODES`: 405 `METHOD_NOT_ALLOWED`, 415 `UNSUPPORTED_MEDIA_TYPE`, 429 `RATE_LIMITED`. Thêm hai code mới vào `ERROR_CODES` + docs. Bỏ `HTTP_ERROR` khỏi nhánh DomainError (sau phase 3 S2 không còn ai dùng); giữ làm fallback của HTTPException lạ.

## H3

`public-historical.routes.ts:11,30`: thêm `throwOnInvalid` vào hai `zValidator`.

## Ranh giới 4xx/5xx và idempotency

| Thay đổi | Trước | Sau | Tác động Idempotency-Key |
|---|---|---|---|
| Lỗi Prisma không map | 500 | 409/404 | Web không gửi lại cùng key (đúng: gửi lại vẫn lỗi) |
| P1001... | 500 | 503 | Vẫn ≥500, web gửi lại cùng key; server tự xóa key khi ≥500 |
| P2034 | 500 | 409 | Server xóa key nếu code thuộc `RETRYABLE_ERROR_CODES`; thêm `CONFLICT`? **Không** — thêm code riêng `WRITE_CONFLICT` (409) vào `RETRYABLE_ERROR_CODES` thay vì làm `CONFLICT` retryable |

Vì vậy P2034 dùng code mới `WRITE_CONFLICT` (409, retryable); P2002/P2003 dùng `CONFLICT`.

## Test (apps/api/tests)

- Unit trên `errorHandler` với lỗi giả `PrismaClientKnownRequestError` từng mã → đúng status/code/body, không có chuỗi từ `error.message` ở `NODE_ENV=production`.
- HTTPException 405/415/429 → code mới.
- `public-historical`: query sai → envelope `{error_code, message}`, 400.

## Chấp nhận

`bun test` không tăng fail so với baseline (cả hai chế độ); `tsc` sạch.
