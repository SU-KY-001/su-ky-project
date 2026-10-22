# UX 07: Dock AI + thanh công cụ editor (bước Kịch bản)

Nguồn: `mockups/07-ai-dock.html`. Mock 07 **thay bố cục** của 01, 02, 03 (nội dung từng tính năng vẫn theo `ux/01`, `ux/02`, `ux/03`). Chỉ ghi ở đây những gì khác. Dữ liệu trong mock là mẫu (nguồn S1, số trang, đề xuất sửa).

## 1. Vào trang

Mod mở một tập: `Studio / <Series> / <Tên tập>` → bước **2 Kịch bản**. Trái là editor, phải là **dock "Trợ lý AI"**. Không còn tab "Trợ lý AI | Nguồn" và không còn thẻ "Soạn bản nháp" / "Viết lại đoạn" trong panel phải.

## 2. Thanh công cụ editor

Từ trái sang phải: `H1 H2 B I U` · gạch · `• 1. ❝` · (đệm giãn) · **Soạn bản nháp** · **Rà kịch bản** (nút đỏ) · **Nguồn (n)**.

- **Soạn bản nháp**: mở hộp thoại 4 bước (xem `ux/02`, đổi bước 2 ở mục 6 dưới đây). Khoá khi chưa tải được `words_per_minute`.
- **Rà kịch bản**: mở hộp thoại cấu hình rà (xem `ux/01` mục 3). Nếu dock đang thu gọn thì dock tự mở ra "Mở" rồi mới hiện hộp thoại. Sau khi rà xong, nhãn đổi thành **"Rà lại"**. Khoá khi kịch bản trống.
- **Nguồn (n)**: nút bật/tắt một **popover** "Nguồn của series" (rộng 320px, neo dưới nút). Mỗi nguồn: tên, loại · số trang · trạng thái, nút **"Chèn trích dẫn"** (chèn vào con trỏ editor). Đóng bằng click ra ngoài hoặc Esc. Nguồn không còn chiếm chỗ của dock.

Nút "Viết lại" nổi lên khi bôi đen: giữ nguyên như `ux/03`. Hướng dẫn về nó không còn nằm trong panel, chỉ còn ở placeholder editor.

## 3. Dock: 3 trạng thái

Dock nằm sát phải, cao bằng khung editor, đổi độ rộng bằng animation ~0,28 giây.

| Trạng thái | Rộng | Khi nào | Nội dung |
|---|---|---|---|
| **Thu gọn** | 48px | Mặc định khi vào trang | Một nút biểu tượng AI, **chữ dọc** "Trợ lý AI" (hoặc "Đang rà…" / "AI rà kịch bản"). Đang rà: biểu tượng quay. Rà xong: **badge** số cảnh báo còn mở (xanh ✓ nếu 0). Bấm nút → Mở. |
| **Mở** | 340px | Bấm nút thu gọn, bấm Rà kịch bản | Một cột: danh sách lỗi (theo `ux/01` mục 4). Đầu dock có nút ◀ (Thu gọn) và, nếu đang có lỗi mở, nút ⤢ (Rộng). |
| **Rộng** | 620px | Bấm một dòng lỗi, hoặc bấm đoạn gạch chân trong editor | Hai cột: **danh sách bên trái (270px)**, **chi tiết bên phải**. Nút ⤡ hoặc **Esc** → về Mở (bỏ chọn lỗi). |

Ở ≥1280px, dock đẩy editor co lại. Dưới 1280px, trạng thái Rộng **đè lên** editor (editor giữ chỗ cho dock 48px, không co).

### Nội dung dock "Mở" theo pha
- **Chưa rà**: biểu tượng AI, "AI rà kịch bản", mô tả, nút "Chạy AI rà kịch bản" (khoá nếu kịch bản trống).
- **Đang rà**: thanh tiến độ, "Đoạn n/N · đang tra nguồn …", vệt tra nguồn, nút **Hủy**. Danh sách lỗi hiện dần.
- **Đã rà**: "N cảnh báo" + nhãn "AI nghi ngờ, chưa xác minh"; dòng "AI đã tra nguồn n lần · mất x giây"; mỗi lỗi là một dòng (Đoạn N, mức độ, nhãn Đã áp dụng/Đã bỏ qua/Đã xem, câu mô tả). Chân dock: "AI có thể báo nhầm hoặc bỏ sót." + nút nhỏ **Rà lại**.

### Chi tiết lỗi (cột phải khi Rộng)
Theo `ux/01` mục 5: đoạn, mức độ, căn cứ, mô tả; **NGUỒN ĐỐI CHIẾU** (trích dẫn + "Nguồn S1 · tr. 88"); **ĐỀ XUẤT SỬA** với diff theo từ hai cột HIỆN TẠI / ĐỀ XUẤT; chân: **Bỏ qua** · **Áp dụng đề xuất** (hoặc **Đánh dấu đã xem** nếu lỗi không có đề xuất). Bấm "Nguồn S1 · tr. 88" mở popover Nguồn (nhấp nháy để mod thấy).

### Áp dụng
Bấm **Áp dụng đề xuất** → chỉ thay đúng đoạn đó trong editor (một bước hoàn tác của editor), đoạn xanh lên, dock về **Mở**, lỗi thành "Đã áp dụng". Dưới editor hiện thanh xanh "Đã áp dụng đề xuất cho Đoạn N. Chữ cũ vẫn còn trong lịch sử của editor." + **Hoàn tác (Ctrl Z)**. Bấm Hoàn tác: trả chữ cũ, lỗi về "Đã xem".

## 4. Editor khi có kết quả rà

Đoạn có lỗi: gạch chân cam (mức Vừa/Cao: đỏ). Đoạn đã xem: nhạt hơn. Đoạn đang mở trong dock: tô nền xanh nhạt. Đoạn đã áp dụng: xanh lá. **Bấm vào đoạn có gạch chân** → mở lỗi đó (dock sang Rộng, editor cuộn tới đoạn).

## 5. Phím tắt

Esc: đóng popover Nguồn → hộp thoại → Rộng về Mở. Ctrl+Z ngoài editor (khi còn thanh Hoàn tác): hoàn tác áp dụng.

## 6. Soạn bản nháp: bước 2 "Dàn ý" thiết kế lại

Các bước khác giữ nguyên `ux/02`. Bước 2 không còn là danh sách thẻ có viền với nhiều ô nhập mà là **tài liệu thu gọn**:

- Thanh tóm tắt: **"3 phần · 6 ý chính"** (trái), **"Mục tiêu ≈ 1.800 từ"** (phải), một dòng hướng dẫn: *"Bấm một phần để mở. Enter thêm ý mới, Backspace trên ý trống để xóa. Dàn ý chỉ lưu trong trình duyệt của bạn, theo từng tập."*
- Mỗi phần một dòng: mũi tên mở/thu · **tiêu đề** (sửa tại chỗ, không viền, viền đỏ nhạt khi gõ) · "N ý" · nút thùng rác (hiện khi rê chuột/đang mở). Dòng thu gọn hiện thêm **mục tiêu** một dòng.
- **Chỉ một phần mở một lúc.** Phần đang mở có nền xám nhạt: nhãn "Mục tiêu" + ô nhiều dòng tự co theo nội dung, rồi danh sách ý chính dạng gạch đầu dòng; mỗi ý là một ô không viền; nút ✕ hiện khi rê chuột vào hàng; **"+ Thêm ý"**.
- **Enter trong một ý**: thêm ý mới ngay dưới và nhảy con trỏ xuống. **Backspace trên ý trống**: xóa ý và nhảy lên ý trên.
- Cuối danh sách: nút nét đứt **"+ Thêm phần"** (thêm phần mới và mở nó, focus vào tiêu đề). Mỗi phần tối đa `OUTLINE_POINTS_MAX` ý; tối đa `OUTLINE_MAX_SECTIONS` phần, chạm giới hạn thì nút khoá kèm tooltip. Không xoá được phần cuối cùng.
- Chân: "Quay lại" · "Tạo lại dàn ý" · "Tiếp →". Phần để trống tiêu đề thì "Tiếp" khoá.

## 7. Đối chiếu với web (đã triển khai, 2026-10-22)

Đã chạy thật trên `localhost:3000` với tập fixture (1 cảnh báo): mở dock từ rail, mở lỗi, Esc, popover Nguồn, hộp thoại Soạn bản nháp, dàn ý do AI tạo (một lần gọi model thật), Enter thêm ý, mở/thu phần.

| # | Mock 07 | Web | Trạng thái |
|---|---|---|---|
| 1 | Dock 3 trạng thái 48/340/620px, animation | `PodcastScriptStep` giữ `dock`; `AiAssistantPanel` vẽ rail / Mở / Rộng | Có. Đã thấy 340px sau Esc. Chưa thử dưới 1280px (đè lên editor) |
| 2 | Rail: biểu tượng, chữ dọc, badge số lỗi, quay khi rà | Có (badge tính lỗi chưa xem và chưa áp dụng) | Có; chưa thấy trạng thái đang rà |
| 3 | Rộng: danh sách trái 270px, chi tiết phải; ⤡ và Esc về Mở | Có | Có. Hộp thoại/popover Radix chặn Esc trước |
| 4 | Soạn bản nháp, Rà kịch bản, Nguồn nằm trên thanh công cụ editor | Có; xoá `ComposeCards` | Có |
| 5 | Nhãn nút đổi "Rà lại" sau khi rà xong | Nhãn luôn là "Rà kịch bản" (trạng thái rà nằm trong dock) | Khác; nhỏ |
| 6 | Nguồn là popover; bấm "Nguồn S1 · tr. 88" trong chi tiết lỗi làm popover nháy | Popover có; **liên kết từ chi tiết lỗi chưa nối** | Thiếu |
| 7 | Bấm đoạn gạch chân trong editor mở lỗi | Chưa có (chỉ mở từ danh sách) | Thiếu |
| 8 | Thanh "Đã áp dụng… Hoàn tác (Ctrl Z)" dưới editor | Không có thanh riêng: hoàn tác bằng Ctrl+Z của editor | Khác, giữ như `ux/01` mục 12 |
| 9 | Dàn ý dạng tài liệu thu gọn, mở một phần, Enter/Backspace, "+ Thêm phần" nét đứt | Có (`DraftOutlineStep`). Ý chính là ô nhiều dòng tự co. Backspace trên ý trống chưa thử trên trình duyệt | Có |
| 10 | Nút khoá/tooltip khi chạm giới hạn số phần | Nút khoá + tooltip "Đã đủ số phần tối đa"; số phần tối thiểu chỉ kiểm bằng nút xoá (không xoá phần cuối) | Có |

Ghi chú kỹ thuật: một quy tắc CSS toàn cục (`button, input, textarea, select { font: inherit }`, không nằm trong layer) thắng các class `text-*`/`font-*` của Tailwind trên ô nhập; dàn ý dùng `text-sm!` / `font-bold!`.
