# Giao diện AI trợ lý cho mod: đặc tả

**Ngày:** 2026-10-22 (viết lại theo mindset kể chuyện trước, nguồn thứ yếu). Hình mẫu tương tác: `plans/261015-1640-podcast-ai-source-check-p1/mockups/index.html`. P1 (AI rà kịch bản) có plan (`phase-04-web.md`); phần còn lại là hướng thiết kế, chưa có plan.

## 1. Nguyên tắc

1. **Mod viết và quyết; AI là trợ lý.** AI đưa cảnh báo mềm và đề xuất; không tự ghi vào kịch bản. Mọi thay đổi do mod bấm; hoàn tác bằng Ctrl+Z của editor.
2. **Màn mặc định chỉ một việc** (một thẻ, một nút). Cấu hình nằm trong hộp thoại.
3. **Nguồn chỉ thuộc series.** Không có chip nguồn, "Cần nguồn", `[CẦN NGUỒN]`, bộ chọn nguồn theo tập hay theo ý ở bất kỳ màn nào của AI. AI có thể đọc nguồn series làm ngữ cảnh ngầm; series không nguồn vẫn dùng được.
4. **Chữ trung thực:** "AI nghi ngờ, chưa xác minh"; không bao giờ "đã kiểm tra/đã xác minh".
5. **Mọi thứ mod muốn phải nhập tự do được.** Preset chỉ là điền sẵn, không bao giờ là lựa chọn duy nhất (mục 7).
6. **Chờ có trạng thái:** mọi chỗ gọi AI hiện "AI đang chạy…" (hoặc "AI đang tạo dàn ý…", "AI đang viết…") thay vì hiện kết quả tức thì; nút khóa khi đang chạy.
7. Chạy nền, không mất khi đóng tab (check/TTS lưu DB).

## 2. AI rà kịch bản (P1): danh sách và chi tiết

**Hộp thoại chạy:** phạm vi (cả kịch bản / đoạn đang chọn), ô "Ghi chú cho AI" (văn tự do), dòng nói rõ nội dung gửi tới nhà cung cấp AI, nút Chạy. Không có mức nghiêm khắc.

**Đang chạy:** "AI đang chạy…", "đã xét x/y đoạn", số cảnh báo tìm thấy, Hủy.

**Danh sách = checklist.** Tiêu đề "n cảnh báo, m đã xem" + nhãn "AI nghi ngờ, chưa xác minh". Mỗi dòng: tag loại (nghi sai / đọc thành tiếng-mạch), thông điệp ngắn, "chưa xem" hoặc "đã xem", tag nhỏ "đã áp dụng" nếu có. Bấm dòng nào cũng được, theo thứ tự nào cũng được (mod muốn chủ động chọn mục kế tiếp).

**Chi tiết (bấm một dòng):** giải thích; đề xuất sửa AI sinh sẵn (cùng lần rà) hiện dạng **diff từng từ** (thêm/bớt) so với đoạn hiện tại; nếu đề xuất có số/tên mới không có trong gốc thì hiện cảnh báo mềm "Có số/tên mới: ... — hãy kiểm tra" (heuristic, bỏ sót phủ định/đảo chủ ngữ/chữ thường); nút tùy chọn **Áp dụng đề xuất**. Chân trang đúng hai nút:
- **Quay lại**: đóng chi tiết, trạng thái giữ nguyên.
- **Hoàn tất**: đánh dấu "đã xem" (`REVIEWED`), về danh sách.

Không có: Mục sau/Mục trước, "Tự sửa", "Giữ nguyên/Bỏ qua", bắt lý do, bước phản hồi. Mod sửa trực tiếp trong editor khi muốn: đó chỉ là soạn thảo bình thường.

**Áp dụng đề xuất:** thay cả đoạn nếu hash đoạn hiện tại còn bằng hash lúc AI chụp; lệch thì từ chối với "Đoạn đã đổi, chạy lại" và **không ghi đè chữ của mod**. Thành công thì ghi `appliedAt` (tag "đã áp dụng"); không tự Hoàn tất.

## 3. Soạn thảo (P3, hướng thiết kế)

**Soạn bản nháp:** Dialog 4 bước.
1. **Đề bài:** chủ đề; **góc kể** = danh sách dọc chọn một (mỗi dòng: tên + mô tả; mục "Của bạn" có nhãn), khung cuộn, ô tìm khi có từ 6 mục; hai nút "Tạo góc kể mới" / "Quản lý" mở **trang quản lý góc kể** riêng (mockup 06: có sẵn chỉ đọc + của bạn, form tên / mô tả ngắn / chỉ dẫn cho AI, Nhân bản để chỉnh, Xóa hai lần bấm, trùng tên bị chặn); **thời lượng mục tiêu** = ô số phút (chip 8/12/15 chỉ điền sẵn) + "≈ N từ" (`script.words_per_minute` = 150 từ/phút từ config), mod có thể ghi đè số từ trực tiếp.
2. **Dàn ý sửa được:** mỗi phần có tiêu đề, mục tiêu, ý chính (văn tự do), thêm/xóa phần và ý. **Không có nút lên/xuống** (không đổi thứ tự trong dàn ý). Không có nguồn ở đây. "Tạo dàn ý" hiện "AI đang tạo dàn ý…" (~2s) trước khi ra kết quả.
3. **Giọng văn:** preset có câu ví dụ + "Tự mô tả…" (văn tự do). Ngôi thứ nhất khóa nếu chưa chọn nhân vật ở bước Thông tin.
4. **Viết:** mỗi phần một lần gọi, "AI đang viết…" (~3s), xem từng phần xong khi phần sau còn chạy; mỗi phần có Sửa / Viết lại phần này / Bỏ / Chèn; chọn chèn cuối hay tại con trỏ; "AI soạn" đánh dấu tới khi mod sửa. Không citation, không `[CẦN NGUỒN]`.

Dàn ý chỉ giữ ở client (state/localStorage theo tập) tới khi bấm Viết; không thêm bảng (ngoại trừ danh sách góc kể tùy nhập).

**Viết lại đoạn:**
1. Mod bôi đen trong editor; nút nổi "Viết lại" hiện cạnh vùng chọn.
2. Phạm vi mở rộng tới hết câu, tối đa 3 đoạn liền nhau (cấu hình). Bước 1 hiện đúng phần sẽ được viết lại.
3. **Cách viết lại:** ô chỉ dẫn tự do là chính; chip Ngắn hơn / Dễ nghe hơn / Tự nhiên hơn chỉ điền vào ô; **số bản viết lại** là ô số (mặc định 3, trần cấu hình 10). Bấm Viết lại → "AI đang chạy…" (~1,5s).
4. **Kết quả:** tất cả bản hiện cùng lúc dạng danh sách card cuộn dọc (không tab), mỗi card có diff so với bản gốc, chọn một (radio). Card có số/tên mới hiện cảnh báo mềm "Có số/tên mới: 968, Tiên, Hoàng — hãy kiểm tra"; vẫn chọn được. Nút **Thay đoạn đã chọn** và **Chèn dưới đoạn** bị khóa tới khi chọn một card.

## 4. Giọng đọc AI (T1/T2, hướng thiết kế)

Màn chính: chọn một hay hai người kể, một nút "Tạo giọng đọc". Dialog 4 bước: chọn giọng + nghe thử (**tốc độ và cao độ là ô số**, mặc định 1,0 / 0, có thể có chip điền nhanh); phân vai từng đoạn (mặc định người kể chính, chỉ đổi đoạn trích dẫn); xác nhận số ký tự, chi phí, cam kết gắn nhãn giọng AI; tiến độ và nghe từng đoạn. Sau khi sửa kịch bản chỉ tạo lại đoạn đã đổi. **Âm thanh chưa dùng cho tập cho tới khi mod nghe và bấm "Xong".** Phụ thuộc: khóa MiniMax thật, ffmpeg, giọng Việt thứ hai (`research-261022-minimax-tts-api.md`).

## 5. Kiểm duyệt (P5)

`ReleaseReviewDialog` có sẵn (duyệt hoặc yêu cầu chỉnh sửa; người duyệt là admin/mod khác, **không** phải tác giả, **không** phải AI). Mock là **một màn, hai cột**:
- **Trái (nội dung đầy đủ, cuộn/mở rộng):** toàn văn kịch bản (mở rộng hết mọi đoạn, không "còn N đoạn") và player âm thanh bên dưới.
- **Phải:** "Tình trạng tập" chỉ-đọc, hệ thống tự tính, chia nhóm **Cần có** (chặn Duyệt) / **Cần xem** (cảnh báo) / **Thông tin**, cộng một dòng AI. Mockup chỉ vẽ vài dòng minh họa; **danh mục đầy đủ (~25 mục, ngưỡng, nguồn dữ liệu, mã lỗi) ở `spec-episode-readiness.md`** trong thư mục plan. Rồi ô "Ghi chú" và hai nút **Yêu cầu chỉnh sửa** (bắt buộc ghi chú) và **Duyệt** (khóa khi còn mục thiếu, hiện lý do; cảnh báo không chặn).

Không có chấm từng tiêu chí, không có biểu mẫu theo tiêu chí. Lưu ý: hàng đợi duyệt của mod (`ModeratorReviewQueue`) hiện không có nội dung để xem; cần route đọc cho người duyệt (xem `spec-episode-readiness.md` mục 6).

## 6. Khoảng trống phát hiện khi làm mockup

| # | Khoảng trống | Xử lý |
|---|---|---|
| 1 | Người duyệt không thấy kết quả AI | Dòng tóm tắt ở màn duyệt; cần route đọc `AiCheckItem` đếm theo tập (P5) |
| 2 | Trường nguồn gốc âm thanh | `EpisodeNarration.audioOrigin`, khi làm TTS |
| 3 | Chưa đọc được tài liệu PDF/DOC đính kèm | Giữ nguyên phạm vi; mockup ghi rõ cho mod |
| 4 | Góc kể tùy nhập cần chỗ lưu + trang quản lý | Bảng `ai_narrative_angles(id, userId, name, description, guide, createdAt, updatedAt)`, unique `(userId, lower(name))`; mặc định theo người dùng (P3, chờ xác nhận). Góc có sẵn là hằng số/seed, chỉ đọc |

## 7. Quy tắc ô nhập tự do

| Chỗ | Điều khiển | Tự do |
|---|---|---|
| Góc kể | danh sách chọn một (có sẵn + của bạn), tìm khi >= 6 mục | "Tạo góc kể mới" và "Quản lý" mở trang riêng `mockups/06-narrative-angles.html`; danh sách tự làm mới khi quay lại; không tạo trong dialog |
| Thời lượng | ô số phút + chip 8/12/15 | số ký tự ghi đè được |
| Giọng văn | preset | "Tự mô tả…" |
| Cách viết lại | ô chỉ dẫn | chip chỉ điền; số bản là ô số |
| AI rà kịch bản | ô ghi chú | phạm vi chọn |
| Giọng đọc | ô số tốc độ/cao độ | chip điền nhanh |

## 7b. Phụ thuộc và lệch so với app thật

- **Icon:** `@phosphor-icons/react` đã cài, mockup dùng cùng họ icon.
- **Font:** mockup dùng Geist và Newsreader (skill `minimalist-ui`); app dùng Be Vietnam Pro. Khi code **giữ Be Vietnam Pro**.
- **Màu nút chính:** mockup `#111`; app dùng nền đỏ (`mod-primary`). Khi code dùng token `mod*`.
- Mockup tải font và icon từ CDN: cần mạng khi xem.
