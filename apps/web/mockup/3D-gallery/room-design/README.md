# Bộ tham chiếu dựng lại phòng triển lãm 3D

Đây là chỉ dẫn hình ảnh cho **kiến trúc và cách trình bày không gian**, bổ sung sau khi lần triển khai trước còn dùng khuôn phòng cũ. Đọc theo thứ tự:

1. [Mặt bằng chính xác](floor-plan.svg) — sơ đồ vector theo kích thước và vị trí cửa trong template code.
2. [Phòng 01 — Đường đến Sài Gòn](room-01-entry.png) — góc nhìn khách, portal sâu và lớp không gian.
3. [Phòng 02 — Ngày toàn thắng](room-02-victory.png) — nhịp ảnh, mảng chương và nhìn xuyên phòng nối.
4. [Phòng 03 — Đất nước liền một dải](room-03-reunification.png) — phòng kết thúc và ghế dừng.

## Bố cục hình học đang có trong code

Nguồn số liệu: `apps/web/src/features/exhibition/data.ts` và `packages/shared/src/exhibition-template.ts`.

- Ba phòng nằm nối tiếp trên trục z, cùng rộng 12 m.
- Phòng 1: x = −6..6, z = −8..12, sâu 20 m.
- Phòng 2: x = −6..6, z = −24..−8, sâu 16 m.
- Phòng 3: x = −6..6, z = −40..−24, sâu 16 m.
- Lối nối nằm trên hai vách tại z = −8 và z = −24; cửa rộng 3 m, x = +2..+5 m. Cửa lệch về phía đông.
- Cao tường 4.4 m; sàn hiện theo ba mảng 12×20, 12×16, 12×16.

## Đích thị giác

Giữ trình tự ba phòng trên để điều khiển, collision, spawn và roomKey tiếp tục đúng. **Thiết kế kiến trúc bên trong được làm lại rõ rệt**: portal dày có chiều sâu, reveal tối, vách hồi ngắn, vài đoạn tường/panel lùi tạo lớp, khối chương như một feature wall, ảnh lớn có caption rõ, trần tối có tracklight và vệt rọi; sàn đá xám mờ, tường plaster xám nhạt. Canvas có lối đi thông thoáng.

Ảnh hướng đến một bảo tàng đương đại có art direction, không phải hộp trắng trống. Thể hiện chiều sâu qua các khung portal và nhìn xuyên sang phòng kế; giữ cửa lệch đúng vị trí mặt bằng. Bản đầu ưu tiên hình học có thể làm bằng box/plane/mesh và ánh sáng có kiểm soát trong Three.js. Không cần tạo model hữu cơ hoặc vật liệu phức tạp để khớp reference.

Ảnh treo nên lớn hơn scene cũ và có hierarchy: một ảnh chủ đạo mỗi tầm nhìn, ảnh phụ theo nhịp hai bên. Kích thước, caption phải kiểm tra ở góc camera khách thật. Dữ liệu/tác phẩm thật phải lấy từ asset dự án cùng nguồn và quyền đã lưu; ảnh trong các PNG này chỉ là AI minh họa, không được đưa vào triển lãm như ảnh lịch sử có thật.

Sơ đồ vector là chuẩn về kích thước/trình tự/cửa. Ba ảnh perspective là chuẩn về ngôn ngữ kiến trúc, ánh sáng, tỷ lệ trưng bày và cảm xúc. Không suy tọa độ chính xác hay nguồn tư liệu từ pixel của ảnh sinh.

## Cách dùng trong implementation

- Tái sử dụng cùng một scene renderer ở trang tạo, editor, xem thử và khách; không duy trì một `GalleryArchitecture` cũ riêng cho khách.
- Map lại wall/artwork placement nếu kiến trúc thêm portal/panel; không để ảnh xuyên hoặc đè lên vách hồi.
- Giữ chiều cao treo, tâm nhìn và khoảng cách đọc hợp lý; không ép toàn bộ ảnh nhỏ theo hệ số cũ.
- Chụp ảnh browser thật ở entrance và trong từng phòng sau lưu/tải lại. Đặt các screenshot vào `../verification/` và đối chiếu bốn tham chiếu ở đây.
- Không đánh dấu nghiệm thu khi output chỉ có material/light mới nhưng silhouette, portal, nhịp vách và phối cảnh vẫn như phòng cũ.

Các ảnh được sinh bởi imagegen. Prompt nguồn có trong [PROMPTS.json](PROMPTS.json).
