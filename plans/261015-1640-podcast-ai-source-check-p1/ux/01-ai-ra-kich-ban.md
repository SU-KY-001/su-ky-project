# UX 01: AI rà kịch bản

Nguồn: `mockups/01-source-check.html`. Phạm vi: P1 (có plan, có backend). Chữ trong dấu `" "` là chữ trên màn hình của mockup.

## 1. Vào trang

Mod mở một tập: `Studio / <Series> / <Tên tập>` → bước **2 Kịch bản** trong thanh bước (Thông tin ✓ · **Kịch bản** · Giọng đọc · Xem lại). Trên cùng: breadcrumb, chữ "Đã lưu hh:mm", nút "Tiếp tục".

Bố cục hai cột:
- **Trái**: thẻ editor (thanh công cụ B / I / H2, vùng soạn gõ trực tiếp được) + dòng chú thích nhỏ: *"Đoạn nào đã đổi từ lúc AI rà, nút 'Áp dụng đề xuất' sẽ từ chối để không ghi đè chữ của bạn."*
- **Phải**: panel **"Trợ lý AI"**. Panel có đúng 4 màn, chỉ một màn hiện tại một lúc: `idle` → `running` → `list` → `detail`.

## 2. Màn `idle` (chưa rà)

Hiện:
- Tiêu đề "AI rà kịch bản".
- Mô tả: AI đọc kịch bản và nhắc chỗ có thể sai sự thật, chỗ khó đọc thành tiếng hoặc mạch chưa liền; chỉ là cảnh báo nhẹ, mod quyết định, AI không tự sửa.
- Nút chính **"Bắt đầu rà"** (icon kính lúp).
- Dòng nhỏ **"Lần rà gần nhất: chưa có."**
- Hộp cảnh báo vàng (ẩn) dùng để báo lỗi khi gọi AI thất bại: *"Không chạy được: <lý do>…"*.

## 3. Hộp thoại cấu hình, 2 bước (có thanh chấm tiến trình 2 chấm)

Bấm **"Bắt đầu rà"** (hoặc "Rà lại" ở màn list) → mở hộp thoại.

**Bước 1: "Rà phần nào?"**
- Radio **"Cả kịch bản"** (kèm số đoạn, mock: "5 đoạn."), mặc định chọn.
- Radio **"Đoạn đang chọn"**. Chỉ dùng được khi con trỏ / vùng bôi đen **đang nằm trong một đoạn của editor** tại lúc bấm nút mở hộp thoại. Dòng phụ:
  - có đoạn: *"Đoạn N đang chọn."*
  - không có: *"Bấm vào một đoạn trong editor trước để dùng lựa chọn này."*, radio bị khóa, ô mờ 50%, tự trả về "Cả kịch bản".
- Footer: "Đóng" · "Tiếp →".

**Bước 2: "Ghi chú cho AI"**
- Ô nhiều dòng "Ghi chú cho AI" (tùy chọn). Gợi ý: *"AI có thể đọc nguồn của series làm nền, nếu series có."* Placeholder: *"Ví dụ: bỏ qua đoạn mở đầu vì đó là lời dẫn"*.
- Hộp thông tin: *"Nội dung kịch bản được gửi tới nhà cung cấp AI. AI không ghi gì vào kịch bản."*
- Footer: "Quay lại" · **"Chạy"** (icon play). Bấm Chạy: đóng hộp thoại, panel sang `running`.

Esc / bấm nền mờ = đóng.

## 4. Màn `running`

- "AI đang rà…" + nhãn xanh "Đang chạy".
- **Thanh tiến độ** (meter).
- Dòng: *"Bạn vẫn có thể tiếp tục gõ kịch bản trong lúc chờ."*
- Nút **"Hủy"** (icon X): hủy lượt → về `idle`, xóa kết quả, bỏ mọi tô màu trên editor.
- Lúc bắt đầu, hệ thống **chụp** các đoạn gửi đi (nội dung + hash tại thời điểm đó). Mọi so sánh "đoạn đã đổi" về sau dùng bản chụp này.
- Lỗi (mạng, 503, 429…) → về `idle`, hộp vàng báo lỗi.
- Xong → tự sang `list`.

## 5. Màn `list` (danh sách cảnh báo, dạng checklist)

Đầu:
- Tiêu đề lớn "N cảnh báo" (hoặc "Không có cảnh báo").
- Nhãn vàng cố định: **"AI nghi ngờ, chưa xác minh"**.
- Dòng tóm tắt: *"x đã xem, y chưa xem"*.
- Dòng vết (trace): *"AI đã tra nguồn N lần, mở tr. 110, 214 (hoặc 'không trang nào'), mất 12.3 giây."*

Mỗi cảnh báo là một nút-dòng gồm:
- Nhãn loại, đổi theo loại:
  - `FACT_DOUBT` → **"Nghi sai"** (đỏ)
  - `READABILITY` → **"Đọc thành tiếng"** (xanh)
  - `basis = NOT_FOUND` → **"Chưa thấy trong nguồn"** (xám)
- "Đoạn N" (số đoạn).
- Câu cảnh báo (đã cắt đuôi "AI nghi ngờ…").
- Bên phải: nhãn **"đã xem"** (xanh) / **"chưa xem"** (xám); thêm nhãn **"đã áp dụng"** (xanh dương) nếu đã áp dụng.

Chân: nút nhỏ **"Rà lại"** (mở lại hộp thoại ở mục 3), dòng *"AI có thể báo nhầm hoặc bỏ sót. Bấm một dòng để xem chi tiết."*

**Tô màu trên editor** (cùng lúc với danh sách):
- đoạn có cảnh báo chưa áp dụng: gạch chân **cam**;
- đoạn đã áp dụng: gạch chân **xanh lá**;
- đoạn đang mở chi tiết: nền xanh nhạt + viền.

## 6. Màn `detail` (bấm một dòng)

Khi mở: editor **cuộn tới giữa màn hình** và đánh dấu đoạn đó; panel hiện:

1. Hàng nhãn: loại (như trên) + **"Mức cao / vừa / thấp"**; bên phải "Đoạn N".
2. Nhãn "AI nghi ngờ, chưa xác minh".
3. Câu giải thích (message).
4. **"Đề xuất sửa"**: khối diff theo từ, chữ xóa gạch đỏ, chữ thêm nền xanh. Chỉ hiện khi AI có đề xuất (`suggestion`).
5. **"Nguồn đối chiếu"**: mỗi bằng chứng là một trích dẫn *"…"* + *"<tên nguồn>, tr. <số trang>"*. Nếu `NOT_FOUND`: *"Hệ thống chưa dẫn được câu nguồn nguyên văn cho chỗ này. Điều đó không có nghĩa là sai."*
6. Hộp vàng **"Đoạn đã đổi, chạy lại. Hệ thống không ghi đè chữ của bạn."** (hiện khi đoạn mất / hash khác bản chụp và chưa áp dụng).
7. Hộp xanh **"Đã áp dụng vào đoạn này. Bấm Ctrl+Z trong editor để hoàn tác."** (sau khi áp dụng).
8. Nút **"Áp dụng đề xuất"** (ẩn nếu không có đề xuất hoặc đã áp dụng).
9. Đúng hai nút chân: **"Quay lại"** (về list) · **"Hoàn tất"**.

### Hành vi nút
- **Áp dụng đề xuất**: so hash đoạn hiện tại với hash đã chụp.
  - Khớp → **thay nguyên văn đoạn đó trong editor bằng đề xuất** (một bước hoàn tác được bằng Ctrl+Z), đánh dấu `appliedAt`, đoạn chuyển gạch xanh lá, nút biến mất, hiện hộp xanh. Ghi nhận lên server.
  - Lệch / đoạn mất → không ghi gì, hiện hộp vàng.
- **Hoàn tất**: đánh dấu mục `REVIEWED` ("đã xem"), về `list`. Không biết mod có sửa hay không; chỉ nghĩa là đã xem.
- **Quay lại**: về `list`, không đổi trạng thái.

## 7. Quy tắc cứng

- AI **không bao giờ** ghi gì vào kịch bản. Chỉ nút "Áp dụng đề xuất" mới thay chữ, và chỉ khi hash khớp.
- Mọi chữ vẫn là "AI nghi ngờ, chưa xác minh". "0 cảnh báo" không nghĩa là đúng.
- Mod vẫn gõ được trong lúc `running`.
- Hủy giữa chừng: bỏ kết quả.
- Mockup thật sự gọi agent qua server spike (`localhost:8799/check`), kể cả dòng vết tra nguồn.

## 8. Đối chiếu web hiện tại (`apps/web/.../podcast-production/components`)

Đã đọc code **và chạy thật** (web `localhost:3000`, API `:3005`, đăng nhập `mod@suky.local`, tập fixture `2069184a…`, model thật `gpt-5.6-luna`, 2026-10-22). Cột "Web" dưới đây là quan sát trình duyệt khi có ghi "Quan sát", còn lại là từ code.

**Kết quả chạy thật (quan sát):**
- Rà thật, 5 đoạn: lượt SUCCEEDED, 2 cảnh báo (`b2` `CONTRADICTED` có đề xuất + 3 trích dẫn tr. 110; `b3` `NOT_FOUND`).
- Mở cảnh báo `b2`: có khối "Nguồn đối chiếu", **"Đề xuất sửa" dạng diff**, nút **"Áp dụng đề xuất"** (hiện thật khi `suggestion` ≠ null).
- Bấm Áp dụng: đoạn **`b2`** (đoạn khớp hash của cảnh báo, qua `locateBlock`, **không phải vùng đang chọn**) đổi thành "Năm 938, Ngô Quyền là người chỉ huy trận đánh trên sông Bạch Đằng, đập tan quân Nam Hán."; 5 đoạn vẫn nguyên; API ghi `appliedAt`; **Ctrl+Z trong editor hoàn tác đúng** (DB vẫn giữ `appliedAt`, đúng thiết kế).
- **Lỗi quan sát 1:** ngay sau Áp dụng, panel hiện **cùng lúc** "Đã áp dụng" và hộp vàng "Đoạn đã đổi, chạy lại. Chữ của bạn không bị ghi đè." kèm nút "Chạy lại với đoạn đang chọn". Nguyên nhân từ code: `conflictNotice` (`AiAssistantPanel.tsx:42-45`) chỉ xét `item.suggestion && located === "conflict"` mà không loại mục đã `appliedAt`; sau khi thay, hash đoạn không còn khớp bản chụp nên `located` = conflict. Mock ẩn hộp vàng khi `appliedAt`.
- **Lỗi quan sát 2:** mở cảnh báo không tô/đánh dấu đoạn trong editor (không thấy `b2` được chọn hay tô màu); cảnh báo thứ hai `NOT_FOUND` hiện nhãn "nghi sai" thay vì "Chưa thấy trong nguồn".
- **Dữ liệu fixture sai:** script fixture phase 4 là **một đoạn duy nhất** chứa `\n\n` trong text; lượt rà đầu chỉ gửi 1 khối (`totalBlocks = 1`, ref `b0` dù nội dung nói về câu Bạch Đằng) và không bao giờ có thể áp dụng một câu. Tôi gõ lại 5 đoạn thật trong editor (tập fixture đã bị đổi nội dung này) rồi mới thấy hành vi đúng. Đây là lỗi của script seed, chưa sửa.
- Chưa kiểm bằng trình duyệt: nhánh Hủy khi đang chạy, thanh tiến độ, xung đột hash khi gõ giữa chừng, F5 giữa lượt chạy.

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Tab "Trợ lý AI" cạnh tab "Nguồn" | Có (`PodcastScriptStep`) | Có |
| 2 | Màn idle: mô tả dài, "Bắt đầu rà", "Lần rà gần nhất" | Hộp nét đứt một câu + nút "Chạy AI rà kịch bản"; tải lại thấy lượt gần nhất từ DB | Thiếu mô tả đầy đủ và dòng "Lần rà gần nhất" |
| 3 | Hộp thoại 2 bước, có đếm đoạn, chấm tiến trình, "Tiếp/Quay lại" | 1 form duy nhất (phạm vi + ghi chú + chạy) | Sai cấu trúc; thiếu "N đoạn", thiếu hint "Đoạn N đang chọn" |
| 4 | Running: thanh tiến độ, "vẫn gõ được", Hủy → về idle | Spinner + "Đã xét x/y đoạn · s giây · n cảnh báo", Hủy → trạng thái CANCELLED (hiện list dở dang) | Thiếu thanh tiến độ; Hủy khác ý mock (mock bỏ hết kết quả) |
| 5 | List: "N cảnh báo", tóm tắt đã xem/chưa, **dòng vết tra nguồn** | Có đếm + đã xem; **không có dòng vết** | Thiếu dòng vết (số lần tra, trang đã mở, giây) |
| 6 | Dòng cảnh báo: nhãn loại màu, "Đoạn N", nhãn mới "Chưa thấy trong nguồn" | Nhãn loại chữ thường chung màu; **không có "Đoạn N"**; `NOT_FOUND` vẫn hiện "nghi sai" | Thiếu "Đoạn N", thiếu nhãn NOT_FOUND, thiếu màu theo loại |
| 7 | **Tô màu đoạn trên editor** (cam / xanh / đang chọn) | `focusBlock` chỉ bôi đen và cuộn; **không tô** | **Thiếu hẳn** |
| 8 | Detail: nhãn **mức** cao/vừa/thấp | Không hiện mức (dữ liệu `severity` có trong item) | Thiếu |
| 9 | Detail: "Đề xuất sửa" diff + nút "Áp dụng đề xuất" | **Quan sát:** có và chạy đúng (xem trên) khi `suggestion` ≠ null. Lượt rà đầu trên fixture hỏng không có đề xuất (`sug: null`) | Có. Lý do bạn không thấy trước đó chưa xác lập: một lượt cũ trên fixture có `CONTRADICTED` nhưng `suggestion = null` (đã đọc từ API); `NOT_FOUND` thì luôn không có đề xuất theo validator. Không chứng minh được đó là nguyên nhân ở máy bạn |
| 10 | Detail: thứ tự "Đề xuất sửa" rồi "Nguồn đối chiếu" | Web: nguồn trước, đề xuất sau; nguồn chỉ hiện khi `CONTRADICTED` | Khác thứ tự; nhỏ |
| 11 | Sau áp dụng: hộp xanh "Bấm Ctrl+Z để hoàn tác" | Chỉ chữ "Đã áp dụng" | Thiếu hướng dẫn hoàn tác |
| 12 | Hộp vàng "Đoạn đã đổi, chạy lại" + nút chạy lại | Có (kèm nút "Chạy lại với đoạn đang chọn") | Có |
| 13 | Hoàn tất / Quay lại | Có | Có |
| 14 | Loại `READABILITY` ("Đọc thành tiếng") | Backend hoãn theo plan; web có nhãn nhưng không bao giờ có dữ liệu | Thiếu ở backend |
| 15 | Thanh trên cùng "Đã lưu hh:mm" | "Đã lưu tự động" không có giờ | Thiếu giờ |
| 16 | Cảnh báo tới dần theo lô khi đang chạy | Web nhận SSE nhưng chỉ hiện số "n cảnh báo", chưa hiện danh sách tới khi xong | Khác kỳ vọng "hiện dần" của plan |
