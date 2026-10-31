# Phase 1: Schema dùng chung, DB, API lưu/đọc hội thoại

Phụ thuộc: không. Hằng số giới hạn lấy mặc định ở `plan.md` ("Thiết kế dữ liệu").

## Việc
1. **Shared** `packages/shared/src/schemas/content/dialogue.ts`: `DIALOGUE_TAGS`, hằng số giới hạn, `DialogueSpeakerSchema`, `DialogueTurnSchema`, `DialogueSchema` như trong `plan.md`, cộng `refine`: đúng hai speaker khác tên và khác giọng, mỗi `turn.speaker` thuộc `A|B`, `turn.id` duy nhất, tag trong `text` thuộc `DIALOGUE_TAGS`, `|` cân bằng, không có `<` ngoài tag hợp lệ. Hàm thuần `dialogueSpokenText(d)` (bỏ tag và `|`), `dialogueSpeechHash(d)` (JSON chuẩn hoá, xem plan.md) để API và web dùng chung. Export ở `packages/shared/src/index.ts` theo cách các schema cùng thư mục đang export.
2. **DB**: `packages/db/prisma/schema.prisma`, `EpisodeNarration` thêm `dialogue Json? @map("dialogue")`. Migration thêm cột nullable (không backfill, không đổi dữ liệu cũ); rollback = bỏ cột. Chạy theo cách repo tạo migration hiện tại.
3. **Contract**: `packages/shared/src/schemas/content/episode.ts` (body lưu kịch bản, ~dòng 16) thêm `dialogue: DialogueSchema.nullish()`; ràng buộc loại trừ: không gửi đồng thời `scriptDocument` khác null và `dialogue` khác null (422 `VALIDATION_ERROR`). `studio.ts` (~dòng 112) thêm `dialogue: DialogueSchema.nullable()` vào DTO narration.
4. **API** `apps/api/src/modules/content`:
   - `content.service.ts` (~dòng 796-878, hàm lưu script): nhánh `dialogue`: parse lại bằng `DialogueSchema` (lỗi → 422 như nhánh `scriptDocument`), `scriptContent = dialogueSpokenText`, `scriptDocument = null`, bỏ kiểm tra citation (hội thoại không có citation). Chỉ cho `THIRD_PERSON`; `FIRST_PERSON` + `dialogue` → 422 (đã quyết: ngôi thứ nhất không có hội thoại).
   - `content.repository.ts` + `prisma-content.repository.ts` (~dòng 966-982): ghi/đọc `dialogue` (dùng `Prisma.DbNull` như `scriptDocument`).
   - `content.mappers.ts` (~dòng 118-145): map `dialogue` bằng `DialogueSchema.safeParse` (hỏng → `null`, giống `scriptDocument`).
   - Chuyển định dạng: đổi một tập đã có `scriptDocument` thành hội thoại (hoặc ngược lại) phải được người dùng xác nhận ở web (phase 2); API chỉ cần cho phép gửi `dialogue` và `scriptDocument: null` trong một lần lưu, và ngược lại. Không chuyển đổi nội dung tự động.
   - Giữ cơ chế `baseUpdatedAt`/xung đột đang có.
5. **Voice hash** `apps/api/src/modules/ai-assist/voice/speech-text.ts`: `scriptSpeechHash` trả `dialogueSpeechHash` khi narration có `dialogue` (giữ nguyên nhánh cũ). Mở rộng `SpeechNarration` thêm `dialogue: unknown`. Chưa đụng phần TTS (phase 4).

## Test (vitest, theo cấu trúc `apps/api/tests/...` và test của `packages/shared`)
- Schema: hợp lệ; thiếu/thừa speaker; trùng tên; trùng giọng; turn rỗng; tag lạ; `<` lẻ; `|` lẻ; quá giới hạn; id trùng.
- `dialogueSpokenText`, `dialogueSpeechHash`: đổi `note`/`name`/`id`/`readerUserId` không đổi hash; đổi `text`/`style`/`voice`/thứ tự đổi hash.
- Service: lưu hội thoại → `scriptContent` đúng, `scriptDocument` null; gửi cả hai → 422; `FIRST_PERSON` → 422; lưu `scriptDocument` thường vẫn như cũ (hồi quy); `baseUpdatedAt` lệch → xung đột như hiện nay.

## Xong khi
Lưu rồi đọc lại đủ speakers/turns; typecheck và test shared/api pass; không route cũ nào đổi hành vi; migration áp dụng được trên DB trắng và DB có dữ liệu.
