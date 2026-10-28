# Phase 3: Web, thu âm thủ công (bản đọc theo vai, in, upload)

Phụ thuộc: phase 1, và khung soạn của phase 2 (cần `dialogue` trong state). Không phụ thuộc phase 4. Mockup chuẩn: `mockups/02-recording-sheet.html` (chỉ phần bản đọc và thẻ tải file; **thẻ Lịch thu âm không làm ở plan này**).

## Việc
1. **`PodcastVoiceStep.tsx` / `AiVoicePanel.tsx`**: với tập hội thoại, hai thẻ lựa chọn "Tạo bằng AI" / "Thu âm thủ công" (đã có hai chế độ `upload|ai` ở `PodcastVoiceMode`; đổi nhãn "Tải file thu âm" thành "Thu âm thủ công" chỉ cho tập hội thoại). Tập một người kể giữ nguyên.
2. **Bản đọc theo vai** `components/DialogueRecordingSheet.tsx`:
   - Danh sách lượt, mỗi lượt: người nói (màu + tên), chip giọng điệu, lời với tag hiển thị thành chỉ dẫn tiếng Việt bằng bảng ánh xạ `DIALOGUE_TAG_CUE` (ví dụ `chuckle` → "cười khẽ", `short pause` → "nghỉ ngắn"; tag thiếu trong bảng hiển thị nguyên tên), `|phản hồi|` hiển thị khác biệt kèm chú thích "người kia chen vào", ghi chú hiển thị nổi.
   - Bộ lọc vai: "Cả hai", "{tên A}", "{tên B}"; chọn một vai thì lượt người kia mờ đi.
   - Nút "In / lưu PDF" dùng `window.print()` với CSS in ẩn khung ứng dụng và ẩn lượt của người kia khi đã chọn vai. Không thêm thư viện PDF.
   - Bảng ánh xạ cue và tag dùng chung với `DIALOGUE_TAGS` (một nguồn); thêm tag mới mà thiếu cue phải làm test fail.
3. **Hướng dẫn thu** (hộp ghi chú, văn bản tĩnh): mỗi người thu một track riêng nếu có thể, đeo tai nghe, mic gần miệng; thu ngoài hệ thống rồi trộn thành một file. Không hứa hệ thống kiểm soát chất lượng.
4. **Upload**: dùng nguyên đường tải file thu âm hiện tại (không đổi API, không đổi giới hạn dung lượng/định dạng). Không thêm nhãn "giọng AI" cho âm thanh thu thật.
5. Không thêm trạng thái "đã thu" riêng: tập có âm thanh `READY` là đủ như tập thường.

## Test
- Ánh xạ cue: mỗi phần tử `DIALOGUE_TAGS` có cue.
- Hàm chuyển lời → các đoạn hiển thị (văn bản, cue, backchannel) với: tag đầu/giữa/cuối, nhiều tag liền nhau, `|...|` trong câu, lời không tag.
- Bộ lọc vai: số lượt mờ đúng.

## Smoke (bắt buộc, UI)
Mở bản đọc, chọn vai, xem bản in (print preview) chỉ còn lượt của vai đó; tải file âm thanh mẫu lên và xác nhận tập có âm thanh. Chụp ảnh.

## Xong khi
Mod mở được bản đọc theo vai, in được, upload được một file âm thanh cho tập hội thoại; không phát sinh API mới.
