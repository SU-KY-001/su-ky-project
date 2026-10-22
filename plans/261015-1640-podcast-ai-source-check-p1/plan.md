---
title: "Podcast AI trợ lý: P1 AI rà kịch bản"
description: "Thẻ AI rà kịch bản trong tab Trợ lý AI: chạy theo block, SSE realtime, danh sách cảnh báo mềm, mod tự mở từng mục"
status: pending
priority: P1
effort: 8 phases (0-7); P1 = phase 0-5, soạn thảo = phase 6, tình trạng tập/duyệt = phase 7
mode: fast
branch: dev
created: 2026-10-15
updated: 2026-10-22
blockedBy: []
blocks: []
---

# P1: AI rà kịch bản (AI trợ lý, cảnh báo mềm)

Tên thư mục giữ `...-source-check-p1` cho khỏi vỡ liên kết; chức năng **không còn là kiểm tra nguồn** (đổi tên 2026-10-22).
Nguồn thiết kế: `plans/reports/brainstorm-261015-podcast-ai-script-assistant.md` (đọc mục "Cập nhật 2026-10-22" trước). Nghiên cứu nền: `plans/reports/research-261022-ai-stability-patterns.md`.
Cross-plan scan: `plans/` chưa có plan nào khác, không có `blockedBy`/`blocks`. Mode `fast`: codebase đã đọc, thiết kế đã duyệt nhiều vòng.

**Nguồn duy nhất cho P2-P4 và các quyết định hoãn:** cùng báo cáo trên. Phase của P2-P4 phải lập plan riêng từ báo cáo, không tự đổi hợp đồng API/dữ liệu mà không cập nhật báo cáo trước.

## Tư duy (người dùng đã quyết 2026-10-22)

Kể chuyện trước; độ chính xác và nguồn là thứ yếu. AI là **trợ lý**: mod viết và quyết. Nguồn chỉ gắn vào **series**, không bao giờ vào tập. AI đưa cảnh báo mềm "AI nghi ngờ, chưa xác minh", không bao giờ "đã kiểm tra/đã xác minh". Hệ thống chỉ ghi những hành động nó thấy được; không ép thứ nó không kiểm soát được.

**Cập nhật cuối ngày 2026-10-22:** hướng "không kiểm trích dẫn/evidence" của đợt đầu đã bị thay. Người dùng chọn **AI rà theo nguồn bằng phiên agent có công cụ** (`spec-source-agent.md`): câu trích đã kiểm bằng code, nhưng sự thật vẫn là "AI nghi ngờ, chưa xác minh". Không có claim register, không có gate Fact QA theo nguồn (vẫn ngoài phạm vi). Phần ổn định hệ thống (SSE, heartbeat, CAS, idempotency, retry một tầng, bulkhead, redact log) vẫn áp dụng nguyên.

## Phạm vi P1

Làm: một chức năng **AI rà kịch bản** (`SCRIPT_REVIEW`) end-to-end: DB, API, SSE, UI, test. Cảnh báo mềm của lần triển khai đầu chỉ có `FACT_DOUBT`: đối chiếu với trang nguồn của series, có câu trích đã kiểm. `READABILITY` (khó đọc thành tiếng, mạch lủng củng) hoãn (xem "Quyết định mở").
Không làm (để P2+): rà lặp ý xa toàn cục (hai tầng tóm tắt, xem báo cáo), Ngôi thứ nhất, **job tự động trích chữ PDF lúc upload và kho trang Postgres** (lần đầu nạp trang tay vào SQLite), queue/pg-boss cho check, pub/sub đa instance, sửa Tiptap thêm block ID.
Enum `AiCheckKind` chỉ có `SCRIPT_REVIEW` (thêm giá trị sau bằng `ALTER TYPE ... ADD VALUE`).

## Quyết định đã chốt

- **Provider:** Pi qua env (`PI_PROVIDER`, `PI_MODEL`, `PI_THINKING_LEVEL`; id ghim, không `-latest`). Đã đo spike trên `gpt-5.6-luna` low (OpenAI OAuth) và Gemini 3.5 Flash Lite. Gemini từng trả chuỗi rỗng bị runner che thành "invalid JSON": sửa ở phase 0. Chưa chốt model cho sản phẩm (xem "Quyết định mở").
- **Quy tắc prompt:** prompt v3 của spike (`apps/api/spike-source-check/prompts/v3.txt`), chuyển thành `prompts/script-review.prompt.ts`. Nguồn không nằm trong prompt mà do agent tự tra bằng công cụ. Series không có nguồn đọc được: xem "Quyết định mở".
- **Mỗi chức năng AI = 5 phần:** input builder, system prompt, schema zod, validator, bộ ca vàng. Validator ở P1 chỉ có tính **heuristic** (xem phase 2); prompt chỉ giảm tỷ lệ sai.
- **Item:** `blockRef, blockHash, kind (FACT_DOUBT; READABILITY hoãn), severity, basis (CONTRADICTED|NOT_FOUND), message, suggestion, evidence [{sourceId,page,quote}], status (OPEN|REVIEWED), appliedAt?`. `suggestion` (toàn bộ văn bản mới của block) **sinh trong cùng phiên rà** và chỉ giữ khi `CONTRADICTED` đã được xác nhận bằng câu trích hợp lệ. `REVIEWED` = mod bấm Hoàn tất (không biết mod có sửa không). `appliedAt` chỉ được đặt khi mod bấm "Áp dụng đề xuất", việc hệ thống tự thực hiện.
- **Input chạy:** `{ kind, scope: ALL|SELECTION, blocks[{ref,text,hash}], note? }`; `note` là ghi chú tự do cho AI. Không có "mức nghiêm khắc".
- Route: `/api/studio/episodes/:id/ai-checks...`. Module `apps/api/src/modules/ai-assist` mount vào `/api/studio` như `studioQuizRoute`.
- Rate limit: policy `ai_check` cho POST tạo check. Idempotency dùng middleware `idempotency()` đã có. Env chỉ cho hạ tầng chạy nền.
- Dữ liệu: `AiCheck` + `AiCheckItem`; run là nguồn sự thật, SSE chỉ là bản phát lại.
- `seq` do **một writer tuần tự mỗi check** cấp (counter trong process).
- SSE: subscribe live trước, rồi đọc DB `seq > Last-Event-ID`, rồi xả buffer. Heartbeat là comment, không nén. Không LISTEN/NOTIFY.
- Neo vị trí: client gửi `blocks[{ref,text,hash}]`; **Áp dụng** so hash, lệch thì từ chối "đoạn đã đổi, chạy lại", không bao giờ ghi đè chữ của mod. Không sửa Tiptap.
- Chạy nền trong process, `AbortController`, timeout env. Heartbeat + reaper (pg-boss, `core/jobs/maintenance-jobs.ts`) đánh dấu check kẹt `FAILED` (`INTERRUPTED`); chuyển trạng thái cuối bằng CAS.
- Một tầng retry (Pi). Lỗi 400/402/403 không retry. Bulkhead: semaphore toàn cục số lời gọi model.
- **Đơn vị gọi model = một phiên agent cho một lô block liền kề** (`AI_ASSIST_BATCH_BLOCKS`), không phải chunk và không phải một block một call. Phiên có hai công cụ chỉ đọc do backend sở hữu: `search_source`, `read_pages` (allowlist theo nguồn của series). Nguồn đặc tả: `spec-source-agent.md`. Thay `spec-prompts-review.md` mục A3, B1 (chunk), B2 (`<sources>`), B4 (`span`).
- **Kiểm câu trích bằng code:** mỗi `evidence.quote` phải nằm nguyên văn trên trang agent đã mở (`quote-check.ts`, mang từ spike); `CONTRADICTED` không còn câu trích hợp lệ thì hạ thành `NOT_FOUND`.
- `hashBlockText` nằm ở `@repo/shared`; server tính lại và từ chối hash sai. **Hash không phải danh tính block.** `ref = b{docIndex}` tuyệt đối trên toàn tài liệu; item lưu thêm `blockPrevHash`, `blockDup`. Áp dụng chỉ nhận đích khi vị trí + hash + hash block trước khớp, hoặc dời chỗ khi `blockDup == 1` và đúng một block khớp; mọi trường hợp mơ hồ là `conflict` (spec-prompts-review B1).
- Cờ khẩn cấp `ai_assist.enabled` (SystemConfig); policy rate limit tách `ai_check` (rà kịch bản) và `ai_generate` (soạn thảo).
- Thời lượng đo bằng **số từ** / `script.words_per_minute` (không phải "850 ký tự/phút").

## Phase

| # | File | Nội dung | Phụ thuộc |
|---|---|---|---|
| 0 | [phase-00](phase-00-engine-hardening.md) | Sửa ai-engine (Pi): lỗi provider, usage, hủy, redact log, retry một tầng, thinking theo lệnh gọi, sẵn sàng AI | không |
| 1 | [phase-01](phase-01-db-shared-ratelimit.md) | Migration, Prisma, zod dùng chung, policy `ai_check` | không |
| 2 | [phase-02](phase-02-api-runner.md) | Module `ai-assist`: kho trang nguồn (SQLite tạm), công cụ chỉ đọc, phiên agent theo lô, kiểm câu trích, REST, reaper, wiring, OpenAPI | 0, 1 |
| 3 | [phase-03](phase-03-sse.md) | Event hub, SSE `seq`, đối chiếu DB, heartbeat | 2 |
| 4 | [phase-04](phase-04-web.md) | Panel thay `ScriptAssistantMock`: danh sách + chi tiết, Áp dụng, hook SSE | 2, 3 |
| 5 | [phase-05](phase-05-tests-docs-smoke.md) | Test, ca vàng, tài liệu, smoke thật | 0-4 |
| 6 | [phase-06](phase-06-compose.md) | Soạn thảo: dàn ý, viết phần, viết lại, góc kể (đồng bộ, không lưu DB trừ góc kể) | 0, 2, 4 |
| 7 | [phase-07](phase-07-readiness-review.md) | Tình trạng tập (checklist ~25 mục), route đọc cho người duyệt, màn duyệt hai cột | 2 (phần AI) |

**Đặc tả logic chi tiết (đọc trước khi code phase tương ứng):**
- [spec-source-agent.md](spec-source-agent.md): **hướng chạy AI rà kịch bản (phiên agent có công cụ, kho trang nguồn, kiểm câu trích). Thắng khi khác file dưới.**
- [spec-prompts-review.md](spec-prompts-review.md): khung prompt dùng chung, validator `suggestion`, quy tắc `ref/hash/prev/dup` (phần chunk, `<sources>`, `span` đã bị thay, xem đầu file).
- [spec-prompts-compose.md](spec-prompts-compose.md): prompt đầy đủ dàn ý, viết phần, viết lại, giọng văn, góc kể, hợp đồng route.
- [spec-episode-readiness.md](spec-episode-readiness.md): danh mục checklist kiểm duyệt, quy tắc server, route người duyệt.

**Giao diện mod (mockup HTML):** [mockups/index.html](mockups/index.html). Mockup 01 = P1; 02, 03, 06 = phase 6; 05 = phase 7; **04 (giọng đọc AI) chưa có phase** (chờ spike T0 với khóa MiniMax thật). Đặc tả giao diện: `plans/reports/ui-spec-261022-ai-assistant-mod.md`.

## Rủi ro chính và giới hạn trung thực

1. **Câu trích là bảo đảm duy nhất về sự thật:** code chỉ chứng minh "câu trích có nguyên văn trong trang agent đã mở", không chứng minh model hiểu đúng. Số đo spike (bộ ca nhỏ, tự soạn, dao động giữa các lần chạy) ở báo cáo đo. Mọi chữ trên UI vẫn là "AI nghi ngờ, chưa xác minh". "0 cảnh báo" không có nghĩa kịch bản đúng, và `NOT_FOUND` không có nghĩa là sai.
2. **Validator chỉ là heuristic:** chỉ chắc chắn `blockRef` tồn tại và `blockHash` lấy từ dữ liệu gửi đi. Đề xuất sửa không được kiểm đúng sai; heuristic `novel()` phía web (số/tên viết hoa mới) bỏ sót phủ định, đảo chủ ngữ, thêm chữ thường (xem phase 5).
3. **Chi phí và độ trễ:** mỗi **phiên** gọi model nhiều lượt (mỗi lần gọi công cụ là một lượt mới, mang theo các trang đã đọc). Spike: 8-9 lần gọi công cụ, 25-34 giây mỗi lô 3-5 block với `gpt-5.6-luna` low. Chưa đo ở 20 block, chưa đo token. Chốt mặc định `rate_limit.ai_check` và `AI_ASSIST_BATCH_BLOCKS` sau đo.
4. SSE qua `compress()`/`etag()` trong `app.ts`: `bypassEventStreams` đã bọc `etag`; xác nhận `compress` không buffer bằng smoke thật.
5. Độ trễ: 25-34 giây mỗi lô 3-5 block với `gpt-5.6-luna` low (spike); đo lại ở phase 5 với kịch bản 20 block.
6. Pi có thể không chuyển `responseSchema` và chưa thấy `maxOutputTokens` [chưa xác minh]: giữ JSON bằng prompt + zod + 1 lần sửa; `stopReason: length` là lỗi block.
7. Hệ thống không biết mod đã sửa gì ngoài nút "Áp dụng"; `REVIEWED` chỉ nghĩa "đã xem".
8. Dữ liệu kịch bản và nguồn series gửi tới nhà cung cấp AI (Gemini); chưa có cờ phân loại dữ liệu.

## Quy tắc code (theo `~/.claude/CLAUDE.md`)

- Không magic number: hằng số có tên hoặc env/SystemConfig có mặc định.
- Lỗi xử lý có chủ đích hoặc ném lại kèm ngữ cảnh; không nuốt.
- Mọi file mới < 200 dòng; tách theo trách nhiệm. Không động `archive/script-workflow/`.
- Không log nội dung kịch bản, prompt, nguồn, secret; chỉ metadata (id, kind, số block, token, độ trễ, mã lỗi).
- Mọi ô nhập của mod là tự do; preset chỉ điền sẵn (xem phase 4 và ui-spec).

## Tiêu chí nghiệm thu

Xem phase 5. Tóm tắt: cảnh báo hiện dần theo lô block; danh sách dạng checklist, bấm mở chi tiết (giải thích + khối "Nguồn đối chiếu" với câu trích và số trang + đề xuất sửa dạng diff + nút "Áp dụng đề xuất" tùy chọn) với đúng hai nút "Quay lại" và "Hoàn tất"; nhãn "AI nghi ngờ, chưa xác minh"; F5/nối lại SSE không mất không trùng; double-click không tạo 2 check; 409/429/503/404 đúng; không ghi gì vào kịch bản trước khi mod bấm Áp dụng; block đổi sau khi chụp thì Áp dụng từ chối; mọi câu trích hiển thị đều nằm nguyên văn trong trang nguồn đã mở; series không có nguồn đọc được trả 422 `NO_READABLE_SOURCE` với thông báo rõ (mặc định tạm, xem "Quyết định mở").

## Chưa kiểm / Quyết định mở

Đã đọc 2026-10-22 (`content.mappers.ts`, `content.service.ts`, `releases/application/release.mappers.ts`, `release.service.ts`, `release-policy.ts`):
- **Series không nguồn:** `seriesChecklist` (`content.mappers.ts:150-168`) có mục `HAS_SOURCE`; `ContentService.publishSeries` (`content.service.ts:381`) trả 422 `SERIES_NOT_PUBLISHABLE` khi checklist chưa đủ. Tức **series không nguồn không phát hành được** (đã xác minh trên đường `publishSeries`; chưa quét đường publish khác nếu có).
- **Tập:** `episodeChecklist` (`content.mappers.ts:170-188`) chỉ có `BASIC_INFO`, `THIRD_PERSON_SCRIPT`, `THIRD_PERSON_AUDIO`; cảnh báo `SERIES_NOT_PUBLISHED`, `ENTITY_TAGS_UNCONFIRMED`. `release.service.ts` chỉ gọi `publisher.checklistReady` (= `episodeChecklist(...).ready`, `release.mappers.ts:10-13`) và `release-policy.ts` trả `CHECKLIST_INCOMPLETE`; **không có kiểm nguồn ở tập/phát hành tập**.
- Mở: với tư duy "nguồn thứ yếu", có giữ ràng buộc `HAS_SOURCE` khi phát hành series không? Plan này không đổi (app có sẵn, ngoài phạm vi).
- Mở: **góc kể tùy nhập** lưu theo người dùng (`ai_narrative_angles`, thuộc P3) + trang quản lý riêng (mockup 06); trường `guide` (chỉ dẫn cho AI) đưa vào prompt như dữ liệu, tối đa 500 ký tự. Chọn làm mặc định, chờ xác nhận.
- Mở: đề xuất sửa sinh ngay trong lần rà (mặc định đã chọn); đo token/độ trễ có tăng quá mức không ở smoke.
- Chưa kiểm: model có phân biệt "nghi sai" và "không chắc" đủ tốt không; Pi có bỏ qua retry với 403 không (phase 0).
- `HAS_SOURCE` web notice và `insertCitation`/tab Nguồn của editor giữ nguyên, plan này không mở rộng cũng không gỡ.
- Mở: **series không có nguồn đọc được** (URL, PDF scan, chưa nạp trang): mặc định tạm là 422 `NO_READABLE_SOURCE`. Chưa quyết có cho rà từ trí nhớ model (không công cụ) hay không; làm vậy sẽ mất bảo đảm "câu trích có trong trang đã mở".
- Mở: **`READABILITY`** không nằm trong lần triển khai đầu của hướng agent-công cụ (cần đo riêng); giữ giá trị enum để thêm sau.
- Mở: **nạp trang nguồn**: lần đầu làm tay bằng `bun run source-pages:load` (`unpdf` + `bun:sqlite`, không Python) vào SQLite. Job upload tự động (chạy sau khi upload PDF, Postgres + `unaccent`, trạng thái "đọc được / không có chữ") chưa làm. PDF scan chưa có OCR.
- Mở: **tài khoản model cho sản phẩm**: số đo spike dùng `gpt-5.6-luna` qua đăng nhập OAuth cá nhân và Gemini 3.5 Flash Lite qua khóa API. OAuth cá nhân không hợp cho máy chủ dùng chung; cần khóa API chính thức.

## Phát hiện khi đặc tả chi tiết (2026-10-22), cần người quyết

1. **Mod người duyệt không có nội dung để xem** (`ModeratorReviewQueue` chỉ có tiêu đề/ghi chú/nút; route đọc tập giới hạn theo chủ series). Phase 7 thêm route đọc cho người duyệt; đây là việc mới ngoài mock.
2. **Server không kiểm checklist khi Duyệt/Gửi duyệt** (`release.service.ts:231-334`): Duyệt hiện lọt dù thiếu âm thanh, chỉ không tự `READY_TO_PUBLISH`. Mock khóa nút nên server phải khớp: đổi hành vi, chờ xác nhận (`spec-episode-readiness.md` mục 8).
3. **Mockup 02 sai quy đổi thời lượng** ("850 ký tự/phút"): đã sửa sang số từ theo `script.words_per_minute` (150); `UploadedAudioPanel.tsx` đang hardcode 150, nên dùng cùng config.
4. **Đã thay bằng phiên agent có công cụ** (2026-10-22, người dùng quyết): không còn chunk và không còn `<sources>` trong prompt. Mỗi lô block một phiên Pi có hai công cụ chỉ đọc tra kho trang nguồn (tạm: SQLite). Chi tiết ở `spec-source-agent.md`, đo ở `plans/reports/eval-261022-source-check-agent-spike.md`.
5. **Cột mới `AiCheckItem.basis`, `AiCheckItem.evidence`, `AiCheck.toolCalls`, `AiCheck.sourcesUsed`, tùy chọn `EpisodeReview.readinessSnapshot`**: thay đổi schema so với thiết kế cũ. (`span` và `skippedBlocks` đã bỏ cùng chunk; xem `spec-source-agent.md`.)
6. **Ngôn ngữ prompt (Việt hay Anh)** chưa có số liệu: A/B bằng bộ ca vàng ở phase 5 trước khi khóa `PROMPT_VERSION`.
7. **Giọng đọc AI (mockup 04) chưa có phase**; làm sau spike T0.
