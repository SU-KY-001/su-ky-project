# Phase 5: Tài liệu, CHANGELOG, dữ liệu mẫu demo

Phụ thuộc: Phase 1-4 xong.

## Việc
| File | Việc |
|---|---|
| `apps/api/CHANGELOG.md` | Mục **ADDITIVE** mới (ngày làm): `dialogue.speakers` nay nhận 2..30 người, `key` chuỗi chữ-số tối đa 8 ký tự; `turn.speaker` phải thuộc danh sách; voice dựng sẵn tăng từ 4 lên 30 (cả `voice` của tập một người kể). Dữ liệu cũ A/B không cần migration. **Lưu ý client:** server từ chối lượt tham chiếu key không tồn tại (trước đây enum A/B che việc này). Env mới `TTS_TURN_GAP_MS` |
| `apps/api/src/routes/docs/paths/ai-assist.ts:250` | Mô tả `createVoiceJob`: thêm "đúng 2 người thực sự nói: một request mỗi chunk; khác 2: từng lượt, `job.total` = số lượt" |
| OpenAPI/Swagger schema `DialogueSchema`, `AiVoiceSchema` | Tự theo `@repo/shared`; chỉ kiểm bản docs sinh ra có liệt kê 30 voice |
| `.env.example` (nếu có) | `TTS_TURN_GAP_MS` |
| `plans/261027-two-person-podcast/plan.md` | Thêm một dòng đầu: "Mở rộng ở `plans/261104-multi-speaker-podcast`" |
| `plans/261104-multi-speaker-podcast/sample-script.txt` | Kịch bản mẫu 30 đoạn cách nhau dòng trống, nội dung lịch sử Đại Việt (chủ đề series hiện có), 4 nhân vật xen kẽ nhưng **không** gắn tên (vì import chỉ dán văn bản). Dùng cho smoke Phase 4 và demo |

## Kịch bản demo (đã chốt với user)
1. Chính: 2 người, dán mẫu, gán, tạo giọng AI (đường cũ). Không phụ thuộc đường mới.
2. Nếu bị hỏi nhiều người: thêm người thứ ba, gán lại vài lượt, cho thấy dòng "AI sẽ gọi từng lượt: N lượt gọi", tạo giọng. Cần `GEMINI_API_KEY` thật và đã smoke trước.
3. Dự phòng: mở sẵn tập đã tạo xong 3 người để không phụ thuộc mạng lúc demo.

## Kiểm tra hoàn tất (checklist rút gọn của CLAUDE.md)
- Không `TODO`/`FIXME`, không số ma thuật (30, 8, 250, 6 đều có tên hằng).
- Input validate ở biên (schema chạy cả ở server).
- Log đường TTS (`path`) có.
- Rollback: thay đổi additive, không migration; tập cũ hợp lệ với schema mới. Quay lại bản cũ thì tập có >2 người hoặc key `S3...` bị server cũ từ chối khi đọc lại (ghi vào CHANGELOG).
- Test: shared, api (dialogue-speech, podcast-narration), web (dialogueState) pass; typecheck sạch.
