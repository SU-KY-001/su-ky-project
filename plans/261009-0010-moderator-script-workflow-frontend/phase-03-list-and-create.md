# Phase 3: S1 Danh sách và S2 Tạo kịch bản

**Phụ thuộc:** phase 2. Đặc tả: `docs/ux/script-workflow-ux.md` §3 S1, S2.

## S1 `/moderator/script-workflows`

- `GET /api/script-workflows?page&limit` (mặc định 20), phân trang theo `meta`.
- Mỗi dòng: chủ đề (cắt 2 dòng), badge trạng thái, dòng phụ "Bước n/7 · tên bước", thời điểm tương đối. Nhấn dòng đi tới `/:id`.
- Dòng `WAITING_FOR_HUMAN` nổi bật (viền amber) + nhãn "Chờ bạn duyệt".
- Badge theo bảng UX §3 S1 (icon + chữ + màu, không dùng màu đơn độc). Map ở `labels.ts`.
- Trạng thái: skeleton 5 dòng; rỗng ("Chưa có kịch bản nào" + nút tạo); lỗi mạng (banner + **Thử lại**). `refetchOnWindowFocus`.
- Dòng là phần tử có thể focus, Enter mở, vùng bấm ≥ 44px.

## S2 `/moderator/script-workflows/new`

- Một `textarea` tự giãn cho `topic`, đếm ký tự, khoá nút khi < 3 (sau `trim`) hoặc > 10000. Dùng `CreateScriptWorkflowRequestSchema` từ shared (react-hook-form + resolver) để không lệch giới hạn; hằng số 3 và 10000 lấy từ schema, không viết lại.
- Gọi `GET /health` trước khi gửi: `data.ai = "unavailable"` thì hiện cảnh báo vàng và khoá nút. **Xác minh trước** `/health` có trường `ai`; nếu không có thì bỏ bước này và chỉ xử lý `503` khi gửi.
- Gửi: `Idempotency-Key` mới, nút "Đang khởi tạo…", khoá form. Thành công chuyển `/:id`.
- Lỗi: `400` hiện `message` tại ô; `503` cảnh báo AI chưa sẵn sàng + thử lại; `429` đếm ngược theo `Retry-After`; lỗi khác toast kèm `X-Request-Id`.

## Acceptance

- Tạo thật một workflow từ UI, được chuyển sang `/:id` (màn có thể còn trống ở phase này), và nó hiện trong S1 với trạng thái đúng.
- Phân trang chạy khi có > 20 bản ghi (tạo dữ liệu thử hoặc hạ `limit` tạm qua query).
- Đủ 4 trạng thái (tải, rỗng, lỗi, có dữ liệu) xem được bằng mắt trên trình duyệt; kiểm tra bàn phím (Tab, Enter) và co hẹp 375px.
- Bấm đúp nút tạo chỉ tạo 1 workflow.
