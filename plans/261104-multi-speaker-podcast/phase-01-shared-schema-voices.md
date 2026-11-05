# Phase 1: Schema dùng chung và 30 voice

Mục tiêu: `Dialogue` hợp lệ với 2..30 người, khoá chuỗi tự do, 30 giọng dựng sẵn. Không migration.

## File
| File | Việc |
|---|---|
| `packages/shared/src/schemas/content/ai-voice.ts` | Thêm `PREBUILT_VOICES` (30 tên, theo thứ tự bảng trong plan.md). `AI_VOICES = ["en-us-riko", ...PREBUILT_VOICES]`. `DIALOGUE_VOICES = PREBUILT_VOICES`. `DialogueVoiceSchema = z.enum(PREBUILT_VOICES)`. Cập nhật comment dòng 3 và 8 |
| `packages/shared/src/schemas/content/dialogue.ts` | Xem bên dưới |
| `apps/web/src/features/podcast-production/voice/voiceLabels.ts` | `VOICE_LABEL` đủ 31 khoá. Giữ nhãn 4 giọng đang có; giọng mới `detail` chỉ ghi giới tính từ bảng Cloud TTS ("Nữ" / "Nam"), không bịa tính cách |

## dialogue.ts
- Thêm `DIALOGUE_MAX_SPEAKERS = 30`, `DIALOGUE_MIN_SPEAKERS = 2`, `DIALOGUE_SPEAKER_KEY_PATTERN = /^[A-Za-z0-9]{1,8}$/`.
- `DialogueSpeakerKeySchema = z.string().regex(DIALOGUE_SPEAKER_KEY_PATTERN)`. Giữ export `DialogueSpeakerKey` (nay là `string`).
- `speakers: z.array(DialogueSpeakerSchema).min(2).max(30)`.
- `superRefine`, theo thứ tự, mỗi vi phạm một issue có `path` rõ:
  1. key duy nhất: "Khoá người nói bị trùng" (`["speakers"]`).
  2. tên duy nhất không phân biệt hoa thường: "Các người nói phải khác tên".
  3. voice duy nhất: "Các người nói phải khác giọng".
  4. id lượt duy nhất (giữ nguyên).
  5. **mới**: với mỗi lượt, `turn.speaker` phải thuộc tập key: "Lượt N tham chiếu người nói không tồn tại", `path: ["turns", i, "speaker"]`. Bỏ qua kiểm này là lỗ hổng dữ liệu, vì trước đây enum A/B đã gánh việc đó.
- Bỏ kiểm "A rồi B".
- `dialogueSpeechKey` giữ nguyên công thức (`[key, voice]` + `[speaker, text, style]`). Không sắp lại `speakers` theo key: UI không cho đổi thứ tự khai báo, và tập cũ A/B giữ nguyên hash.
- Thêm hàm thuần `dialogueUsedSpeakerKeys(dialogue): string[]` (khoá xuất hiện trong lượt, theo thứ tự xuất hiện): dùng ở Phase 2 để chọn đường TTS và ở Phase 4 để chặn xoá.

## Test (`packages/shared`)
Tìm test hiện có của dialogue bằng grep `DialogueSchema`; thêm cạnh đó:
- dữ liệu cũ `A/B` 2 người vẫn parse được (hồi quy).
- 30 người hợp lệ; 31 người bị từ chối; 1 người bị từ chối.
- key trùng, tên trùng khác hoa thường, voice trùng: mỗi cái một issue đúng thông điệp.
- lượt có `speaker` không có trong `speakers`: bị từ chối với path `["turns", i, "speaker"]`.
- `dialogueUsedSpeakerKeys`: thứ tự xuất hiện, không trùng.

## Test cũ phải sửa (đã grep)
- `apps/api/tests/ai-assist/dialogue-speech.test.ts:16-19`: dùng `voices[0]`, `voices[1]`; kiểm `voices` còn lấy từ `DIALOGUE_VOICES`.
- `apps/api/tests/podcast-narration.service.test.ts:236`: ca "hai giọng trùng nhau" vẫn đúng; kiểm thông điệp nếu có.
- `apps/web/.../dialogueState.test.ts:36`: thông điệp đổi thành "Các người nói phải khác giọng".

## Check
`bun test` trong `packages/shared`; typecheck toàn monorepo vì `DialogueSpeakerKey` đổi từ union sang `string` (record `Record<DialogueSpeakerKey,...>` ở `DialogueScriptStep.tsx:20` và `DialogueRecordingSheet.tsx:10` sẽ báo lỗi: đó là điểm dẫn sang Phase 4).
