# Brainstorm: AI trong quy trình sản xuất podcast (Studio): trợ lý soạn/review, quản lý-kiểm duyệt, TTS MiniMax, 2 người kể

> **2026-10-27:** phần "2 người kể" (T2, `NarrationSegment`, `narrationMode`) và TTS MiniMax trong báo cáo này đã được thay: TTS dùng Gemini (đã triển khai), hai người nói theo `plans/261027-two-person-podcast/`.

**Ngày:** 2026-10-15, viết lại 2026-10-22 (mở rộng phạm vi theo yêu cầu mới)
**Trạng thái:** P1 đã chốt và có plan `plans/261015-1640-podcast-ai-source-check-p1/` (6 phase, phase 0 sửa ai-engine). **2026-10-22: P1 đổi thành "AI rà kịch bản" (mindset kể chuyện trước, nguồn thứ yếu), xem mục ngay dưới.** Hợp đồng P1 ở mục 6 đã cập nhật theo. Các nhóm mới (soạn thảo, quản lý, TTS, 2 người kể) có hướng đề xuất, **chưa lập plan**; việc cần bạn quyết ở "Chưa chốt".

## Cập nhật 2026-10-22: mindset kể chuyện trước, nguồn thứ yếu

**Quyết định của người dùng:** câu chuyện là chính; chính xác và nguồn là thứ yếu. AI là trợ lý (mod viết và quyết), đưa cảnh báo mềm; hệ thống không ép thứ nó không kiểm soát và chỉ ghi hành động nó thật sự thấy.

1. **Nguồn chỉ gắn vào series**, không gắn vào tập/ý/câu. Bỏ: nguồn theo ý, chip nguồn ở dàn ý/bản nháp, nhãn "Cần nguồn", `[CẦN NGUỒN]`, lựa chọn xử lý "ý thiếu nguồn", bộ chọn "Nguồn được dùng" theo tập, `evidence/quote/sourceId`, độ phủ ("12 khẳng định, 8 có nguồn"), `SUPPORTED_CLAIM`, 422 `NO_SOURCE_EXCERPTS`, dòng "series có ít nhất 1 nguồn" trong điều kiện sẵn sàng của tập. AI **có thể đọc nguồn series làm ngữ cảnh tùy chọn** (toàn bộ nguồn, cắt theo ngân sách ký tự cấu hình); series không nguồn vẫn chạy. Tính năng có sẵn của app (editor `insertCitation`, tab Nguồn, thông báo `HAS_SOURCE`) giữ nguyên, không mở rộng.
2. **Quy tắc prompt:** ưu tiên tư liệu nguồn series nếu có; không chắc chi tiết cụ thể (số, năm, tên) thì **gắn cờ cho mod, không bịa**. Chữ UI là "AI nghi ngờ, chưa xác minh", không bao giờ "đã kiểm tra/đã xác minh".
3. **P1 = "AI rà kịch bản"** (`SCRIPT_REVIEW`, trước là "Kiểm tra nguồn"): hai loại cảnh báo `FACT_DOUBT` (nghi sai) và `READABILITY` (đọc thành tiếng/mạch). Item: `blockRef, blockHash, kind, severity, message, suggestion, status OPEN|REVIEWED, appliedAt?`. `suggestion` sinh **trong cùng lần rà**. `REVIEWED` = mod bấm Hoàn tất (không biết mod có sửa không); `appliedAt` chỉ khi mod bấm "Áp dụng đề xuất". Giữ chống ghi đè theo hash: đoạn đã đổi thì từ chối "đoạn đã đổi, chạy lại". Bỏ `KEPT/DISMISSED/APPLIED/SUPERSEDED`, `modNote`, `suggestionAttempts`, `suggestionRationale`, endpoint `suggest`, mức nghiêm khắc.
4. **UX danh sách:** checklist; bấm một dòng mở chi tiết (giải thích + đề xuất sẵn dạng word diff + nút tùy chọn "Áp dụng đề xuất"); đúng hai nút "Quay lại" / "Hoàn tất"; không "Mục sau/trước", không "Tự sửa", không "Giữ nguyên/Bỏ qua", không bắt lý do. Mod tự chọn mục tiếp.
5. **Mọi thứ mod muốn phải nhập tự do được; preset chỉ điền sẵn.**
6. **Giới hạn trung thực:** tín hiệu "nghi sai" dựa vào trí nhớ model (flash-lite [INFERENCE]): có dương/âm tính giả; không còn kiểm chứng trích dẫn phía server; validator chỉ heuristic (`novel()` bỏ sót phủ định, đảo chủ ngữ, thêm chữ thường).

**Thay thế (các phần bên dưới đã sửa cho khớp, không chỉ ghi chú):** mọi chỗ "kiểm tra nguồn/SOURCE_CHECK/evidence/độ phủ/`sourceIds`/`needsSource`/`[CẦN NGUỒN]`"; mục 8 viết lại; ranh giới "chứng minh được/không chứng minh" nay dựa vào tư duy cảnh báo mềm. Báo cáo `research-261022-*.md` giữ nguyên (phần nguồn-trung-tâm của chúng bị plan P1 thay thế).

**Tác động lên lộ trình:**

| Giai đoạn | Thay đổi |
|---|---|
| P1 | Như trên. Đã loại khỏi plan: validator evidence, độ phủ, `NO_SOURCE_EXCERPTS`, call suggest riêng |
| P2 | Phần "rà lặp ý xa toàn cục" là mở rộng sau; `READABILITY` của P1 đã gồm phần đọc thành tiếng/mạch cơ bản |
| P3 dàn ý/bản nháp | **Không có nguồn ở bất kỳ đâu**: section gồm tiêu đề, mục tiêu, ý chính (văn tự do), thêm/xóa. Không có nút đổi thứ tự. Có trạng thái chờ ("AI đang tạo dàn ý…", "AI đang viết…") |
| P3 góc kể | Danh sách dọc chọn một (có sẵn + của bạn); tạo/sửa/xóa ở **trang riêng** (mockup 06), không tạo trong dialog. **Mặc định đã chọn: lưu theo người dùng**, bảng `ai_narrative_angles(id, userId, name, description, guide, ...)` (chưa xác nhận, xem "Chưa chốt") |
| P3 thời lượng | Ô số phút (chip 8/12/15 chỉ điền sẵn); hiện "≈ N từ" theo `script.words_per_minute` (150 từ/phút, cùng nguồn với `estimatedDurationMs` ở `mapNarration`); mod ghi đè trực tiếp số từ. (Bản cũ ghi "850 ký tự/phút từ config": sai, config không có hằng số đó) |
| P3 giọng văn | Preset + "Tự mô tả…" |
| P3 viết lại | Chỉ dẫn tự do là chính; chip Ngắn hơn/Dễ nghe hơn/Tự nhiên hơn chỉ điền sẵn; **N bản viết lại** (ô số, mặc định 3, trần cấu hình 10); hiện **tất cả** bản cùng lúc dạng danh sách card cuộn, có diff, chọn một; nút Thay/Chèn khóa tới khi chọn. `novel()` thành **cảnh báo mềm** trên card, vẫn chọn được |
| P5 kiểm duyệt | Dùng `ReleaseReviewDialog` có sẵn: một màn hai cột (nội dung đầy đủ + player | "Tình trạng tập" hệ thống tự tính + ghi chú + Yêu cầu chỉnh sửa/Duyệt). **Không chấm từng tiêu chí**, người duyệt là admin/mod khác, không phải tác giả hay AI. Xem `review-criteria-261022-podcast-episode.md` |
| Giọng đọc (T1) | Tốc độ/cao độ là ô số (mặc định 1,0 / 0), không chỉ lựa chọn cố định |

**Nghiên cứu nền (đọc kèm):**
- `plans/reports/research-261022-minimax-tts-api.md` (API MiniMax, giới hạn, giá, lỗi)
- `plans/reports/research-261022-dual-narrator-design.md` (thiết kế 2 người kể)
- `plans/reports/research-261022-ai-stability-patterns.md` (kiến trúc chuẩn cho tính năng AI chạy nền: Gemini, SSE, job Postgres, retry, validator, eval; có bảng Adopt/Defer/Reject)
- `E:/FPT/Semester_8/WDP301/su-ky-document/Báo cáo nghiên cứu_ Vận hành sản xuất podcast ... .pdf` (quy trình, vai trò, kiểm chứng)

## 1. Phạm vi

| Nhóm | Chức năng | Mã |
|---|---|---|
| A. AI soạn thảo và review (mod chủ động chạy) | Tạo dàn ý · Viết bản nháp · Viết lại đoạn · **AI rà kịch bản** (cảnh báo mềm: nghi sai thông tin, khó đọc thành tiếng, mạch lủng củng; nguồn series chỉ là ngữ cảnh tùy chọn) | P1-P3 |
| B. AI hỗ trợ quản lý/kiểm duyệt | Đọc kịch bản mod tải lên, phát hiện thông tin thiếu, đề xuất công việc cần làm, ghi nhận vấn đề cần kiểm duyệt, tổng hợp nhận xét của người kiểm duyệt | P5 |
| C. AI tạo giọng đọc (TTS, MiniMax) | Chọn giọng, tạo audio từ kịch bản; chỉnh tốc độ, cảm xúc, cách phát âm | T0-T1 |
| D. Hai người kể qua lại (tùy chọn; mặc định 1 người kể) | Gán giọng theo lượt cho từng đoạn, ghép thành một audio | T2 |

## 2. Điều chỉnh so với bản trước (có chủ đích)

| Quyết định cũ | Nay | Lý do |
|---|---|---|
| "AI không tạo cả kịch bản" | **Có Dàn ý và Bản nháp, nhưng luôn là đề xuất**: mod chọn chèn vào editor, không tự ghi | Yêu cầu mới. Giữ nguyên nguyên tắc "AI đề xuất, mod áp dụng" |
| "Không queue/pg-boss" (trần P1) | **P1 vẫn chạy trong process. TTS dùng pg-boss** | Scout xác nhận repo **đã có** pg-boss (`core/jobs/maintenance-jobs.ts`, `release-jobs.ts`, `worker.ts`). TTS bắt buộc bền qua restart (task MiniMax sống 9 giờ, URL hết hạn) nên không thể chạy trong request |
| P3 cũ "Gợi ý ý từ nguồn" | Bỏ. Nguồn series chỉ là **ngữ cảnh tùy chọn** cho Dàn ý/Bản nháp, không gắn nguồn vào từng ý | Mindset 2026-10-22: kể chuyện trước, nguồn thứ yếu |
| Chưa có voice | MiniMax TTS | Yêu cầu mới |

`archive/script-workflow/` vẫn giữ nguyên làm archive, không nối vào luồng chính, không dùng lại bước của nó (đúng quyết định trước của bạn).

## 3. Hiện trạng repo đã xác minh

| Mục | Hiện trạng |
|---|---|
| Voice step (wizard) | Chỉ có upload audio thật hoặc `AiVoiceMockPanel` (3 giọng mock, speed 0,75-1,25, "stability"); không có emotion/pronunciation/TTS API (scout) |
| Upload audio hiện có | Ticket → browser upload thẳng Cloudinary (ký) → verify → attach narration. Mặc định tối đa 50 MiB, `mp3/m4a/ogg`, duration phải dương |
| `MediaStorageGateway` | Chỉ có `signUpload`, `fetchResource`, `destroy`, `deliveryUrl`. **Không có upload từ server** (SDK `cloudinary.uploader` đã dùng cho `destroy`, thêm upload buffer là việc nhỏ). TTS sinh ra audio ở server nên **bắt buộc thêm** đường này |
| `EpisodeNarration` | Một `audioAssetId` mỗi (episode, narrationType); không có metadata TTS, không có job |
| ffmpeg | **Không có** trong dependency, không thấy Dockerfile/manifest deploy (scout) → chưa biết host |
| `ai-engine` | `runStructuredAgent` qua Pi runtime (`PI_PROVIDER`, `PI_MODEL` từ env). **Đã chạy thật 2026-10-22:** `opencode-go` lỗi 403 (thiếu subscription) và runner che thành "invalid JSON" sau ~32 giây; `google`/`gemini-3.5-flash-lite` chạy được (3 block, ~7,5 giây, JSON hợp lệ; mẫu nhỏ). `.env` local đã chuyển sang Gemini. Chưa module nào gọi runner |
| Điểm yếu của engine (đã xác minh) | Nuốt lỗi provider (`stopReason:"error"` bị đọc thành text rỗng); không trả token dù có `usage`; không có `AbortSignal` (Pi có `session.abort()`); log 500 ký tự đầu của prompt/đầu ra và tracer in cả nội dung tin nhắn; Pi tự retry 2s/4s/8s cả với 403. Sửa ở phase 0 của plan P1 |
| Env AI | `PI_PROVIDER`, `PI_MODEL`, `PI_API_KEY`, `GEMINI_API_KEY`, `OPENCODE_API_KEY`, `PI_THINKING_LEVEL`. Provider cấu hình được, nên điều kiện 503 là `piRuntime.isReady`, không riêng `GEMINI_API_KEY`. Thiếu key hiện trả 500 chung (scout, chưa tự chạy kiểm riêng) |
| Luồng duyệt | Đã có `EpisodeReview` (`IN_REVIEW`/`CHANGES_REQUESTED`/`APPROVED`, `reviewedById`, **một** `reviewNote` mỗi revision) gắn `ReleaseSchedule`. Không có bảng comment, task hay checklist |
| Block ID Tiptap | Chưa có (`StarterKit`) |

## 4. Nhóm A: AI soạn thảo và review

### 4.1 Năm chức năng (thẻ trong tab Trợ lý AI)

| Thẻ | Vào | Ra | Kiểu response | Giai đoạn |
|---|---|---|---|---|
| **AI rà kịch bản** (`SCRIPT_REVIEW`) | Kịch bản + ghi chú tự do + (tùy chọn) nguồn series | Cảnh báo mềm `FACT_DOUBT` / `READABILITY`, mỗi mục kèm đề xuất sửa sinh sẵn | `items[]` | **P1** |
| **Rà lặp ý xa** (mở rộng `SCRIPT_REVIEW`) | Kịch bản | Cảnh báo lặp ý/mạch giữa các đoạn xa nhau, thêm `kind` bằng `ADD VALUE` | `items[]` | **P2** (hoãn) |
| **Viết lại** (`REWRITE`) | Một đoạn đang chọn + chỉ dẫn tự do (chip điền sẵn) + số bản (mặc định 3, trần 10) | N bản thay thế, hiện cùng lúc, có diff | `variants[]` | **P3** |
| **Tạo dàn ý** (`OUTLINE`) | Chủ đề, góc kể (preset hoặc tự nhập), thời lượng (ô số), nguồn series (ngữ cảnh tùy chọn) | Section: tiêu đề, mục tiêu, ý chính (văn tự do). Không có nguồn từng ý | `blocks[]` | **P3** |
| **Viết bản nháp** (`DRAFT`) | Dàn ý đã duyệt + giọng văn (preset hoặc tự mô tả) + ngữ cảnh nguồn series tùy chọn | Kịch bản theo section; không citation, không `[CẦN NGUỒN]` | `blocks[]` | **P3** |

### 4.2 API: gom theo kiểu response

Quy ước repo: route theo tài nguyên, nest dưới `/api/studio/episodes/:id/...`, mỗi module mount riêng vào `/api/studio`, dùng `idempotency()` + `rateLimit(...)`. **Không dùng tiền tố `studio/ai/`**.

- **`/ai-checks`** (P1, P2): tạo rà kịch bản trả `items[]`; `kind` = `SCRIPT_REVIEW`. Có SSE, item, cancel, PATCH (bảng API ở mục 6).
- **P3 (đã đổi 2026-10-22):** không dùng `/ai-generations` chạy nền. Dàn ý, viết phần, viết lại là **ba route đồng bộ không lưu DB** dưới `/episodes/:id/ai/{outline,draft-section,rewrite}` (mod đang mở dialog nên không cần chạy nền). Chi tiết ở `plans/261015-1640-podcast-ai-source-check-p1/spec-prompts-compose.md`.
- Hai route tách vì hai kiểu response khác nhau; không gộp `items[]` và `blocks[]` vào một endpoint.
- `REWRITE` chỉ một đoạn nên có thể trả đồng bộ trong một request; vẫn ghi một dòng usage để tính chi phí và rate limit.

### 4.3 Quy tắc chung cho nhóm A

1. **AI không ghi vào kịch bản.** Chỉ mod áp dụng, qua đường lưu `scriptDocument` hiện có.
2. **Chi tiết cụ thể (số, năm, tên) mà AI không chắc thì gắn cờ cho mod, không bịa.** AI ưu tiên tư liệu nguồn series nếu có (ngữ cảnh tùy chọn). Viết lại **không thêm sự kiện mới**: chỉ đổi giọng văn, giữ facts.
3. Bản nháp sinh **theo section từ dàn ý đã duyệt**, không một lần cả kịch bản (kiểm soát độ dài và chi phí).
4. Đơn vị công việc của AI là block/section; không stream token (output là JSON dang dở). Realtime = kết quả theo block + timeline vòng đời (`onEvent`).
5. **Nhãn UI trung thực:** "AI nghi ngờ, chưa xác minh", không bao giờ "đã kiểm tra/đã xác minh". Xem mục 8.
6. **Neo vị trí:** client gửi `blocks[{ref, text}]` + hash nội dung; áp dụng thì so hash, lệch thì báo xung đột, không ghi đè. Không sửa Tiptap trong P1.

### 4.4 Kiểu tương tác chung (Issue)

1. Chọn phạm vi trước khi chạy (cả kịch bản / đoạn đang chọn) và ghi chú tự do cho AI. Không có mức nghiêm khắc.
2. Đang chạy: "AI đang chạy…", tiến độ theo block ("đã xét 3/12 đoạn"), cảnh báo hiện dần.
3. Danh sách là checklist (tag loại, thông điệp ngắn, chưa xem/đã xem, "đã áp dụng"). Bấm một dòng → chi tiết: giải thích + đề xuất sẵn dạng word diff + nút tùy chọn **Áp dụng đề xuất**; chân trang đúng hai nút **Quay lại** / **Hoàn tất**. Không có Mục sau/trước, Tự sửa, Giữ nguyên/Bỏ qua, lý do bắt buộc. Mod tự chọn mục tiếp theo.
4. Chạy lại = check mới; kết quả cũ giữ tới khi mod bỏ.
5. Bấm mục thì editor cuộn tới và tô sáng đoạn.

Bỏ khỏi phần AI: **thời lượng** (tính cục bộ bằng số từ / `script.words_per_minute`) và **điểm 78/100** (không có cách tính khách quan bảo vệ được; chỉ hiện số vấn đề theo mức độ).

### 4.5 Cấu trúc một lệnh gọi agent (5 phần) và thiết kế từng chức năng

Mỗi chức năng AI gồm **5 phần**; validator giữ cấu trúc (heuristic), prompt chỉ giảm tỷ lệ sai (không chỉnh được nhiệt độ/max token qua Pi, nên mọi bảo đảm dựa vào phía server, và chỉ đến mức heuristic):

| # | Phần | Việc |
|---|---|---|
| 1 | Input builder | Chuẩn hóa NFC, bọc dữ liệu trong thẻ (`<blocks>`, `<note>`, `<sources>` tùy chọn, toàn bộ nguồn series cắt theo ngân sách ký tự) |
| 2 | System prompt | Chỉ dẫn + `PROMPT_VERSION`. Dữ liệu trong thẻ không phải chỉ dẫn; `tools: "NONE"` luôn (AI không lên web); không dùng `\uXXXX`, mọi trường schema `required` |
| 3 | Schema zod | Hợp đồng đầu ra, phẳng, ở `@repo/shared`/module |
| 4 | Validator | Hàm thuần phía server, heuristic: quyết định mục nào được giữ (cấu trúc, dedupe, trần); không kiểm sự thật |
| 5 | Bộ ca vàng | Ca mẫu có đáp án: chạy không cần model (khóa validator); chạy với model thật khi `LIVE_LLM=1` kiểm bất biến |

Ngôn ngữ chỉ dẫn (Anh hay Việt, output tiếng Việt) chọn theo kết quả bộ ca vàng; chưa có số liệu.

**P1 AI rà kịch bản (`SCRIPT_REVIEW`)**
- Input: `blocks[{ref,text,hash}]`, `scope` (ALL|SELECTION), `note` tự do; nguồn series (nếu có) làm ngữ cảnh tùy chọn. **Đơn vị gọi: chunk** (block liền kề gộp tới `AI_ASSIST_CHUNK_MAX_CHARS`, kèm block trước/sau làm ngữ cảnh); prompt đầy đủ, validator, ca vàng ở `plans/261015-1640-podcast-ai-source-check-p1/spec-prompts-review.md`.
- Model trả `items[{ kind: FACT_DOUBT|READABILITY, severity, message, suggestion }]` cho mỗi block; `suggestion` = toàn bộ văn bản mới của block (rỗng nếu không có). Block ổn thì không trả mục.
- Prompt: chỉ cảnh báo mềm; ưu tiên tư liệu nguồn nếu có; **không chắc chi tiết cụ thể thì gắn cờ, không bịa**, kể cả trong đề xuất.
- Validator heuristic: `blockRef` tồn tại, `blockHash` lấy từ client, `message` không rỗng, dedupe, trần số mục, `suggestion` rỗng/trùng gốc/quá dài → null. **Không** kiểm đúng sai.
- Không có độ phủ, không lưu "khẳng định đã ổn". "0 cảnh báo" không có nghĩa kịch bản đúng.
- Smoke thật mẫu cũ (3 block, Gemini 3.5 flash lite, 7,5 giây, JSON hợp lệ) dùng prompt kiểm nguồn; **chưa chạy với prompt rà kịch bản mới**, chưa có số liệu dương/âm tính giả.

**P2 (hoãn) Rà lặp ý xa toàn cục**: P1 đã có `READABILITY` cho đọc thành tiếng/mạch cục bộ. Phần dưới là mở rộng sau; cần ngữ cảnh toàn kịch bản (lặp ý, mạch lạc, chuyển cảnh là quan hệ giữa các block)
- Phần tất định trong code (không gọi AI): câu quá dài, viết tắt/số La Mã/ký hiệu khó đọc, đoạn quá dài, câu mở đầu lặp, cặp block gần trùng chữ (n-gram). Ngưỡng là hằng số/config.
- Phần AI, **hai tầng** khi kịch bản vượt trần ngữ cảnh (ngắn hơn trần: một lượt toàn kịch bản):
  - **Toàn cục:** (1) mỗi block (hoặc nhóm nhỏ) cho một dòng tóm tắt `{blockRef, gist, keyPoints[], names[]}`; (2) một lượt nhận **toàn bộ bản tóm tắt** trả danh sách **cặp/nhóm block nghi ngờ** (`GLOBAL_REPETITION`, `GLOBAL_COHERENCE`); (3) mỗi cặp bị gắn cờ được **kiểm lại bằng văn bản gốc** của hai block. Có trần số cặp (env) để không bùng nổ chi phí.
  - **Cục bộ:** cửa sổ block liên tiếp chồng 1 block, chỉ cho chuyển cảnh đột ngột, nhịp, lặp ý gần; **không** đảm nhận lặp ý xa.
- Khóa gộp Issue: `kind` + `blockRef` + `relatedBlockRefs` (đã sắp xếp) + `anchor` (`quote` là chuỗi con của block, kèm `[start,end)` lúc chụp). Chỉ gộp khi trùng cả bốn; hai cặp lặp khác nhau trong cùng một block không bị gộp. Cùng một vấn đề tìm thấy ở hai tầng thì giữ bản có `quote` hợp lệ và mức nghiêm trọng cao hơn, ghi nguồn tầng.
- Issue thêm `relatedBlockRefs` và `anchor` (cần cho tô sáng đúng đoạn); phải đưa vào hợp đồng `AiCheckItem` khi lập plan P2 (kind mới bằng `ADD VALUE`).
- Điểm yếu: "chuyển cảnh đột ngột" chủ quan, dễ nhiễu; cần ghi chú dẫn hướng và Bỏ qua dễ dàng; không có điểm số. Chưa chạy với model nào, cần ca vàng có cặp lặp xa nhau và cặp gần-giống-nhưng-khác-nghĩa.

**P3a Viết lại (`REWRITE`)** — một block hoặc vài block liền kề; chỉ dẫn tự do là chính (chip Ngắn hơn/Dễ nghe hơn/Tự nhiên hơn chỉ điền sẵn); kèm block trước và sau (chỉ để mạch văn, không sửa)
- Output `variants[{text, changeNote}]`, **N bản** (input `count`, mặc định 3, trần cấu hình 10). UI hiện tất cả cùng lúc dạng danh sách card có diff, chọn một. Prompt: chỉ đổi giọng văn, giữ facts.
- Heuristic mềm `novel()`: số/năm/từ viết hoa **không có trong bản gốc** → cảnh báo trên card "Có số/tên mới: ... — hãy kiểm tra"; card vẫn chọn được. Nó bỏ sót phủ định, đảo chủ ngữ, thêm chữ thường; chỉ là gợi ý. Không còn loại cứng bản có số mới.
- Một request đồng bộ, vẫn ghi usage và rate limit.
- **Vấn đề mở:** mark `sourceCitation` của Tiptap ở mức từ/câu; biến thể là plain text nên thay thế làm mất mark. Cách xử lý (gắn lại citation cấp block hay gửi text kèm ký hiệu mark) chốt ở plan P3.

**P3b Dàn ý (`OUTLINE`)** — input brief (chủ đề, góc kể: preset hoặc tự nhập, thời lượng: ô số phút), nguồn series làm ngữ cảnh tùy chọn, siêu dữ liệu tập
- Output `sections[{title, goal, points[], weight}]`. **Không có nguồn từng ý, không có `needsSource`.** Mod sửa/thêm/xóa trực tiếp (không có nút đổi thứ tự).
- **Thời lượng do code tính**: `targetWords = phút × script.words_per_minute` (mod ghi đè số từ); `targetWords` mỗi phần = tổng × weight/Σweight do server tính, không tin phép tính của model.
- Đầu ra vào editor là block heading + ý chính (cùng kiểu `blocks[]` với Bản nháp).

**P3c Bản nháp (`DRAFT`)** — input là **dàn ý đọc từ editor** (mod đã sửa, không trạng thái ẩn), giọng văn (preset hoặc tự mô tả), ngân sách ký tự mỗi section, ngữ cảnh nguồn series tùy chọn
- Một phần mỗi lần, **gọi tuần tự** (phần i cần đoạn cuối phần i-1 để nối mạch); mỗi call nhận toàn bộ dàn ý (title+goal) + ý chính phần hiện tại + giọng văn.
- Prompt: văn nói (câu ngắn, tránh ngoặc đơn/viết tắt/ký hiệu); ưu tiên tư liệu nguồn nếu có; không chắc chi tiết cụ thể thì để trung tính hoặc gắn cờ cho mod, không bịa; **không** chèn `[CẦN NGUỒN]` hay citation.
- Validator tất định (heuristic): độ dài section trong ±20% ngân sách (lệch thì cảnh báo, không tự gọi lại).
- Đề xuất hiện dần theo section ("AI đang viết…"); **Chèn / Thay / Sửa / Bỏ**; nhãn "do AI soạn" tới khi mod sửa hoặc duyệt.
- Rủi ro: model có thể thêm chi tiết lịch sử không có căn cứ; validator không bắt được. Nên chạy P1 sau khi chèn.

## 5. Nhóm B: AI hỗ trợ quản lý và kiểm duyệt (P5)

Yêu cầu: đọc kịch bản mod tải lên → phát hiện thông tin thiếu → đề xuất công việc → ghi nhận vấn đề cần kiểm duyệt → tổng hợp nhận xét người kiểm duyệt.

**Thách thức (ultra):** phần lớn việc này **không cần AI**, và hạ tầng nền chưa có.

| Việc | Cách làm đề xuất | Cần gì |
|---|---|---|
| Phát hiện thông tin thiếu | **Quy tắc tất định** (không AI): đúng các mục đã có trong `episodeChecklist` + cảnh báo (tên tập, kịch bản, âm thanh, thẻ nhân vật/sự kiện chưa xác nhận...); không có mục "series có nguồn" | Hàm kiểm tra, không bảng mới |
| Đề xuất công việc cần hoàn thành | Sinh từ checklist ở trên. AI chỉ viết lại thành câu việc dễ hiểu nếu cần | Chưa có bảng task. Bản nhỏ nhất: **hiển thị** (không lưu) trên màn hình duyệt |
| Ghi nhận vấn đề cần kiểm duyệt | Màn duyệt hiện một dòng tóm tắt nếu đã chạy AI rà kịch bản: "AI đã rà: 3 cảnh báo, 2 đã xem" (AI nghi ngờ, chưa xác minh) | Đọc từ `AiCheckItem` (P1); không bảng mới |
| Tổng hợp nhận xét người kiểm duyệt | AI tóm tắt các `reviewNote` qua các revision + Issue thành danh sách "việc cần sửa" cho mod | Chỉ **một** `reviewNote` mỗi revision, nên "tổng hợp" ít giá trị hiện tại. Cần quyết có thêm comment theo đoạn không |

Đề xuất: P5 làm **tình trạng tập tất định + một dòng tóm tắt AI rà kịch bản cho người kiểm duyệt**; phần AI duy nhất là tóm tắt nhận xét, chỉ làm khi có nhiều nhận xét thật. Không tạo bảng task/comment/state machine mới nếu bạn chưa yêu cầu.

## 6. P1 (hợp đồng, cập nhật 2026-10-22)

### 6.1 API `ai-checks`

| Method | Path | Middleware | Việc |
|---|---|---|---|
| POST | `/episodes/:id/ai-checks` | `idempotency()`, `rateLimit("ai_check")` | Tạo rà kịch bản, body `{ kind, scope, blocks[{ref,text,hash}], note? }`. 202 `{ id }` |
| GET | `/episodes/:id/ai-checks` | | Liệt kê gần đây (mở lại sau F5) |
| GET | `/episodes/:id/ai-checks/:checkId` | | Trạng thái + các mục hiện có |
| GET | `/episodes/:id/ai-checks/:checkId/events` | | SSE: `progress`, `item`, `done`, `failed` |
| POST | `/episodes/:id/ai-checks/:checkId/cancel` | `rateLimit("write")` | Hủy |
| PATCH | `/episodes/:id/ai-checks/:checkId/items/:itemId` | `rateLimit("write")` | `{ status: "REVIEWED" }` (mod bấm Hoàn tất) hoặc `{ applied: true }` (web đã thay đoạn trong editor, ghi `appliedAt`). Không có endpoint suggest: đề xuất sinh trong lần rà |

- Mã lỗi: 202 nhận việc; 409 cùng loại kiểm tra đang chạy cho tập này; 429 vượt giới hạn; 503 chưa cấu hình AI; 404 tập không thuộc mod.
- Đăng ký OpenAPI docs cùng chỗ với các route studio hiện có.

```
Item { id, seq, blockRef, blockHash, kind: FACT_DOUBT | READABILITY, severity, message, suggestion|null,
       status: OPEN | REVIEWED, appliedAt|null }
```
(P2 có thể thêm kind và `relatedBlockRefs`/`anchor` bằng migration `ALTER TYPE ... ADD VALUE`. "Áp dụng" do web làm trong editor, so `blockHash`; lệch thì từ chối "đoạn đã đổi, chạy lại".)

### 6.2 SSE: không mất, không trùng

Mỗi item có `seq` tăng đơn điệu theo check, là `id` của sự kiện SSE; client gửi `Last-Event-ID`.
1. Server **subscribe kênh live trước**, buffer sự kiện đến.
2. Truy vấn DB các item có `seq` > `Last-Event-ID` (hoặc tất cả nếu kết nối mới), phát cho client.
3. Xả buffer, bỏ sự kiện có `seq` ≤ `seq` đã phát.
4. Client chống trùng thêm bằng `item.id`.

Kênh live là `EventEmitter` trong process (một instance). Nhiều instance cần pub/sub (xem Trần đã biết).

### 6.3 Dữ liệu

Kết quả từng block xong đồng thời, nên **không** gộp vào một JSONB. Mỗi block xong thì insert các item của block đó.

| Bảng | Cột chính |
|---|---|
| `AiCheck` | `id, userId, episodeId, kind, status (RUNNING/SUCCEEDED/FAILED/CANCELLED), config jsonb (scope, note), totalBlocks, processedBlocks, failedBlocks, inputTokens, outputTokens, model, promptVersion, heartbeatAt, startedAt, finishedAt, errorCode` |
| `AiCheckItem` | `id, checkId, seq, blockRef, blockHash, kind, severity, message, suggestion, status, appliedAt, createdAt, updatedAt` |

- Index `AiCheck(userId, createdAt)`, `AiCheckItem(checkId, seq)` unique. Migration cộng thêm, rollback bằng drop 2 bảng.
- Giới hạn đồng thời = đếm `RUNNING` chưa quá hạn heartbeat của user (khóa advisory trong transaction chống race); usage theo user/episode lấy từ `AiCheck`.
- Không lưu prompt, không log toàn văn kịch bản/nguồn (engine phải redact, phase 0).
- Chạy nền trong process API, `AbortController` truyền xuống engine, timeout từ env. Check kẹt `RUNNING` được reaper (job định kỳ pg-boss, mẫu `core/jobs/maintenance-jobs.ts`, cùng một lần lúc khởi động) đánh dấu `FAILED` (`INTERRUPTED`) khi `heartbeatAt` quá hạn; chuyển trạng thái cuối bằng CAS (`WHERE status='RUNNING'`).

### 6.4 Rate limit và cấu hình

`apps/api/src/core/middleware/rate-limit.ts` là bucket Postgres, cấu hình qua `SYSTEM_CONFIGS["rate_limit.<policy>"]` (admin sửa được). Thêm policy `ai_check` (mặc định ví dụ `{ limit: 10, windowSeconds: 3600 }`, chốt sau khi đo chi phí): `RateLimitPolicy`, `SYSTEM_CONFIGS`, nhãn admin, `RatePolicy`/`RATE_DOC`. Env chỉ cho hạ tầng chạy nền: `AI_ASSIST_TIMEOUT_MS`, `AI_ASSIST_BLOCK_CONCURRENCY`, `AI_ASSIST_MAX_CONCURRENT_PER_USER`, `AI_ASSIST_GLOBAL_MODEL_CONCURRENCY`, `AI_ASSIST_MAX_SOURCE_CHARS`, heartbeat/stale của run và SSE; engine có `PI_RETRY_MAX`, `PI_RETRY_BASE_DELAY_MS`, `PI_PROVIDER_TIMEOUT_MS`.

### 6.5 Nền tảng ổn định (kiến trúc chuẩn đã chọn áp dụng)

Nguồn: `plans/reports/research-261022-ai-stability-patterns.md`. Phần đã xác minh trực tiếp bằng tài liệu Google/pg-boss được đánh dấu [V] ở báo cáo đó; phần còn lại (đặc tả SSE, NOTIFY, AWS, OWASP, IETF) trích từ kiến thức đã biết và cần kiểm lại khi code.

| Pattern | Quyết định | Dạng tối thiểu ở stack này |
|---|---|---|
| Ghim model stable từ env, không `-latest` | Áp dụng | `PI_MODEL=gemini-3.5-flash-lite` |
| Schema gốc của Gemini + zod | **Hoãn**: không thấy Pi chuyển tiếp `responseSchema` | Prompt-JSON + zod + 1 lần sửa (đang có) |
| Thinking tối thiểu cho kiểm tra; `maxOutputTokens` | Áp dụng thinking; **`maxOutputTokens` chưa có trong SDK** | `thinking` theo lệnh gọi; `TRUNCATED` là lỗi block |
| Run là nguồn sự thật + log sự kiện theo `seq` | Áp dụng | `AiCheck` + `AiCheckItem` (đã thiết kế) |
| SSE replay: `id=seq`, heartbeat comment, không nén, subscribe-then-replay | Áp dụng | `streamSSE`, `X-Accel-Buffering: no` |
| Heartbeat + reaper cho job kẹt, CAS khi chốt trạng thái | Áp dụng | pg-boss cron + `WHERE status='RUNNING'` |
| Idempotency-Key | Áp dụng cái đã có | Middleware `idempotency()` + bảng `IdempotencyKey` sẵn có |
| Retry: backoff có jitter, chỉ 408/429/5xx, **một tầng** | Áp dụng | Cấu hình retry của Pi; không bọc thêm; không retry 400/402/403 |
| Timeout/hủy mọi lời gọi | Áp dụng | `AbortSignal` xuống engine |
| Bulkhead (cách ly số lời gọi đồng thời) | Áp dụng | Semaphore toàn cục `model-gate`, env |
| Token bucket Postgres | Áp dụng cho TTS (mục 7.4); hoãn cho Gemini | Một dòng, `UPDATE ... RETURNING` |
| Circuit breaker, promptfoo, tách bảng outbox | Hoãn | Khi quan sát thấy cần |
| LISTEN/NOTIFY | Hoãn làm gợi ý thức dậy; **bác** làm kênh duy nhất | Một instance dùng `EventEmitter`; DB luôn là sự thật |
| Validator tất định + bộ ca vàng (bun test, cổng `LIVE_LLM=1`) | Áp dụng | Mục 4.5, phase 2/5 |
| Chống prompt injection: ranh giới dữ liệu/chỉ dẫn, không tool, đầu ra là đề xuất, người áp dụng | Áp dụng | Prompt + schema + validator |
| Redact log, không log prompt/nội dung | Áp dụng, **sửa engine** | Phase 0 |
| Redis/Kafka/queue ngoài | Bác | Postgres đủ ở quy mô này |

## 7. Nhóm C: TTS MiniMax (T0-T1)

Chi tiết API ở `research-261022-minimax-tts-api.md`. Điểm quyết định:

### 7.1 Sự thật cần biết trước khi thiết kế
- **Sync** `POST /v1/t2a_v2`: < 10.000 ký tự; **async** `POST /v1/t2a_async_v2`: tới 50.000 ký tự, poll `GET /v1/query/t2a_async_query_v2`, tải file trong **9 giờ**. Auth: `Authorization: Bearer`. Không có chế độ nhiều người nói trong một request.
- Một tập 30 phút tiếng Việt khoảng 20k-25k ký tự (ước tính ~750 ký tự/phút [INFERENCE]) → **một task async cho cả tập, không cần cắt/ghép** khi chỉ có một người kể.
- Giá: speech-2.8-hd **$0,10 / 1.000 ký tự**, turbo $0,06. Kịch bản 30k ký tự ≈ $3 (hd). Nghe thử 300 ký tự ≈ $0,03.
- **Giới hạn T2A 60 request/phút theo tài khoản MiniMax, không theo user** (query async có giới hạn riêng 10 QPS; giới hạn của `files/retrieve` chưa rõ [UNVERIFIED]). `rateLimit` theo user không đủ, và **concurrency của pg-boss cũng không giới hạn tốc độ** (job nhanh, preview, và các lượt của chế độ 2 người kể vẫn có thể vượt 60/phút). Cần một **bộ giới hạn theo thời gian dùng chung** cho mọi lời gọi tạo giọng, xem mục 7.4.
- Tiếng Việt: `language_boost: "Vietnamese"`. **Danh sách giọng hệ thống chỉ thấy đúng một giọng Vietnamese (`Vietnamese_kindhearted_girl`)**; còn lại cần Voice Design ($3/giọng) hoặc Voice Clone ($1,5/giọng, bị xóa nếu 7 ngày không dùng) hoặc thử giọng đa ngôn ngữ. Chất lượng tiếng Việt, tên Hán-Việt, số/ngày: **chưa kiểm** (xem T0).
- Tham số chỉnh cách đọc: `speed` 0,5-2; `pitch` -12..12; `vol`; `emotion` (happy, sad, angry, fearful, disgusted, surprised, calm, fluent; **model 2.8 không có `whisper`**; để trống = model tự chọn, khuyến nghị); `pronunciation_dict.tone` dạng `"gốc/thay thế"` (với tiếng Việt chỉ dùng dạng viết lại bằng chữ thường, chưa có quy tắc riêng); marker nghỉ `<#x#>` (0,01-99,99 giây; **chưa chắc hoạt động trong `text` inline của async**, chỉ ghi nhận ở file txt và sync).
- Lỗi: HTTP 200 kèm `base_resp.status_code`. Mã **1026/1027 (kiểm duyệt nội dung đầu vào/ra) có thể chặn nhầm kịch bản chiến tranh**, cần UX báo lỗi cho mod. Phân loại retry/không retry ở báo cáo nghiên cứu.
- Tài liệu có chỗ tự mâu thuẫn (giá preview Voice Design, kiểu `task_id`, hoa/thường của `status`, `download_url`) → code phòng thủ, kiểm bằng spike.

### 7.2 Thiết kế đề xuất (một người kể)

```
Mod chọn giọng + tốc độ/cảm xúc/từ điển phát âm  →  POST /episodes/:id/narrations/:type/tts-jobs  (202)
   → bảng NarrationTtsJob (lưu task_id/file_id NGAY khi MiniMax trả)
   → job pg-boss: tạo task async → poll (backoff, trần 10 QPS) → tải file ≤ 9h
   → upload server-side lên Cloudinary (MediaStorageGateway.uploadBuffer) → MediaAsset READY
   → gắn vào narration qua đường attach audio hiện có (cùng ràng buộc mp3/≤50 MiB)
   → SSE/poll trạng thái cho UI (cùng cơ chế SSE của P1)
```

| Điểm | Quyết định |
|---|---|
| Chạy ở đâu | **pg-boss** (đã có worker). Không chạy trong request vì task MiniMax sống lâu và phải sống qua restart. pg-boss chỉ lo bền vững, retry, số job đồng thời; **không** bảo đảm tốc độ gọi (xem 7.4) |
| Bảng | `NarrationTtsJob`: `id, narrationId, userId, status, providerTaskId, providerFileId, voiceConfig jsonb, textHash, usageCharacters, traceId, errorCode, audioAssetId, createdAt, finishedAt`. Lưu cấu hình giọng để biết audio ứng với phiên bản kịch bản nào (`textHash` khác kịch bản hiện tại → audio cũ) |
| Giọng | Server cache `get_voice` (hệ thống), lọc `Vietnamese_*` lên đầu; API trả danh sách cho UI. Không hardcode voice_id |
| Nghe thử | `POST .../tts-preview`: sync, văn bản ngắn (trần ký tự theo env), `rateLimit("tts_preview")` riêng, trả audio (không lưu) |
| Config | Env: `MINIMAX_API_KEY`, `MINIMAX_API_BASE` (mặc định `https://api.minimax.io`), `MINIMAX_TTS_MODEL` (mặc định `speech-2.8-hd`), timeout, `MINIMAX_TTS_RPM` (mặc định thấp hơn 60 để chừa biên), `MINIMAX_TTS_MAX_IN_FLIGHT`. Thiếu key → **503** tường minh, không sập. Key không bao giờ ra browser |
| Giới hạn tốc độ | Xem mục 7.4. Mọi lời gọi tới MiniMax (preview, tạo task async, từng lượt của DUAL) đều phải qua đó |
| Ghi đè audio | Mod đã có audio (upload hay TTS cũ) thì tạo mới cần xác nhận thay; tập đã `PUBLISHED` giữ ràng buộc hiện có của `THIRD_PERSON` |
| Nhãn AI | Audio do TTS tạo có cờ `aiGenerated` (phục vụ disclosure, xem mục 8) |
| Log | `trace_id`, độ dài, `usage_characters`, độ trễ; **không** log nội dung kịch bản |

Từ kịch bản Tiptap sang `text` gửi MiniMax: bỏ định dạng, giữ ngắt đoạn bằng `\n`; chuẩn hóa số/ngày/niên đại trước khi gửi (số La Mã, "1946", "thế kỷ XX") bằng từ điển viết lại có phiên bản (để gắn vào hash). Từ điển phát âm này là dữ liệu của dự án, mod chỉnh được.

### 7.3 T0: spike bắt buộc trước khi code T1 (cần `MINIMAX_API_KEY` thật)
1 giờ, kịch bản tiếng Việt thật 3k và 25k ký tự: `get_voice` trả bao nhiêu giọng Việt; nghe thử dấu/tên Hán-Việt/số; đầu ra async là một file audio hay zip (có phụ đề kèm?); `<#x#>` trong `text` async; đếm `usage_characters` với dấu tiếng Việt; trần đồng thời async (mã 1045) và độ trễ thực tế 25k ký tự. **Nếu không có ít nhất một giọng Việt đạt chất lượng, dừng T1**, vì không sửa được bằng code.

### 7.4 Bộ giới hạn tốc độ dùng chung cho MiniMax

Vấn đề: 60 request/phút là trần theo thời gian của cả tài khoản. Concurrency của pg-boss chỉ giới hạn số job chạy cùng lúc, nên job ngắn chạy nối tiếp, preview của nhiều mod và các lượt DUAL vẫn có thể vượt 60/phút. API và worker là hai process, nên bộ đếm trong bộ nhớ không dùng được.

Đề xuất:
- **Token bucket trong Postgres**, một dòng cho mỗi (provider, loại giới hạn), ví dụ `provider_rate_state(key, tokens, refilled_at)`. Cấp phát bằng **một câu lệnh SQL nguyên tử** (`UPDATE ... RETURNING`, tính lượng nạp lại theo đồng hồ DB, không theo đồng hồ process), nên API và worker dùng chung. Cùng kiểu bucket Postgres mà `rate-limit.ts` đang dùng, nhưng **không** dùng lại cửa sổ cố định của nó: cửa sổ cố định cho phép tới ~2 lần trần ở ranh giới hai cửa sổ.
- Dung lượng và tốc độ nạp lấy từ `MINIMAX_TTS_RPM` (mặc định thấp hơn 60 để chừa biên), không hardcode.
- **Mọi lời gọi tạo giọng** lấy 1 token trước khi gọi: preview, tạo task async, từng lượt sync của DUAL. Lời gọi `query` async có bucket riêng theo 10 QPS; `files/retrieve` chưa rõ giới hạn [UNVERIFIED], đo ở T0.
- Hết token: **preview trả 429 + `Retry-After`** (không giữ request chờ); **job pg-boss đặt lại lịch** (`startAfter` theo thời gian nạp token kế tiếp) thay vì ngủ trong worker.
- Khi MiniMax trả 1002/2045-2047, vẫn **lùi theo backoff** và tạm giảm tốc độ nạp; bucket của ta chỉ là rào chắn phía trước, không thay xử lý lỗi của nhà cung cấp.
- **Số lời gọi đang chạy dở** là giới hạn khác, giữ riêng bằng concurrency pg-boss và `MINIMAX_TTS_MAX_IN_FLIGHT` (đồng thời với mã 1045 của async).
- Công bằng: một lượt DUAL dài không được chiếm hết token làm preview đói. Phương án nhỏ nhất: dành một phần dung lượng cho preview (cấu hình được). Chốt chi tiết ở plan T1.
- Kiểm tra: test cạnh tranh nhiều caller song song chứng minh số token cấp ra trong một phút không vượt dung lượng (xem plan T1).

## 8. Ranh giới: AI cảnh báo ≠ xác minh sự kiện

Báo cáo nghiên cứu tách **AI claim extraction** khỏi **Fact QA do người ký**; AI không được auto-clear Fact QA/Rights QA. Với tư duy mới (kể chuyện trước, nguồn thứ yếu) P1 không làm Fact QA, chỉ nhắc nhẹ.

| Cơ chế | Cho biết | Không cho biết |
|---|---|---|
| AI gắn `FACT_DOUBT` | Model **nghi ngờ** một chi tiết (từ trí nhớ và/hoặc nguồn series) | Chi tiết đó sai; cũng không phải đã đối chiếu nguồn |
| Mod bấm Hoàn tất (`REVIEWED`) | Mod đã **xem** mục này | Mod đã sửa hay giữ nguyên; không phải sign-off Fact QA |
| `appliedAt` | Mod bấm Áp dụng đề xuất và web đã thay đoạn | Đề xuất đúng; server không thấy editor, chỉ ghi cờ client báo |
| "Không có cảnh báo" | Model không nghi ngờ gì | Kịch bản đúng |

- Nhãn UI: "AI nghi ngờ, chưa xác minh". Không dùng "đã kiểm tra/đã xác minh".
- `REVIEWED`/`appliedAt` không được dùng làm trạng thái duyệt hay cổng phát hành. Muốn gate Fact QA thật thì là tính năng riêng (người ký, claim register, bằng chứng), ngoài phạm vi.
- Giọng AI: disclosure. Audio TTS gắn cờ; giọng tái hiện nhân vật lịch sử không được trình bày như ghi âm thật. Không clone giọng người thật còn sống/mới mất khi chưa có đồng ý bằng văn bản. Quy định pháp lý Việt Nam về nhãn AI chưa kiểm.

## 9. Nhóm D: hai người kể qua lại (T2)

Chi tiết ở `research-261022-dual-narrator-design.md`. Ràng buộc gốc: MiniMax **một giọng mỗi request** → phải tổng hợp theo lượt rồi ghép.

### 9.1 Phương án

| | A. Văn bản `A:/B:` rồi parse | **B. Thuộc tính `speaker` trên block Tiptap + bảng `NarrationSegment` (đề xuất)** | C. API hội thoại của vendor (ElevenLabs/Google) |
|---|---|---|---|
| Hợp MiniMax | Có | **Có** | Không (đổi vendor) |
| Nguồn sự thật | Yếu, parse mơ hồ, AI sửa dễ hỏng | **Mạnh, giữ rich text** | Mạnh |
| Tạo lại một đoạn | Không có id ổn định | **Có (id block + hash)** | Kém |
| Liền mạch ngữ điệu | Khởi đầu "lạnh" | Khởi đầu lạnh (đổi giọng che đỡ) | Tốt nhất |
| Chi phí | Thấp | Trung bình | Trung bình + đổi vendor |

### 9.2 Đề xuất kỹ thuật (nếu bạn xác nhận làm T2)
- Mỗi paragraph có `speaker: "A"|"B"` và `segmentId` (uuid ổn định). Cùng `segmentId` này **giải luôn bài toán "block ID" của AI checks** sau này (P1 vẫn không sửa Tiptap).
- `NarrationSegment { id=segmentId, narrationId, orderIndex, speaker, text, voiceId, settings, hash, audioAssetId?, durationMs, pauseAfterMs?, status }`; `hash = sha256(text + voiceId + settings + từ điển phiên bản + model)`. Chỉ tổng hợp lại đoạn có hash đổi.
- Chế độ trên `EpisodeNarration`: `narrationMode SINGLE|DUAL`, `voiceAssignments {A, B?}`, `gapConfig`.
- Quy ước: một người kể = **mặc định, đường đã làm ở T1 (không có bảng segment)**. DUAL là đường riêng chỉ khi mod bật. Không ép người kể đơn đi qua pipeline segment (nghiên cứu đề xuất một đường chung; tôi bác vì thêm bảng, ffmpeg và nhiều request cho phần 95% dùng một người kể).
- Hợp nhất các đoạn liền kề cùng người nói (tới một trần ký tự) để giảm số request và cải thiện ngữ điệu. Mỗi đoạn là một lượt lấy token của bộ giới hạn ở mục 7.4; một tập nhiều lượt sẽ chạy chậm hơn đáng kể, tính thời gian render ở T0/T2.

### 9.3 Quyết định hạ tầng ghép audio (chưa có ffmpeg)

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| ffmpeg (binary hoặc `ffmpeg-static`) | Chuẩn: cùng sample rate, chuẩn hóa âm lượng, chèn nghỉ, mã hóa một lần | Thêm dependency nặng hoặc phải xác nhận host có ffmpeg (chưa biết host) |
| Ghép PCM thuần JS rồi mã hóa MP3 bằng thư viện nhỏ | Không cần binary | Thêm dependency khác; WAV trung gian lớn |
| Nối trực tiếp luồng MP3 cùng thông số | Không cần gì | Có thể click ở mối nối, thiếu chuẩn hóa âm lượng giữa hai giọng; chỉ chấp nhận nếu nghe thử đạt |

Đề xuất: chốt sau T0 và sau khi biết host. Mặc định nghiêng về ffmpeg.

### 9.4 Điểm chặn và câu hỏi
- **Chặn lớn nhất:** chỉ có **một giọng Việt hệ thống** (xem T0). Hai giọng phân biệt rõ cần Voice Design/Clone hoặc giọng đa ngôn ngữ; phải nghe thử trước khi cam kết.
- **Vai của giọng B** là gì: người dẫn thứ hai (hai host đối thoại) hay "giọng trích dẫn sử liệu/nhân vật"? Quyết định ảnh hưởng nhãn UI, disclosure và cách tách đoạn. Báo cáo nghiên cứu nghiêng về "giọng B = trích dẫn/nhân vật" hợp podcast lịch sử, **là suy luận chưa kiểm**.
- Ngôi kể (`THIRD_PERSON`/`FIRST_PERSON`) và số người kể là hai trục độc lập: mỗi `narrationType` có audio riêng; chế độ DUAL nằm bên trong một narration.
- Phụ đề/timeline: có thể tính từ `durationMs` đo từ audio đã giải mã cộng khoảng nghỉ (không tin thời lượng API).

## 10. Rủi ro

1. **AI nghi sai nhầm hoặc bỏ sót / bịa chi tiết khi viết:** tín hiệu dựa vào trí nhớ model, không có kiểm chứng phía server. Giảm bằng prompt (gắn cờ khi không chắc), cảnh báo mềm `novel()`, nhãn "AI nghi ngờ, chưa xác minh"; mod luôn quyết.
2. **Chi phí LLM:** gọi theo block, kèm ngữ cảnh nguồn đã cắt; đề xuất sinh trong cùng call nên tăng token đầu ra (đo ở smoke); rate limit + giới hạn song song; 409 chặn double-click.
3. **Chi phí/giới hạn TTS:** 60 request/phút toàn tài khoản, bảo đảm bằng bộ giới hạn theo thời gian dùng chung (mục 7.4), không chỉ bằng concurrency; preview có policy riêng theo user; ghi `usage_characters`.
4. **Kịch bản đổi sau khi chụp:** so hash lúc áp dụng; audio TTS cũ so với `textHash`.
5. **Prompt injection qua nguồn/kịch bản/ghi chú:** đưa vào prompt như dữ liệu; đầu ra ép schema; AI chỉ đề xuất, mod áp dụng.
6. **Độ trễ [INFERENCE, chưa đo]:** LLM theo số block; TTS qua T0.
7. **Ngôi 1 bịa lời thoại:** chỉ đổi giọng, giữ facts (P4).
8. **Kiểm duyệt nội dung của MiniMax (1026/1027)** chặn nhầm chủ đề chiến tranh/chính trị: cần UX lỗi.
9. **Chất lượng tiếng Việt TTS và voice inventory:** chưa kiểm; có thể làm T1/T2 không khả thi.
10. **Một nhà cung cấp, không có benchmark độc lập; tài liệu MiniMax có chỗ mâu thuẫn.** Giữ model/voice trong config, bọc provider sau một interface mỏng chỉ khi có provider thứ hai.
11. **Dữ liệu gửi bên thứ ba:** kịch bản và nguồn series (ngữ cảnh) gửi tới Gemini/MiniMax. Chưa có cờ phân loại dữ liệu (nguồn nội bộ/hạn chế bản quyền) chặn việc này.
12. **Nhà cung cấp LLM đổi/ngừng hoặc hết hạn mức:** engine hiện che lỗi; sửa ở phase 0 để lỗi AUTH/QUOTA hiện đúng và dừng sớm. Model Gemini cụ thể có thể đổi tên (alias) hoặc ngừng: ghim id stable qua env.
13. **Chất lượng cảnh báo `FACT_DOUBT` (P1):** tỷ lệ báo nhầm và bỏ sót chưa đo; không có benchmark; flash-lite [INFERENCE]. Chỉ có mẫu 3 block với prompt cũ.

## 11. Trần đã biết (ponytail)

- AI checks/generations chạy nền trong process, `EventEmitter` live: chỉ một instance API. Nhiều instance cần gợi ý thức dậy qua LISTEN/NOTIFY (DB vẫn là sự thật; cần kết nối trực tiếp, không qua pooler) hoặc poll; Redis bị bác. TTS dùng pg-boss nên không bị trần này, nhưng SSE tiến độ TTS dùng cùng kênh live hay poll thì ghi ở plan T1.
- Token tính theo tổng mỗi check, chưa theo block.
- Không có bảng task/comment/claim register/state machine duyệt; chỉ `EpisodeReview` hiện có.
- Một giọng người kể mặc định, không overlap/ngắt lời giữa hai giọng.

## 12. Chưa chốt (cần bạn quyết)

1. **`MINIMAX_API_KEY` để chạy spike T0**, và host API (có ffmpeg không, có chạy worker pg-boss riêng không).
2. **Vai giọng B (T2):** người dẫn thứ hai hay giọng trích dẫn sử liệu/nhân vật.
3. **Ngôi thứ nhất (P4):** chỗ chọn nhân vật ở bước Thông tin hay trong panel AI. Không chặn P1.
4. **Nhóm B:** chỉ checklist tất định + hiển thị Issue cho người kiểm duyệt (đề xuất), hay có thêm comment theo đoạn/bảng task.
5. **Thứ tự ưu tiên** (mục 13) và có làm T2 hay dừng ở một người kể.
6. Mặc định `rate_limit.ai_check`, `tts_preview`: chốt sau đo chi phí.
7. Giọng AI cho nhân vật lịch sử: chính sách disclosure và pháp lý.
8. **Góc kể tùy nhập (P3):** lưu theo người dùng (`ai_narrative_angles(userId, label, description)`) đã chọn làm mặc định; chờ xác nhận (khác: dùng chung toàn hệ thống).
9. **Ràng buộc `HAS_SOURCE` khi phát hành series** (đã có: `ContentService.publishSeries` → `SERIES_NOT_PUBLISHABLE` nếu series không nguồn; tập thì không bị) có giữ khi nguồn là thứ yếu? Plan P1 không đổi. Chi tiết ở `plan.md`.

## 13. Giai đoạn

| P | Nội dung | Phụ thuộc |
|---|---|---|
| **P1** | **AI rà kịch bản** (`SCRIPT_REVIEW`): phase 0 sửa ai-engine + Gemini; migration 2 bảng; runner theo block với 5 phần (input/prompt/schema/validator heuristic/ca vàng); đề xuất sinh cùng lần rà; SSE (cursor `seq`); reaper; checklist + chi tiết (Quay lại/Hoàn tất) + Áp dụng đề xuất theo hash, thay `ScriptAssistantMock` | (plan đã có) |
| **P2** (hoãn) | Rà lặp ý xa toàn cục: mở rộng `SCRIPT_REVIEW`, thêm kind bằng `ADD VALUE` | P1 |
| **P3** | Soạn thảo (không nguồn trong dàn ý/bản nháp): `/ai-generations` cho Dàn ý, Bản nháp (theo section), Viết lại N bản; góc kể tự nhập lưu theo người dùng; chèn/thay vào editor | P1 |
| **P4** | Ngôi thứ nhất theo `narratorEntity` | P3 (và quyết định 3) |
| **P5** | Kiểm duyệt: `ReleaseReviewDialog` hai cột + "Tình trạng tập" hệ thống tự tính + tóm tắt AI rà (nếu đã chạy); không chấm từng tiêu chí | P1 |
| **T0** | Spike MiniMax với key thật (mục 7.3), cổng quyết định có làm T1/T2 | key |
| **T1** | TTS một người kể: job pg-boss, upload server-side, chọn giọng, speed/pitch/emotion/từ điển phát âm, nghe thử, gắn audio | T0, thêm `uploadBuffer` |
| **T2** | Hai người kể: `speaker`+`segmentId` trên block, `NarrationSegment`, ghép audio, timeline | T1, quyết định 1-2 |

Mỗi giai đoạn dùng được độc lập. P1 và T0 không phụ thuộc nhau nên có thể làm song song. Thứ tự đề xuất: P1 ∥ T0 → T1 → P2/P3 → P5 → T2.

## 14. Ngoài phạm vi

ElevenLabs; trích text PDF/DOC đính kèm (spec wizard ghi rõ không nhập tự động); chat tự do; khôi phục pipeline cũ; STT/transcript; hosting/RSS/Auphonic và chọn công cụ (báo cáo nghiên cứu); state machine nhiều gate, rights register, script lock, phân vai nhiều bước (báo cáo nghiên cứu); voice clone người thật; overlap/ngắt lời giữa hai giọng.

## 15. Tiêu chí nghiệm thu P1

- Mod bấm AI rà kịch bản (phạm vi + ghi chú tự do), thấy "AI đang chạy…", tiến độ theo block và cảnh báo hiện dần. Series **không có nguồn** vẫn chạy được.
- Danh sách là checklist (tag loại, thông điệp, chưa xem/đã xem, "đã áp dụng"); bấm mở chi tiết có giải thích + đề xuất dạng diff + nút tùy chọn "Áp dụng đề xuất"; đúng hai nút Quay lại / Hoàn tất. Bấm mục thì editor tô sáng đúng đoạn.
- F5 hoặc mất kết nối SSE rồi nối lại: không mất và không trùng.
- Không có thay đổi nào vào kịch bản trước khi mod bấm Áp dụng; block đổi nội dung từ lúc chụp thì Áp dụng từ chối ("đoạn đã đổi, chạy lại") và không ghi đè.
- Double-click không tạo 2 check; vượt giới hạn → 429; AI chưa sẵn sàng (`isReady` sai) → 503, API không sập; provider từ chối → check `FAILED` nhanh (`AI_PROVIDER_AUTH/QUOTA`), không treo; mỗi check có đúng một dòng `AiCheck`.
- Log không chứa nội dung kịch bản, nguồn hay secret.
- Panel ghi "AI nghi ngờ, chưa xác minh"; không bao giờ "đã kiểm tra/đã xác minh".
