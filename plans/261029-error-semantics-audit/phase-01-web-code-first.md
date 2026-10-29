# Phase 1 — Frontend quyết định theo code

Mục tiêu: backend sửa status sau này không làm vỡ UI. Phải xong trước phase 3.

## Thay đổi (apps/web/src)

1. `features/podcast-production/aiCheck/messages.ts` `describeStartError`:
   - 409 → `errorCode === "AI_CHECK_ALREADY_RUNNING"`; mọi 409 khác rơi xuống `error.message`.
   - 422 giữ nhánh `NO_READABLE_SOURCE`; 429 và 503 giữ theo status.
2. `features/podcast-production/angles/AngleManagePage.tsx:90`: bỏ `NAME_TAKEN_STATUS`, dùng `errorCode === "ANGLE_NAME_TAKEN"`.
3. `features/podcast-production/compose/composeMessages.ts`: kiểm tra `HASH_MISMATCH`/`SCRIPT_TOO_LONG` **trước** nhánh status, độc lập 422 hay 409.
4. `shared/components/common/ImageUploadDropzone.tsx`: thêm nhánh `MEDIA_PROVIDER_UNAVAILABLE` theo code trước nhánh 503 theo status (giữ status làm dự phòng).

5. **Gõ kiểu cho code** (`lib/apiError.ts`): `ApiError` giữ `errorCode: string | null` (Better Auth trả `code` riêng, không thuộc `ErrorCode`) và thêm `is(code: ErrorCode): boolean { return this.errorCode === code; }`, `ErrorCode` import từ `@repo/shared`. Thay mọi `errorCode === "X"` và mảng `.includes(error.errorCode ...)` bằng `error.is("X")`: `ReleaseScheduleDialog.tsx:93`, `CreateHistoricalContentDialog.tsx:292`, `PodcastWorkspace.tsx:142`, `aiCheck/messages.ts`, `composeMessages.ts`, `ImageUploadDropzone.tsx:21-22`, `AngleManagePage.tsx`. Gõ sai code → lỗi `tsc`. `check.errorCode` của `AiCheck` (`INTERRUPTED`, `ALL_BLOCKS_FAILED`) là bộ code lưu DB, không đổi.

Không đổi: `RouteErrorFallback`, `currentUserService`, `authService`, `adminReleaseService.health`.

## Test

- `aiCheck`: 409 `AI_CHECK_ALREADY_RUNNING` → câu "đang có lượt rà"; 409 `CONTENT_IN_TRASH` → message server (hiện bị gắn nhầm).
- `composeMessages`: `HASH_MISMATCH` ở cả 422 và 409 đều ra câu "Đoạn đã đổi…".
- `ApiError.is`: `is("STALE_WRITE")` đúng với body `error_code: "STALE_WRITE"`, sai với `null` và với code Better Auth. Một dòng `// @ts-expect-error` cho code không tồn tại để khóa kiểm tra kiểu.
- Angle: 409 `ANGLE_NAME_TAKEN` → nameTaken; 409 khác không.
- Dropzone: `MEDIA_PROVIDER_UNAVAILABLE` ở 502/503/504 đều ra thông báo kho lưu trữ.

## Chấp nhận

`cd apps/web && bun test` + `tsc` sạch; không đổi hành vi với cặp (status, code) hiện tại của backend.
