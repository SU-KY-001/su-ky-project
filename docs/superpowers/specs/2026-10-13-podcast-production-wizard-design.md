# Podcast Production Wizard Design

**Ngày:** 2026-10-13

## Mục tiêu

Refactor trang tạo tập podcast của moderator thành một không gian làm việc gồm bốn bước trên cùng một trang. Moderator có thể mở và thao tác ở mọi bước, hoàn thành từng phần theo thứ tự phù hợp với công việc thực tế, lưu bản nháp và xuất bản trực tiếp mà không qua quy trình duyệt.

Hai mockup do người dùng cung cấp là chuẩn tham khảo cho bố cục, mật độ thông tin và cách điều hướng. Màu sắc, font chữ và component tiếp tục dùng design token của moderator app.

## Phạm vi

Đợt triển khai này bao gồm:

- Wizard bốn bước: Thông tin, Kịch bản, Giọng đọc, Xem lại và lưu.
- Tiptap rich text editor và lưu tài liệu có định dạng.
- Tài liệu tham khảo PDF, DOC và DOCX đính kèm tập podcast.
- Tải lên một file audio hoàn chỉnh, kiểm tra sơ bộ và nghe thử.
- Lưu bản nháp và xuất bản trực tiếp bằng workflow hiện có.
- Giao diện mock cho AI Assistant và giọng AI.

Đợt này không bao gồm:

- Gọi API AI hoặc ElevenLabs.
- Sinh âm thanh theo đoạn.
- Phân tích hay viết lại kịch bản bằng AI.
- Trích xuất nội dung PDF, DOC hoặc DOCX vào editor.
- Trạng thái chờ duyệt hoặc hàng đợi reviewer.

Thiết kế backend AI cho giai đoạn sau được ghi riêng tại `docs/PODCAST-AI-BACKEND-NOTES.md`.

## Nguyên tắc điều hướng

Thanh tiến trình bốn bước nằm đầu không gian làm việc. Cả bốn bước luôn có thể bấm và không bước nào bị khóa do bước trước chưa hoàn thành.

Mỗi bước có hai trạng thái chính:

- Chưa hoàn thành: hiển thị số thứ tự.
- Hoàn thành: hiển thị dấu tích và chạy hiệu ứng thành công ngắn khi trạng thái vừa chuyển đổi.

Nếu moderator xóa dữ liệu bắt buộc, bước quay lại trạng thái chưa hoàn thành. Điều này chỉ thay đổi tín hiệu tiến độ, không khóa điều hướng hoặc dữ liệu đã nhập ở bước khác.

Nút **Lưu bản nháp** xuất hiện xuyên suốt. Chuyển bước không bắt buộc lưu xong bước hiện tại. Nút **Xuất bản** chỉ xuất hiện ở bước cuối và tuân theo checklist phát hành của backend.

## Bước 1: Thông tin

Form được thu gọn để ưu tiên tác vụ chính:

- Series.
- Tên tập podcast.
- Sự kiện lịch sử kế thừa từ series, chỉ đọc.
- Mô tả.

Bước hoàn thành khi đã có series, tên, mô tả và series có sự kiện lịch sử hợp lệ.

Khi đã có series và tên tập, thao tác lưu đầu tiên tạo `Episode` bản nháp. Nếu moderator chuyển sang bước khác trước khi đủ hai trường này, wizard vẫn giữ dữ liệu cục bộ và không khóa thao tác.

## Bước 2: Kịch bản

### Trình soạn thảo

Editor dùng Tiptap và tăng chiều cao theo nội dung thay vì dùng vùng nhập có chiều cao cố định. Thanh công cụ gồm:

- Heading.
- Đậm, nghiêng và gạch chân.
- Danh sách có thứ tự và không thứ tự.
- Trích dẫn.
- Hoàn tác và làm lại.
- Gắn nguồn tham khảo.

Tài liệu Tiptap được lưu dưới dạng JSON có kiểm soát. Backend trích xuất plain text từ JSON và lưu vào `scriptContent` để tiếp tục tính số từ, ước lượng thời lượng và đánh giá checklist phát hành. Backend không nhận HTML tùy ý.

Nguồn tham khảo dùng một citation mark riêng chứa định danh nguồn thuộc series. Editor hiển thị ký hiệu nguồn nhưng plain text dùng cho giọng đọc không đọc metadata kỹ thuật của citation.

### Tài liệu đính kèm

Moderator có thể tải PDF, DOC hoặc DOCX làm tài liệu bổ sung. Tệp được hiển thị theo tên gốc, trạng thái tải lên và có thao tác gỡ. Hệ thống không đưa nội dung tệp vào editor và không phân tích nội dung trong đợt này.

### Panel bên phải

Panel gồm hai tab:

- **Trợ lý AI:** hiển thị dữ liệu mock về độ dài, nhịp kể, câu chưa có nguồn và gợi ý mẫu. Các hành động chỉ thay đổi trạng thái giao diện cục bộ.
- **Nguồn tham khảo:** hiển thị nguồn kế thừa từ series và hỗ trợ chèn citation mark vào vị trí con trỏ.

Mọi nội dung mock được gắn nhãn **Bản xem trước** để moderator không hiểu nhầm là phân tích thật.

Bước hoàn thành khi plain text được trích xuất từ tài liệu Tiptap có nội dung.

## Bước 3: Giọng đọc

Hai chế độ đặt cạnh nhau để moderator chọn rõ ràng:

- **Tải file thu âm:** hoạt động thật trong đợt này.
- **Dùng giọng AI:** mock giao diện.

### Tải file thu âm

Moderator tải một file audio hoàn chỉnh. Giao diện thực hiện:

- Kiểm tra định dạng trước khi tải lên.
- Đọc thời lượng và so sánh với thời lượng ước tính của kịch bản.
- Phân tích mức âm thanh sơ bộ bằng Web Audio API và hiển thị kết quả dưới dạng cảnh báo hỗ trợ, không dùng làm điều kiện phát hành bắt buộc.
- Phát file cục bộ ngay sau khi chọn.
- Sau khi tải thành công, phát qua URL có ký từ backend.
- Cho phép thay file.

Backend tiếp tục là nguồn xác thực chính cho định dạng, dung lượng, trạng thái media và thời lượng. Kết quả phân tích phía trình duyệt được lưu cùng narration để có thể hiển thị lại ở bước Xem lại.

Bước hoàn thành khi narration có audio asset ở trạng thái sẵn sàng.

### Giọng AI

Giao diện mock gồm danh sách giọng, nút nghe thử, tốc độ, độ ổn định, số ký tự ước tính và danh sách đoạn. Các nút tạo hoặc tạo lại đoạn chỉ mô phỏng trạng thái chờ, đang tạo và hoàn thành; không gửi request ra dịch vụ ngoài và không làm bước 3 hoàn thành.

## Bước 4: Xem lại và lưu

Bước cuối tổng hợp dữ liệu đã tạo:

- Series, tên tập, sự kiện và mô tả.
- Bản xem trước kịch bản.
- Nguồn đã gắn và tài liệu đính kèm.
- Kết quả kiểm tra audio.
- Trình phát toàn bộ file audio.
- Checklist phát hành từ backend.

Các hành động cuối:

- **Lưu bản nháp:** lưu mọi thay đổi có thể lưu và giữ trạng thái `DRAFT`.
- **Xuất bản:** gọi workflow publish hiện có khi checklist sẵn sàng.

Không có thao tác gửi duyệt. Nếu chưa đủ điều kiện, giao diện chỉ rõ từng mục còn thiếu theo checklist backend.

## Mô hình dữ liệu

### Episode narration

Mở rộng narration với:

- `scriptDocument Json?`: tài liệu Tiptap.
- `scriptContent String?`: plain text do backend trích xuất.
- `audioAnalysis Json?`: kết quả kiểm tra hỗ trợ gồm thời lượng phía client, tỷ lệ lệch thời lượng, mức âm thanh ước tính, trạng thái cảnh báo và thời điểm kiểm tra.

Schema của `scriptDocument` chỉ nhận những node và mark editor hỗ trợ. Kích thước JSON và plain text đều chịu giới hạn kịch bản hiện có.

### Episode attachment

Thêm `EpisodeAttachment` với:

- `id`.
- `episodeId`.
- `mediaAssetId` duy nhất.
- `fileName` là tên tệp gốc.
- `createdAt`.

Quan hệ tới `MediaAsset` bảo đảm job dọn media không xóa file đang được tập podcast sử dụng.

Media DOCUMENT được mở rộng allowlist để nhận PDF, DOC và DOCX cùng MIME type tương ứng.

## API

Các API episode/narration hiện có được mở rộng để đọc và lưu `scriptDocument`, plain text được backend sinh ra và `audioAnalysis`.

Thêm API attachment trong phạm vi episode:

- Liệt kê tài liệu.
- Gắn media asset đã xác minh.
- Gỡ tài liệu.

Audio tiếp tục dùng API upload media và attach narration hiện có. API publish hiện tại không thay đổi ý nghĩa.

## Trạng thái và lưu dữ liệu

Wizard có một store cục bộ dùng chung cho bốn bước. Store phân biệt dữ liệu chưa lưu, đang lưu, đã lưu và lưu lỗi theo từng phần.

Khi chưa có episode ID, dữ liệu vẫn được giữ trong wizard. Khi series và tên tập đã hợp lệ, `ensureDraft()` tạo bản nháp một lần rồi các phần kịch bản, attachment và audio được gắn vào episode đó. Idempotency key tiếp tục được dùng cho thao tác tạo.

Editor được lưu theo debounce và khi moderator chủ động bấm **Lưu bản nháp**. Upload file có tiến độ riêng; rời bước không hủy upload đang chạy. Lỗi ở một phần không làm mất dữ liệu cục bộ của phần khác.

## Xử lý lỗi

- Lỗi tạo bản nháp giữ nguyên dữ liệu trên form và cho phép thử lại.
- Lỗi upload hiển thị tại từng file hoặc audio tương ứng.
- File không đúng định dạng bị từ chối trước request và vẫn được backend xác minh lại.
- Xung đột phiên bản dùng lỗi `STALE_WRITE` hiện có và yêu cầu tải lại dữ liệu mới nhất.
- Mock AI không tạo lỗi mạng giả gây nhầm lẫn; trạng thái lỗi mock chỉ dùng khi cần xem thiết kế.
- Toast chỉ hiển thị trạng thái ngắn. Chi tiết lỗi nằm cạnh vùng thao tác.

## Cấu trúc frontend

`PodcastCreation` trở thành container của wizard. Mỗi bước là một component riêng và dùng chung store/hook lưu dữ liệu:

- `PodcastWizardStepper`.
- `PodcastInformationStep`.
- `PodcastScriptStep`.
- `RichScriptEditor`.
- `ScriptAssistantMock`.
- `PodcastVoiceStep`.
- `UploadedAudioPanel`.
- `AiVoiceMockPanel`.
- `PodcastReviewStep`.

Component dùng moderator token, Manrope và shared UI hiện có. Không đưa chi tiết kỹ thuật hoặc nhãn “mock” vào luồng ngoài phần cần phân biệt tính năng bản xem trước.

## Tiêu chí nghiệm thu

- Moderator mở được bất kỳ bước nào vào bất kỳ thời điểm nào.
- Dữ liệu không mất khi chuyển bước.
- Mỗi bước hiển thị đúng trạng thái hoàn thành và hiệu ứng thành công.
- Tiptap giữ nguyên định dạng sau khi lưu và tải lại.
- Plain text, số từ và thời lượng ước tính nhất quán với tài liệu Tiptap.
- Có thể tải, xem và gỡ PDF, DOC, DOCX.
- Có thể tải audio hợp lệ, xem kết quả kiểm tra và nghe ở bước 3 lẫn bước 4.
- AI Assistant và giọng AI hiển thị đầy đủ mock nhưng không gọi dịch vụ ngoài.
- Có thể lưu nháp khi chưa đủ checklist.
- Có thể xuất bản trực tiếp khi backend trả checklist sẵn sàng.

