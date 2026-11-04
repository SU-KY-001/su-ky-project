---
title: "Podcast nhiều người đọc: import đoạn văn, gán người đọc, TTS từng lượt cho >2 người"
description: "Mở rộng Dialogue từ đúng 2 người (A/B) lên 2..30 người; UX dán văn bản tách đoạn và gán người đọc hàng loạt; TTS >2 người đi từng lượt rồi nối bằng ffmpeg"
status: in-progress
priority: P2
effort: 5 phase, ~3-4 ngày một người
mode: fast
created: 2026-11-04
blockedBy: []
blocks: []
---

> **Đã code xong 2026-11-05**, chưa gọi Gemini thật (key hết lượt). Chưa kiểm: đường TTS từng lượt, và chunk 2 người mà chỉ có một người nói.

# Podcast nhiều người đọc

Nguồn: `plans/reports/brainstorm-261104-multi-speaker-podcast.md`. Mockup chạy được: `mockups/index.html` (mở thẳng bằng trình duyệt, không cần server).
Cross-plan scan: `plans/261027-two-person-podcast` (completed, là nền của plan này), `261029-error-semantics-audit` (không chạm dialogue). Không chặn nhau.

## Bối cảnh (quan trọng cho mọi quyết định)
Đồ án đại học. Tiêu chí chấm là độ đầy đủ tính năng nhìn thấy được, không phải chất lượng audio hay tải production. Demo thật: 2 người (đường cũ). Nếu bị hỏi: 3 người, nên đường >2 phải **chạy thật**. Hỗ trợ trên giấy: tối đa 30 người. Không tối ưu chất lượng, hạn mức key, hay chi phí.

## Quyết định đã chốt (user duyệt 2026-11-04)
| # | Quyết định | Hệ quả |
|---|---|---|
| 1 | Số người nói 2..30 (`DIALOGUE_MAX_SPEAKERS = 30` = số voice dựng sẵn, vì giọng phải khác nhau) | Schema, UI |
| 2 | Đúng 2 người dùng: giữ nguyên 1 request multi-speaker. Khác 2 (1 hoặc >=3 người thực sự xuất hiện trong lượt): từng lượt single-speaker, nối WAV | `voice.service.ts` |
| 3 | Luồng "1 người kể" (`scriptDocument`/`scriptContent`) giữ riêng, không đụng | Không migration |
| 4 | Import: chỉ dán văn bản, tách theo dòng trống. Không `Tên: lời`, không upload file | Phase 3-4 |
| 5 | Mở rộng voice lên 30 dựng sẵn | `ai-voice.ts`, `voiceLabels.ts` |

## Dữ kiện đã kiểm trong code (không đoán)
- `DialogueSchema.speakers` là `z.tuple([2])`, `key` là `z.enum(["A","B"])`, superRefine ép "A rồi B" (`packages/shared/src/schemas/content/dialogue.ts:25,58-67`).
- `turn.speaker` hiện hợp lệ vì cùng enum A/B. **Khi đổi sang chuỗi tự do phải thêm kiểm "lượt tham chiếu người nói có tồn tại"**, nếu không dữ liệu lệch sẽ lọt qua server.
- `AI_VOICES = ["en-us-riko","Kore","Charon","Puck","Aoede"]`, `DialogueVoiceSchema` là enum cứng 4 giọng (`ai-voice.ts:4,10`). `VOICE_LABEL: Record<AiVoice,...>` phải có nhãn cho mọi giọng (`voiceLabels.ts`).
- `voice.service.ts:97-99` tạo `units`; mỗi unit ra 1 WAV; sau đó ghi `part{i}.wav`, ffmpeg `concat` ra mp3, `durationMs` tính từ tổng byte WAV trừ header 44 (dòng 156-189). **Không cần code nối audio mới**: chỉ đổi cách tạo unit.
- `synthesizeWav(text, voice, signal)` (`gemini-tts.ts:62`) dùng `env.TTS_MODEL` (lite) và `env.TTS_STYLE` cố định: chưa nhận style theo lượt, chưa chọn model. Phải mở rộng.
- Đường 2 người dùng `generateContent` với `speech_metadata.speaker = speaker.key` (`gemini-tts.ts:47,55`). Khoá người nói mới phải là chuỗi chữ-số không khoảng trắng (Cloud TTS ghi alias chỉ chữ-số; áp dụng cho an toàn).
- Docs Gemini API (đọc 2026-11-04): multi-speaker tối đa 2 người, voice dựng sẵn; muốn nhiều hơn thì synthesize từng lượt rồi nối PCM; unary trả WAV có header 44 byte, ffmpeg concat đã xử lý.
- 30 voice dựng sẵn (bảng Cloud TTS): Achernar(Nữ) Achird(Nam) Algenib(Nam) Algieba(Nam) Alnilam(Nam) Aoede(Nữ) Autonoe(Nữ) Callirrhoe(Nữ) Charon(Nam) Despina(Nữ) Enceladus(Nam) Erinome(Nữ) Fenrir(Nam) Gacrux(Nữ) Iapetus(Nam) Kore(Nữ) Laomedeia(Nữ) Leda(Nữ) Orus(Nam) Pulcherrima(Nữ) Puck(Nam) Rasalgethi(Nam) Sadachbia(Nam) Sadaltager(Nam) Schedar(Nam) Sulafat(Nữ) Umbriel(Nam) Vindemiatrix(Nữ) Zephyr(Nữ) Zubenelgenubi(Nam).

## Thiết kế dữ liệu
Không migration. Cột `episode_narrations.dialogue Json?` giữ nguyên; chỉ đổi hợp đồng schema:

```ts
DialogueSpeaker = { key: /^[A-Za-z0-9]{1,8}$/, name: 1..40, voice: PrebuiltVoice /* 30 */ }
Dialogue = { speakers: DialogueSpeaker[2..30],
             turns: DialogueTurn[1..300] /* turn.speaker phải nằm trong speakers[].key */ }
// ràng buộc: key duy nhất, tên (không phân biệt hoa thường) duy nhất, voice duy nhất, id lượt duy nhất
```
- **Giữ tên trường `key`** (không đổi thành `id`): dữ liệu cũ `A/B` vẫn hợp lệ, không viết migration, không đổi hash `dialogueSpeechKey`. Người nói mới sinh key `S3`, `S4`, ... (số nhỏ nhất chưa dùng, tính từ 3).
- Thông điệp lỗi "Hai người nói phải ..." đổi thành "Các người nói phải ...".

## Phase
| # | Phase | File | Trạng thái |
|---|---|---|---|
| 1 | Schema dùng chung + 30 voice | `phase-01-shared-schema-voices.md` | pending |
| 2 | API: TTS từng lượt khi số người thực sự dùng khác 2 | `phase-02-api-per-turn-tts.md` | pending |
| 3 | Web: state + hàm tách đoạn/gán/thêm-xoá người nói | `phase-03-web-state-import.md` | pending |
| 4 | Web: giao diện (dán, chip, chọn nhiều, thanh người nói, bản đọc theo) | `phase-04-web-ui.md` | pending |
| 5 | Dọn chữ "hai người", CHANGELOG, dữ liệu mẫu demo | `phase-05-docs-demo.md` | pending |

Phụ thuộc: 1 → 2 và 3; 3 → 4; 5 sau cùng. 2 và 3 làm song song được sau 1.

## Ngoài phạm vi (cố ý)
- Cú pháp `Tên: lời`, upload `.docx/.txt`, phím tắt 1-9, kéo-thả lượt: không tăng điểm demo.
- Voice tự thiết kế/nhân bản, Extended Voice Library, tạo lại riêng một lượt.
- Thu âm nhiều track, trộn audio, lịch thu âm.
- AI soạn hội thoại nhiều người; AI rà kịch bản cho hội thoại (đã ngoài phạm vi từ plan 261027).
- Tối ưu độ liền mạch giữa các lượt, hạn mức key, chi phí.

## Rủi ro
| Rủi ro | Mức | Giảm |
|---|---|---|
| Quên kiểm "lượt tham chiếu người nói tồn tại" khi bỏ enum A/B | Cao | Phase 1, có test riêng |
| Test cũ dựa vào A/B và thông điệp "Hai người nói..." vỡ | Cao | Cập nhật ở Phase 1-3 (liệt kê trong từng phase) |
| Đường từng lượt chưa gọi Gemini thật | TB | Smoke với key thật 1 tập 3 người; unit test dùng `synthesize` giả |
| `|ừ|` chen lời bị đọc bởi cùng một giọng ở đường từng lượt | Thấp | Ghi rõ giới hạn ở UI và docs; bỏ dấu `|` trước khi gửi |
| Bảng màu 30 người trùng màu | Thấp | 6 màu lặp + số thứ tự trên chip |

## Tiêu chí nghiệm thu
1. Tạo tập hội thoại, thêm tới 30 người nói, giọng không trùng; không thêm được người thứ 31.
2. Dán 30 đoạn cách nhau dòng trống: ra 30 lượt chưa gán; gán hàng loạt bằng chọn nhiều; lượt chưa gán chặn lưu.
3. Xoá người nói còn lượt dùng: bị chặn kèm số lượt.
4. Tập cũ (A/B) mở lại, sửa, lưu, tạo giọng AI: hành vi và hash giọng không đổi.
5. Tạo giọng AI với 2 người thực sự xuất hiện: đúng 1 request/chunk như cũ. Với 3 người: số request = số lượt, mp3 ra thành công, `durationMs` > 0.
6. Server từ chối: lượt tham chiếu key không có, key trùng, giọng trùng, tên trùng, 31 người.
7. Test pass: `packages/shared`, `apps/api` (dialogue-speech, podcast-narration), `apps/web` (dialogueState).
