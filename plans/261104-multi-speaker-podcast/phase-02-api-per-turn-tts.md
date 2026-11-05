# Phase 2: API sinh giọng từng lượt khi số người dùng khác 2

Phụ thuộc: Phase 1. Làm song song được với Phase 3.

## Quy tắc chọn đường
Đếm theo `dialogueUsedSpeakerKeys(dialogue)` (số người **thực sự có lượt**, không phải số người khai báo):
- **đúng 2**: đường cũ (`chunkDialogue` + `synthesizeDialogue`, multi-speaker 1 request/chunk). Truyền **đúng 2 speaker đã dùng trên toàn kịch bản** cho **mọi chunk** (kể cả chunk chỉ có một người nói, để luôn đủ 2 cấu hình như Gemini yêu cầu). Chưa biết Gemini có chấp nhận chunk chỉ một người nói: kiểm ở smoke. Hành vi và hash không đổi.
- **khác 2** (1 hoặc >=3): từng lượt single-speaker.

Lý do đếm theo người dùng thật: Gemini multi-speaker cần đúng 2 cấu hình; 30 người khai báo nhưng chỉ 2 nói vẫn đi đường rẻ.

## File
| File | Việc |
|---|---|
| `apps/api/src/modules/ai-assist/voice/gemini-tts.ts` | `buildSingleBody(text, voice, opts?)`: `opts.model` (mặc định `env.TTS_MODEL`) và `opts.style` (mặc định `env.TTS_STYLE`). Khi `opts.style === ""`: bỏ `annotations` (không gửi style trống). Thêm `synthesizeTurnWav(turn, voice, signal)`: model `env.TTS_DIALOGUE_MODEL`, style = `turn.style?.trim() ?? ""`, text = `turn.text.replace(/\|/g, "")` (giữ tag `<...>` vì single-speaker hiểu tag inline). `synthesizeWav` giữ nguyên chữ ký, chỉ đi qua tham số mặc định |
| `apps/api/src/core/env.ts` | Thêm `TTS_TURN_GAP_MS` theo đúng mẫu các biến TTS cạnh đó: `z.preprocess(emptyAsUndefined, z.coerce.number().int().min(0).default(250))` (env rỗng trong docker/dotenv sẽ thành 0 nếu chỉ dùng `z.coerce.number()`). Comment 1 dòng nêu lý do (ffmpeg nối thẳng, không có hơi nghỉ). Sửa comment dòng 66 "Two-speaker requests…" vì model này nay dùng cả cho từng lượt. **Bắt buộc** thêm vào `.env.example` (file đã tồn tại, khối `TTS_*` dòng ~95-102) |
| `apps/api/src/modules/ai-assist/voice/speech-text.ts` | Thêm `silenceWav(ms): Buffer`: header RIFF/WAVE 44 byte, PCM 16-bit mono 24 kHz, dữ liệu toàn 0; cùng định dạng với đầu ra Gemini để ffmpeg concat demuxer không đổi tham số |
| `apps/api/src/modules/ai-assist/voice/voice.service.ts` | Xem bên dưới |

## voice.service.ts
- `VoiceDeps` thêm `synthesizeTurn?: typeof synthesizeTurnWav` (để test tiêm hàm giả, theo mẫu `synthesize`, `synthesizeDialogue`).
- Nhánh `dialogue` tạo `units`:
  - đường cũ: giữ nguyên biểu thức hiện tại, nhưng `speakers` truyền vào là `dialogue.speakers` lọc theo khoá đã dùng.
  - đường từng lượt: mỗi lượt một unit `{ chars: turn.text.length, run: (signal) => this.synthesizeTurn(turn, voiceOf(turn.speaker), signal) }`.
- Sau khi `Promise.all` xong (đoạn dòng 167-173): nếu đường từng lượt và `env.TTS_TURN_GAP_MS > 0`, dựng mảng `parts` = WAV các lượt xen `silenceWav(gap)` (không chèn sau lượt cuối), rồi ghi `part{i}.wav` từ `parts`. **`durationMs` (dòng 186) phải tính từ `parts`**, không phải từ mảng `wavs` của các unit, nếu không thời lượng thiếu đoạn lặng. Đường cũ: `parts = wavs`, công thức giữ nguyên.
- `job.total` = số unit; không đếm đoạn lặng.
- Log `voice job done` thêm `path: "multi" | "per-turn"` để biết đường nào chạy.
- Lỗi một lượt: giữ cơ chế hiện có (`job.abort.abort()` dừng các worker anh em, job FAILED với thông điệp lỗi từ `requestWav`). Không thêm retry.

## Test (`apps/api/tests/ai-assist/dialogue-speech.test.ts`)
- `buildSingleBody`: model/style mặc định giữ nguyên (hồi quy); `style: ""` thì không có `annotations`.
- `synthesizeTurnWav` dựng body: text đã bỏ `|`, còn nguyên `<laugh>`, voice đúng, model là `TTS_DIALOGUE_MODEL`.
- `silenceWav(250)`: độ dài byte = 44 + 250 ms × 48 byte/ms; byte dữ liệu toàn 0.
- `VoiceService.start` với 3 người, 4 lượt: `synthesizeTurn` được gọi 4 lần đúng giọng theo người nói, `synthesizeDialogue` không bị gọi; `encode` nhận 4 WAV + 3 đoạn lặng xen kẽ (đọc `parts.txt`); `job.total` = 4.
- 5 lượt nhưng chỉ A và B nói dù khai báo 3 người: đường cũ, `synthesizeDialogue` nhận đúng 2 speaker.
- Hồi quy: ca 2 người hiện có (dòng 84-90) vẫn pass; một người nói duy nhất đi đường từng lượt.

## Smoke (cần `GEMINI_API_KEY` thật)
Tập 3 người, 6 lượt: mp3 ra, nghe được, thời lượng khớp. Không có key: báo rõ trong bàn giao rằng chỉ có unit test, chưa gọi Gemini thật.

## Tài liệu / comment cần sửa theo
- `apps/api/src/routes/docs/paths/ai-assist.ts:250,255` và `routes/docs/paths/studio.ts:496`: mô tả OpenAPI nói "hai người"; sửa thành nhiều người nói (2..30) và nêu hai đường TTS.
- Comment "Two-person script" ở `speech-text.ts:19,40` và `content/domain/content.repository.ts:103`.

## Rủi ro ghi nhận (ngoài phạm vi đồ án)
300 lượt = 300 request; `TTS_CONCURRENCY` mặc định 3 dễ dính 429 với key miễn phí. Khi demo: hạ `TTS_CONCURRENCY` và dùng kịch bản ngắn. Job nằm trong bộ nhớ nên restart server thì mất, cơ chế này đã có từ trước.
