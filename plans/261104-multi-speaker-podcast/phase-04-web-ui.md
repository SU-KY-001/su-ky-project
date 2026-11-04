# Phase 4: Giao diện

Phụ thuộc: Phase 3. Nguồn sự thật hình ảnh: `mockups/index.html` (mở bằng trình duyệt). Giữ bố cục hai cột hiện có của `DialogueScriptStep.tsx`: cột trái lượt, cột phải sticky 320px.

## 4.1 `DialogueScriptStep.tsx`
Bỏ `speakerDot` cố định (dòng 20) và mọi chỗ ép A/B (dòng 62, 99). Thay bằng `speakerColorClass` và các hàm Phase 3.

**Khối dán (đầu cột trái)**
- Kịch bản còn một lượt trống: hiện ô lớn nét đứt "Dán văn bản. Mỗi đoạn cách nhau một dòng trống." (`Textarea`) + nút **Tách đoạn**.
- Đã có lượt: ô thu thành nút **Dán thêm kịch bản**, mở cùng ô dán.
- Bấm Tách đoạn: gọi `splitScript`; có lượt có lời rồi thì hỏi **Nối thêm** hoặc **Thay thế**. Thay thế dùng `AlertDialog` có sẵn (`shared/components/ui/alert-dialog.tsx`). Không có đoạn nào thì báo "Không thấy đoạn nào". Thông báo dùng `notify.*` (`shared/lib/notifications.ts`).
- Nếu `splitLong > 0`: thông báo "Đã tách thêm N đoạn quá dài". Nếu `importTurns` trả `error`: hiện lỗi, giữ nguyên nội dung ô dán.
- Sau khi nhập: ô dán đóng, danh sách lượt hiện ra, người đọc để trống.

**Thẻ lượt**
- Đầu thẻ: ô chọn (`Checkbox` có sẵn ở `shared/components/ui/checkbox.tsx`) + **chip người đọc có màu** (thay `ModeratorSelect` dòng 96-103). Checkbox cỡ `size-5.5` (22px, vùng bấm dễ trúng), `shrink-0`, căn giữa dọc với chip (`items-center` trên hàng đầu thẻ). Chip mở `Popover` (đã dùng trong file, dòng 106-118) chứa danh sách nút người nói có chấm màu; **không dùng `ModeratorSelect`** vì nó chỉ nhận nhãn chuỗi, không vẽ được chấm màu. Nhãn chip: `tên` + chấm màu. Chưa gán: chip "Chưa gán người", viền đỏ nét đứt, thẻ `border-mod-danger`.
- Phần còn lại của thẻ (style, expression, lên/xuống/xoá, lời, ghi chú) giữ nguyên.
- `aria-label` của chip: "Người nói của lượt N".

**Thanh chọn nhiều (nổi, `sticky bottom-0`)**
- Chỉ hiện khi đã chọn >= 1 lượt: "Đã chọn N lượt" + một nút theo từng người nói (chấm màu + tên) + "Bỏ chọn" + "Chọn tất cả chưa gán".
- Một lượt bấm gọi `assignTurns`, rồi bỏ chọn. Tập chọn là `useState<Set<string>>` cục bộ; xoá lượt phải loại id khỏi tập.
- 30 nút khi có 30 người: bọc `flex-wrap` và `max-h` + cuộn, không làm vỡ bố cục.

**Cột phải: Người nói (N/30)**
- Thay vòng lặp 2 khối cố định bằng danh sách từ `dialogue.speakers`: chấm màu, ô tên (`maxLength` = `DIALOGUE_NAME_MAX_CHARS`), chọn giọng (`DIALOGUE_VOICES` 30 mục, nhãn từ `VOICE_LABEL`), nút xoá.
- Nút **+ Thêm người nói**: `addSpeaker`; vô hiệu ở 30 và có `title` "Tối đa 30 người nói".
- Nút xoá: `removeSpeaker`; nếu `blockedBy > 0` hiện "N lượt đang dùng người này, hãy gán lại trước"; nếu chỉ còn 2 người, nút bị vô hiệu với `title` "Cần tối thiểu 2 người nói".
- Giữ ghi chú giọng AI nhưng đổi chữ: "Giọng AI chỉ dùng khi tạo giọng bằng AI. Các người nói phải khác tên và khác giọng."
- Thêm một dòng nhỏ cho biết đường TTS sẽ dùng: đếm `dialogueUsedSpeakerKeys`; đúng 2 → "AI sẽ đọc trong một lượt gọi mỗi đoạn"; khác 2 → "AI sẽ gọi từng lượt: N lượt gọi" (số lượt thật). Đây là điểm giảng viên thấy hệ thống "hiểu" số người.
- Dòng cảnh báo khi có >2 người dùng: "Chen lời `|…|` được đọc bằng cùng giọng của người đang nói khi có hơn 2 người."

**Tóm tắt**: thêm hàng "Người nói" (dùng/khai báo) và "Chưa gán". Khối lỗi giữ `dialogueIssues`.

**Tiêu đề**: "Kịch bản hội thoại" (bỏ "hai người"); nút "Chuyển về một người kể" giữ nguyên điều kiện.

## 4.2 `DialogueRecordingSheet.tsx`
- Bỏ `speakerDot` cố định; dùng `speakerColorClass`.
- Bộ lọc vai: "Cả hai" → "Tất cả". Với >6 người, nhãn chip lọc dùng cuộn ngang, không xuống nhiều hàng.
- `nameOf` không dùng `!`: khoá không có thì hiển thị "(chưa gán)".
- Câu mô tả "Read-along sheet for two people" (comment) sửa cho đúng.

## 4.3 Chữ còn nhắc "hai"
- `PodcastScriptStep.tsx:217`: "Chuyển sang hội thoại hai người" → "Chuyển sang hội thoại nhiều người".
- `PodcastVoiceStep.tsx:25-26`: "Hai người thu ngoài hệ thống..." → "Những người đọc thu ngoài hệ thống..."; "AI đọc hai vai..." → "AI đọc từng vai...".
- `AiVoicePanel.tsx:46`: "AI đọc hai vai" → "AI đọc từng vai". Dòng 53 `VOICE_LABEL[speaker.voice]` đã đúng vì Phase 1 mở `VOICE_LABEL`.
- `AiVoicePanel.tsx:90` **bắt buộc sửa**: `origin.voice` có `.max(60)` (`editor-document.ts:157`), nối 30 giọng bằng `" + "` sẽ bị 422 khi gắn audio. Thêm hàm thuần `formatVoiceOrigin(voices: string[])` (đặt cạnh `voiceLabels.ts`): ≤3 giọng thì nối `" + "`; hơn thì `"Kore + Charon + Puck (+N)"`. Kết quả luôn ≤60 ký tự (3 tên dài nhất 13 + 2×3 + " (+27)" = ~51). Có test: 2, 3, 4, 30 giọng, và độ dài ≤60. Dòng này dùng khi `job.voice` rỗng (tập hội thoại).
- `DialogueRecordingSheet.tsx:8`: `RoleFilter = DialogueSpeakerKey | "ALL"` thành `string`.
- Mọi chỗ đọc `speakerDot[turn.speaker]` phải đi qua `speakerColorClass` (không còn `Record<DialogueSpeakerKey,...>`).

## Kiểm thử UI
Không viết test component mới (project chưa có hạ tầng test cho các màn này; hàm thuần đã test ở Phase 3). Smoke thủ công theo "Smoke" bên dưới, chụp ảnh.

## Smoke
1. Tập mới → chuyển hội thoại → dán `sample-script.txt` (xem Phase 5) → Tách đoạn: ra 30 lượt chưa gán.
2. Thêm 2 người (tổng 4), chọn 10 lượt, gán một người cho cả lô; chip đổi, lượt chưa gán còn viền đỏ.
3. Xoá người đang dùng: bị chặn, có số lượt. Gán lại rồi xoá: được.
4. Lưu tự động chạy sau 900 ms, đóng và mở lại tập: người nói, giọng, lượt, gán đều còn.
5. Bước Giọng đọc: bản đọc theo vai lọc đúng người, màu khớp bước kịch bản.
6. Tập hai người A/B cũ: mở được, hiển thị đúng.
