# Phase 5 — Chi tiết lỗi validation (tùy chọn, D3)

Vấn đề: `throwOnInvalid` ném `RequestValidationError("Request validation failed")` và bỏ `issues` của zod; web hiển thị đúng chuỗi đó.

## Thay đổi

1. `packages/shared/src/schemas/problem.ts`: `ErrorResponseSchema` thêm `details: z.array(z.object({ path: z.string(), message: z.string() })).max(MAX_ERROR_DETAILS).optional()`. `MAX_ERROR_DETAILS` là hằng có tên (đề xuất 20).
2. `RequestValidationError` giữ `issues`; `throwOnInvalid` truyền `result.error.issues`.
3. `errorHandler` trả `details` (path nối bằng `.`, message của zod; không trả giá trị đầu vào để khỏi lộ dữ liệu).
4. `routes/docs/components.ts`: thêm `details` vào schema lỗi và ví dụ.
5. Web `lib/apiError.ts`: `ErrorBodySchema` thêm `details`, `ApiError` giữ `details` (additive; field lạ hiện bị bỏ qua nên backend phát trước không làm vỡ web). Hiển thị theo field là việc UI từng form, ngoài phase này; tối thiểu `errorMessage()` ghép field đầu tiên vào message.

## Tương thích

Thêm field tùy chọn. `idempotency.ts` parse body lỗi đã lưu bằng `ErrorResponseSchema` (strip field lạ nên replay cũ vẫn hợp lệ).

## Test

- Body sai kiểu → 400 `VALIDATION_ERROR` kèm `details[0].path`.
- Replay idempotency của response lỗi cũ (không có `details`) vẫn parse được.
- `ApiError.fromResponse` với và không có `details`.

## Chấp nhận

`tsc` api + web + shared sạch; không test cũ nào đổi kỳ vọng.
