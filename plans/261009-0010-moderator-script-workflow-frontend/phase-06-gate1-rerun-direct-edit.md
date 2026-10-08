# Phase 6: Gate 1, hộp thoại "Làm lại", trình "Sửa tay"

**Phụ thuộc:** phase 5 (dùng lại `useStepDecision`, thanh hành động, xử lý 409/400). Đặc tả: UX §3.4, §3.5, §4.4.

## Việc làm

1. **Thanh hành động chung** `GateActionBar` (dùng cho Gate 0/1/2): **Duyệt & tiếp tục**, **Làm lại…**, **Sửa tay**; chỉ hiện ở bước có cổng đang `WAITING_FOR_HUMAN`; khoá toàn bộ khi đang gửi; vô hiệu khi xem version cũ. Refactor lại Gate 0 (phase 5) dùng component này nếu đã làm riêng.
2. **Hộp thoại Làm lại** (`RERUN`): textarea bắt buộc "Bạn muốn AI sửa điều gì?" + chip gợi ý ("Ngắn gọn hơn", "Nhấn mạnh nhân vật", "Bám sát chính sử hơn"); cảnh báo "Các bước sau (<tên>) sẽ cần chạy lại"; **Gửi cho AI** / **Hủy**. Cũng dùng cho bước `FAILED`.
3. **Gate 1 xem** (`STORY_PLANNER`): tiêu đề series, trọng tâm, huy hiệu "3 tập", 3 thẻ tập (accordion): tiêu đề, câu hỏi trung tâm, 4 ô SPDC (Bối cảnh / Vấn đề / Quyết định / Hệ quả), `narrativeBeats`, `summaryMoments`, `detailedSceneMoments`, `hookEnd`.
4. **Gate 1 sửa tay:** form theo trường; mảng cho thêm/xoá/sắp xếp dòng; giữ đúng 3 tập, `episodeNumber` và `scale` không cho đổi. Validate bằng schema shared trước khi gửi.
5. **Trình sửa JSON dự phòng** (desktop) cho bước chưa có form: kiểm tra cú pháp và schema ở client (schema shared) và hiển thị `message` server khi `400`. Dùng cho Gate 2 báo cáo ở phase 7 nếu cần.
6. Hủy khi có thay đổi chưa lưu thì hỏi xác nhận. `DIRECT_EDIT` thành công: version mới, vẫn chờ duyệt.

## Acceptance

- Gate 1 thật: sửa 1 tiêu đề tập + thêm 1 nhịp kể, Lưu → `v(n+1)` đúng nội dung; **Duyệt & tiếp tục** → chạy bước viết.
- **Làm lại** với feedback: version mới sinh, các bước sau thành "Cần chạy lại", feedback hiện ở tab version tương ứng.
- Nhập sai schema ở trình JSON: lỗi do client bắt hiện ra, nội dung giữ nguyên.
- Hộp thoại bẫy focus, `Esc` đóng, nhãn đọc được bằng trình đọc màn hình.
