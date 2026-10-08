# Script Workflow API (Moderator)

Moderator tạo kịch bản podcast lịch sử 3 tập bằng AI: 7 bước tuần tự, 3 cổng duyệt của người (Gate 0 sau `RESEARCHER`, Gate 1 sau `STORY_PLANNER`, Gate 2 sau `FACT_CHECKER`). Âm thanh nằm ngoài hệ thống: Moderator copy `finalScript` sang ElevenLabs.

## Truy cập

- Prefix `/api/script-workflows`, cookie session Better Auth, role `moderator` (Admin KHÔNG vào được, BR-22).
- Cấp quyền: `POST /api/auth/admin/set-role` với `{ userId, role: "moderator" }`.
- Workflow thuộc người tạo. Id của người khác trả `404`, không phải `403`.
- Envelope chuẩn `ApiResponse`: `{ success, data, error?, meta }`. Lỗi: `400 VALIDATION_ERROR`, `401`, `403`, `404`, `409 CONFLICT` (baseVersion cũ hoặc bước không ở `WAITING_FOR_HUMAN`), `503 SERVICE_UNAVAILABLE` (AI chưa sẵn sàng khi tạo).

## Endpoint

| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | `{ topic }` (3-10000 ký tự) -> `201 { id }`, chạy `RESEARCHER` ngay |
| GET | `/?page&limit` | Danh sách của tôi, `meta.total` |
| GET | `/:id` | 7 bước + các version + output |
| GET | `/:id/tree` | Cây node bất biến + publications |
| POST | `/:id/step-decisions` | `CONTINUE` / `RERUN` / `DIRECT_EDIT` |
| GET | `/:id/publications` | Bản xuất bản kèm `finalScript` |
| POST | `/:id/publications` | `{ approvedVersionId }`, idempotent |
| GET | `/:id/events?type&limit` | Nhật ký, cũ -> mới |
| GET | `/:id/events/stream` | SSE: `workflow-event`, `ping`, `workflow-done` |

SSE dùng cookie: `new EventSource(url, { withCredentials: true })`. Hỗ trợ `afterId` và `Last-Event-ID`.

## step-decisions

- `CONTINUE`: `{ action, stepType, baseVersion, incomingGuidance?, narrativeSelection? }`. Gate 0 gửi `narrativeSelection` (chọn từ `narrativeMenu`).
- `RERUN`: `{ action, stepType, feedback }`. Fork node anh em, các bước sau thành `STALE`.
- `DIRECT_EDIT`: `{ action, stepType, baseVersion, editedOutputJson, note? }`. Sai schema -> `400 VALIDATION_ERROR`.

## Vận hành

- Cần `DATABASE_URL` (pg-boss dùng schema `pgboss` trong cùng Postgres) và khoá AI: `PI_PROVIDER`, `GEMINI_API_KEY` hoặc `OPENCODE_API_KEY`, tùy chọn `PI_MODEL`, `PI_THINKING_LEVEL`, `PI_WEB_ACCESS_DIR` (xem `.env.example`).
- `bun run dev` của `apps/api` nạp `../../.env`.
- `/health` trả thêm `queue` (`running|stopped`, stopped => 503) và `ai` (`ready|unavailable`, không làm degraded).
- Áp schema: `bun run db:push` trong `packages/db`.
