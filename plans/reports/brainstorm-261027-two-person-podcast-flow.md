# Brainstorm: Podcast 2 người (kịch bản · thu âm thủ công · TTS)

**Ngày:** 2026-10-27. **Trạng thái:** hướng đã chốt với user, chưa lập plan. Chưa có code.

## 1. Quyết định đã chốt (user)
1. Tách 3 việc: (a) tạo kịch bản 2 người, (b) thu âm thủ công, (c) TTS 2 người.
2. Thu âm thủ công = **hướng A**: thu ngoài app, mod upload 1 MP3 qua "Tải file thu âm" đã có. Không trộn track trong app.
3. Kịch bản kiểu Google AI Studio: mỗi lượt nói = 1 thẻ = 1 segment, có speaker, giọng điệu (style), expression. Cùng một cấu trúc dùng cho TTS và cho người thu.

## 2. Gemini TTS multi-speaker: đã đọc doc (ai.google.dev/gemini-api/docs/speech-generation)
- Model `gemini-3.8-flash-tts` (đa sắc thái, hội thoại phức tạp, vocal burst) và `gemini-3.8-flash-lite-tts` (rẻ, nhanh). Cùng schema. Cả hai hỗ trợ tiếng Việt, tự nhận ngôn ngữ.
- Endpoint đang dùng trong repo: `POST /v1beta/interactions` (`gemini-tts.ts`). Dùng tiếp, **không đổi SDK**.
- Hai người nói: `generation_config.speech_config = { speakers: [{speaker:"A", voice}, {speaker:"B", voice}] }`; mỗi lượt là một item `content` với `annotations: [{type:"speech_metadata", speaker, style?}]`. Một request, một file WAV (24kHz, mono, 16-bit).
- REST có thêm `speech_config.mode: "conversational"` cho nhịp chuyển lượt tự nhiên (SDK chưa nhận). Repo gọi REST nên dùng được.
- `style` (trên `speech_metadata`) = giọng điệu cả lượt ("thì thầm", "nói chậm"). Inline tag `<laugh> <sigh> <short pause> <long pause> <breath> <cough> <gasp> ...` = expression tại một điểm. Tag viết tiếng Anh kể cả khi lời tiếng Việt.
- `|phản hồi|` trong lượt người này = người kia chen "ừ", "vâng" (backchannel) mà không cần tách lượt.
- Doc khuyên: để `style` trống hoặc một câu ngắn cố định; muốn nhân vật ổn định thì dùng Voice design thay vì chỉ dẫn dài.
- **Giới hạn:** tối đa **2 speaker** trong một request, và chỉ với **giọng prebuilt**. Giọng tự thiết kế/nhân bản (`voice_...`) phải tổng hợp từng lượt riêng rồi ghép PCM (bỏ header WAV 44 byte, dùng `audio/l16`).
- Chưa thấy trong doc: giới hạn độ dài một request đa speaker. [UNVERIFIED] cần spike.

## 3. Mô hình dữ liệu dùng chung

```
DialogueScript (jsonb, zod-validate, trên EpisodeNarration)
  speakers: [ { key:"A", name, voice, persona?, recorderLabel? },
              { key:"B", ... } ]            // đúng 2
  turns: [ { id: uuid ổn định, speaker:"A"|"B",
             text,       // lời + tag inline <laugh>, |phản hồi|
             style?,     // giọng điệu cả lượt -> speech_metadata.style
             note? } ]   // ghi chú nội bộ cho người thu, không gửi TTS
```
- `turns[].id` làm luôn "block id" cho AI rà kịch bản sau này.
- Không thêm bảng. Đường một người kể giữ nguyên (Tiptap). Hội thoại là `scriptFormat = DIALOGUE`, đường riêng.
- Không có bảng audio theo lượt: hướng A không cần, TTS một request không cần.

## 4. Ba luồng

| | (a) Soạn kịch bản | (b) Thu âm thủ công | (c) TTS |
|---|---|---|---|
| Đầu vào | Mod soạn thẻ: chọn speaker, style, chèn expression, thêm/xoá/đổi thứ tự lượt | Cùng kịch bản | Cùng kịch bản |
| Việc hệ thống | Trình soạn thẻ kiểu AI Studio; (sau) AI soạn lượt hội thoại từ dàn ý | "Bản đọc theo vai": mỗi người thấy lượt của mình nổi bật, kèm style/expression/note; in/xuất; gắn lịch thu | Map turns -> `speech_metadata`; chunk theo lượt; ffmpeg ghép; nghe thử rồi gắn |
| Âm thanh ra | không | Mod upload 1 MP3 (đường có sẵn) | MP3 + nhãn "giọng AI" |
| Hệ thống kiểm soát | | Không (user chốt) | Có |

### (a) Soạn
- Thẻ: dropdown speaker, ô style, nút "+ Expression" chèn tag tại con trỏ (danh sách tag cố định từ doc), ô text. Panel "Speaker settings" chọn giọng, hiển thị pitch/persona từ `GET /v1beta/voices` (Extended Voice Library). Chưa kiểm thư viện có giọng tiếng Việt không [UNVERIFIED].
- Chỉ validate: đúng 2 speaker, mỗi lượt không rỗng, tag nằm trong danh sách cho phép, độ dài tối đa.
- AI soạn hội thoại (prompt `draft-dialogue-section` trả `turns[]`) để pha sau; pha đầu mod soạn tay hoặc dán.

### (b) Thu thủ công
- Hệ thống không biết file audio được làm thế nào. Chỉ cần: bản đọc theo vai + lịch.
- **Lịch thu âm hiện chưa có.** Repo chỉ có `releaseSchedule` (lịch phát hành, `productionDeadline`, assignment, nhắc việc qua worker). Đề xuất nhỏ: `RecordingSession { episodeId, startsAt, location/link, assignments: {A: userId, B: userId} }`, tái dùng worker nhắc việc. **Cần user xác nhận** cần cả lịch trong hệ thống hay chỉ ghi chú.
- Checklist duyệt tập: có đủ 2 vai gán người, đã upload âm thanh.

### (c) TTS
- Mở rộng `voice.service.ts`: tạo body từ `turns` thay vì đoạn văn; gom lượt liên tiếp tới `TTS_CHUNK_CHARS`, chia chunk **tại ranh giới lượt**, mỗi chunk một request, giữ cùng cặp giọng prebuilt; ffmpeg ghép như hiện tại.
- Model riêng cho hội thoại (`TTS_DIALOGUE_MODEL`, mặc định `gemini-3.8-flash-tts`); `TTS_MODEL` flash-lite giữ cho một người kể.
- Nhãn disclosure "giọng AI" như đã chốt ở plan trước.
- Tạo lại một lượt riêng lẻ: **không làm** (một request nhiều lượt). Sửa kịch bản thì tạo lại cả tập.

## 5. Rủi ro / chưa kiểm
1. Tiếng Việt hai giọng prebuilt: chất lượng, có tên Hán-Việt, số/ngày, tag `<laugh>` trong lời Việt, `|phản hồi|` -> chưa thử. **Spike 1 giờ với kịch bản thật trước khi xây UI.**
2. Giới hạn độ dài một request đa speaker và có giữ giọng ổn định qua nhiều chunk không.
3. Giọng tự thiết kế không dùng được trong một request 2 speaker; nếu cần thì thành tổng hợp từng lượt (nhiều request, rate limit, không có `mode: conversational`). Ngoài phạm vi, chỉ ghi nhận.
4. Rate limit/quota theo project; repo đã có xoay nhiều key khi 429.
5. Giọng AI đọc lời nhân vật lịch sử: vẫn phải gắn nhãn là tái dựng (xem research-261022-dual-narrator-design.md).
6. Plan cũ ghi MiniMax; code đã chuyển Gemini. Các plan/spec còn nhắc MiniMax, `NarrationSegment`, `narrationMode` cần đối chiếu và sửa khi lập plan.

## 6. Không làm (YAGNI)
Thu âm trong app, trộn nhiều track, đồng bộ độ lệch, teleprompter, overlap/ngắt lời ngoài `|phản hồi|`, bảng segment audio, tạo lại từng lượt, hơn 2 speaker, voice clone.

## 7. Thứ tự đề xuất
1. Spike Gemini 2 giọng tiếng Việt (script rời, không repo).
2. Schema `DialogueScript` + trình soạn thẻ + bản đọc theo vai (a, b).
3. TTS hội thoại (c).
4. Lịch thu âm (nếu xác nhận).
5. AI soạn hội thoại.

## 8. Câu hỏi còn mở
1. Lịch thu âm: tính năng trong hệ thống hay chỉ ghi chú?
2. Pha đầu cho phép dán kịch bản dạng `A: ...` để nhập nhanh (parse ở biên) hay chỉ soạn từng thẻ?
3. Tập hội thoại và tập một người kể có thể cùng tồn tại trong cùng series? (đề xuất: có, chọn theo tập)
