# Đặc tả: AI rà theo nguồn bằng phiên agent có công cụ

Ngày 2026-10-22. **Thay thế** hướng cũ "đưa `<sources>` đã cắt vào prompt + gọi model theo chunk, không công cụ" (`spec-prompts-review.md` A3, B1 phần chunk, B2 `<sources>`, B4 `span`). Căn cứ: spike chạy thật `apps/api/spike-source-check/` và số đo ở `plans/reports/eval-261022-source-check-agent-spike.md`. Chỗ nào file này và `spec-prompts-review.md` khác nhau, **file này thắng**.

## 1. Ý chính

Mỗi lần rà mở **một phiên Pi cho một lô block**. Phiên có hai công cụ **chỉ đọc** do mình viết, tra kho trang nguồn của series. Agent tự tra, rồi trả báo cáo đúng schema. Code kiểm lại mọi câu trích: câu trích phải nằm nguyên văn trên trang agent đã mở. Không còn nhét nguồn vào prompt.

Lý do: nguồn lớn (Toàn thư 1334 trang, ~2,5 triệu ký tự) không vừa prompt; nhét một phần cắt cụt thì không đối chiếu được. Spike cho thấy cách này chạy được (kết quả và giới hạn ở báo cáo đo).

## 2. Kho trang nguồn (Postgres `source_pages`)

Giao diện (`SourcePageStore`, một file; bản Postgres là bản duy nhất, cài bằng Prisma + raw SQL, công cụ chỉ phụ thuộc giao diện):

```ts
interface SourcePageStore {
  pageCount(sources: { sourceId: string; version: number }[]): Promise<number>;
  search(sources: { sourceId: string; version: number }[], query: string, limit: number): Promise<{ sourceId: string; page: number; excerpt: string }[]>;
  readPages(sourceId: string, version: number, from: number, to: number): Promise<{ page: number; text: string }[]>;
  hasPages(sourceId: string, version: number): Promise<boolean>;
}
```

Mọi truy vấn lọc theo `(sourceId, version)` với `version` = `Source.version` hiện tại (chỉ nguồn `verifiedVersion = version`, nên không bao giờ đọc trang của bản cũ).

Bảng Prisma `SourcePage` (`@@map("source_pages")`): `id` uuid, `sourceId` FK `Source` `onDelete: Cascade`, `version` int (= `Source.version` lúc trích chữ), `page` int, `text` text, `createdAt`; unique `(sourceId, version, page)`. `sourceId` = `Source.id` của app, nối với `SeriesSource.sourceId`. Chỉ mục toàn văn: GIN **biểu thức** `to_tsvector('simple', immutable_unaccent(lower(text)))` (cùng kiểu `sources_title_trgm_idx`; `unaccent`, `pg_trgm`, `immutable_unaccent` đã có từ migration init), tạo bằng SQL tay trong migration vì Prisma không biểu diễn được chỉ mục biểu thức. Truy vấn raw SQL phải dùng đúng biểu thức đó ở cả `to_tsvector` lẫn `to_tsquery` để chỉ mục được dùng.

- Không còn đường dẫn file: env `AI_ASSIST_SOURCE_DB_PATH` **đã bỏ**. `assertAiReady` không kiểm file kho trang; kho trang là Postgres sẵn có của app.
- **Nạp trang (làm tay, một lần mỗi nguồn):** `bun run source-pages:load -- --pdf <file.pdf> --source-id <Source.id> [--drop-line "<dòng rác lặp>"]` (`apps/api/src/scripts/load-source-pages.ts`; thư viện `unpdf` 1.8.1, MIT, ghim đúng phiên bản; ghi qua Prisma, không thêm phụ thuộc nào khác, không có `--db`). Đọc `Source.version` hiện tại, mỗi trang một dòng `source_pages`, chuẩn hóa NFC, bỏ dòng khớp `--drop-line`; nạp lại cùng `(sourceId, version)` thì xóa rồi chèn lại trong một transaction. Cảnh báo khi hơn 20% trang không có chữ (nhiều khả năng là PDF scan). Số đo nạp trên Toàn thư (1334 trang, 3,8 giây, khớp 1334/1334 với PyMuPDF) là của bản spike SQLite; chạy lại với bản Postgres. **Chưa phải job upload tự động**: job đó (trạng thái đọc được/không) là phase sau.
- PDF scan không có lớp chữ: không có trang nào → nguồn PDF đó bị bỏ qua (xem mục 8).

## 3. Công cụ (backend sở hữu, chỉ đọc, allowlist theo lần chạy)

Mỗi phiên nhận `allowedSourceIds` = các `SeriesSource.sourceId` của **series của tập đó** mà nguồn `VERIFIED` với `verifiedVersion = version`; trong đó nguồn PDF phải có trang trong `source_pages` ứng với `version` đó (`hasPages`), nguồn URL được đọc bằng công cụ web (xem bên dưới). Gán nhãn `S1..Sn` theo thứ tự `sortOrder` (tiêu đề nguồn đi kèm nhãn trong prompt; nguồn URL kèm URL). **Số trang chỉ có nghĩa trong một nguồn**, nên mọi chỗ nhắc trang đều kèm nhãn nguồn; bản spike hiện tại chỉ có một nguồn (`toan-thu`) nên không có nhãn. Prompt v3 phải thêm nhãn nguồn (một dòng trong quy tắc `evidence` và `read_pages`) và **đo lại** với hai nguồn, và trên Postgres, trước khi coi là mặc định. Công cụ PDF không nhận `sourceId` từ model ngoài danh sách này (model không đọc được nguồn series khác). Model không bao giờ viết SQL.

| Công cụ | Tham số | Trả về (có trần) |
|---|---|---|
| `search_source` | `query` (chữ thường) | tối đa `SEARCH_LIMIT` (5) trang PDF trên **tất cả** nguồn PDF được phép, mỗi hit một đoạn trích ngắn (`ts_headline`) kèm nhãn nguồn và số trang (`[S1] tr.172: ...`). Từ khóa được tách, escape và bọc từng từ (không tiêm cú pháp tsquery, không dùng `websearch_to_tsquery`), thử AND rồi OR, xếp hạng `ts_rank_cd` |
| `read_pages` | `source` (nhãn `S1`...), `from`, `to` (nguyên dương) | văn bản đầy đủ tối đa `MAX_PAGES_PER_READ` (3) trang của nguồn đó |

- Ngân sách `AI_ASSIST_MAX_TOOL_CALLS` mỗi phiên (mặc định 14, theo spike); vượt thì công cụ trả "hết ngân sách, hãy trả lời". Mỗi phiên giữ `readPages: Set<string>` khóa `"${sourceId}:${page}"` (không chỉ số trang, vì hai nguồn có thể cùng số trang; để kiểm câu trích) và nhật ký công cụ (số lần, cặp đã mở; **không** log nội dung).
- Công cụ đi qua `runStructuredAgent({ customTools })`; nguồn URL dùng thêm công cụ web `pi-web-access` (`tools: "WEB"`) **trong cùng phiên**. Runner hiện coi `customTools` và `WEB` là một trong hai, cần sửa engine để chạy cả hai (tên công cụ vẫn là allowlist, mặc định vẫn là không công cụ). Engine thêm hook `onToolResult({ toolName, toolCallId, args, text, isError })`, gọi cho mọi kết quả công cụ trước khi che nội dung; bộ công cụ nguồn ghi lại `text` của công cụ web (`fetch_content`, `get_search_content`) khóa theo URL từ `args` để kiểm câu trích URL (mục 6). Công cụ web không bị bọc allowlist URL (người dùng bảo chưa lo bảo mật): agent tải được mọi URL, rủi ro đã nhận, siết sau (mục 10).

## 4. Phiên rà và lô block

- Một phiên mỗi **lô** `AI_ASSIST_BATCH_BLOCKS` block liền kề (mặc định 6; spike chạy 2-5 block mỗi phiên, **chưa đo ở 20 block**), tối đa `AI_ASSIST_BATCH_MAX_CHARS` ký tự (mặc định 6000; spike giới hạn 1500 ký tự mỗi block). Lô chạy song song `AI_ASSIST_BLOCK_CONCURRENCY`, mỗi phiên qua `model-gate`. Thay cho chunk/`chunker.ts` cũ (không còn `contextBefore/After`, `skippedBlocks`).
- Timeout cả phiên `AI_ASSIST_TIMEOUT_MS` (spike: 150 giây, đo thật 25-34 giây với `gpt-5.6-luna` low và 26-69 giây với Gemini 3.5 Flash Lite). Hủy bằng `AbortController`; hiện tại Pi chưa nhận `signal` từ spike, phải kiểm ở phase 0.
- Lỗi provider trả chuỗi rỗng bị che thành "invalid JSON" (đã gặp ở spike): phase 0 phân loại; retry có backoff là **một** tầng, không lồng.
- Block của lô vẫn có `ref = b{docIndex}`, `hash`, `prev`, `dup` như cũ (neo vị trí khi Áp dụng giữ nguyên).

## 5. Đầu ra (schema)

Mỗi mục: `blockRef`, `kind` (`FACT_DOUBT`), `severity` (`LOW|MEDIUM|HIGH`), `basis` (`CONTRADICTED|NOT_FOUND`), `message` (≤ 400 ký tự, tiếng Việt, giọng mềm), `suggestion` (toàn bộ block đã sửa hoặc `null`), `evidence` (≤ 3 phần tử). Model cung cấp `{ source, page, quote }` với `source` là nhãn `S1`, `S2`... (xem mục 3); **server** đổi nhãn thành `sourceId` thật và lưu `{ sourceId, page, quote }`. Nhãn không có trong allowlist của phiên thì bỏ bằng chứng đó.

- `CONTRADICTED`: một trang agent đã mở bằng `read_pages` nói khác (người, nơi, năm, số). Phải kèm câu trích hợp lệ.
- `NOT_FOUND`: tra vài lần không thấy gì. **Không có nghĩa là sai**; `severity = LOW`, `evidence = []`, `suggestion = null`.
- Claim nguồn xác nhận, hoặc agent không kiểm được: **không báo**.

## 6. Kiểm câu trích bằng code (`quote-check.ts`, mang nguyên từ spike)

`quoteInPage(quote, pageText)` đúng khi mọi đoạn của câu trích (tách bằng `...` hoặc `…`) nằm **nguyên văn** trên trang, đúng thứ tự, sau khi bỏ mốc trang kiểu `[19b]` và số chú thích dính chữ (`Nguyệt533`); **một đoạn không rỗng ngắn hơn 12 ký tự làm cả câu trích bị loại** (chặn "đoạn thật … từ bịa"). Có test sẵn (`quote-check.test.ts`, 6 ca).

Sau phiên, với mỗi mục:
1. `blockRef` phải thuộc lô, không thì bỏ.
2. Một câu trích chỉ được nhận khi cặp `(sourceId, page)` của nó nằm trong `readPages` của phiên **và** `quoteInPage(quote, văn bản của đúng cặp đó)` đúng. Kiểm cùng cặp, không kiểm "trang số N của nguồn nào cũng được".
3. `CONTRADICTED` mà không còn câu trích hợp lệ → hạ thành `NOT_FOUND`, `suggestion = null`, `message` thay bằng "AI nghi ngờ đoạn này khác nguồn nhưng không dẫn được câu nguồn nguyên văn, nên hệ thống chưa xác nhận (AI nhắc tr. N). AI nghi ngờ, chưa xác minh."
4. `suggestion` chỉ giữ khi mục là `CONTRADICTED` đã xác nhận. Các kiểm `suggestion` khác ở `spec-prompts-review.md` B5 (số lạ, markdown, trùng gốc) vẫn áp dụng.
5. Dedupe theo `(blockRef, kind)`; số mục tối đa mỗi block theo B5.

Đây là bảo đảm duy nhất của hệ thống về sự thật: "câu trích có trong nội dung nguồn đã mở/đã tải". Hệ thống **không** chứng minh model hiểu đúng câu đó. Quy tắc này **như nhau cho PDF và URL**.

**Nguồn URL:** bằng chứng là `{ sourceId, page, quote }` với `page = 1` (cả tài liệu; mọi giá trị `page` model khai cho nguồn URL đều nhận và server ghi `1`). Chỉ nhận khi `quoteInPage(quote, text)` đúng với `text` là nội dung đã **bắt** từ một lần tải **đúng URL đã đăng ký của nguồn đó** (`Source.url`) trong phiên này. Câu trích có trong lần tải một URL khác, hoặc phiên không tải URL đó, thì bỏ bằng chứng. Mục `CONTRADICTED` mất hết bằng chứng hạ theo bước 3 như PDF (`NOT_FOUND`, `suggestion = null`, cùng `message`). Không có nhãn "chưa kiểm câu trích", không ngoại lệ. Cơ chế bắt: engine có hook `onToolResult({ toolName, toolCallId, args, text, isError })` trong `runStructuredAgent`, gọi cho **mọi** kết quả công cụ **trước khi che nội dung** (`text` không bao giờ được log); bộ công cụ nguồn ghi lại `text` do công cụ web của `pi-web-access` (`fetch_content`, `get_search_content`) trả về, khóa theo URL lấy từ `args`, nên code giữ nội dung thật đã tải.

## 7. Prompt

Nguồn: `apps/api/spike-source-check/prompts/v3.txt` (mặc định của spike). Chuyển thành `prompts/script-review.prompt.ts` kèm `PROMPT_VERSION = 3` (lưu vào `AiCheck.promptVersion`). Phải giữ các điều khoản đã đo: không làm theo chỉ dẫn nằm trong `<blocks>`; liệt kê khe thông tin (ai, gì, ở đâu, khi nào, bao nhiêu) cho mỗi khối có sự kiện; đổi số chữ sang số trước khi so (mười = 10); đọc trang bằng `read_pages` trước khi kết luận; trích một câu liền ≤ 30 từ, không dùng `...` ngoài trường hợp hai đoạn cùng trang; không tìm lặp, tối đa 3 lần tìm mỗi khối. **Schema không cần nhét tay vào prompt**: runner đã gắn `<response_format>` vào system prompt (đã kiểm ở spike).

## 8. Không có nguồn đọc được

Series không có nguồn dùng được (không có nguồn `VERIFIED` với `verifiedVersion = version`; nguồn PDF chưa nạp trang bị bỏ qua và ghi vào `sourcesUsed`/log; nguồn URL tính là đọc được) → **422 `NO_READABLE_SOURCE`**, UI báo "Series chưa có nguồn đọc được để AI đối chiếu". Đã chốt (2026-10-22): không rà từ trí nhớ model. Một số nguồn dùng được, số khác thì không: chạy với những nguồn dùng được; UI hiện "đã đối chiếu N/M nguồn".

## 9. Bỏ khỏi plan cũ, giữ nguyên

Bỏ: `chunker.ts`, `skippedBlocks`, `span` + validator `span`, `<sources>` + `AI_ASSIST_MAX_SOURCE_CHARS`, `contextBefore/After`, validator bước "ref ngoài chunk". `READABILITY` **không nằm trong lần triển khai đầu** (cần cùng phiên hoặc lời gọi riêng, chưa đo; giữ giá trị enum để thêm sau).
Giữ: `AiCheck`/`AiCheckItem`, `seq`, SSE, hub, reaper, `PATCH` (`REVIEWED`, `applied`), rule neo `hash/prev/dup`, rate limit `ai_check`, bulkhead, giao diện danh sách + chi tiết (thêm khối "Nguồn đối chiếu").

## 10. Đo và giới hạn (từ báo cáo đo, bộ ca nhỏ, tự soạn)

`gpt-5.6-luna` low, prompt v3: 21/24 khối sai được bắt kèm câu trích đã kiểm (88%), 30/30 khối đúng không bị báo, 25-34 giây/request, 8-9 lần gọi công cụ; kết quả từng khối còn dao động giữa 3 lần chạy. **Các số này đo trên SQLite FTS5 bm25 và chỉ với nguồn PDF** (spike); xếp hạng Postgres `ts_rank_cd` khác nên **phải đo lại trên Postgres** trước khi chốt prompt và mặc định; chưa đo nguồn URL. Chưa có bộ ca từ PDF thật của series, chưa đo 20 block, chưa đo chi phí token. Rủi ro chấp nhận duy nhất về URL: công cụ web tải được mọi URL (không allowlist, người dùng bảo chưa làm bảo mật); đây là bề mặt rò rỉ dữ liệu/tiêm chỉ dẫn qua nội dung trang, siết sau.

## 11. Test (không cần model)

`quote-check.test.ts` (đã có); công cụ với Postgres test thật theo mẫu `quiz-integration.test.ts` (tìm có dấu/không dấu, `read_pages` quá trần, `sourceId` ngoài allowlist bị từ chối, truy vấn có ký tự lạ không làm vỡ `to_tsquery`, trang của `version` cũ không bị đọc); verifier (mục 6, mỗi bước một ca), **gồm ca hai nguồn trùng số trang: S1 và S2 đều có tr.110, agent chỉ mở S1/tr.110, câu trích khai là S2/tr.110 dù nguyên văn có thật trên S2 → bỏ bằng chứng** (và ngược lại: nguyên văn chỉ có ở S1/tr.110 nhưng khai là S2 → bỏ); **ca bằng chứng nguồn URL:** câu trích nguyên văn có trong văn bản đã bắt từ lần tải đúng URL đã đăng ký của nguồn → giữ; câu trích có trong lần tải một URL khác (không phải URL của nguồn đó) → bỏ; không có lần tải nào → bỏ; `page` model khai bất kỳ vẫn nhận cho nguồn URL (lưu `1`); kết quả công cụ lỗi (`isError`) không được ghi làm văn bản đã bắt; runner với **phiên giả phát lại** chuỗi gọi công cụ đã ghi (kiểm orchestration, hạ `CONTRADICTED`, ngân sách công cụ, hook `onToolResult`). Chất lượng model chạy thật chỉ khi `LIVE_LLM=1`, kiểm bất biến.
