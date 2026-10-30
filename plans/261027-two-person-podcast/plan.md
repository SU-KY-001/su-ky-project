---
title: "Podcast hai người: kịch bản dạng lượt, thu âm thủ công, TTS hai giọng"
description: "Một cấu trúc DialogueScript (lượt: người nói, giọng điệu, expression, ghi chú) dùng chung cho TTS Gemini hai giọng và bản đọc theo vai cho thu âm thủ công"
status: completed
priority: P2
effort: 5 phase; lịch thu âm và AI soạn hội thoại để plan riêng
mode: fast
created: 2026-10-27
blockedBy: []
blocks: []
---

> **Đã triển khai 2026-10-27.** Khác plan gốc (cố ý, theo ponytail): không có `readerUserId` (không có endpoint liệt kê mod) nên không có mục checklist `DIALOGUE_SPEAKER_UNASSIGNED`; hằng số giới hạn đặt cố định trong `@repo/shared` thay vì cấu hình; chỉ thêm env `TTS_DIALOGUE_MODEL` (chunk dùng `TTS_CHUNK_CHARS`, `mode: "conversational"` luôn bật); xác nhận trước khi tạo giọng là ghi chú trong panel thay vì hộp thoại hai bước; `AI_VOICE` hiển thị cặp giọng `Kore + Charon`. Chưa gọi Gemini thật, chưa chạy toàn bộ luồng web với API.

# Podcast hai người

Nguồn thiết kế: `plans/reports/brainstorm-261027-two-person-podcast-flow.md`. Mockup đã duyệt: `mockups/index.html` (hai trang chạy được).
Cross-plan scan: chỉ có `261015-1640-podcast-ai-source-check-p1` (status in-progress). **Không chặn nhau** nhưng chạm chung vài file (xem "Va chạm với P1"); làm phase 2 và 5 sau khi P1 phase 7-8 đã merge, hoặc rebase cẩn thận.

## Quyết định đã chốt
1. Ba việc tách rời: (a) soạn kịch bản hai người, (b) thu âm thủ công, (c) TTS hai người.
2. **Thu âm thủ công = hướng A:** thu ngoài hệ thống, mod upload **một file** bằng đường "Tải file thu âm" đã có. Không trộn track, không ghi âm trong app.
3. Mỗi lượt nói = một thẻ = một segment: `speaker`, `style` (giọng điệu cả lượt), expression (tag inline trong lời), `note` (ghi chú cho người thu).
4. Soạn bằng thẻ, không dán `A: ...` ở bản đầu.
5. Series chỉ là chủ đề; tập hội thoại và tập một người kể sống chung trong một series, chọn theo từng tập.
6. Lịch thu âm tách riêng, **không nằm trong plan này** (mockup chỉ minh hoạ).

## Dữ kiện đã kiểm (docs Gemini 2026-10-27)
- `POST /v1beta/interactions` (repo đã dùng ở `gemini-tts.ts`). Hai người: `generation_config.speech_config = { speakers: [{speaker, voice} x2] }` (REST có thêm `mode: "conversational"`); mỗi lượt là một `content` item có `annotations: [{type:"speech_metadata", speaker, style?}]`. Đầu ra WAV 24kHz mono.
- Tối đa **2 speaker, giọng prebuilt** trong một request. Giọng tự thiết kế/nhân bản: không hỗ trợ ở plan này.
- Inline tag: `<laugh> <chuckle> <sigh> <breath> <gasp> <cough> <throat-clearing> <whispers> <short pause> <long pause>`; tag viết tiếng Anh dù lời tiếng Việt. `|phản hồi|` = người kia chen vào mà không tách lượt.
- Tiếng Việt: được hỗ trợ trên cả hai model 3.8. Chất lượng giọng tiếng Việt **không phải mối quan tâm của plan này** (user quyết 2026-10-27): không spike, không cổng nghe thử. Giới hạn độ dài một request đa speaker chưa biết: dùng mặc định thận trọng cấu hình được, lỗi thật từ API được báo rõ cho mod.
- `AI_VOICES = ["en-us-riko","Kore","Charon","Puck","Aoede"]` trong `packages/shared/src/schemas/content/ai-voice.ts`: danh sách giọng hiện có; hội thoại chọn từ đây.

## Thiết kế dữ liệu
Thêm **một cột nullable** `dialogue Json?` vào `EpisodeNarration` (`packages/db/prisma/schema.prisma:554`). Dùng trên hàng `THIRD_PERSON` (hàng mà voice đang đọc, `speechNarration`). Không bảng mới.

```ts
// packages/shared/src/schemas/content/dialogue.ts
DialogueSpeaker = { key: "A" | "B", name: string(1..40), voice: AiVoice, readerUserId?: uuid }
DialogueTurn    = { id: uuid, speaker: "A" | "B", text: string(1..DIALOGUE_TURN_MAX_CHARS),
                    style?: string(..DIALOGUE_STYLE_MAX_CHARS), note?: string(..DIALOGUE_NOTE_MAX_CHARS) }
Dialogue        = { speakers: [DialogueSpeaker, DialogueSpeaker] /* key A rồi B, tên khác nhau, giọng khác nhau */,
                    turns: DialogueTurn[1..DIALOGUE_MAX_TURNS] }
```
- Hằng số có tên, ví dụ `DIALOGUE_MAX_TURNS` (mặc định 300), `DIALOGUE_TURN_MAX_CHARS` (2000), `DIALOGUE_STYLE_MAX_CHARS` (200), `DIALOGUE_NOTE_MAX_CHARS` (500); cấu hình được qua `env`/`SystemConfig` theo quy ước hiện có.
- `text` chỉ được chứa tag trong danh sách cho phép (`DIALOGUE_TAGS`) và cặp `|...|` cân bằng; ký tự `<` khác bị từ chối.
- `dialogue` khác null ⇒ tập này là hội thoại. Khi lưu: server tính `scriptContent` = lời các lượt đã bỏ tag/`|`, nối bằng xuống dòng (để đếm từ, thời lượng, tìm kiếm, `scriptHash`, kiểm duyệt vẫn dùng được); `scriptDocument` = null.
- Hash giọng đọc của tập hội thoại = sha256 của JSON chuẩn hoá `{speakers[key,voice], turns[speaker,text,style]}` (bỏ `note`, `name`, `readerUserId`, `id`): đổi ghi chú không làm âm thanh cũ mất hiệu lực.

## Phase
| # | Phase | Trạng thái | File |
|---|---|---|---|
| 1 | Schema dùng chung, DB, API lưu/đọc hội thoại | pending | `phase-01-dialogue-data-api.md` |
| 2 | Web: soạn kịch bản bằng thẻ | pending | `phase-02-web-dialogue-editor.md` |
| 3 | Web: thu âm thủ công (bản đọc theo vai, in, upload) | pending | `phase-03-web-recording-sheet.md` |
| 4 | API + Web: TTS hai giọng | pending | `phase-04-tts-dialogue.md` |
| 5 | Kiểm duyệt, nhãn AI, tài liệu | pending | `phase-05-review-docs.md` |

Phụ thuộc: 1 → 2, 3, 4. 3 và 4 làm song song được sau phase 2. 5 sau cùng.

## Va chạm với P1 (`261015-1640-podcast-ai-source-check-p1`)
| File / vùng | P1 | Plan này |
|---|---|---|
| `voice.service.ts`, `speech-text.ts` (scriptHash, attach) | phase 8 đã thêm hash/attach | phase 4 thêm nhánh hội thoại, giữ nguyên hợp đồng `HASH_MISMATCH` |
| `PodcastScriptStep.tsx` (dock AI) | phase 6/dock | phase 2 rẽ nhánh: tập hội thoại hiện trình soạn thẻ, **không hiện dock AI rà/soạn** |
| Checklist tập / `episodeChecklist` | phase 7 | phase 5 thêm mục |
| AI rà kịch bản (`scriptDocument` theo block) | phase 1-5 | **Không hỗ trợ hội thoại ở plan này** (xem "Ngoài phạm vi") |

## Ngoài phạm vi (cố ý)
- Lịch thu âm (`RecordingSession`) và nhắc việc: plan riêng; bản đọc theo vai độc lập với nó.
- AI soạn hội thoại (prompt `draft-dialogue-section`), AI rà kịch bản cho hội thoại: plan riêng. Tập hội thoại không có nút AI rà; trang kiểm duyệt ghi rõ.
- Thu âm trong app, trộn nhiều track, căn độ lệch, teleprompter, overlap ngoài `|...|`, hơn 2 người, giọng tự thiết kế/nhân bản, tạo lại riêng một lượt, dán `A: ...`.

## Rủi ro lớn nhất
Giới hạn độ dài một request hai giọng của Gemini chưa đo. Giảm thiểu: chunk theo lượt với `TTS_DIALOGUE_CHUNK_CHARS` cấu hình được, mặc định bằng `TTS_CHUNK_CHARS`; nếu API từ chối thì job báo lỗi rõ và mod giảm độ dài hoặc chỉnh cấu hình. Phase 1-3 không phụ thuộc phase 4.

## Tiêu chí nghiệm thu
1. Tạo tập hội thoại, soạn ≥ 3 lượt hai người với style, expression, note; lưu và mở lại đúng.
2. Tập hội thoại thu âm thủ công: mở bản đọc theo vai, chọn người đọc, in được, upload file và tập có âm thanh.
3. TTS: tạo giọng hai người từ cùng kịch bản, nghe thử, gắn làm âm thanh; sửa lời sau khi tạo thì gắn bị chặn `HASH_MISMATCH`; sửa `note` thì không.
4. Tập một người kể hiện tại không đổi hành vi (không migration dữ liệu, không đổi route cũ).
5. Test tự động pass: schema, validate tag, hash, dựng body Gemini, chunk theo lượt, reducer web.
