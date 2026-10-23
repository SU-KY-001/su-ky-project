# UX 02: Soạn bản nháp (dàn ý rồi viết từng phần)

Nguồn: `mockups/02-draft-wizard.html` + `angles.js`. Phạm vi: phase 6 (chưa làm). Đọc kèm `spec-prompts-compose.md` cho prompt và route.

## 1. Vào trang

Cùng trang với 01: bước **2 Kịch bản** của tập. Editor trái, panel "Trợ lý AI" phải.

Khi kịch bản **trống**, editor hiện chữ mờ: *"Kịch bản đang trống. Viết trực tiếp, hoặc bấm 'Soạn bản nháp' ở bên phải để AI soạn dàn ý rồi từng đoạn."* Chữ này biến mất khi có nội dung chèn vào.

Panel phải có thẻ **"Soạn bản nháp"**:
- Mô tả: bốn bước (đề bài, sửa dàn ý, giọng văn, AI viết từng phần); không có gì vào kịch bản cho tới khi bấm **Chèn**.
- Nút chính **"Soạn bản nháp"** (icon bút).
- Dòng phụ: *"Muốn viết lại một đoạn có sẵn: bôi đen đoạn đó trong editor, nút 'Viết lại' sẽ hiện ra."* (xem UX 03)

Bấm nút → hộp thoại **rộng** "Soạn bản nháp · Tập 3" với **4 chấm** tiến trình. Tiêu đề hộp đổi theo bước: Đề bài → Dàn ý → Giọng văn → Bản nháp.

## 2. Bước 1: Đề bài

1. **"Chủ đề của tập"**: ô một dòng, "Một câu. AI dùng câu này để định hướng dàn ý." (mock điền sẵn *"Vì sao Lý Thái Tổ dời đô từ Hoa Lư ra Thăng Long"*).
2. **"Góc kể"**: danh sách chọn **một** (radio), cuộn được, cao tối đa ~236px.
   - Gồm 4 góc có sẵn (Chuỗi sự kiện, Nhân vật, Nguyên nhân – hệ quả, Đối lập; mặc định chọn "Chuỗi sự kiện") + các góc **của mod** (nhãn "Của bạn").
   - Mỗi dòng: tên + mô tả một dòng (hoặc "Không có mô tả").
   - Có từ **6 góc trở lên** thì hiện ô **"Tìm góc kể"**; không khớp → *"Không có góc kể khớp. Thử từ khóa khác hoặc tạo góc kể mới."*
   - Hai nút nhỏ: **"Tạo góc kể mới"** (mở trang 06 ở tab mới, có `?new=1` để focus ô tên) và **"Quản lý"** (mở trang 06 ở tab mới).
   - Quay lại tab hộp thoại (focus/storage) → danh sách **tự làm mới**, giữ lựa chọn cũ nếu còn, không còn thì chọn góc đầu tiên.
   - Chú thích: *"Góc kể của bạn chỉ bạn thấy. Tạo hoặc sửa ở trang riêng, danh sách này tự cập nhật khi bạn quay lại."*
3. **"Thời lượng mục tiêu"**:
   - Ô số **phút** (1–120, mặc định 12) + 3 chip **8 / 12 / 15** (bấm là điền).
   - Dòng "≈ N từ" tính bằng **phút × 150** (tốc độ mặc định, `script.words_per_minute`), định dạng vi-VN.
   - Ô số **từ** (min 50, bước 50, mặc định 1800) để đặt trực tiếp; sửa số từ thì **ghi đè** phần tính theo phút (dòng "≈" cập nhật theo ô từ).
   - Chú thích: 150 từ/phút, cùng cấu hình với ước tính thời lượng kịch bản.
4. Dòng phụ: AI có thể dùng nguồn của series làm ngữ cảnh nền; series chưa có nguồn vẫn soạn được.
5. Chân: "Đóng" · **"Tạo dàn ý →"**.

## 3. Bước 2: Dàn ý (sửa được)

Bấm "Tạo dàn ý" lần đầu → màn **loading** "AI đang tạo dàn ý…" (spinner), nút "Tạo lại dàn ý" và "Tiếp" bị khóa. Xong → hiện dàn ý.

Dàn ý gồm **các phần** (mock 3 phần); mỗi phần là một khung:
- Ô **tiêu đề** phần (chữ đậm, sửa được) + nút thùng rác **xóa cả phần**.
- Ô **"Mục tiêu của phần"** (sửa được).
- Danh sách **ý chính**: mỗi ý một ô nhập + nút X xóa. Nút **"Thêm ý"** thêm ô trống (placeholder "Ý chính mới").
- Cuối danh sách phần: nút **"Thêm phần"** (thêm khung trống, placeholder "Tiêu đề phần mới").
- Dòng hướng dẫn trong mock: *"AI đề xuất 3 phần. Sửa tiêu đề, mục tiêu, ý chính tùy ý; đổi thứ tự bằng mũi tên."* Câu này **lỗi thời**: mock không có mũi tên, và `phase-06-compose.md` + `ui-spec` chốt **không có đổi thứ tự**. Khi làm phải bỏ cụm "đổi thứ tự bằng mũi tên".

Chân: "Quay lại" · **"Tạo lại dàn ý"** (chạy lại AI, thay dàn ý đang có; mock không hỏi xác nhận) · **"Tiếp →"**. Theo phase 6, dàn ý chỉ giữ ở client (localStorage khóa theo `episodeId`), không có bảng DB.

## 4. Bước 3: Giọng văn

1. **"Ngôi kể"** (2 thẻ cạnh nhau):
   - **Ngôi thứ ba** (chọn sẵn): người kể đứng ngoài.
   - **Ngôi thứ nhất**: **khóa, mờ** nếu bước "Thông tin" chưa chọn nhân vật: *"Chưa chọn nhân vật ở bước Thông tin. Chọn xong sẽ dùng được."*
2. **"Giọng văn"** (radio, mỗi dòng có **câu mẫu**):
   - Điềm đạm (chọn sẵn) · Kể chuyện gần gũi · Trang trọng · **Tự mô tả…** (chọn thì hiện ô nhiều dòng, placeholder *"như người kể chuyện đêm khuya, chậm rãi, có chút hoài cổ"*).
3. Hộp thông tin "Luôn bật": câu ngắn để đọc thành tiếng, tránh ngoặc đơn và ký hiệu khó đọc; khi không chắc số liệu, năm, tên thì **AI đánh dấu để mod kiểm tra, không tự bịa**.
4. Chân: "Quay lại" · **"Viết bản nháp"** (icon bút).

## 5. Bước 4: Bản nháp

### 5a. Đang viết
- "AI đang viết từng phần" + nhãn "Đang chạy" + thanh tiến độ.
- Bảng mỗi phần một dòng: icon (✓ đã viết / xoay đang viết / ○ đang chờ) + tên phần + chữ "đã viết / đang viết / đang chờ".
- Ghi chú: *"Mỗi phần là một lần gọi riêng. Chưa có gì vào kịch bản cho tới khi bạn bấm Chèn."*
- Xong → tự sang 5b.

### 5b. Xem lại và chèn
- Thanh tab theo phần: **Mở đầu / Bối cảnh / Quyết định**; bấm tab nào hiện nội dung phần đó (khối chữ, nhãn "AI soạn").
- Ba nút nhỏ dưới:
  - **"Sửa phần này"**: bật/tắt chế độ sửa trực tiếp ngay trong khối chữ (contenteditable, tự focus).
  - **"Viết lại phần này"**: **khóa trong mock** (tooltip "Mock chưa có: sẽ gọi lại AI riêng cho phần này"). Phase 6 ghi rõ phải có: gọi lại AI với cùng `previousText`.
  - **"Bỏ phần này"** ⇄ **"Khôi phục phần này"**: phần bị bỏ mờ 40%; nút Chèn đổi thành "Chèn N phần vào kịch bản" (N = số phần còn lại); nếu bỏ hết thì **khóa** nút Chèn.
- Ô chọn **"Chèn vào"**: *Cuối kịch bản* (mặc định) / *Tại vị trí con trỏ*.
- Chân: "Quay lại" · **"Chèn 3 phần vào kịch bản"** (icon mũi tên xuống).

### 5c. Bấm Chèn
- Đóng hộp thoại. Với mỗi phần còn lại (đúng chữ đang hiện, **gồm cả chỗ mod vừa sửa**): thêm một **tiêu đề h3** (tên phần) + một **đoạn văn** có nhãn nhỏ **"AI soạn"** ở cuối đoạn.
- Vị trí: "Cuối kịch bản" → nối vào cuối. "Tại vị trí con trỏ" → chèn **sau khối chứa con trỏ**; nếu con trỏ không nằm trong editor → chèn **đầu** editor.
- Chữ "kịch bản đang trống" bị xóa.
- Không có gì ghi vào kịch bản trước bước này.

## 6. Quy tắc cứng

- AI chỉ sinh bản nháp trong hộp thoại; **chỉ nút Chèn** mới ghi vào editor.
- Mỗi phần = một lần gọi AI riêng (nên "Viết lại phần này" khả thi).
- Mọi ô là tự do; preset (chip phút, câu mẫu giọng văn) chỉ **điền sẵn**.
- Thời lượng tính theo **số từ**, 150 từ/phút (cấu hình), **không** dùng 850 ký tự/phút.
- Góc kể: `guide` (≤500 ký tự) vào prompt như dữ liệu chỉ cách kể, không phải sự kiện.

## 7. Đối chiếu web hiện tại

Đã đọc: `PodcastScriptStep`, `AiAssistantPanel`, `RichScriptEditor`; grep backend `apps/api/src`, `packages/db`, `packages/shared` không có `compose`, `outline`, `narrative`.

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Thẻ "Soạn bản nháp" + nút trong panel Trợ lý AI | Panel chỉ có "AI rà kịch bản" | **Thiếu hẳn** |
| 2 | Chữ mờ "Kịch bản đang trống…" trong editor | Không có | Thiếu |
| 3 | Hộp thoại 4 bước | Không có | Thiếu |
| 4 | Chọn góc kể (có sẵn + của bạn), tìm kiếm ≥6, làm mới khi quay lại tab | Không có; không có bảng `ai_narrative_angles` | Thiếu cả web lẫn API/DB |
| 5 | Thời lượng phút ⇄ từ, chip 8/12/15 | Không có. Header script ước tính bằng `characterCount / 850` ở `PodcastScriptStep.tsx:184` | Thiếu; **công thức hiện có sai** so với spec (150 từ/phút) |
| 6 | Dàn ý sửa được (thêm/xóa/sắp xếp phần và ý) | Không có; không có API `outline` | Thiếu |
| 7 | Chọn ngôi kể, giọng văn (3 preset + tự mô tả) | Không có | Thiếu |
| 8 | Viết từng phần, tiến độ từng phần | Không có API `draft-section` | Thiếu |
| 9 | Xem lại: tab phần, Sửa / Viết lại / Bỏ phần | Không có | Thiếu |
| 10 | Chèn tại cuối hoặc con trỏ, có tiêu đề h3 + nhãn "AI soạn" | Editor không có mark "AI soạn"; có `insertCitation` nhưng không có chèn khối | Thiếu (cần thêm node/mark vào `RichScriptEditor`) |
