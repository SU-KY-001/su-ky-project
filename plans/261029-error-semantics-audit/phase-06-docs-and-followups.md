# Phase 6 — Docs, theo dõi còn lại, D1

## Docs

- `apps/api/src/routes/docs/index.ts`: bảng quy ước status (từ `plan.md`), danh sách code retryable cập nhật (`WRITE_CONFLICT`), ghi chú "client (kể cả mobile) quyết định theo `error_code`, không theo `message`; status chỉ để phân loại lớp lỗi".
- `routes/docs/paths/*`: mỗi operation liệt kê đúng status/code sau các phase 2-4 (`AGENTS.md` của docs yêu cầu đọc service lấy code thật, không đoán).
- Ghi chú trong docs: `ai_checks.error_code` (`INTERRUPTED`, `ALL_BLOCKS_FAILED`) là bộ code lưu DB, tách biệt `ERROR_CODES`.
- Không tạo README mới; cập nhật `docs/` hiện có nếu có chỗ mô tả lỗi.

## H5 — Worker/outbox

Đọc `core/jobs/release-jobs.ts:57,74,94`: `OutboxPayloadSchema.parse` / `ReleaseJobDataSchema.parse` ném ZodError khi payload sai. Xác minh cấu hình retry của queue; nếu job sai payload bị thử lại vô hạn hoặc mất im lặng thì chuyển sang `safeParse`, log lỗi có `eventId`, đánh dấu failed (không retry). Chưa xác minh — kết quả đọc quyết định có cần sửa không.

## D1 — Quyền truy cập ở module khác

Sau khi chốt D1: đổi `historical-catalog` / catalog "không phải chủ" 404 → 403 và cập nhật `historical-catalog-permissions.test.ts`, `historical-taxonomy.test.ts`. Angle giữ 404 (có chú thích lý do ở `angle.service.ts:10`).

## Dọn dẹp

Xóa DB test `suky_project_test` nếu không dùng nữa: `docker exec suky-postgres psql -U admin -d postgres -c "drop database suky_project_test"`.

## Chấp nhận toàn plan

- `bun test` apps/api ở cả hai chế độ: số fail ≤ baseline (3 và 25), không có test nào mới fail.
- `bun test` apps/web, `tsc` api/web/shared sạch.
- Smoke với API local: một lỗi mỗi loại (400 schema, 403 không quyền, 404, 409 stale, 422 checklist, 429, 502/504 TTS giả, lỗi Prisma P2002) trả đúng status/code/body.
