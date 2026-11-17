# Một trình soạn kịch bản cho độc thoại và hội thoại

## Yêu cầu

- Chọn rõ loại podcast trước khi nhập nội dung: Độc thoại hoặc Hội thoại.
- Import file đọc nội dung, nhận diện loại, hiển thị loại đã chọn/loại nhận diện cùng bản xem trước. Nếu không khớp thì chặn áp dụng, cho đổi loại theo kết quả nhận diện hoặc tải file khác. Không tự đổi loại hoặc cắt nội dung.
- Sau khi xác nhận, đưa nội dung vào một khung rich editor chính. Không điều hướng sang trang/khung DialogueScriptStep cũ.
- Hội thoại hiển thị nhãn người nói và lượt thoại trong editor; bảo toàn thứ tự, tên người nói, giọng điệu, expression và ghi chú. Có khả năng sửa lời, gán vai, thêm/xóa/sắp xếp lượt và quản lý người nói phù hợp trong cùng vùng soạn.
- Chuyển cấu hình giọng AI từng người nói sang bước Giọng đọc; giữ cơ chế tạo và kiểm tra giọng hiện hành, không chạy TTS nếu cấu hình chưa hợp lệ.
- Giữ mode Trợ lý AI đã làm, tự lưu/lưu tay, nguồn/trích dẫn, tài liệu bổ sung, xem chi tiết và kiểm duyệt. Nội dung AI hoặc người dùng sửa cũng phải phù hợp loại kịch bản.

## Cấu trúc đề xuất

Dùng rich editor chung với adapter theo loại. Độc thoại tiếp tục lưu EditorDocument; hội thoại dùng các khối gắn người nói trong editor và chuyển qua cấu trúc Dialogue hiện có khi lưu. Không gửi đồng thời scriptDocument và dialogue vì API hiện loại trừ hai trường này.

Cấu hình tên/phân vai thuộc Kịch bản, cấu hình giọng đọc thuộc Giọng đọc. Khi đổi giọng cần lưu cấu hình trước khi tạo audio, bảo đảm script hash và âm thanh cũ được xử lý theo cơ chế hiện có. Dữ liệu hội thoại đã lưu phải mở lại đầy đủ, không tự chuyển thành văn bản thuần.

Nếu cần bảo toàn định dạng rich-text trong từng lượt thoại, hợp đồng Dialogue phải được mở rộng có tương thích ngược, thay vì làm mất định dạng khi lưu rồi mở lại. Không thay thế khung cũ bằng một textarea chứa tên người nói rồi đoán lại khi lưu.

## Nhận diện cần chốt

Phương án đề xuất: phân tích nhãn người nói rõ ràng (ví dụ MC:, Khách mời:), yêu cầu ít nhất hai vai có lời thoại để kết luận hội thoại. Không xem mọi dấu hai chấm là nhãn người nói. File thiếu cấu trúc hoặc mơ hồ phải hiển thị cảnh báo và yêu cầu kiểm tra/phân vai trong preview; không tự bịa người nói. Phương án thay thế: AI phân tích file không có nhãn, vẫn bắt buộc xem trước và xác nhận.

## Kiểm tra

File đúng/sai loại; file mơ hồ; hai hoặc nhiều vai; đoạn dẫn xen thoại; nhãn lặp/khác tên; nhập nối/thay thế/hủy; giữ nguyên dữ liệu khi lỗi. Kiểm tra rich formatting, lượt thoại/giọng điệu/ghi chú qua chu kỳ lưu và mở lại. Kiểm tra bước Giọng đọc, giọng trùng/thiếu, tạo AI hai người và nhiều người, hash/audio đã có, chế độ chỉ đọc và các hợp đồng API.

## Trạng thái

Người dùng đã chọn nhận diện theo cấu trúc file và đồng ý triển khai. Dùng nhãn người nói rõ ràng, không gọi AI phân loại. Nhãn không xác định, đoạn dẫn chưa gán vai hoặc chỉ có một vai được cảnh báo trong preview và chặn áp dụng.
