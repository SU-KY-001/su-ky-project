# UX 06: Góc kể của tôi (trang quản lý)

Nguồn: `mockups/06-narrative-angles.html` + `angles.js`. Phạm vi: phase 6 (chưa làm). Mock lưu ở `localStorage` (khóa `su-ky.mock.angles.v1`); bản thật: bảng `ai_narrative_angles(id, userId, name, description, guide, createdAt, updatedAt)`, unique `(userId, lower(name))`, theo tài khoản.

## 1. Vào trang

- Đường dẫn: `Studio / Cài đặt / Góc kể`. Bên phải thanh trên: *"Chỉ bạn thấy các góc kể của mình"*.
- Đi vào từ hai nơi ở UX 02 bước 1: nút **"Tạo góc kể mới"** (mở **tab mới**, URL có `?new=1` → focus ô Tên) và **"Quản lý"** (tab mới).
- Tiêu đề **"Góc kể của tôi"**; mô tả: *"Góc kể là cách AI dẫn dắt câu chuyện khi soạn dàn ý và bản nháp. Chọn một góc có sẵn, hoặc tạo góc riêng với chỉ dẫn của bạn."*

Bố cục hai cột: **trái** danh sách (rộng ≤420px), **phải** thẻ form.

## 2. Cột trái: danh sách

- Hàng đầu: ô **"Tìm góc kể"** + nút chính **"Tạo góc kể mới"** (icon +).
- Nhóm **"Của bạn (n)"**: mỗi góc là một nút-dòng: icon **bút chì**, tên đậm, mô tả một dòng (hoặc *"Không có mô tả"*). Khi **chưa có góc nào**: ô nét đứt *"Bạn chưa có góc kể riêng. Bấm Tạo góc kể mới, hoặc Nhân bản một góc có sẵn để chỉnh."* Khi có nhưng tìm không khớp: *"Không có góc kể khớp."*
- Nhóm **"Có sẵn (4)"**: icon **khóa**; 4 góc: **Chuỗi sự kiện** ("Trước, trong, sau."), **Nhân vật** ("Kể qua một người."), **Nguyên nhân – hệ quả** ("Vì sao, rồi sao."), **Đối lập** ("Hai phía, hai lựa chọn."). Không khớp tìm → *"Không có góc kể khớp."*
- Tìm: lọc theo tên **và** mô tả, không phân biệt hoa thường, lọc cả hai nhóm, đếm `(n)` luôn là tổng chứ không phải số đang lọc.
- Dòng đang mở viền đậm.
- Bấm một dòng → mở góc đó ở thẻ form.
- Tab khác đổi dữ liệu (`storage`) → danh sách tự làm mới.

## 3. Cột phải: thẻ form (3 chế độ)

Thẻ có vùng báo lỗi `role=alert` và `aria-live`.

### 3a. Tạo mới (mặc định lúc vào, hoặc bấm "Tạo góc kể mới")
- Tiêu đề "Góc kể mới".
- **"Tên"** (≤60 ký tự; gợi ý *"Hiện trong danh sách chọn khi soạn bản nháp."*; placeholder *"Một ngày ở kinh đô"*).
- **"Mô tả ngắn"** (≤120; không bắt buộc; *"Một dòng nhắc bạn góc này dùng khi nào."*).
- **"Chỉ dẫn cho AI"** (nhiều dòng, ≤500; không bắt buộc; *"AI coi đây là gợi ý về cách kể, không phải sự kiện."*) + **bộ đếm `0/500`** cập nhật khi gõ.
- Nút: **"Lưu góc kể"** (chính) · **"Hủy"** (xóa form về trống).

### 3b. Sửa góc của bạn
- Tiêu đề = tên góc. Hai nút: **"Lưu góc kể"**, **"Hủy"** (khôi phục giá trị đã lưu), thêm **"Xóa"** (icon thùng rác) bên phải.
- **"Xóa" hai lần bấm**: lần 1 nút đổi thành **"Bấm lần nữa để xóa"** (icon cảnh báo); lần 2 mới xóa, báo *"Đã xóa "<tên>""*, form về trống. Mở góc khác sẽ reset trạng thái chờ xác nhận.

### 3c. Xem góc có sẵn (chỉ đọc)
- Nhãn **"Có sẵn · chỉ đọc"** + hộp thông tin *"Góc kể có sẵn không sửa được. Nhân bản để tạo bản của bạn rồi chỉnh tùy ý."*
- Mọi ô **chỉ đọc**. Không có "Lưu" và "Xóa". Nút **"Nhân bản để chỉnh"** (icon copy) và **"Đóng"**.
- **"Nhân bản để chỉnh"**: mở form tạo mới, điền sẵn tên `"<tên> (của tôi)"`, mô tả, chỉ dẫn; focus ô Tên.

### Lưu (xác thực, theo thứ tự)
1. Tên rỗng (sau khi bỏ khoảng trắng) → *"Cần có tên góc kể."*, focus ô Tên.
2. Tên > 60 ký tự → *"Tên tối đa 60 ký tự."*
3. Trùng tên (không phân biệt hoa thường) với **bất kỳ góc nào khác** (cả có sẵn lẫn của bạn) → *"Đã có góc kể trùng tên."*, focus ô Tên.
4. Hợp lệ → lưu; toast **"Đã lưu góc kể"** (1,8 giây, góc dưới phải); form chuyển sang chế độ sửa góc vừa lưu; danh sách cập nhật.

## 4. Quy tắc cứng

- Góc **có sẵn** là hằng số/seed, chỉ đọc, ai cũng thấy. Góc **của bạn** chỉ chủ sở hữu thấy.
- `guide` vào prompt như **dữ liệu** (cách kể), không phải sự kiện; tối đa 500 ký tự.
- Danh sách chọn ở UX 02 tự đồng bộ khi quay lại tab.
- Mọi ô là văn bản tự do.

## 5. Đối chiếu web hiện tại

Đã đọc: `apps/web/src/features/moderator/paths.ts` (các mục: `overview, timeline, events, sources, podcast, assignments, tickets, pending, schedule`), router; grep `narrative|angle|Góc kể` trong `apps/web`, `apps/api`, `packages`.

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Trang `Studio / Cài đặt / Góc kể` | **Không có** route, không có mục "Cài đặt" trong thanh Mod | **Thiếu hẳn** |
| 2 | Danh sách Của bạn / Có sẵn, tìm kiếm | Không có | Thiếu |
| 3 | Form tên / mô tả / chỉ dẫn + bộ đếm, xác thực, nhân bản, xóa hai lần bấm, toast | Không có | Thiếu |
| 4 | Bảng `ai_narrative_angles` + API CRUD theo `userId` | Không có trong `packages/db`, `apps/api` | Thiếu |
| 5 | Danh sách chọn góc trong hộp thoại Soạn bản nháp | Không có (UX 02) | Thiếu |
| 6 | Chỉ có chữ "Góc kể" ở web: `PodcastPlayer.tsx` dùng **cùng từ** cho việc chọn giọng nghe **ngôi kể** (người dẫn chuyện / lời kể nhân vật) phía người nghe | Khác nghĩa hoàn toàn | Cảnh báo trùng thuật ngữ khi đặt tên UI |
