# Phase 4: API + Web, TTS hai giọng

Phụ thuộc: phase 1, phase 2. Mockup chuẩn: hộp thoại "Tạo giọng AI" trong `mockups/01-dialogue-editor.html`.

## API
1. **Env** `apps/api/src/core/env.ts` + `.env.example` (nhóm TTS, kèm giải thích): `TTS_DIALOGUE_MODEL` (mặc định `gemini-3.8-flash-tts`, theo doc: model dành cho hội thoại), `TTS_DIALOGUE_CHUNK_CHARS` (mặc định bằng `TTS_CHUNK_CHARS`), `TTS_DIALOGUE_CONVERSATIONAL` (boolean, mặc định `true`: REST hỗ trợ `mode: "conversational"`). `TTS_MODEL` và `TTS_STYLE` giữ cho một người kể.
2. **Gọi Gemini** `voice/gemini-tts.ts`: tách phần chung (khóa, xoay key khi 429, timeout, rút `audio`) thành hàm dùng cho cả hai đường; thêm `synthesizeDialogueWav(turns, speakers, signal)` dựng body: `input[0].content` là mỗi lượt một item `{type:"text", text, annotations:[{type:"speech_metadata", speaker: key, style?}]}`; `generation_config.speech_config = { speakers: [{speaker, voice}, ...], mode?: "conversational" }`; `model: env.TTS_DIALOGUE_MODEL`. Hàm dựng body là hàm thuần để test. Không thay đổi hành vi `synthesizeWav` hiện có.
3. **Chia chunk** `voice/speech-text.ts`: `chunkDialogue(turns, maxChars)` gom lượt liên tiếp tới `maxChars`; **không cắt ngang lượt**; một lượt dài hơn `maxChars` thì báo lỗi rõ khi lưu/khởi tạo (422) thay vì cắt (giới hạn `DIALOGUE_TURN_MAX_CHARS` đã chặn từ phase 1; kiểm lại ở đây vì cấu hình có thể đổi).
4. **Service** `voice.service.ts`: `start()` nhận cả hai dạng. Hợp đồng: tập có `dialogue` → body `voice` phải vắng (giọng đọc lấy từ `dialogue.speakers`); tập không có → `voice` bắt buộc như cũ; sai dạng → 422 `VALIDATION_ERROR`. `CreateVoiceJobSchema` đổi thành object có `voice` tuỳ chọn và kiểm theo tập; `VoiceJobSchema` thêm `mode: "SINGLE"|"DIALOGUE"` và `voice` thành nullable (web đã dùng `voice` ở panel một giọng, cập nhật theo). `Job.scriptHash` = `scriptSpeechHash` (phase 1 đã trả hash hội thoại), nên attach vẫn kiểm `HASH_MISMATCH` đúng. Pipeline `run()` (đồng thời `TTS_CONCURRENCY`, ghép ffmpeg ra MP3, hủy, TTL) dùng lại nguyên; chỉ nguồn `chunks` khác. Trùng job đang chạy: so cả `scriptHash` và (voice | null).
5. **Lỗi**: không retry lỗi 4xx của Gemini; 429 theo cơ chế xoay key đã có; nếu Gemini từ chối request (kịch bản quá dài, bị chặn nội dung) thì job `ERROR` với thông báo tiếng Việt kèm mã lỗi thật, để mod rút ngắn hoặc sửa lời.
6. **Nhật ký**: log có `jobId`, `episodeId`, số lượt, số ký tự, `model`, thời gian; **không** log nội dung lời hay key (theo `ai-engine` đã sửa ở P1 phase 0).

## Web
7. `voice/voiceService.ts`, `useVoiceJob.ts`, `AiVoicePanel.tsx`: với tập hội thoại hiện hộp thoại 2 bước: (1) xác nhận (mô hình, số lượt và ký tự, hai giọng, cảnh báo "sửa kịch bản phải tạo lại cả tập", checkbox cam kết nhãn "giọng AI"), (2) tiến độ (thanh `done/total` theo chunk, hủy) rồi nghe cả tập và "Xong" mới gắn. Không có "tạo lại một lượt". Thông báo `HASH_MISMATCH` đã có thì dùng lại.
8. Giọng chọn ở panel Người nói (phase 2), không chọn lại ở hộp thoại.

## Test
- Dựng body: hai speaker đúng `speech_config`, mỗi lượt đúng `speaker`/`style`, không gửi `style` rỗng, `mode` theo env.
- `chunkDialogue`: không cắt lượt; lượt vượt giới hạn → lỗi; chunk đầu/cuối.
- Service (stub `synthesize`/`encode` như `voice.service.test.ts` hiện có): hợp đồng `voice` vắng/có; job trùng; hủy; sửa `text` làm attach `HASH_MISMATCH`, sửa `note` thì không.
- Hồi quy: một người kể giữ nguyên toàn bộ test cũ.

## Smoke (bắt buộc, thật)
Với khóa Gemini thật: tạo giọng cho kịch bản mẫu 6 lượt rồi một kịch bản dài vượt `TTS_DIALOGUE_CHUNK_CHARS` (nhiều chunk); xác nhận job chạy xong, MP3 ghép được và gắn làm âm thanh được. Không đánh giá chất lượng giọng. Chụp ảnh UI, ghi lại thời gian và giới hạn thực tế gặp phải.

## Xong khi
Cả hai đường TTS (một giọng, hai giọng) chạy end-to-end; hợp đồng attach bảo vệ khỏi âm thanh cũ.
