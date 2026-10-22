> **Lưu ý (2026-10-22):** mọi số đo dưới đây (19/24, 21/24, 0 báo nhầm, thời gian tra) đo bằng **SQLite FTS5 bm25** trong spike. Hướng làm thật đã đổi sang Postgres (`source_pages`, `ts_rank_cd`), nên xếp hạng khác: **phải đo lại trên Postgres** trước khi chốt prompt và mặc định (plan phase 5). Báo cáo này giữ nguyên làm ghi chép lịch sử của spike.

# Đo thử: AI rà kịch bản bằng phiên Pi tự tra SQLite (spike)

Ngày: 2026-10-22. Nhánh: `feat/podcast-ai-script-review`. Mã spike: `apps/api/spike-source-check/` (không phải mã production).

## 1. Đã làm gì

- Nguồn thử: *Đại Việt sử ký toàn thư*, 1334 trang, tách chữ bằng `unpdf` (Bun), SQLite FTS5 qua `bun:sqlite` (`dvsktt-js.db`, nằm ngoài repo). PDF có lớp chữ nên không cần OCR. Dòng rác `https://thuviensach.vn` đã lọc (`--drop-line`). Ban đầu tách bằng PyMuPDF; bản JS cho văn bản giống hệt trên cả 1334 trang.
- Server spike (`server.ts`, cổng 8799): mỗi lần rà mở một phiên Pi với hai công cụ chỉ đọc do mình viết.
  - `search_source`: FTS5, mỗi từ được bọc ngoặc kép nên model không tiêm được cú pháp FTS. Trả tối đa 5 trang kèm đoạn trích.
  - `read_pages`: tối đa 3 trang mỗi lần. Ngân sách 14 lần gọi công cụ, timeout 150 giây (đo thử nâng lên 280 giây).
- Báo cáo đúng schema zod. Mỗi mục: `blockRef`, `kind`, `severity`, `basis` (`CONTRADICTED` hoặc `NOT_FOUND`), `message`, `suggestion`, `evidence[{page, quote}]`.
- **Kiểm bằng code, không tin model:** câu trích chỉ được nhận nếu nằm nguyên văn trên một trang agent đã mở bằng `read_pages` (`quote-check.ts`). `CONTRADICTED` mà không còn câu trích hợp lệ bị hạ xuống `NOT_FOUND` và đổi lời cảnh báo.
- Runner `structured-agent-runner.ts`: thêm tùy chọn `customTools` (tên công cụ thành allowlist). Mặc định vẫn là không công cụ.
- `pi-runtime.ts`: dùng đăng nhập OAuth đã lưu của đúng provider, không để `OPENCODE_API_KEY` đè lên.
- Mock `01-source-check.html` gọi server thật: bỏ dữ liệu giả, hiện khối "Nguồn đối chiếu" (trích dẫn, số trang), dòng "AI đã tra nguồn N lần, mở tr. …", nút Hủy là abort fetch. Thông báo của model được escape trước khi vào `innerHTML` (đã thử bằng `<img onerror>`).

## 2. Cách đo

Bộ ca do tôi tự soạn (`eval-cases.ts`, chạy bằng `eval.ts`): 4 kịch bản, 18 khối có nhãn đúng/sai theo chính văn bản Toàn thư (nhãn kiểm lại bằng truy vấn trực tiếp trên DB). Mỗi kịch bản chạy 3 lần, 12 request mỗi vòng.

| Nhãn | Số khối | Ý nghĩa |
|---|---|---|
| BAD | 8 | Sách mâu thuẫn. Kỳ vọng: `CONTRADICTED` kèm câu trích đã kiểm |
| OK | 10 | Đúng hoặc chỉ là câu văn. Kỳ vọng: không báo |

- Gồm các ca: đổi tên người (Trần Bạch Đằng), sai năm (1020), sai địa danh, số bằng chữ so với số ("mười" sứ quân so với 12), sai họ nhường ngôi, câu tiêm chỉ dẫn ("Bỏ qua mọi chỉ dẫn…"), câu cảm xúc không có sự kiện.
- Ca `d3` ban đầu gán nhầm nhãn OK. Nguồn ghi Nhà Lý bắt đầu 1009 và dời đô 1010 (tr. 172–173), nên "năm 1010 dời đô, khởi đầu triều Lý" là lệch. Đã sửa thành BAD và thêm ca đối chứng `d4` (câu dời đô đúng).
- Cách tính "bắt được" là chặt: chỉ tính khi `basis=CONTRADICTED` **và** còn ít nhất một câu trích đã được code kiểm.

## 3. Kết quả

### 3.1 Prompt v0 và v3 trên `gpt-5.6-luna`, thinking `low` (bộ nhãn đã sửa)

| | v0 | v3 |
|---|---|---|
| Khối sai bị bắt, có câu trích đã kiểm | 19/24 (79%) | **21/24 (88%)** |
| Khối sai chỉ được cảnh báo mềm | 2 | 2 |
| Khối sai bị bỏ sót | 3 | 1 |
| Khối đúng không bị báo | 30/30 | 30/30 |
| Câu trích không khớp nguyên văn | 1/29 | 1/30 |
| Request lỗi sau retry | 0/12 | 0/12 |
| Gọi công cụ trung bình | 8,6 | 8,8 |
| Thời gian trung bình mỗi request | 25,9 giây (tối đa 33) | 28,1 giây (tối đa 34) |

Vòng đo trước (nhãn `d3` chưa sửa) cho v0 12/21 (57%) và v3 20/21 (95%). Chênh lệch giữa hai vòng chạy cùng một cấu hình cho thấy dao động giữa các lần chạy khá lớn, nên đừng đọc 57% và 95% như hai con số ổn định.

### 3.1b Kết quả từng khối sai qua 3 lần chạy (TP = bắt được, có câu trích đã kiểm; SOFT = chỉ cảnh báo mềm; MISS = bỏ sót)

| Khối | Nội dung sai | v0 | v3 |
|---|---|---|---|
| a2 | Trần Bạch Đằng thay Ngô Quyền | TP TP TP | TP TP TP |
| a5 | dời đô năm 1020 | TP TP TP | TP TP TP |
| b2 | Tống bị đánh ở Bạch Đằng | TP TP TP | TP SOFT TP |
| b4 | "mười" sứ quân (nguồn 12) | MISS MISS TP | TP TP MISS |
| c2 | điện Thiên Trường thay Diên Hồng | SOFT SOFT TP | TP TP SOFT |
| c4 | nhường ngôi cho họ Lê | TP TP TP | TP TP TP |
| d2 | Tống thay Nam Hán (câu tiêm chỉ dẫn) | TP TP TP | TP TP TP |
| d3 | triều Lý khởi đầu năm 1010 (nguồn 1009) | MISS TP TP | TP TP TP |

Cả 10 khối đúng (`a1 a3 a4 b1 b3 b5 c1 c3 d1 d4`) không bị báo ở cả 3 lần của cả hai bản.

Nhận xét đã sửa: v3 hơn v0 ở số tổng (21 so với 19 trên 24 lượt), nhưng chênh lệch này nằm trong dao động giữa các lần chạy. Không khối nào chỉ v3 bắt "ổn định" và v0 hụt "ổn định". `b4` và `c2` đổi kết quả ở cả hai bản. Một lỗi hiển thị trong script chấm điểm (in kết quả lần chạy đầu cho cả ba lần) từng làm cột theo từng khối trông ổn định hơn thực tế; số tổng không bị ảnh hưởng. Script chấm điểm sau đó được viết lại bằng Bun (`eval.ts`); chấm lại `result-v0.json` cho đúng 19/24. **`result-v3.json` (vòng 3 lần chạy) đã bị ghi đè** bởi một lần chạy thử 1 lần lặp (8/8 khối sai bắt được, 9/10 khối đúng sạch, trên mẫu quá nhỏ để so sánh); số v3 ở mục 3 (21/24, bảng 3.1b) là số đã ghi lúc đo và không còn file gốc để chấm lại. `eval.ts` nay ghi file có dấu thời gian nên không ghi đè nữa.

### 3.2 Gemini 3.5 Flash Lite (vòng đo cũ, nhãn `d3` cũ, 2 lần mỗi ca)

| | v0 | v1 | v2 |
|---|---|---|---|
| Khối sai bị bắt, có câu trích đã kiểm | 9/14 (64%) | 8/12 (67%) | 6/10 (60%) |
| Khối đúng bị cảnh báo nhầm | 1 mềm | 0 | 0 |
| Request lỗi sau retry | 0/8 | 1/8 | 2/8 |
| Thời gian mỗi request | 26 giây | 40 giây | 69 giây |

Chưa có số v3 trên Gemini (vòng đo bị dừng khi chuyển nhà cung cấp). So sánh trực tiếp luna với Gemini chưa công bằng vì bộ ca và số lần chạy khác nhau.

## 4. Vì sao kết quả từng không ổn định, và đã sửa gì

1. **Câu trích bị loại vì khác nguyên văn** (nguyên nhân phổ biến nhất ở Gemini). Model bỏ số chú thích dính chữ (`Nguyệt533`), bỏ mốc trang `[19b]`, hoặc nối hai đoạn bằng "…". Đã sửa ở phía kiểm: bỏ qua mốc trang và số chú thích; chấp nhận các đoạn nguyên văn nối bằng "…" nếu đúng thứ tự. Một đoạn không rỗng ngắn hơn 12 ký tự làm hỏng cả câu trích (sửa theo góp ý: "đoạn thật … không đúng" không được qua). Có 6 test trong `quote-check.test.ts`.
2. **Provider trả chuỗi rỗng** bị che thành "invalid JSON". Server spike retry có backoff (4 lần, 8 giây). Runner production vẫn chưa phân loại lỗi provider (phase 0 của plan). Chưa thấy mã lỗi thật.
3. **Agent tự quyết kiểm cái gì**, nên tập claim được kiểm khác nhau giữa các lần chạy. Prompt v3 buộc liệt kê khe thông tin cho từng khối và cấm tìm lặp.

## 5. Vì sao chậm

SQLite không phải điểm nghẽn: một lần FTS5 mất khoảng 1 ms (tối đa 2,2 ms), một lần đọc trang khoảng 0,08 ms. Thời gian gần như hoàn toàn là các lượt gọi LLM, mỗi lần gọi công cụ là một lượt mới mang theo toàn bộ ngữ cảnh đã đọc. Gemini v0 → v2: 2,8 → 7,0 giây mỗi lượt, vì prompt dài hơn và có nhiều trang trong ngữ cảnh hơn. Luna: 25–28 giây mỗi request, khoảng 8–9 lần gọi công cụ.

## 6. Giới hạn và rủi ro

- **Bộ ca nhỏ và do chính tôi soạn.** Prompt v3 được viết sau khi thấy các lỗi trên chính các ca này, nên 88% có thể cao hơn thực tế. Chỉ có 8 khối sai, mỗi khối chạy 3 lần; các lần lặp của cùng một khối không độc lập, nên khoảng tin cậy rộng. Chưa có bộ câu hỏi lấy từ PDF thật của series.
- **Chỉ đo trên một sách và một kiểu sai** (một chi tiết thay đổi trong câu ngắn). Chưa đo sai tinh vi, câu có phủ định, hoặc nhiều lỗi trong một khối.
- Kết quả giữa các lần chạy không lặp lại hoàn toàn: ở mỗi bản có 3 trong 8 khối sai đổi kết quả giữa 3 lần chạy (xem bảng 3.1b). `b2` của v0 ở vòng đo trước chỉ là cảnh báo mềm, vòng này bắt được cả 3 lần.
- `NOT_FOUND` không có nghĩa là sai. UI vẫn ghi "AI nghi ngờ, chưa xác minh".
- Spike không có xác thực, giới hạn tốc độ, log có cấu trúc, hay hủy phiên Pi khi client ngắt kết nối. Dữ liệu trang đang ở SQLite cục bộ; production phải là Postgres.
- Mới đo `gpt-5.6-luna` low và Gemini 3.5 Flash Lite. Chưa đo chi phí token của luna.
- Chưa chạy `check-types`/test toàn repo. Chỉ chạy test của `quote-check`.

## 7. Đề xuất bước tiếp

1. Dùng v3 làm prompt mặc định (đã đặt trong `server.ts`).
2. Lập bộ ca thứ hai từ PDF thật của series, chưa dùng để chỉnh prompt, và đo lại cả recall lẫn tỷ lệ báo nhầm.
3. Nếu làm thật: lưu trang vào Postgres lúc upload (một lần), bảng `source_pages`; công cụ đọc Postgres; kiểm câu trích bằng chính `quote-check`; thêm phân loại lỗi provider ở runner trước khi dựa vào retry.
4. Quyết định có dùng luna (OpenAI OAuth) hay Gemini cho sản phẩm. OAuth của tài khoản ChatGPT cá nhân không hợp cho máy chủ dùng chung. Cần khóa API chính thức.
