# Phase 6: Soạn thảo (dàn ý, viết phần, viết lại, góc kể)

Phụ thuộc: phase 0 (engine), phase 2 (module `ai-assist`, `model-gate`, config, `assertAiReady`), phase 4 (`blockRefs`, `replaceBlockText` mở rộng). Mockup 02, 03, 06. **Logic và prompt đầy đủ: `spec-prompts-compose.md` (đọc trước).** Chưa làm giọng đọc AI (mockup 04): phụ thuộc T0 (xem cuối).

## Hiện trạng cần biết

- Không có chức năng sinh nội dung nào trong app; mọi lời gọi qua `runStructuredAgent` (phase 0). Compose **không lưu DB** ngoại trừ `ai_narrative_angles`.
- Thời lượng đo bằng từ / `script.words_per_minute` (`spec-prompts-compose.md` mục 0). Sửa `UploadedAudioPanel.tsx` (hardcode 150) dùng cùng nguồn config để mọi ước lượng khớp.
- Editor chỉ có `insertCitation` và (từ phase 4) `getBlocks/replaceBlockText/focusBlock`; cần thêm `insertParagraphs`, `getSelectionRange` (mục Web).

## DB (một bảng)

`ai_narrative_angles` theo `spec-prompts-compose.md` mục 1: `id uuid`, `userId varchar(36)`, `name varchar(60)`, `description varchar(160)`, `guide varchar(500)`, `createdAt`, `updatedAt`; unique `(userId, lower(name))` (index biểu thức, SQL tay trong migration vì Prisma không biểu diễn được); index `(userId)`. Migration chỉ-thêm `20261022xxxxxx_ai_narrative_angles`, rollback = drop bảng (ghi chú đầu file). Góc có sẵn là hằng số trong `ai-assist/angles/builtin-angles.ts` (id `builtin:*`), không seed DB.

## API (`apps/api/src/modules/ai-assist/`)

Thêm vào module có sẵn (cùng layering, mỗi file < 200 dòng):
- `angles/angle.repository.ts`, `angles/angle.service.ts`, `presentation/angle.routes.ts`: CRUD theo mục 1 (409 `ANGLE_NAME_TAKEN` kể cả trùng tên builtin; 404 khi không thuộc mình; giới hạn `AI_ANGLE_MAX_PER_USER` → 422 `ANGLE_LIMIT`).
- `compose/` (mỗi chức năng đủ 5 phần như `script-review`): `input/{outline,draft-section,rewrite}.input.ts`, `prompts/{outline,draft-section,rewrite}.prompt.ts` (+ `tone.ts` bảng preset), `schemas/*.schema.ts`, `validators/{outline,draft,variants}.ts`, `golden/*.golden.ts`.
- `application/compose.service.ts` (đồng bộ: kiểm quyền episode, `assertAiReady`, nạp nguồn series, nạp góc kể, qua `model-gate`, gọi `runStructuredAgent` một lần, validator, trả kết quả). Không retry thêm.
- `presentation/compose.routes.ts`: `POST /episodes/:id/ai/outline`, `/ai/draft-section`, `/ai/rewrite` (`rateLimit("ai_generate")`). `signal = c.req.raw.signal`. Không dùng `idempotency()` (không tạo tài nguyên; lặp lại là chấp nhận được, đã có hạn mức).
- Hạn mức đồng thời: dùng chung `AI_ASSIST_MAX_CONCURRENT_PER_USER` + `model-gate` (đếm trong bộ nhớ theo user cho lời gọi đồng bộ; check chạy nền vẫn đếm bằng DB).

Env mới (mặc định, `core/env.ts` + `.env.example` + README): `AI_ASSIST_CALL_TIMEOUT_MS` (đồng bộ), `AI_REWRITE_MAX_VARIANTS` (10), `AI_ANGLE_MAX_PER_USER` (50), các hằng số prompt có tên trong `compose/constants.ts` (`OUTLINE_*`, `DRAFT_*`, `REWRITE_*`; không có số rời rạc trong code).
`SystemConfig`: `rate_limit.ai_generate` (mặc định `{ limit: 60, windowSeconds: 3600 }`, nhãn "Giới hạn AI soạn thảo"); `RateLimitPolicy`/`RATE_DOC` thêm `ai_generate` (cùng nơi `ai_check`).

Shared zod (`packages/shared`): `CreateOutlineSchema`, `OutlineResponseSchema`, `DraftSectionRequestSchema/ResponseSchema`, `RewriteRequestSchema/ResponseSchema`, `AngleSchema`, `CreateAngleSchema`, `UpdateAngleSchema`; `hashBlockText` (phase 4 chuyển vào shared).

OpenAPI: `routes/docs/paths/ai-assist.ts` mô tả đủ mã lỗi mục 6 của spec.

## Web (`apps/web/src/features/podcast-production/`)

- `compose/composeService.ts`: gọi route + parse schema shared; `AbortController` cho mỗi lời gọi (đóng dialog hủy ngay).
- `compose/useOutline.ts`, `useDraftSections.ts` (điều phối **tuần tự**: phần i cần `previousText` của phần i-1; hiển thị dần; "Viết lại phần này"/"Bỏ"/"Chèn" từng phần), `useRewrite.ts`.
- `compose/outlineState.ts`: trạng thái dàn ý (hàm thuần, có test): thêm/xóa phần và ý, **không có đổi thứ tự** (đã bỏ mũi tên); tính lại `targetWords` khi mod đổi số từ đích hoặc xóa/thêm phần (theo `weight`, phần mới `weight` = trung vị). Lưu `localStorage` khóa `episodeId`, xóa khi chèn xong hoặc đóng có xác nhận. Không tạo bảng.
- `components/DraftWizardDialog.tsx` (4 bước: Đề bài / Dàn ý / Giọng văn / Viết), `AngleList.tsx` (danh sách dọc chọn một, ô tìm khi ≥ 6, link "Tạo góc kể mới"/"Quản lý" mở trang quản lý), `AngleManagePage.tsx` (route riêng, danh sách Của bạn/Có sẵn, form tên/mô tả/hướng dẫn ≤ 500, nhân bản, xóa hai lần bấm, trùng tên chặn), `RewriteToolbar.tsx` (nút nổi cạnh vùng chọn), `RewriteDialog.tsx` (phạm vi → cách viết lại → danh sách bản + diff + radio), `NovelHint.tsx` dùng `novelHint.ts` (phase 4) cho số/tên mới.
- `RichScriptEditor.tsx`: thêm vào handle `insertParagraphs(texts, at)`, `getSelectionRange()` (trả `{ blocks[], expandedToSentence }`), `replaceBlocks(refs/hashes, texts)` (một transaction Tiptap, đối chiếu hash theo quy tắc phase 4). Tôn trọng `SCRIPT_MAX_CHARACTERS`: không đủ chỗ thì từ chối và báo, không cắt.
- `UploadedAudioPanel.tsx`: ước lượng thời lượng đọc `words_per_minute` từ config (hiện hardcode 150).
- Mọi ô nhập tự do theo ui-spec mục 7; trạng thái chờ "AI đang tạo dàn ý…/AI đang viết…/AI đang chạy…" với `aria-busy`; khóa nút khi đang chạy; không dùng "đã kiểm tra/đã xác minh".

## Lỗi hiển thị (theo mã API)

429 kèm `Retry-After`; 502 `AI_BAD_OUTPUT`/`AI_NO_VARIANTS` → "AI chưa viết được, thử đổi chỉ dẫn hoặc thử lại"; 503 `AI_DISABLED` → ẩn tính năng; `AI_PROVIDER_*` → "Dịch vụ AI tạm không dùng được, báo quản trị"; 504 → "AI phản hồi quá lâu, thử lại". `role="alert"`. Series không nguồn không phải lỗi.

## Test

- API (hàm thuần/bảng ca): chuẩn hóa/chia trọng số `targetWords` (tổng đúng, phần dư dồn vào phần lớn nhất); `suggestedSections` biên 3/12; validator dàn ý (số phần ngoài khoảng → lỗi, trùng title, kẹp weight); làm sạch draft (markdown/`[CẦN NGUỒN]`/dòng trống), `lengthStatus` biên ±25%, `novelNumbers`; validator rewrite (trùng gốc, trùng nhau, ngoài tỉ lệ, giữ bản có số lạ kèm `novelNumbers`); `tone.ts` (preset → chỉ dẫn; custom giới hạn); input builder (thoát XML, bỏ thẻ rỗng, nguồn cắt đúng ngân sách).
- API tích hợp (DB thật): CRUD góc kể (trùng tên không phân biệt hoa thường, trùng builtin, giới hạn, quyền chủ sở hữu); route compose: 404 tập lạ, 422 vượt trần/hash lệch, 429, 503 (`assertAiReady`/`ai_assist.enabled=false`); runner giả `runStructuredAgent` qua tham số (không gọi model).
- Ca vàng (mục 8 của spec): offline bắt buộc; live `LIVE_LLM=1`.
- Web: `outlineState` (thêm/xóa, tính lại từ đích), `replaceBlocks` conflict không đổi văn bản, `insertParagraphs` đúng trần ký tự, `useDraftSections` (tuần tự, một phần lỗi không làm mất phần đã xong, hủy khi đóng).

## Smoke

Chạy API+web; series có nguồn và không nguồn; dàn ý 8/12/20 phút (số phần, tổng từ đích); viết đủ các phần (đo thời gian từng phần, độ dài so với đích, `lengthStatus`); xem log không có nội dung; chèn cuối/tại con trỏ, Ctrl+Z; sửa kịch bản rồi Thay bản viết lại → "Đoạn đã đổi"; góc kể: tạo, trùng tên, nhân bản, xóa, dùng trong dàn ý; prompt injection trong `guide` và `instruction`; hủy giữa chừng; `thinking: "low"` vs mặc định (đo token); chốt `rate_limit.ai_generate`.

## Done khi

Ba chức năng chạy đúng hợp đồng, validator và ca vàng đạt, không số rời rạc trong code, mọi lỗi có mã, UI khớp mockup 02/03/06 (không nút lên/xuống), thời lượng quy đổi bằng từ khớp `mapNarration`, test đạt, `check-types` sạch.

## Chưa làm (có lý do)

- **Giọng đọc AI (mockup 04):** cần khóa MiniMax thật, ffmpeg, giọng Việt thứ hai, nhãn pháp lý (`research-261022-minimax-tts-api.md`, T0). Chưa thể đặc tả prod-level khi chưa chạy spike. Hợp đồng đã chừa chỗ: mục `AI_VOICE` trong `spec-episode-readiness.md`.
- Đánh dấu "AI soạn" trong editor (cần extension Tiptap): chỉ đánh dấu trong dialog.
- Rà lặp ý xa toàn cục, trích text PDF/DOC, queue cho compose.
