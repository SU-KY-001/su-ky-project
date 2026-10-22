# UX 03: Viết lại đoạn đang chọn

Nguồn: `mockups/03-rewrite.html`. Phạm vi: phase 6 (chưa làm). Mock dùng 7 câu mẫu cố định (không phải AI thật).

## 1. Vào trang

Cùng bước **2 Kịch bản** của tập. Editor trái (ví dụ có tiêu đề h3 "Bối cảnh" + 4 đoạn), panel "Trợ lý AI" phải.

Panel phải có thẻ **"Viết lại đoạn"**:
- *"Bôi đen phần bạn muốn viết lại trong editor. Nút 'Viết lại' sẽ hiện ngay cạnh phần bôi đen."*
- *"AI chỉ đổi cách nói. Nếu bản viết lại có số hoặc tên mới, thẻ sẽ hiện cảnh báo nhẹ để bạn tự kiểm tra; bản đó vẫn chọn được."*
- Không có nút nào trong thẻ: lối vào duy nhất là **bôi đen trong editor**.

Dưới editor: *"Thử: bôi đen một phần của một câu (không cần hết câu), hoặc kéo qua nhiều đoạn. Vùng chọn tự mở rộng tới hết câu, tối đa 3 đoạn."*

## 2. Bôi đen và nút nổi

Mod kéo chuột chọn chữ trong editor, **thả chuột** (`mouseup`):

1. Hệ thống **mở rộng vùng chọn**:
   - đầu vùng lùi về **đầu câu**; bỏ khoảng trắng đầu;
   - cuối vùng tiến tới **hết câu** (dấu `.` `!` `?`); bỏ khoảng trắng cuối;
   - nếu kéo sang đoạn sau nhưng điểm cuối nằm **ngay đầu đoạn** (0 ký tự) → bỏ đoạn đó;
   - **tối đa 3 đoạn** (`MAX_BLOCKS`, là cấu hình); nhiều hơn thì cắt còn 3 đoạn đầu và nhớ cờ "bị cắt".
2. Vùng chọn đã mở rộng **hiện ngay trên editor** (bôi đen lại đúng phạm vi mới) để mod thấy AI sẽ viết lại gì.
3. Nút nổi tối **"✦ Viết lại"** hiện **phía trên vùng chọn** (cách ~44px).
4. Bôi đen rỗng / click thường / bôi ngoài editor → nút nổi **biến mất**.
5. Bấm nút nổi **không làm mất vùng chọn** (mousedown bị chặn).

## 3. Hộp thoại, bước 1 "Đoạn bạn chọn" (2 chấm)

Bấm nút nổi → mở hộp thoại "Viết lại đoạn đang chọn".

- **"Phần được viết lại"**: khối chữ đúng phạm vi đã mở rộng (các câu nối bằng dấu cách).
- Dòng giải thích: *"Bạn chọn X ký tự. Phạm vi mở rộng thành N câu, Y ký tự."* Nếu bị cắt: thêm *"Bạn chọn quá 3 đoạn, chỉ lấy 3 đoạn đầu."*
- **"Bạn muốn viết lại thế nào?"**: ô nhiều dòng **tự do** (placeholder *"ngắn gọn hơn, giữ cụm 'trung tâm của trời đất'"*).
- **"Gợi ý nhanh"**: 3 nút **Ngắn hơn / Dễ nghe hơn / Tự nhiên hơn**. Bấm = **điền sẵn** một câu chỉ dẫn vào ô trên (không gửi, mod vẫn sửa được) và focus ô đó.
- **"Số bản viết lại"**: ô số 1–10, mặc định 3 (`MAX_VARIANTS` là cấu hình). Rời ô thì giá trị tự **kẹp** về 1–10, rỗng/sai → 3.
- Hộp thông tin: *"AI xem thêm đoạn trước và sau để giữ mạch, chỉ viết lại phần bạn chọn. Bạn luôn là người chọn và quyết định."*
- Chân: "Đóng" · **"✦ Viết lại"**.

## 4. Bước 2 "Chọn bản viết lại"

Bấm "Viết lại":
1. Sang bước 2; nút **"Thay…"** và **"Chèn…"** bị khóa.
2. Hiện hộp xanh xoay *"AI đang chạy…"* (mock 1,5 giây).
3. Hết chờ: hiện danh sách **N thẻ** (cuộn được, tối đa ~420px, cuộn lên đầu):
   - radio + **"Bản k"** + nhãn **"Ngắn hơn x%"** hoặc **"Dài hơn x%"** (so với độ dài gốc);
   - **diff**: bản gốc gạch đỏ, bản mới nền xanh;
   - nếu bản mới có **số hoặc tên riêng mới** mà đoạn gốc không có → hộp vàng nhỏ: *"Có số/tên mới: 968, Đinh Tiên Hoàng — hãy kiểm tra. Đây là gợi ý tự động, không phải xác minh."* **Bản đó vẫn chọn được** (cảnh báo mềm, không loại).
4. Dưới danh sách: *"Chọn một bản để bật nút bên dưới. Dùng một lần; Ctrl+Z trong editor hoàn tác việc thay hoặc chèn."*
5. Chọn một radio → bật hai nút chân.

Chân: **"Quay lại"** (về bước 1) · **"Bỏ"** (đóng) · **"Chèn dưới đoạn"** · **"Thay đoạn đã chọn"**.

- **Quay lại / Bỏ / Đóng** khi đang chờ AI → **hủy** kết quả đang chờ (kết quả về sau bị bỏ, không hiện).
- Chạy lại ("Viết lại" ở bước 1) khi đang có lượt cũ → lượt cũ bị bỏ, chỉ nhận lượt mới.

### Quy tắc dò "số/tên mới" (client, heuristic)
Với mỗi từ trong bản mới (bỏ dấu câu hai đầu): coi là *mới* nếu **chứa chữ số**, hoặc **viết hoa và không đứng đầu câu**, mà **không có** trong tập từ của bản gốc (so không phân biệt hoa/thường). Chỉ là gợi ý, **không phải xác minh** (bỏ sót phủ định, đảo chủ ngữ, thêm chữ thường).

## 5. Hai hành động chốt

- **"Thay đoạn đã chọn"**: xóa nội dung vùng chọn, chèn chữ của bản đã chọn vào chỗ đó; các đoạn dư (từ đoạn thứ 2 trở đi) nếu rỗng thì **bị xóa**. Đóng hộp thoại. Một bước hoàn tác (Ctrl+Z).
- **"Chèn dưới đoạn"**: **không đụng bản gốc**; thêm **đoạn mới** ngay sau đoạn cuối của vùng chọn, có nhãn nhỏ **"AI viết lại"** ở cuối đoạn. Đóng hộp thoại.
- Dùng một lần: mỗi lần mở hộp thoại là một lượt mới.

## 6. Quy tắc cứng

- AI chỉ đổi cách nói, giữ nguyên dữ kiện; không tự ghi vào kịch bản.
- Mọi ô chỉ dẫn là tự do; chip chỉ điền sẵn.
- Phạm vi gửi AI: các câu đã mở rộng + đoạn trước và đoạn sau để giữ mạch.
- Phải kiểm hash/vị trí lúc Thay (như UX 01): nếu mod gõ vào vùng đó trong lúc chờ thì không ghi đè. (Mock chưa có; spec phase 6 bắt buộc đối chiếu hash.)

## 7. Đối chiếu web hiện tại

Đã đọc: `RichScriptEditor.tsx` (handle + toolbar), `aiCheck/editorBlocks.ts`, grep toàn `apps/api/src`, `packages` không có route/prompt "rewrite".

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Thẻ "Viết lại đoạn" trong panel | Không có | Thiếu |
| 2 | Nút nổi "✦ Viết lại" khi bôi đen | Editor không có bubble/floating menu (grep `Bubble`, `selectionchange` không có) | **Thiếu hẳn** |
| 3 | Mở rộng vùng chọn tới hết câu, tối đa 3 đoạn, hiện lại trên editor | Không có. Hiện chỉ có `selectionBlocks` (chọn theo **cả khối**) | Thiếu |
| 4 | Hộp thoại 2 bước: ô chỉ dẫn, chip điền, số bản 1–10 | Không có | Thiếu |
| 5 | Danh sách bản viết lại + diff + % ngắn/dài + cảnh báo số/tên mới | Có sẵn `wordDiff` và `novelHint` dùng cho AI rà; **chưa dùng cho viết lại**. Không có API | Thiếu API và UI (tái dùng được `wordDiff`/`novelHint`) |
| 6 | "Thay đoạn đã chọn" / "Chèn dưới đoạn" (nhãn "AI viết lại") | `replaceBlockText` chỉ thay **một khối** theo hash; không thay **một phần câu** hoặc nhiều khối; không có mark "AI viết lại" | Thiếu (cần thêm `replaceBlocks`, `insertParagraphs`, mark/nhãn trong editor) |
| 7 | Hủy kết quả đang chờ khi Quay lại/Đóng | Không có | Thiếu |
