# Phase 2: Web, soạn kịch bản bằng thẻ

Phụ thuộc: phase 1. Mockup chuẩn: `mockups/01-dialogue-editor.html` (cột trái các thẻ, cột phải Người nói và Tóm tắt).

## Việc
1. **Chọn định dạng**: ở bước Thông tin hoặc đầu bước Kịch bản của tập chưa có nội dung, mod chọn "Một người kể" (mặc định, như hiện tại) hoặc "Hội thoại hai người". Tập đã có kịch bản rồi đổi định dạng → hộp thoại xác nhận nói rõ nội dung cũ sẽ không tự chuyển (lời cũ còn nguyên cho tới khi mod lưu định dạng mới). Chỉ cho `THIRD_PERSON` (chặn khi đã chọn ngôi thứ nhất).
2. **State** `podcastWizardState.ts`: thêm `dialogue: Dialogue | null` và action tương ứng; `scriptDirty`, `scriptText` (bằng `dialogueSpokenText`) dùng chung với luồng cũ. `fromExistingEpisode` (~dòng 81) đọc `dialogue` từ narration.
3. **Lưu** `usePodcastCreationWizard.ts` (~dòng 62, `saveScript`): gửi `{ dialogue }` thay cho `{ scriptDocument }` khi định dạng hội thoại; autosave đang có ở `PodcastScriptStep.tsx` (~dòng 93-111) dùng lại.
4. **Component** `components/DialogueEditor.tsx` (+ tách `DialogueTurnCard.tsx`, `DialogueSpeakersPanel.tsx` nếu file quá 200 dòng):
   - Thẻ lượt: chọn người nói (A/B với tên), ô giọng điệu có gợi ý (datalist), nút "+ Expression" chèn tag tại con trỏ từ `DIALOGUE_TAGS` (menu), ô lời, ô ghi chú cho người thu, nút lên/xuống/xoá lượt, nút "Thêm lượt A / B". Dùng component và token Tailwind `mod*` của app, không copy CSS mockup.
   - Panel Người nói: tên, giọng AI (chọn từ `AI_VOICES` qua `VOICE_LABEL` ở `voice/voiceLabels.ts`, **không cho trùng giọng**), người đọc thật (chọn một mod; chỉ lưu nếu danh sách mod lấy được từ API hiện có, nếu chưa có endpoint phù hợp thì bỏ trường này khỏi UI bản đầu và để `readerUserId` trống).
   - Tóm tắt: số lượt, ký tự, thời lượng ước (dùng `useWordsPerMinute`), trạng thái hợp lệ, lỗi theo lượt (rỗng, tag lạ).
   - Phím tắt và truy cập: nhãn cho mọi control, thứ tự tab, thông báo lỗi cho trình đọc màn hình.
5. **`PodcastScriptStep.tsx`**: nếu định dạng hội thoại render `DialogueEditor`, **ẩn dock AI** (rà/soạn/viết lại) và hiện một dòng giải thích "AI rà/soạn chưa hỗ trợ kịch bản hội thoại".
6. Thuần logic tách ra `dialogueState.ts` (thêm/xoá/đổi chỗ lượt, chèn tag tại vị trí, chuẩn hoá) để test không cần DOM.

## Test
- `dialogueState.test.ts`: thêm/xoá/đổi chỗ giữ `id` ổn định; chèn tag tại đầu/giữa/cuối và khi có vùng chọn; không cho xoá lượt cuối nếu schema đòi ≥1 lượt (hoặc hiện lỗi hợp lệ); đổi giọng trùng bị từ chối.
- `podcastWizardState.test.ts`: tập có `dialogue` nạp đúng; tập thường không đổi (hồi quy).

## Smoke (bắt buộc, UI)
Chạy app, tạo tập hội thoại, thêm 3+ lượt, chèn expression, reload trang, xác nhận dữ liệu còn nguyên; chụp ảnh. Kiểm một tập một người kể cũ vẫn mở đúng.

## Xong khi
Soạn, lưu, mở lại được; không còn cách lưu ra dữ liệu sai schema; tập cũ không đổi.
