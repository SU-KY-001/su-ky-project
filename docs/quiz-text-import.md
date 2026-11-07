# Import tài liệu câu hỏi và xem trước kết quả

Trong trình soạn quiz, chọn **Import File** rồi kéo thả hoặc chọn đúng một file. Không còn ô dán văn bản, toolbar xem/sao chép mẫu hoặc nút Hủy nhập. Dùng nút X/Escape để đóng; đóng trong lúc xử lý sẽ hủy yêu cầu và bỏ qua kết quả trả về muộn.

## Định dạng và giới hạn

- DOC, DOCX, PDF có văn bản, TXT và MD UTF-8 (nhận UTF-8 BOM).
- Tối đa 5 MiB/file, 200.000 ký tự, PDF 100 trang, tổng bộ quiz 100 câu.
- DOCX tối đa 20 MiB sau giải nén và 1.000 entries. Bản chuyển từ DOC cũng phải tuân theo giới hạn này.
- Câu hỏi tối đa 2.000 ký tự, 1–6 câu trả lời được chấp nhận cho TEXT hoặc 2–6 lựa chọn cho SINGLE/MULTIPLE; mỗi đáp án 1.000 ký tự, giải thích 4.000 ký tự, thời gian 10–120 giây.
- PDF scan cần OCR ở bên ngoài trước. Bộ đọc không dùng AI, OCR, không kiểm chứng tính đúng của kiến thức hoặc suy ra đáp án bị thiếu.

## Mẫu nội dung

Câu 1: Hai cộng hai bằng bao nhiêu?
Loại: Chọn một
A. Ba
B. Bốn
Đáp án: B
Giải thích: Hai cộng hai bằng bốn.
Thời gian: 30

Câu 2: Chọn các số nguyên tố.
Loại: Chọn nhiều
A. Hai
B. Ba
C. Bốn
Đáp án: A, B

Câu 3: Thủ đô Việt Nam là gì?
Loại: Điền đáp án
Đáp án: Hà Nội
Chấp nhận thêm: Thành phố Hà Nội

Mỗi câu bắt đầu bằng Câu N:, Câu N. hoặc N./N). Nhãn lựa chọn A–F phải liên tiếp. Có thể bỏ Loại nếu đáp án và lựa chọn xác định duy nhất loại câu. Có thể có tiêu đề được nhận diện như BỘ CÂU HỎI ÔN TẬP và phân phần Phần I/Phần II.

Câu hỏi và lựa chọn có thể kéo dài nhiều dòng. Các trường Loại, Đáp án, Chấp nhận thêm, Thời gian cần ghi giá trị cùng dòng; giải thích có thể nhiều dòng. Lựa chọn cùng dòng cần ranh giới rõ (ít nhất hai khoảng trắng/tab giữa các nhãn). Không dựa vào màu/in đậm để đánh dấu đáp án đúng. Danh sách Word tự động bắt đầu khác 1 hiện yêu cầu chuyển số sang nội dung chữ rõ ràng (ví dụ Câu 7:) thay vì tự đoán số nguồn.

Bảng đáp án riêng cần tiêu đề BẢNG ĐÁP ÁN, sau đó mỗi dòng như 1. B hoặc 2. A, C. Nếu số câu bắt đầu lại ở nhiều phần, ghi tên phần cả ở vùng câu hỏi và bảng đáp án. Không ghép theo vị trí khi có trùng hoặc mơ hồ. Dùng Chấp nhận thêm riêng cho mỗi biến thể TEXT, không tách đáp án điền bằng dấu phẩy.

## Xử lý và preview

1. Đang tải tài liệu: dựa trên upload thực tế của trình duyệt.
2. Đang đọc và phân tích: sau khi upload hoàn tất; spinner và tên file. Sau 10 giây hiển thị thông báo có thể đóng bằng X để dừng. Không có phần trăm giả.
3. Hoàn tất: popup hiển thị tên file, số câu theo loại, nội dung, lựa chọn, đáp án đúng/chấp nhận, giải thích và thời gian. Preview chỉ đọc.
4. Có lỗi: hiển thị trạng thái Cần sửa file, nguyên nhân và Cách sửa theo câu. TXT/MD dùng dòng; PDF dùng trang; Word dùng đoạn khi không xác định được trang. Có vùng nguồn chưa hiểu để đối chiếu. Không tạo số trang/dòng giả.
Muốn bỏ kết quả xem trước để chọn file khác, bấm mũi tên quay lại bên cạnh tiêu đề. Thao tác chỉ xóa kết quả import tạm và trở về drop zone, không thay đổi bộ quiz đang soạn.

5. Sửa file gốc rồi chọn Tải lại file đã sửa; có thể chọn lại chính file cũ. Có bất kỳ lỗi chặn nào thì không được đưa cả batch vào trình soạn, không tự bỏ câu lỗi.
6. Hợp lệ: bấm Đưa vào trình soạn. Mặc định thêm vào cuối khi đã có câu, hoặc thay bản trắng. Thay thế câu hiện có cần xác nhận. Kiểm tra tổng số câu không vượt 100.
7. Đây chỉ là thay đổi bản đang soạn. Lưu nháp, Xem thử và gắn quiz với podcast vẫn thực hiện riêng. Lỗi upload, hủy, timeout hoặc chỉ xem preview không thay đổi các câu đang soạn.

Bộ đọc báo lỗi cho câu trùng, nhãn/đáp án trùng hoặc thiếu, loại lạ/mâu thuẫn, bảng đáp án không ghép được, dữ liệu quá giới hạn và vùng nguồn không hiểu. Số câu nhận diện không phải cam kết đã hiểu mọi nội dung của tài liệu tự do. PDF phức tạp, bảng/nhiều cột không có thứ tự rõ cần chuyển sang DOCX hoặc TXT.

## Runtime và vận hành

Production Docker image API bao gồm LibreOffice Writer. Local cần LibreOffice đã được quản trị cài đặt; đặt QUIZ_IMPORT_OFFICE_PATH tới soffice.com trên Windows hoặc libreoffice trên Linux. Không có converter thì DOC trả 503 kèm hướng dẫn lưu thành DOCX; các định dạng còn lại tiếp tục hoạt động.

Mỗi import chạy trong process riêng. Deadline BE tổng 60 giây, chuyển DOC tối đa 30 giây nằm trong deadline tổng; FE timeout 75 giây. Tối đa hai tác vụ mỗi process API và một tác vụ/user. Hủy/timeout dừng process được tạo và dọn đúng thư mục tạm; không ghi file gốc/nội dung vào database, Cloudinary hoặc log.

## API

POST /api/studio/quiz-import/preview nhận multipart file và defaultTime (10–120, mặc định 20), chỉ Moderator và có write rate limit. Kết quả 200 gồm parserVersion, fileName, format, status ready/needs_correction, questions, diagnostics, summary và unparsedRegions. Lỗi vận hành dùng body error_code/message chuẩn: 413 quá lớn, 422 file/nội dung không đọc được, 429 rate limit, 503 thiếu converter/quá tải/deadline; auth 401/403.

Endpoint /api/studio/quiz-import/extract giữ hợp đồng cũ trả fileName/text để tương thích client cũ. UI mới chỉ dùng /preview. BE và FE cần triển khai cùng phiên bản để dùng luồng mới.

## Kiểm thử

Chạy unit parser/reader/runner/handler, OpenAPI và test FE của quiz. Acceptance thật cần Docker:

    docker build -f apps/api/tests/support/Dockerfile.quiz-import -t suky-quiz-import-test .

Trong image chạy tests/support/generate-quiz-import-files.ts để tạo file thật bằng LibreOffice rồi chạy tests/quiz-import-end-to-end.test.ts với RUN_OFFICE_IMPORT=1. Acceptance phải thất bại rõ khi thiếu converter/file fixture; không suy ra DOC hỗ trợ chỉ từ các unit test bị skip.

Persistence tests dùng RUN_INTEGRATION=1 và DATABASE_URL có tên database chứa test. Chuẩn bị DB test riêng đã migrate; không reset/migrate database làm việc để chạy test. Bộ persistence kiểm tra actual route/rate limit và save–activate–read của cả ba loại.
