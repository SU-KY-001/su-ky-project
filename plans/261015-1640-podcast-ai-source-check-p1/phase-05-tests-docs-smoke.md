# Phase 5: Test, tài liệu, smoke

Phụ thuộc: phase 1-4. Chỉ test logic phức tạp và ranh giới; không test wiring/mock echo.

## Trạng thái hiện tại (2026-10-23) — `completed`

- **Đã hoàn tất theo quyết định người dùng:** toàn bộ phạm vi test, tài liệu vận hành và smoke validation cho P1 rà kịch bản được nghiệm thu `done`.
- **Bằng chứng kỹ thuật:**
  - API test suite: 124 passed, 51 skipped (DB opt-in), 0 failed (299 assertions, 19 test files); API typecheck pass (`tsc --noEmit`).
  - Web test suite: 74 passed, 0 failed (204 assertions, 18 test files); Web typecheck pass (`tsc --noEmit`).
  - Tài liệu kỹ thuật: `PODCAST-AI-BACKEND-NOTES.md` và `README.md` đã cập nhật đầy đủ thông số cấu hình, model, giới hạn heuristic và cơ chế xoay key / PDF extraction.
## Test (bun test, theo quy ước repo)

API:
- `items.test.ts` (validator sau phiên): `blockRef` ngoài lô → bỏ; `evidence` có trang chưa mở hoặc câu trích không nguyên văn → bỏ bằng chứng; `CONTRADICTED` mất hết bằng chứng → `NOT_FOUND`, `suggestion = null`, thông báo đổi; từ cấm; dedupe `(blockRef, kind)` kể cả khác NFC/NFD; trần số mục mỗi block; `suggestion` rỗng/trùng gốc/ngoài tỉ lệ/markdown/số lạ → `null`; `blockHash` lấy từ client; `evidence.sourceId` do server điền (model gửi gì cũng bị ghi đè). `batcher.test.ts`: ranh giới `BATCH_MAX_CHARS`, `BATCH_BLOCKS`, block quá dài vào lô riêng hoặc bị bỏ có báo. `hashBlockText.test.ts` (shared): NFC/khoảng trắng không đổi hash, đổi chữ thì đổi.
- `source-tools.test.ts` (Postgres test thật, mẫu `quiz-integration.test.ts`; chèn `source_pages` nhỏ cho một `Source` thử): tìm có dấu và không dấu ra cùng trang; `read_pages` vượt `MAX_PAGES_PER_READ` bị cắt; `sourceId` ngoài allowlist bị từ chối; ký tự lạ/toán tử tsquery trong truy vấn (`&`, `|`, `!`, `:`, ngoặc, nháy) không phá truy vấn (từ khóa được escape); AND không ra thì rơi sang OR; trang của `version` cũ không bị tìm/đọc; ngân sách công cụ hết thì trả thông báo dừng; **hai nguồn cùng số trang: `read_pages` S1 không đánh dấu S2/tr.N là đã mở**. **Bằng chứng nguồn URL (bắt qua `onToolResult`):** câu trích nguyên văn có trong văn bản bắt từ lần tải đúng `Source.url` của nguồn → giữ (lưu `page = 1`, `page` model khai bất kỳ); câu trích từ lần tải một URL khác → bỏ; không có lần tải nào → bỏ; kết quả `isError` không được ghi; `CONTRADICTED` mất hết bằng chứng URL → `NOT_FOUND`, `suggestion = null`. Test engine: `customTools` và `tools: "WEB"` cùng có trong một phiên; `onToolResult` được gọi cho mọi kết quả công cụ với `text` chưa che và `text` không xuất hiện trong log. `quote-check.test.ts` (đã có 6 ca ở spike): câu trích nguyên văn, bỏ mốc trang/số chú thích, đoạn ghép đúng thứ tự, đoạn đảo thứ tự, "đoạn thật … đoạn ngắn bịa", đoạn dài bịa, câu trích rỗng.
- `check-writer.test.ts`: kết quả block hoàn thành đồng thời vẫn cho `seq` tăng dần, liên tục, không trùng; publish chỉ sau insert.
- `check-stream.test.ts` (repo giả + hub thật): item chèn giữa lúc đọc DB và subscribe không mất; item trùng DB/buffer phát một lần; `Last-Event-ID` cắt đúng; check terminal đóng stream; unsubscribe khi ngắt.
- Dịch vụ/route với DB thật theo mẫu `quiz-integration.test.ts`: 404 episode lạ, 409 chạy đôi, 429 đồng thời, 503 khi `assertAiReady` thất bại, **series không có nguồn `VERIFIED` dùng được (kể cả chỉ có PDF chưa nạp trang) → 422 `NO_READABLE_SOURCE`; có thêm nguồn URL `VERIFIED` → chạy được; nguồn `PENDING` hoặc `verifiedVersion ≠ version` bị bỏ khỏi `sourcesUsed`**, idempotency (hai POST cùng key chỉ một check), PATCH `{status:"REVIEWED"}` idempotent và không đổi về `OPEN`, PATCH `{applied:true}` đặt `appliedAt` một lần, PATCH item của check khác episode → 404, reaper chuyển check quá hạn heartbeat thành `INTERRUPTED` và CAS không ghi đè check đã `SUCCEEDED`. Runner dùng `runStructuredAgent` giả (inject qua tham số, phát lại chuỗi gọi công cụ đã ghi) để không gọi model thật.
- Bộ ca vàng `golden/script-review.golden.ts`: ca của spike (`eval-cases.ts`: đổi tên người, sai năm, sai nơi, số chữ so với số, họ nhường ngôi, câu tiêm chỉ dẫn, câu cảm xúc, và `d3`/`d4` lệch mốc/đúng) cộng ca compose ở `spec-prompts-compose.md` mục 8 (phase 6). Test chạy **không cần model** bằng chuỗi gọi công cụ ghi sẵn (phiên giả phát lại) để khóa orchestration và validator; chạy model thật chỉ khi `LIVE_LLM=1` (không chạy trong CI), kiểm **bất biến** (câu trích hợp lệ, không bịa trang, khối đúng không bị báo `CONTRADICTED`), không so khớp văn bản chính xác. Chạy lại mỗi khi đổi prompt hoặc model.

Web:
- `blockRefs.test.ts`: `ref` tuyệt đối khi `SELECTION` bắt đầu giữa tài liệu (không bị đánh số lại từ 0); hash đổi khi sửa nội dung; `prev`/`dup` đúng. `locateBlock` / `replaceBlockText` (mỗi ca khẳng định văn bản **không đổi** khi `conflict`): (a) không đổi gì → `target`; (b) **hai đoạn trùng nội dung** X ở chỉ số 5 và 6, đích là 6 và bị sửa → `conflict`, đoạn X còn lại **không bị đụng**; (c) cùng bố cục, đích là 6, **xóa đoạn 5** → X dịch lên chỉ số 5 nhưng hash block liền trước đổi (từ X sang đoạn 4) → `conflict`, không áp dụng lên đoạn X còn lại; (c') đích là 5, xóa đoạn 5 → X (cũ 6) lên chỉ số 5 với cùng đoạn liền trước: coi là `target` (nội dung và vị trí giống hệt; rủi ro còn lại đã ghi ở spec B1, ghi trong test để khóa hành vi); (d) đích bị xóa, `dup = 1`, không còn bản nào → `conflict`; (e) `dup = 1`, mod chèn đoạn phía trên → `target` đã dời, đúng đoạn; (f) `dup = 1` nhưng giờ có hai bản khớp → `conflict`; (g) `dup > 1` và đích dịch chỗ → `conflict` (không dời sang bản trùng); (h) check chụp `SELECTION` từ block 40 → áp dụng đúng block 40, không phải block 0.
- `wordDiff.test.ts`: thêm/bớt/không đổi, tiếng Việt có dấu.
- `novelHint.test.ts`: số mới và từ viết hoa mới được báo; không báo khi đã có trong gốc.

### Giới hạn heuristic phải ghi lại (test không chứng minh được, ghi README)

- `novelHint`/`novel()` chỉ bắt **số mới** và **từ viết hoa mới**. Nó **bỏ sót**: phủ định ("thắng" → "không thắng"), đảo chủ ngữ/tân ngữ, thêm chữ thường (địa danh/ chức danh viết thường, "vua" → "tướng"), đổi quan hệ nhân quả. Vì vậy nó là **cảnh báo mềm**, không phải kiểm chứng; card/đề xuất vẫn cho chọn.
- Validator server chỉ đảm bảo cấu trúc (`blockRef`, `blockHash`, trần, dedupe). Không đảm bảo đề xuất đúng, không đảm bảo cảnh báo đúng.
- `FACT_DOUBT` vẫn do model quyết: câu trích đã kiểm (PDF và URL) chỉ chứng minh "có nguyên văn trong nội dung nguồn đã mở/đã tải", không chứng minh model hiểu đúng. Có dương tính giả và âm tính giả; số đo spike (bộ ca nhỏ, tự soạn, dao động giữa các lần chạy, **đo trên SQLite FTS5, chỉ PDF, chưa đo trên Postgres**) ở `plans/reports/eval-261022-source-check-agent-spike.md`.
- `REVIEWED` chỉ là "mod đã xem"; hệ thống không biết mod có sửa đoạn hay không ngoài `appliedAt`.

Không viết test cho: nhãn UI, việc route gọi service, giá trị mặc định env.

## Tài liệu

- `.env.example` và README (api): các biến `AI_ASSIST_*` (gồm `AI_ASSIST_BATCH_BLOCKS`, `AI_ASSIST_MAX_TOOL_CALLS`; **không có `AI_ASSIST_SOURCE_DB_PATH`**, đã bỏ vì kho trang là Postgres) và `PI_*` kèm ý nghĩa, mặc định; id model ghim, không dùng `-latest`; cách nạp trang nguồn PDF vào Postgres bằng `bun run source-pages:load -- --pdf <file> --source-id <id>` (không có `--db`; nạp lại thì thay trang của `(sourceId, version)`); điều kiện nguồn được rà (`VERIFIED`, `verifiedVersion = version`; PDF cần trang đã nạp, URL dùng công cụ web); ghi rõ OAuth cá nhân không dùng cho máy chủ.
- README/docs: policy `rate_limit.ai_check`, cách admin chỉnh, mặc định chốt sau đo; mục "Giới hạn" như trên.
- Cập nhật `docs/PODCAST-AI-BACKEND-NOTES.md`: thay thiết kế `script-analysis`/`script-suggestions` bằng bộ route `ai-checks` + hai bảng; nguyên tắc còn đúng: AI không tự sửa tài liệu, mod quyết; nguồn gắn series, không gắn tập.
- ADR ngắn (`docs/adr/` nếu có, nếu không thì mục quyết định trong notes): chạy nền trong process + `seq` do writer cấp + SSE `Last-Event-ID` + reaper heartbeat + một tầng retry, "trần đã biết" (một instance, không NOTIFY, không queue cho check), kiến trúc đã cân nhắc/hoãn/bác ở `research-261022-ai-stability-patterns.md`; quyết định "kể chuyện trước, nguồn thứ yếu"; và quyết định 2026-10-22 đổi sang phiên agent có công cụ tra kho trang nguồn với câu trích được code kiểm (`spec-source-agent.md`), thay hướng nhét `<sources>` vào prompt.

## Smoke (bắt buộc trước khi báo xong)

1. Chạy API + web, đăng nhập mod, mở episode; thử **series có nguồn PDF `VERIFIED` đã nạp trang vào `source_pages`** (chạy được), **series chỉ có PDF chưa nạp trang hoặc không có nguồn `VERIFIED` dùng được** (422 `NO_READABLE_SOURCE` hiển thị rõ), và series có thêm nguồn URL `VERIFIED` (chạy được dù PDF chưa nạp).
2. Kịch bản thật vài block: bấm AI rà kịch bản (có ghi chú tự do); quan sát "AI đang chạy…", tiến độ, cảnh báo hiện dần; DevTools: `text/event-stream` không bị `compress` buffer.
3. Mở từng cảnh báo: chi tiết có giải thích + diff; **Quay lại** không đổi trạng thái; **Hoàn tất** đổi thành "đã xem" và về danh sách.
4. F5 giữa chừng: danh sách mở lại đúng, không trùng, giữ trạng thái đã xem/đã áp dụng; tắt/mở mạng: nối lại không mất.
5. **Áp dụng đề xuất** (thành công; Ctrl+Z hoàn tác); tạo xung đột bằng cách sửa block trước khi Áp dụng → từ chối "Đoạn đã đổi, chạy lại", chữ của mod giữ nguyên. Hủy khi đang chạy.
6. Double-click Chạy: một check. Chạy lại ngay: 409 hiển thị rõ. Vượt hạn mức: 429.
7. AI chưa sẵn sàng (xóa khóa API/bỏ cấu hình provider): 503, API vẫn sống. Khóa sai: check `FAILED` nhanh `AI_PROVIDER_AUTH`, không treo ~30 giây.
8. **Đo:** tổng thời gian, độ trễ tới cảnh báo đầu, số lần gọi công cụ, token vào/ra cho kịch bản 5 và 20 block trên series có nguồn PDF nạp vào Postgres `source_pages`; chốt `rate_limit.ai_check`, `AI_ASSIST_BATCH_BLOCKS`, `AI_ASSIST_MAX_TOOL_CALLS`, `AI_ASSIST_BLOCK_CONCURRENCY`, `AI_ASSIST_GLOBAL_MODEL_CONCURRENCY`; ghi README. **Chạy lại bộ ca đo của spike trên xếp hạng Postgres (`ts_rank_cd`) trước khi khóa prompt và mặc định**: các số 19/24, 21/24, 0 báo nhầm đo bằng SQLite FTS5 bm25, không mặc nhiên đúng với Postgres. Dùng lại bộ ca của spike (`apps/api/spike-source-check/eval.ts`, ca ở `eval-cases.ts`, báo cáo `plans/reports/eval-261022-source-check-agent-spike.md`; nạp cùng PDF vào Postgres bằng `source-pages:load`) và thêm bộ ca **mới lấy từ PDF thật của series, chưa dùng để chỉnh prompt**; đo tỷ lệ bắt được khối sai và tỷ lệ báo nhầm.
9. **Smoke nguồn URL:** thêm vào series một nguồn URL `VERIFIED` (`verifiedVersion = version`, có `url`) bên cạnh nguồn PDF; chạy check và xác nhận phiên dùng được cả công cụ web lẫn `search_source`/`read_pages` trong cùng một phiên (`toolCalls > 0`, `sourcesUsed` có cả hai), và một mục `CONTRADICTED` từ nguồn URL có `evidence` `{ sourceId, page: 1, quote }` với `quote` nguyên văn trong nội dung trang đó (mở URL đối chiếu bằng tay). Ghi nhận rủi ro đã nhận duy nhất: công cụ web tải được mọi URL (ghi README).
10. Log: không có nội dung kịch bản, nguồn, prompt hay secret.

## Dọn dẹp

Xóa script smoke tạm, dữ liệu thử; không `TODO`/code chết; không còn tham chiếu `ScriptAssistantMock`.

## Done khi

Test đạt, `check-types` api/web/shared sạch, smoke 1-10 đạt hoặc ghi rõ mục nào không chạy được và vì sao, đo lại trên Postgres xong trước khi chốt prompt/mặc định, tài liệu cập nhật.
