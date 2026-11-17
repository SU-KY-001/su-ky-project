# Hai chế độ soạn kịch bản podcast

## Phạm vi

Tách giao diện bước Kịch bản thành Soạn thủ công (mặc định) và Trợ lý AI qua một công tắc có nhãn rõ ràng. Hai chế độ chiếm toàn chiều rộng vùng nội dung, dùng chung bản kịch bản và không thay đổi luồng tạo tập, kiểm duyệt hay phát hành.

## Phương án

Dùng hai bề mặt trong cùng bước và giữ trạng thái của editor/AI khi chuyển. Đây là phương án đề xuất vì mở route khác hoặc tiếp tục dùng sidebar AI sẽ không đáp ứng việc chuyển mode ngay trong trang và dễ mất trạng thái.

## Soạn thủ công

Rich editor toàn chiều rộng; giữ định dạng, undo/redo, trích dẫn nguồn, đếm ký tự/từ/thời lượng, tự lưu, lưu tay và thông báo lỗi. Tài liệu bổ sung vẫn là file đính kèm riêng. Có Import file để đọc nội dung vào kịch bản. Giữ chức năng hội thoại nhiều người, các lượt nói và gán người đọc; không tự chuyển đổi hay ghi đè hội thoại khi đổi mode.

## Trợ lý AI

Vùng AI toàn chiều rộng, mặc định vào Soạn nháp. Giữ đủ đề bài, góc kể, thời lượng/số từ, ngôi kể, dàn ý có thể sửa, giọng văn, kết quả nháp và chèn vào kịch bản. Rà soát, cảnh báo, nguồn, trạng thái xử lý và viết lại đoạn vẫn được giữ. Thao tác cần chọn đoạn dẫn người dùng về editor để chọn rồi mở đúng tác vụ AI. Nút quay về soạn thủ công luôn khả dụng.

Chuyển mode không unmount controller đang xử lý, không tự hủy request hoặc xóa kết quả/đề bài/dàn ý. Có trạng thái xử lý rõ; lỗi không làm mất văn bản. Giữ xác nhận và kiểm tra xung đột khi áp dụng nội dung thay thế. Chuyển giao diện nhẹ, hỗ trợ giảm chuyển động và focus bàn phím.

## Import file

Tách phần tái sử dụng của import Quiz thành component/controller dùng chung cho chọn file, kéo thả, trạng thái tải/đọc, hủy và lỗi. Dùng lại bộ đọc tài liệu backend hiện có; không gọi bộ phân tích câu hỏi hoặc AI tạo câu hỏi để nhập kịch bản.

Định dạng theo khả năng bộ đọc Quiz: DOC, DOCX, PDF có văn bản, TXT, MD; giữ giới hạn 5 MB và kiểm tra phía server. Có xem trước văn bản, số ký tự và giới hạn kịch bản. Người dùng chọn chèn cuối hoặc thay thế; thay thế văn bản đang có phải xác nhận. Không cắt âm thầm văn bản vượt giới hạn. Nội dung được đưa qua cấu trúc tài liệu editor, không chèn HTML không tin cậy. Đóng/hủy không đổi kịch bản. Chưa áp dụng thì chưa lưu nội dung vào tập.

## Kiểm tra

Kiểm tra mặc định thủ công; chuyển mode nhiều lần giữ nội dung/trạng thái; AI soạn/rà/viết lại/chèn vẫn hoạt động; import xem trước, append, replace, hủy, file lỗi/vượt giới hạn; giữ tự lưu, quyền chỉ đọc và hội thoại; responsive desktop/mobile, focus và reduced motion. Chạy TypeScript, test FE/API liên quan và OpenAPI nếu bổ sung endpoint.

## Trạng thái

Đã được người dùng duyệt và triển khai. Ghi nhận kiểm tra và giới hạn tại `podcast-script-modes-plan.md`.
