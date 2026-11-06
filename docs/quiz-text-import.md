# Nhập câu hỏi từ văn bản và tài liệu

Trong trình soạn quiz, chọn **Nhập câu hỏi**. Dán nội dung hoặc tải một tệp
`.docx`, `.txt`, `.md`, PDF có văn bản. Tệp tối đa 5 MB, văn bản tối đa 200.000
ký tự, PDF tối đa 100 trang. `.doc` cần lưu lại thành `.docx`; PDF scan cần OCR trước.

## Mẫu

```text
Câu 1: Triều đại nào ba lần đánh thắng quân Mông – Nguyên?
Loại: Chọn một
A. Triều Lý
B. Triều Trần
Đáp án: B
Giải thích: Nội dung giải thích của người soạn.
Thời gian: 30

Câu 2: Chọn những nhân vật được nhắc đến trong tập podcast.
Loại: Chọn nhiều
A. Nhân vật thứ nhất
B. Nhân vật thứ hai
C. Nhân vật thứ ba
Đáp án: A, C

Câu 3: Ai lãnh đạo khởi nghĩa Lam Sơn?
Loại: Điền đáp án
Đáp án: Lê Lợi

Câu 4: Ai chỉ huy quân Tây Sơn đại phá quân Thanh?
Loại: Điền đáp án
Đáp án: Nguyễn Huệ
Chấp nhận thêm: Quang Trung
```

Mỗi câu bắt đầu bằng `Câu 1:`, `Câu 1.` hoặc `1.`; lựa chọn dùng A–F với dấu
chấm hoặc ngoặc đóng. Nhận cả `Đáp án đúng: B. Nội dung đáp án`. Câu hỏi,
lựa chọn, đáp án điền và giải thích có thể kéo dài nhiều dòng.

`Loại` có thể bỏ nếu cấu trúc rõ: có lựa chọn và một/nhiều đáp án đúng sẽ
nhận diện dạng chọn một/nhiều; không có lựa chọn nhưng có câu trả lời sẽ
nhận diện dạng điền. `Giải thích` và `Thời gian` không bắt buộc; thời gian
mặc định lấy từ trình soạn, cho phép 10–120 giây. Mỗi câu tối đa 6 lựa chọn
hoặc 6 cách trả lời được chấp nhận. Không tách đáp án điền bằng dấu phẩy;
dùng từng dòng `Chấp nhận thêm:`.

## Xem lại và áp dụng

1. Bấm **Đọc câu hỏi**. Chọn từng câu để đối chiếu đoạn nguồn được đánh dấu.
2. Sửa trực tiếp câu nhận diện sai, sửa nguồn rồi đọc lại, hoặc chủ động bỏ câu.
   Không thể áp dụng khi vẫn còn câu được chọn bị lỗi.
3. Nếu trình soạn đã có nội dung, chọn thêm vào cuối hoặc thay thế (có xác nhận).
   Tổng số câu sau khi nhập tối đa 100.
4. Bấm **Đưa … câu vào trình soạn**. Tiếp tục kiểm tra rồi **Lưu nháp** và gắn
   quiz với tập podcast theo luồng thông thường. Nhập tài liệu không tự lưu,
   đăng tải hoặc thay đổi kịch bản podcast.

Hủy nhập không thay đổi nội dung trình soạn. Tải tài liệu khác thay nguồn
nhập sau xác nhận, không nối văn bản âm thầm. Đọc lại sẽ cảnh báo trước khi
thay các chỉnh sửa trong bản xem lại. Công cụ không dùng AI để đoán đáp án.

## API

`POST /api/studio/quiz-import/extract` nhận `multipart/form-data`, trường
`file`. Yêu cầu phiên Moderator và áp dụng giới hạn tần suất ghi. Trả
`{ fileName, text }`, không lưu tệp hoặc nội dung xuống database/Cloudinary.
Phần nhận diện câu hỏi và xem lại chạy trên FE. Cả FE và BE cần cập nhật
cùng phiên bản để sử dụng chức năng tải tài liệu.
