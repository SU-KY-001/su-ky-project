# Import tài liệu quiz và xem trước kết quả

## Phạm vi đã được yêu cầu

- Cải thiện import không AI cho DOC, DOCX, PDF có văn bản, TXT, MD; nhận một hoặc cả ba loại SINGLE, MULTIPLE, TEXT trong một file.
- Bỏ giao diện dán văn bản, toolbar Dán văn bản / Tải tài liệu / Xem mẫu / Sao chép mẫu, và nút Hủy nhập.
- Ban đầu chỉ có drop zone cùng nút Chọn tệp trong popup. Đọc xong phải hiển thị preview câu hỏi, trạng thái và hướng dẫn sửa lỗi theo câu/vị trí nguồn.
- Người dùng sửa file gốc rồi tải lại; preview không phải một trình biên soạn thứ hai.
- Không tự lưu, kích hoạt quiz hoặc thay đổi dữ liệu đang soạn khi upload.

## Các quyết định đề xuất cho plan này

- Giữ một popup, đổi tiêu đề thành Import câu hỏi; preview thay drop zone lớn khi xử lý xong. Giữ nút X và Escape. Không có nút Hủy nhập ở bất kỳ trạng thái nào.
- Đóng popup khi đang đọc sẽ hủy yêu cầu và bỏ kết quả trả về muộn; không hỏi xác nhận bỏ dữ liệu vì chưa áp dụng vào trình soạn và file gốc vẫn ở máy người dùng.
- Khi có bất kỳ lỗi chặn nào, chỉ cho xem kết quả và tải file đã sửa. Không nhập riêng các câu hợp lệ, không tự loại câu lỗi.
- Chỉ bật Đưa vào trình soạn nếu có 1–100 câu và không có lỗi chặn. Vẫn kiểm tra tổng số câu sau khi thêm vào cuối.
- Cảnh báo chỉ dùng cho biến đổi không mơ hồ như nhận biết tiêu đề hoặc chuẩn hóa xuống dòng. Thiếu nguồn, loại/đáp án mâu thuẫn, ghép đáp án không duy nhất, nội dung chưa hiểu có thể ảnh hưởng câu hỏi đều là lỗi chặn.
- Sau khi bấm Đưa vào trình soạn, mặc định thêm vào cuối; bản trắng được thay bằng kết quả. Nếu đã có câu, giữ lựa chọn thêm/thay ở màn preview, thay thế cần ConfirmationDialog chung. Chỉ thao tác bản đang soạn, không gọi API save/activate.
- Tái sử dụng Dialog, Button mặc định, CardBadge, notify và ConfirmationDialog hiện có. Không thêm bảng màu nút riêng hoặc banner toàn trang.

## Luồng giao diện

1. Chờ file: drop zone, định dạng/giới hạn, Chọn tệp; không textarea và không toolbar.
2. Xử lý: tên file và trạng thái Đang đọc tài liệu; không phần trăm giả. Chặn gửi nhiều lần đồng thời. X/Escape vẫn đóng được.
3. Thành công: tên file; tổng câu và số từng loại; danh sách preview chỉ đọc gồm câu, loại, lựa chọn, đáp án đúng/chấp nhận, giải thích và thời gian. Có Chọn file khác và Đưa vào trình soạn.
4. Có lỗi nội dung: vẫn hiển thị câu nhận diện được, đánh dấu câu lỗi và vùng chưa nhận diện; thông báo tổng hợp ngay trong popup. Mỗi lỗi có vị trí, nguyên nhân và cách sửa. Có Tải lại file đã sửa; Đưa vào trình soạn bị khóa.
5. Không đọc được file: lỗi kỹ thuật ngắn gọn cùng cách khắc phục, drop zone để chọn lại; không tạo câu rỗng và không thay đổi trình soạn.
6. Áp dụng xong: đóng popup, chọn câu đầu tiên vừa nhập, notify thành công; người dùng lưu/xem thử/kích hoạt bằng luồng hiện có.

## Hợp đồng backend

- Thêm POST /api/studio/quiz-import/preview, multipart một file, chỉ Moderator, rate limit write. Giữ endpoint /extract và response cũ để không phá client đang dùng.
- Kết quả đọc được dùng HTTP 200 với status ready hoặc needs_correction. Đây là kết quả phân tích, không phải xác nhận đã lưu quiz.
- Schema dùng chung đặt trong packages/shared/src/schemas/quiz-import.ts và export qua @repo/shared.
- QuizImportPreview: parserVersion, fileName, format, status, questions, diagnostics, summary, unparsedRegions.
- Mỗi câu: id dùng cho phiên import, sourceNumber, section, kind có thể null khi chưa xác định, text, options, correctIndex, correctIndexes, explanation, timeLimit, source và diagnostics. Câu lỗi không bị ép thành QuizDraftQuestion hợp lệ giả.
- source: blockStart/blockEnd, pageStart/pageEnd hoặc lineStart/lineEnd khi thực sự xác định được, excerpt. Không chế số trang/dòng; DOCX dùng đoạn/bảng khi không có phân trang đáng tin cậy.
- Diagnostic: code ổn định, severity error/warning, questionId nullable, source, message và suggestion bằng tiếng Việt. summary chứa tổng số câu nhận diện, số hợp lệ/lỗi và số từng loại; số liệu tính từ kết quả, không hardcode.
- unparsedRegions giữ nguồn không thể phân loại; vùng có nguy cơ là nội dung câu hỏi phải chặn apply. Không tuyên bố đã tìm đủ tất cả câu trong tài liệu tự do.
- File không đọc được trả body lỗi chuẩn { error_code, message }: 413 vượt kích thước; 422 định dạng/nội dung file không đọc được; 429 rate limit; 503 bộ chuyển DOC thiếu/quá tải hoặc deadline xử lý. Lỗi xác thực/quyền giữ 401/403.
- Parser dùng chung là mã thuần TypeScript, không truy cập DB/HTTP hoặc AI; backend là bên phân tích chính. Save/activate vẫn kiểm tra dữ liệu nghiệp vụ trên server, không tin kết quả FE.

## Bộ đọc và parser

- TXT/MD: UTF-8 và UTF-8 BOM; lỗi encoding yêu cầu lưu lại UTF-8, không đoán bảng mã tùy ý. Giữ dòng nguồn và chuẩn hóa NFC/CRLF.
- DOCX: dùng mammoth.convertToHtml để giữ heading, list, table; đọc cấu trúc HTML qua HTMLRewriter của Bun, không render HTML nguồn ra FE. Giữ kiểm tra ZIP/giới hạn giải nén hiện có.
- DOC: chuyển nội bộ thành DOCX bằng LibreOffice headless trong process riêng, thư mục tạm/profile riêng từng tác vụ. Không truyền tên file người dùng vào shell; spawn bằng argv, tên tạm do hệ thống sinh. Không cài phần mềm toàn máy tự động. Production khai báo converter trong Docker image; môi trường dev dùng QUIZ_IMPORT_OFFICE_PATH.
- PDF: dùng unpdf/PDF.js đang có để lấy text items theo trang và tọa độ; tái tạo dòng/khối và theo dõi số trang. Xử lý bố cục một cột và mẫu nhiều cột có ranh giới rõ; bố cục mơ hồ phải báo unsupported layout. Không OCR, không hiểu ảnh/công thức bằng AI.
- Chạy đọc/chuyển đổi ngoài main request thread, deadline tổng 60 giây gồm mở file/convert/extract/parse; riêng process LibreOffice tối đa 30 giây. FE timeout 75 giây. Hủy/timeout phải dừng worker/process con và dọn đúng thư mục tạm.
- Giữ 5 MiB/file, 200.000 ký tự, PDF 100 trang, DOCX tối đa 20 MiB giải nén và 1.000 entries, tổng bộ quiz 100 câu. Chặn trước khi đọc không giới hạn. Bản chuyển DOC cũng phải qua các giới hạn DOCX.
- Mỗi process API tối đa 2 tác vụ đọc đồng thời, mỗi user 1; vượt trả 503 có hướng dẫn thử lại. Không tuyên bố giới hạn toàn cluster khi chỉ có bộ đếm process.
- Tách các vùng giới thiệu/câu hỏi/bảng đáp án bằng state machine. Hỗ trợ Câu N:, Câu N., N., N), nhãn A–F và lựa chọn cùng dòng có ranh giới rõ; không tách theo dấu chấm tùy tiện.
- Ghép bảng đáp án bằng section + số câu; không ghép theo thứ tự nếu có trùng/mơ hồ. Nhận Đáp án/Đáp án đúng và Loại theo các alias công bố trong tài liệu.
- Không tự suy ra đáp án khi nguồn không có; không thay dữ kiện; không tự sửa loại khi mâu thuẫn. TEXT giữ dấu và dấu phẩy, chấp nhận thêm theo từng mục riêng.
- Báo trùng số, thiếu số bất thường, câu trùng nội dung, lựa chọn trùng, loại lạ, thiếu đáp án, đáp án ngoài lựa chọn, metadata lặp/mâu thuẫn, vượt giới hạn trường, tham chiếu hình chưa được hỗ trợ.

## Tính toàn vẹn và giới hạn

- Preview không lưu file, kết quả hoặc nội dung vào database/Cloudinary; log chỉ metadata kỹ thuật, không ghi nguyên nội dung tài liệu.
- Nguồn dùng đối chiếu nằm trong phiên popup; không thêm migration cho phiên preview.
- Lưu/kích hoạt tiếp tục validate schema và validateReadyQuiz trên BE. Các lỗi import phải được xử lý bằng re-upload trước apply, nên không phụ thuộc vào cờ Đã kiểm tra câu này chỉ nằm trên FE.
- Đổi nhãn/tách câu đúng cấu trúc không có nghĩa đáp án đúng kiến thức. Không chấm tính đúng của kiến thức, hiểu câu mơ hồ, tương đương ngữ nghĩa hay giải quyết file mã hóa/hỏng không khôi phục được.
- Không sửa mobile trong plan này. Định dạng quiz lưu trữ vẫn gồm ba loại đã có; mobile hỗ trợ các loại mới là công việc riêng.

## Tiêu chí nghiệm thu

- File chuẩn thật của cả năm định dạng, mỗi loại riêng và trộn ba loại, phải khớp golden data về số câu, loại, nội dung, lựa chọn, đáp án và thứ tự.
- Bảng đáp án cuối tài liệu không tạo câu hỏi giả; trùng số giữa các phần không ghép sai; phần chưa hiểu không biến mất.
- File hỏng/khóa/scan/giả đuôi/quá giới hạn, thiếu converter, timeout và hủy được xử lý có kiểm soát, không gây API 500 hoặc thay đổi bản đang soạn.
- Popup không còn paste textarea, bốn nút toolbar và Hủy nhập; preview xuất hiện sau upload, hiển thị lỗi và hướng dẫn tại đúng câu.
- Có lỗi thì không apply; ready chỉ apply một lần; save/activate vẫn là thao tác riêng, stale-write và kiểm tra quyền giữ nguyên.
- Typecheck shared/API/web; test parser/extractor/routes/FE/OpenAPI; integration lưu–đọc lại bộ ba loại trên DB test được bảo vệ. Browser QA chỉ chạy khi có yêu cầu trình duyệt rõ ràng theo rule dự án.

## Approaches

- Chỉ nới regex ở FE: thay đổi ít nhưng không đáp ứng DOC, cấu trúc PDF/DOCX và kiểm tra server.
- Parser có cấu trúc trên BE + preview chỉ đọc ở FE: hướng đề xuất, kiểm soát được, tái sử dụng schema và luồng lưu hiện tại.
- AI/OCR dịch vụ ngoài: không thuộc phạm vi được yêu cầu.

Đã được người dùng duyệt và triển khai ngày 2026-11-07; kết quả kiểm tra và các giới hạn định dạng được ghi trong execution ledger của plan. Converter được kiểm thử trong Docker, không cài phần mềm toàn máy.
