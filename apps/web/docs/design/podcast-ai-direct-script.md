# AI tạo kịch bản độc thoại trực tiếp

Luồng hiện tại thay thế phần soạn nháp nhiều bước trong thiết kế cũ.

- Một trang cấu hình: chủ đề, góc kể (kèm tạo/quản lý), thời lượng, giọng văn hoặc mô tả riêng, ngôi kể. Số từ được tính nội bộ theo thời lượng; ngôi thứ nhất vẫn chưa khả dụng.
- Không gọi AI tạo dàn ý và không có bước duyệt dàn ý. `DirectScriptComposer` gọi API `draft-section` hiện có với một phần đại diện cho toàn bộ kịch bản; nội dung có mở đầu, phát triển và kết thúc.
- Dùng chung một `RichScriptEditor` với mode thủ công. Khi nhận kết quả hợp lệ, thay nội dung trong editor và giữ mode AI. Mod có thể chỉnh trực tiếp, tạo lại hoặc lưu kịch bản.
- Không tự lưu nội dung. Nút Lưu kịch bản và Lưu bản nháp/Lưu thay đổi vẫn là thao tác lưu chủ động.
- Tạo lại phải xác nhận nếu editor đang có nội dung; chỉ thay sau khi tạo thành công. Kiểm tra nội dung editor với ảnh chụp trước yêu cầu để tránh ghi đè chỉnh sửa trong lúc chờ. Nếu xung đột, giữ bản AI riêng để mod xác nhận áp dụng.
- Hỗ trợ dừng tạo, bỏ kết quả muộn sau hủy, lỗi API, giới hạn ký tự và kiểm tra cấu trúc độc thoại.
- Mode AI chỉ tạo kịch bản, không có tab Rà soát. Nút AI rà soát nằm trên toolbar editor ở mode thủ công: mở cấu hình phạm vi/ghi chú rồi chạy luồng rà soát hiện có. Kết quả xuất hiện trong một vùng riêng ở mode thủ công; giữ chức năng hủy, xem nguồn, xem đoạn, áp dụng đề xuất và xác nhận đã xử lý. Nút Viết lại khi bôi đen đã được ẩn.
- Các component dàn ý cũ không còn được gọi từ `AiDock`; endpoint dàn ý chưa bị xóa khỏi backend.
