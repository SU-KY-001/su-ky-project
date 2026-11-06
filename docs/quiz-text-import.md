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

## Đưa thẳng vào trình soạn

1. Chọn **Dán văn bản**, dán nội dung rồi bấm **Đưa vào trình soạn**; hoặc chọn
   **Tải tài liệu**, chọn/kéo thả một file. File đọc được sẽ tự đưa câu hỏi vào
   trình soạn, không qua một màn chỉnh sửa hay xem trước trung gian.
2. Nếu đã có câu hỏi, mặc định **Thêm vào cuối**. Chọn **Thay thế câu hỏi hiện
   tại** khi cần; hệ thống xác nhận trước khi thay. Tổng số câu tối đa 100.
3. Chỉnh sửa ngay bằng các ô sẵn có trong trình soạn. Mọi câu đọc được đều được
   giữ lại, kể cả câu chưa đầy đủ. Câu cần sửa được đánh dấu và được chọn trước.
   Thiếu đáp án, lựa chọn trống và các lỗi nội dung sẽ hiện tại câu đó.
4. Nếu ký hiệu/nội dung/loại câu mâu thuẫn, mở **Đối chiếu văn bản nhập**, sửa
   các ô rồi bấm **Đã kiểm tra câu này**. Cảnh báo mâu thuẫn chưa kiểm tra chặn
   lưu nháp và đăng tải, tránh mất cảnh báo khi tải lại. Câu thông thường còn
   thiếu nội dung vẫn có thể lưu nháp, nhưng không thể đăng tải.
5. **Xem thử** dùng lại popup trải nghiệm quiz có sẵn, chỉ khả dụng khi mọi câu
   hoàn chỉnh và đã kiểm tra. Không tự mở popup sau import. **Lưu nháp** và gắn
   quiz với podcast vẫn theo luồng cũ; import không tự lưu/đăng tải.

Nếu không đọc được cấu trúc hoặc có chữ thừa trước câu đầu, nội dung được giữ
trong ô dán kèm lỗi để sửa, chưa thay đổi trình soạn. Không tự bỏ qua phần nguồn
không nhận diện. Hủy nhập giữ nguyên câu hỏi đang soạn, có xác nhận khi đang dán
hoặc tải file. Công cụ không dùng AI để đoán đáp án. Bộ đếm ký tự không hiển thị
thường trực; giới hạn vẫn được kiểm tra và báo khi vượt.

## API

`POST /api/studio/quiz-import/extract` nhận `multipart/form-data`, trường
`file`. Yêu cầu phiên Moderator và áp dụng giới hạn tần suất ghi. Trả
`{ fileName, text }`, không lưu tệp hoặc nội dung xuống database/Cloudinary.
Phần nhận diện câu hỏi và kiểm tra trong trình soạn chạy trên FE. Cả FE và BE cần cập nhật
cùng phiên bản để sử dụng chức năng tải tài liệu.
