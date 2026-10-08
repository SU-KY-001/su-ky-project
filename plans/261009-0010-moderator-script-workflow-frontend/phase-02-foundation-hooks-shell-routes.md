# Phase 2: Nền tảng (helper, hooks, SSE, shell, route)

**Phụ thuộc:** phase 1. **Mục tiêu:** mọi thứ dùng chung để các màn chỉ còn là UI.

## Cấu trúc thư mục

```text
apps/web/src/features/script-workflow/
├── api/            # hàm gọi API + query keys + parse schema
├── hooks/          # useScriptWorkflows, useScriptWorkflow, useStepDecision, ...
├── stream/         # useWorkflowStream (EventSource)
├── store.ts        # zustand: bước/version đang xem, nháp form
├── labels.ts       # tên bước, nhãn trạng thái, map badge (từ UX 3.1)
└── components/
apps/web/src/features/moderator/components/ModeratorShell.tsx
apps/web/src/pages/moderator/script-workflows/
```

## Việc làm

1. **Lỗi API.** `lib/apiError.ts`: class `ApiError { status, errorCode, message, requestId }` đọc body `{ error_code, message }` (không có `details`) và header `X-Request-Id`. Hàm `unwrap(res)` ném `ApiError` nếu `!res.ok`. (Thay `readJson` đã bị xoá khi merge.)
2. **Idempotency.** `lib/idempotency.ts`: `newIdempotencyKey()` (`crypto.randomUUID()`). Mutation giữ key theo **lần bấm**, tái dùng khi retry cùng một thao tác, sinh key mới cho thao tác mới. Xử lý `429` bằng `Retry-After` (hiện đếm ngược, khoá nút).
3. **Hooks theo UX §5.3:** `useScriptWorkflows(page, limit)`, `useScriptWorkflow(id)` (`refetchInterval` bật khi SSE đứt), `useCreateScriptWorkflow()`, `useStepDecision(id)`, `usePublications(id)`, `useWorkflowEvents(id)`. Response parse bằng schema `@repo/shared`, không cast. Query keys tập trung một file.
4. **SSE.** `useWorkflowStream(id)`: `new EventSource(url, { withCredentials: true })`; nghe `workflow-event` và `workflow-done`; gộp event trong 500 ms (hằng số `EVENT_COALESCE_MS`) thành một lần `invalidateQueries`; đóng khi `workflow-done` hoặc khi run `COMPLETED/FAILED`; đứt liên tiếp quá `MAX_SSE_RETRIES` thì báo `connection: "degraded"` để hook detail chuyển sang polling `POLL_INTERVAL_MS`. Cleanup `close()` trong effect. Đây là trường hợp `useEffect` hợp lệ (đồng bộ với hệ ngoài React).
5. **Tách shell.** Lấy sidebar + header + toast từ `ModeratorDashboard.tsx` thành `ModeratorShell` (giữ nguyên class `mod-*`, `Sheet` mobile, `ModeratorText`). `ModeratorDashboard` dùng lại shell, không đổi hành vi. Thêm mục điều hướng "Kịch bản" (icon Phosphor) trỏ `/moderator/script-workflows`; dashboard giữ neo hash như cũ.
6. **Route** trong `routeConfig.tsx` (lazy, theo mẫu hiện có): `/moderator/script-workflows`, `/new`, `/:id`, `/:id/publication`, mỗi route có `errorElement`.
7. **Route guard.** Layout route `ModeratorGuard` dùng `useSession()`: chưa đăng nhập hiện trạng thái "Cần đăng nhập" (kèm nút đăng nhập dev khi `DEV`); không phải `moderator` hiện "Bạn không có quyền truy cập" và ẩn menu moderator (UX §2).
8. **Kiểm tra SSE bằng request thật** trước khi dựng UI: tạo workflow bằng seed account, mở `EventSource` từ origin `5173`, xác nhận nhận được event và không bị CORS chặn.

## UI/UX

- Shell giữ nguyên ngôn ngữ thị giác hiện có (token `mod-*`, Manrope). Không thêm màu mới.
- Banner "Mất kết nối realtime" dùng chữ + icon, `role="status"`.
- Mọi toast lỗi kèm mã yêu cầu (`X-Request-Id`) có nút sao chép (UX §6).

## Acceptance

- Từ trình duyệt: gọi `GET /api/script-workflows` qua hook trả danh sách (rỗng cũng được), không lỗi CORS/401.
- `useWorkflowStream` nhận được `workflow-event` thật; ngắt API thì chuyển sang polling và hiện banner.
- Dashboard `/moderator` hoạt động y như trước (so sánh trực quan) sau khi tách shell.
- `check-types` sạch.

## Rủi ro

- Tách shell có thể làm vỡ layout dashboard: chụp ảnh trước và sau để so.
- `hc` type có thể suy ra response union rộng: nếu vậy chỉ dùng `hc` để dựng request, còn kiểu response lấy từ schema shared.
