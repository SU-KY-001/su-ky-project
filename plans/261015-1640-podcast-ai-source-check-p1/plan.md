---
title: "Podcast AI trợ lý: P1 AI rà kịch bản"
description: "Thẻ AI rà kịch bản trong tab Trợ lý AI: chạy theo block, SSE realtime, danh sách cảnh báo mềm, mod tự mở từng mục"
status: in-progress
priority: P1
effort: 8 phases (0-7); P1 = phase 0-5, soạn thảo = phase 6, tình trạng tập/duyệt = phase 7
mode: fast
branch: feat/podcast-ai-script-review
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
Không làm (để P2+): rà lặp ý xa toàn cục (hai tầng tóm tắt, xem báo cáo), Ngôi thứ nhất, **job tự động trích chữ PDF lúc upload** (lần đầu nạp trang tay vào Postgres bằng script), queue/pg-boss cho check, pub/sub đa instance, sửa Tiptap thêm block ID.
Enum `AiCheckKind` chỉ có `SCRIPT_REVIEW` (thêm giá trị sau bằng `ALTER TYPE ... ADD VALUE`).

## Quyết định đã chốt

- **Provider:** Pi qua env (`PI_PROVIDER`, `PI_MODEL`, `PI_THINKING_LEVEL`; id ghim, không `-latest`). Đã đo spike trên `gpt-5.6-luna` low (OpenAI OAuth) và Gemini 3.5 Flash Lite. Gemini từng trả chuỗi rỗng bị runner che thành "invalid JSON": sửa ở phase 0. Chưa chốt model cho sản phẩm (xem "Quyết định mở").
- **Quy tắc prompt:** prompt v3 của spike (`apps/api/spike-source-check/prompts/v3.txt`), chuyển thành `prompts/script-review.prompt.ts`. Nguồn không nằm trong prompt mà do agent tự tra bằng công cụ. Series không có nguồn dùng được: 422 `NO_READABLE_SOURCE` (đã chốt, xem bên dưới).
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
- **Đơn vị gọi model = một phiên agent cho một lô block liền kề** (`AI_ASSIST_BATCH_BLOCKS`), không phải chunk và không phải một block một call. Phiên có hai công cụ chỉ đọc do backend sở hữu cho nguồn PDF: `search_source`, `read_pages` (allowlist theo nguồn của series), cộng công cụ web `pi-web-access` cho nguồn URL. Nguồn đặc tả: `spec-source-agent.md`. Thay `spec-prompts-review.md` mục A3, B1 (chunk), B2 (`<sources>`), B4 (`span`).
- **Kiểm câu trích bằng code, cùng một quy tắc cho PDF và URL:** mỗi `evidence.quote` phải nằm nguyên văn (`quoteInPage`) trong nội dung nguồn agent đã mở: trang đã `read_pages` (PDF), hoặc văn bản đã tải từ **đúng URL đã đăng ký của nguồn đó** trong phiên (URL; `page = 1`). Engine có hook `onToolResult({ toolName, toolCallId, args, text, isError })` gọi cho mọi kết quả công cụ trước khi che nội dung (`text` không bao giờ log); bộ công cụ nguồn ghi `text` của công cụ web (`fetch_content`, `get_search_content`) khóa theo URL từ `args`. `CONTRADICTED` không còn câu trích hợp lệ thì hạ thành `NOT_FOUND`, `suggestion = null`.
- **Kho trang nguồn = Postgres (người dùng chốt 2026-10-22, thay SQLite):** bảng Prisma `source_pages` (`id` uuid, `sourceId` FK `Source` cascade, `version` int = `Source.version` lúc trích chữ, `page` int, `text`, `createdAt`), unique `(sourceId, version, page)`. Tìm toàn văn bằng chỉ mục GIN **biểu thức** `to_tsvector('simple', immutable_unaccent(lower(text)))` (cùng kiểu `sources_title_trgm_idx`; `unaccent`/`pg_trgm`/`immutable_unaccent` đã có từ migration init) và raw SQL không dùng `websearch_to_tsquery` (từ khóa được bọc/escape, thử AND rồi OR; xếp hạng `ts_rank_cd`; đoạn trích `ts_headline`). Env `AI_ASSIST_SOURCE_DB_PATH` **bỏ hẳn**. Script nạp `apps/api/src/scripts/load-source-pages.ts` ghi vào Postgres qua Prisma (`--pdf <file> --source-id <id>`, thay toàn bộ trang của `(sourceId, version)`). Job tự động lúc upload vẫn là việc sau. Spike SQLite (`apps/api/spike-source-check/`) chỉ còn là spike lịch sử.
- **Nguồn nào được rà:** mọi nguồn của series của tập, trộn các loại. Chỉ dùng nguồn `verificationStatus = VERIFIED` và `verifiedVersion = version` (admin gỡ nguồn không dùng được). Nguồn PDF: đọc qua `source_pages` (công cụ `search_source`, `read_pages`). Nguồn URL: dùng `pi-web-access` (0.37.0, đã có trong `apps/api/package.json`; runner `tools: "WEB"`) **cùng phiên** với công cụ tự viết (engine hiện coi `customTools` và `WEB` là một trong hai; cần sửa ở phase 2 hoặc việc nhỏ nối tiếp phase 0).
- **Giới hạn đã nhận (người dùng bảo chưa lo bảo mật):** không có allowlist/bọc URL cho công cụ web; công cụ web có thể tải bất kỳ URL nào (bề mặt rò rỉ/tiêm chỉ dẫn, siết sau). Chỉ rủi ro này được chấp nhận; đúng đắn của bằng chứng thì không được miễn (dòng trên).
- `hashBlockText` nằm ở `@repo/shared`; server tính lại và từ chối hash sai. **Hash không phải danh tính block.** `ref = b{docIndex}` tuyệt đối trên toàn tài liệu; item lưu thêm `blockPrevHash`, `blockDup`. Áp dụng chỉ nhận đích khi vị trí + hash + hash block trước khớp, hoặc dời chỗ khi `blockDup == 1` và đúng một block khớp; mọi trường hợp mơ hồ là `conflict` (spec-prompts-review B1).
- Cờ khẩn cấp `ai_assist.enabled` (SystemConfig); policy rate limit tách `ai_check` (rà kịch bản) và `ai_generate` (soạn thảo).
- Thời lượng đo bằng **số từ** / `script.words_per_minute` (không phải "850 ký tự/phút").

## Phase

| # | File | Nội dung | Phụ thuộc |
|---|---|---|---|
| 0 | [phase-00](phase-00-engine-hardening.md) | Sửa ai-engine (Pi): lỗi provider, usage, hủy, redact log, retry một tầng, thinking theo lệnh gọi, sẵn sàng AI | không |
| 1 | [phase-01](phase-01-db-shared-ratelimit.md) | Migration, Prisma, zod dùng chung, policy `ai_check` | không |
| 2 | [phase-02](phase-02-api-runner.md) | Module `ai-assist`: kho trang nguồn (Postgres `source_pages`), công cụ chỉ đọc + công cụ web trong cùng phiên, phiên agent theo lô, kiểm câu trích PDF, REST, reaper, wiring, OpenAPI | 0, 1 |
| 3 | [phase-03](phase-03-sse.md) | Event hub, SSE `seq`, đối chiếu DB, heartbeat | 2 |
| 4 | [phase-04](phase-04-web.md) | Panel thay `ScriptAssistantMock`: danh sách + chi tiết, Áp dụng, hook SSE | 2, 3 |
| 5 | [phase-05](phase-05-tests-docs-smoke.md) | Test, ca vàng, tài liệu, smoke thật | 0-4 |
| 6 | [phase-06](phase-06-compose.md) | Soạn thảo: dàn ý, viết phần, viết lại, góc kể (đồng bộ, không lưu DB trừ góc kể) | 0, 2, 4 |
| 7 | [phase-07](phase-07-readiness-review.md) | Tình trạng tập (checklist ~25 mục), route đọc cho người duyệt, màn duyệt hai cột | 2 (phần AI) |

## Trạng thái thực thi (2026-10-22)

| Phase | Trạng thái | Thực tế / điều kiện còn lại |
|---|---|---|
| 0 | `completed` | Ai-engine hardening, provider errors, usage, abort, retry, redact log và readiness AI đã triển khai; smoke cơ bản đã chạy. |
| 1 | `completed` | Migration `AiCheck`/`AiCheckItem`, shared schemas và rate limit đã triển khai; typecheck/migration đã kiểm. |
| 2 | `completed` | Module `ai-assist`, Postgres `source_pages`, runner, validator, REST, reaper và wiring đã có; bộ test `ai-assist` đã qua. Smoke model/URL đầy đủ chuyển sang phase 5. |
| 3 | `completed` | SSE route, heartbeat, replay và header đã có. Đã sửa lỗi item `seq = 0` bị mất (`dc532b0`) và cursor rỗng (`8926ec3`). Browser/curl thật đạt; contract test SSE `6 pass`, typecheck API đạt. |
| 4 | `in-progress` | Panel, config dialog, detail, apply/conflict guard và hook SSE đã có. Browser đã kiểm login, editor, danh sách, chi tiết và config; web contract/UI tests `28 pass`, typecheck đạt, có test Apply retry và conflict guard. Chưa smoke browser với dữ liệu thật có `suggestion`, chưa kiểm F5 live trong session này. |
| 5 | `pending` | Chưa hoàn tất golden/integration tests, README/ADR, smoke model thật 5/20 block, đo Postgres và smoke URL/browser đầy đủ. |
| 6 | `pending` | Chưa triển khai compose: outline, draft-section, rewrite và narrative angles. |
| 7 | `in-progress` | Readiness DTO/API/review panel đã có; đã sửa hợp đồng `EpisodeWorkspace.readiness` (`7bfa2b3`). Readiness contract `5 pass`, release service `22 pass`, HTTP route `12 pass`, typecheck API/web/shared đạt. Chưa smoke admin/mod thật và chưa chạy toàn bộ integration DB. |

**Kết luận:** phase 3 đã đóng ở mức implementation + contract/smoke. Phase 0-2 và 3 đã hoàn tất; phase 4 và 7 còn nghiệm thu browser/integration; phase 5 và 6 chưa đóng.

**Blocker hiện tại:** phase 4 cần dữ liệu review có `suggestion` để smoke Apply/conflict/PATCH retry bằng browser. Test component đã bao phủ Apply retry và conflict guard, nhưng chưa thay đổi dữ liệu thật trong dev DB.

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
9. **Đo spike trên SQLite, chưa đo trên Postgres:** 19/24, 21/24 và 0 báo nhầm đo bằng SQLite FTS5 bm25. Xếp hạng `ts_rank_cd` của Postgres khác, nên **phải chạy lại bộ ca đo trên Postgres** trước khi chốt prompt và mặc định (phase 5).
10. **Công cụ web tải được mọi URL:** không có allowlist (người dùng bảo chưa làm bảo mật). Đây là bề mặt rò rỉ dữ liệu và tiêm chỉ dẫn qua nội dung trang, siết sau. Câu trích URL **vẫn được code kiểm nguyên văn** trên nội dung đã tải từ đúng URL đã đăng ký của nguồn (xem dòng "Kiểm câu trích").

## Quy tắc code (theo `~/.claude/CLAUDE.md`)

- Không magic number: hằng số có tên hoặc env/SystemConfig có mặc định.
- Lỗi xử lý có chủ đích hoặc ném lại kèm ngữ cảnh; không nuốt.
- Mọi file mới < 200 dòng; tách theo trách nhiệm. Không động `archive/script-workflow/`.
- Không log nội dung kịch bản, prompt, nguồn, secret; chỉ metadata (id, kind, số block, token, độ trễ, mã lỗi).
- Mọi ô nhập của mod là tự do; preset chỉ điền sẵn (xem phase 4 và ui-spec).

## Tiêu chí nghiệm thu

Xem phase 5. Tóm tắt: cảnh báo hiện dần theo lô block; danh sách dạng checklist, bấm mở chi tiết (giải thích + khối "Nguồn đối chiếu" với câu trích và số trang + đề xuất sửa dạng diff + nút "Áp dụng đề xuất" tùy chọn) với đúng hai nút "Quay lại" và "Hoàn tất"; nhãn "AI nghi ngờ, chưa xác minh"; F5/nối lại SSE không mất không trùng; double-click không tạo 2 check; 409/429/503/404 đúng; không ghi gì vào kịch bản trước khi mod bấm Áp dụng; block đổi sau khi chụp thì Áp dụng từ chối; mọi câu trích hiển thị (PDF và URL) đều nằm nguyên văn trong nội dung nguồn đã mở/đã tải trong phiên; series không có nguồn VERIFIED dùng được trả 422 `NO_READABLE_SOURCE` với thông báo rõ.

## Chưa kiểm / Quyết định mở

Đã đọc 2026-10-22 (`content.mappers.ts`, `content.service.ts`, `releases/application/release.mappers.ts`, `release.service.ts`, `release-policy.ts`):
- **Series không nguồn:** `seriesChecklist` (`content.mappers.ts:150-168`) có mục `HAS_SOURCE`; `ContentService.publishSeries` (`content.service.ts:381`) trả 422 `SERIES_NOT_PUBLISHABLE` khi checklist chưa đủ. Tức **series không nguồn không phát hành được** (đã xác minh trên đường `publishSeries`; chưa quét đường publish khác nếu có).
- **Tập:** `episodeChecklist` (`content.mappers.ts:170-188`) chỉ có `BASIC_INFO`, `THIRD_PERSON_SCRIPT`, `THIRD_PERSON_AUDIO`; cảnh báo `SERIES_NOT_PUBLISHED`, `ENTITY_TAGS_UNCONFIRMED`. `release.service.ts` chỉ gọi `publisher.checklistReady` (= `episodeChecklist(...).ready`, `release.mappers.ts:10-13`) và `release-policy.ts` trả `CHECKLIST_INCOMPLETE`; **không có kiểm nguồn ở tập/phát hành tập**.
- Mở: với tư duy "nguồn thứ yếu", có giữ ràng buộc `HAS_SOURCE` khi phát hành series không? Plan này không đổi (app có sẵn, ngoài phạm vi).
- Mở: **góc kể tùy nhập** lưu theo người dùng (`ai_narrative_angles`, thuộc P3) + trang quản lý riêng (mockup 06); trường `guide` (chỉ dẫn cho AI) đưa vào prompt như dữ liệu, tối đa 500 ký tự. Chọn làm mặc định, chờ xác nhận.
- Mở: đề xuất sửa sinh ngay trong lần rà (mặc định đã chọn); đo token/độ trễ có tăng quá mức không ở smoke.
- Chưa kiểm: model có phân biệt "nghi sai" và "không chắc" đủ tốt không; Pi có bỏ qua retry với 403 không (phase 0).
- `HAS_SOURCE` web notice và `insertCitation`/tab Nguồn của editor giữ nguyên, plan này không mở rộng cũng không gỡ.
- **Đã chốt (2026-10-22):** series không có nguồn dùng được (không có nguồn `VERIFIED` với `verifiedVersion = version`; nguồn PDF chưa nạp trang bị bỏ qua, nguồn URL tính là đọc được) → 422 `NO_READABLE_SOURCE`. Không rà từ trí nhớ model.
- Mở: **`READABILITY`** không nằm trong lần triển khai đầu của hướng agent-công cụ (cần đo riêng); giữ giá trị enum để thêm sau.
- Mở: **nạp trang nguồn**: lần đầu làm tay bằng `bun run source-pages:load` (`unpdf` + Prisma, không Python) vào Postgres `source_pages`. Job upload tự động (chạy sau khi upload PDF, trạng thái "đọc được / không có chữ") chưa làm. PDF scan chưa có OCR.
- Mở: **tài khoản model cho sản phẩm**: số đo spike dùng `gpt-5.6-luna` qua đăng nhập OAuth cá nhân và Gemini 3.5 Flash Lite qua khóa API. OAuth cá nhân không hợp cho máy chủ dùng chung; cần khóa API chính thức.

## Phát hiện khi đặc tả chi tiết (2026-10-22), cần người quyết

1. **Mod người duyệt không có nội dung để xem** (`ModeratorReviewQueue` chỉ có tiêu đề/ghi chú/nút; route đọc tập giới hạn theo chủ series). Phase 7 thêm route đọc cho người duyệt; đây là việc mới ngoài mock.
2. **Server không kiểm checklist khi Duyệt/Gửi duyệt** (`release.service.ts:231-334`): Duyệt hiện lọt dù thiếu âm thanh, chỉ không tự `READY_TO_PUBLISH`. Mock khóa nút nên server phải khớp: đổi hành vi, chờ xác nhận (`spec-episode-readiness.md` mục 8).
3. **Mockup 02 sai quy đổi thời lượng** ("850 ký tự/phút"): đã sửa sang số từ theo `script.words_per_minute` (150); `UploadedAudioPanel.tsx` đang hardcode 150, nên dùng cùng config.
4. **Đã thay bằng phiên agent có công cụ** (2026-10-22, người dùng quyết): không còn chunk và không còn `<sources>` trong prompt. Mỗi lô block một phiên Pi có công cụ chỉ đọc tra kho trang nguồn (Postgres `source_pages`) và công cụ web cho nguồn URL. Chi tiết ở `spec-source-agent.md`, đo ở `plans/reports/eval-261022-source-check-agent-spike.md` (đo trên SQLite, phải đo lại trên Postgres).
5. **Cột mới `AiCheckItem.basis`, `AiCheckItem.evidence`, `AiCheck.toolCalls`, `AiCheck.sourcesUsed`, tùy chọn `EpisodeReview.readinessSnapshot`**: thay đổi schema so với thiết kế cũ. (`span` và `skippedBlocks` đã bỏ cùng chunk; xem `spec-source-agent.md`.)
6. **Ngôn ngữ prompt (Việt hay Anh)** chưa có số liệu: A/B bằng bộ ca vàng ở phase 5 trước khi khóa `PROMPT_VERSION`.
7. **Giọng đọc AI (mockup 04) chưa có phase**; làm sau spike T0.
