# Triển lãm 1975

## Thiết kế và phạm vi

Route độc lập `/trien-lam-1975`, lazy-load riêng, không gắn vào landing và không cần API/đăng nhập. Ba phòng nối qua hai lối rẽ: Đường đến Sài Gòn → Ngày toàn thắng → Đất nước liền một dải. **Ảnh tham chiếu sáng do người dùng cung cấp là chuẩn hiện tại, thay thế concept tối trước đó.** Tường phẳng xám trắng lạnh `#C9CCD3`, trần phẳng `#55595F`, sàn xám trung bình với phản chiếu mờ, phào mảnh `#7A7D82`. Giữ nguyên mặt bằng và tọa độ ngang của các ảnh. Tranh dày 2,5 cm, cạnh đen trơn; nâng cả ảnh và nhãn thêm 25 cm, tâm hiện tại 1,75 m. Dùng thư viện đã có, không thêm dependency production.

Màn mở đầu chỉ có một nút Enter. WASD/mũi tên để đi, chuột để nhìn, Esc tạm dừng và nhả chuột. Menu nhỏ bên phải có chọn chương, hướng dẫn và danh mục ảnh có thể đọc bằng bàn phím. Nhấp ảnh/nhấn E khi đứng gần mở chi tiết. Thiết bị cảm ứng có nút đi và kéo để nhìn. Giữ thẻ chương serif, chú thích sans-serif, gợi ý Esc tự ẩn và màn hình “Một khoảng lặng”; đổi toàn bộ UI thành chữ tối trên nền sáng. Âm thanh chính dùng file MP3 người dùng cung cấp trong `src/public/audio-trienlam-3d`, bắt đầu sau Enter ở âm lượng 65%, tiếp tục khi đọc ảnh/mục lục, tạm dừng khi Esc hoặc ẩn tab, tiếp tục từ vị trí cũ khi trở lại tham quan. Không lặp tự động. Đã bỏ mã tổng hợp nhạc và bước chân cũ.

## Triển khai

1. Dữ liệu tác phẩm và sơ đồ tường dùng chung cho hình học, va chạm, sơ đồ điều hướng.
2. `GalleryFloor.tsx` dùng một mesh phản chiếu theo đúng mặt bằng ba phòng, render phản chiếu 512 px và blur hai trục; texture sàn loang nhẹ, ron mảnh cùng tông. Tường mịn, góc vuông, phào chân 8 cm. Nguồn sáng ambient/hemisphere/directional ẩn và trung tính. Không render spotlight, thân đèn, ray, dầm, gờ trần, sương, bụi, SSAO, vignette hoặc film grain. NoToneMapping giữ màu trung tính; chỉ có bóng tiếp xúc rất nhẹ dưới tranh. Canvas DPR tối đa 1,5; dừng render liên tục khi tạm nghỉ.
3. Điều khiển chuột/di chuyển cập nhật trong render loop, không cập nhật React state mỗi frame. Va chạm tròn với đoạn tường, chia bước nhỏ và trượt dọc tường.
4. Nhãn canvas texture hiển thị Unicode tiếng Việt và đo/ngắt dòng trước khi vẽ. `artworkLayout.ts` giữ tâm tranh 1,75 m, cao tối đa 1,45 m; nhãn cao 0,48 m, cách tranh 0,12 m, căn trái đúng mép tranh. Ảnh giữ tỉ lệ gốc và tương quan kích thước. Trục Y vị trí dữ liệu được tính lại theo bố cục chung. Tiêu đề tường dùng Cormorant Garamond tự lưu kèm giấy phép OFL; chú thích dùng Be Vietnam Pro, màu xám đậm. Chi tiết dùng Dialog chung với focus trap và đường dẫn nguồn.
5. Kiểm tra typecheck, build, va chạm/lối đi, ảnh thực tế và thao tác trên trình duyệt. 60 fps là mục tiêu; cần đo trên máy đích để xác nhận.
7. Trường nhìn 75°, hướng nhìn ban đầu chúc nhẹ 0,13 rad để cả ảnh và nhãn nằm trong khung ở cự ly đọc khoảng 1,5-2 m. Chuột vẫn điều khiển tự do. Gợi ý Esc tự ẩn sau 4,5 giây.

## Kiểm chứng khôi phục theo ảnh tham chiếu

Kịch bản `.run/exhibition-check.cjs` kiểm tra Enter, khóa chuột, ba phòng, E xem ảnh, Esc, mục lục và cảm ứng; không ghi nhận lỗi trình duyệt. Test bố cục/va chạm: 5 bài, 33 assertions. Kịch bản `.run/exhibition-reference-check.cjs` chụp ở 1905×872, gồm góc ngang, sàn, trần và tạm dừng. Ảnh tại `.run/exhibition-reference-{view,floor,ceiling,pause}.png`. Trần phẳng, không còn đèn/dầm; màu sáng và phản chiếu sàn đã đối chiếu với ảnh người dùng. Khác biệt còn lại: độ chuyển sáng ở góc tường, vân loang và độ mờ phản chiếu chưa trùng từng pixel; góc chụp tương đương vì giữ nguyên mặt bằng/vị trí tranh, không dựng lại phòng trong ảnh tham chiếu.

## Bộ ảnh và quyền sử dụng

Người dùng cung cấp 33 file tại `src/public/30-4-1975` (gồm 4 bản tên có `(1)`). Chọn 12 ảnh theo mạch kể, giữ nguyên file và watermark, dùng Vite asset imports để hoạt động ở cả dev/build. Đây là thư mục dưới `src`, không phải `publicDir` mặc định của Vite.

Nguồn bộ ảnh: Thông tấn xã Việt Nam, chuyên đề kỷ niệm 48 năm ngày giải phóng miền Nam (2023). Chú thích và tác giả đối chiếu trang VNA theo mã ảnh. Mỗi tác phẩm lưu `sourceUrl`, `credit`, `rights` và ngày/bối cảnh riêng trong `src/features/exhibition/data.ts`.

Các ảnh TTXVN không được tự gán giấy phép Creative Commons. Trạng thái hiện tại: **bản quyền TTXVN/tác giả; file do người dùng cung cấp, chưa kèm bằng chứng cấp phép**. Trước khi công bố rộng rãi hoặc ghép vào landing production, chủ dự án cần xác nhận phạm vi quyền sử dụng với bên cấp ảnh. Ghi nguồn không thay thế giấy phép. Không cắt watermark, đổi màu hoặc tạo ảnh lịch sử giả.

## Thêm tác phẩm

Thêm một mục vào `artworks` trong `data.ts`, cung cấp ảnh (asset URL hoặc URL bắt đầu bằng `/` cho `apps/web/public`), tỉ lệ gốc, tiêu đề, chú thích, nguồn/quyền, chương, tọa độ `[x, y, z]`, góc quay và chiều rộng. Tường chạy dọc trục Z: quay `Math.PI / 2` hoặc `-Math.PI / 2`. Tường phía cuối phòng: góc `0`; tường đối diện: `Math.PI`. Chọn khoảng trống trên tường và giữ ảnh cách cửa.
