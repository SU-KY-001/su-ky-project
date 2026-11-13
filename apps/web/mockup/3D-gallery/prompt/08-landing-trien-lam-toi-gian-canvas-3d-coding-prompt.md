# Prompt coding agent: section triển lãm 3D tối giản

Thiết kế và triển khai section **Triển lãm 3D** trên landing page Sử Ký Việt Nam, nằm sau phần lịch sử và trước podcast. Tham chiếu `../08-landing-trien-lam-toi-gian-canvas-3d.png`. Mục tiêu là để người dùng nhận ra họ có thể chọn và bước vào nhiều triển lãm, qua một khung 3D trực tiếp gọn gàng.

## Bố cục

- Một hàng đầu gồm heading **“Triển lãm 3D”**, câu mô tả **“Chọn một triển lãm và tự do khám phá không gian bên trong.”**, cùng một menu chọn triển lãm có nhãn rõ **“Chọn triển lãm”**.
- Bên dưới là **một canvas 3D tương tác duy nhất**, rộng theo container landing page. Hiển thị phòng triển lãm thật của mục đang chọn, theo architecture/rendering hiện có. Đây là canvas đang chạy, không phải ảnh bìa, poster, thumbnail, carousel ảnh hoặc ảnh preview tĩnh.
- Trong canvas chỉ để các điều khiển cần thiết: tên phòng hiện tại, gợi ý **“Kéo để nhìn · WASD hoặc phím mũi tên để di chuyển”**, và nút phóng toàn màn hình nếu hỗ trợ.
- Đặt một CTA rõ dưới canvas: **“Bắt đầu tham quan”**. Nút mở trải nghiệm toàn màn hình của đúng triển lãm đang chọn.
- Giữ nền `--paper`, chữ `--ink`, chữ phụ `--ink-soft`, vermilion làm điểm nhấn và font Be Vietnam Pro. Không thêm gallery card, thumbnail, ảnh bìa, poster hoặc nội dung trang trí.

## Dữ liệu và tương tác

- Danh sách chọn gồm nhiều triển lãm đã xuất bản. API public hiện chỉ truy xuất theo `slug`; không gọi API studio/moderator. Bổ sung API public chỉ trả danh sách trường cần thiết: `slug`, tên, mô tả ngắn nếu có.
- Tải scene cho lựa chọn hiện tại qua Hono RPC/service và TanStack Query theo quy ước repo; không dựng dữ liệu tĩnh làm danh sách thật.
- Tái sử dụng renderer/controls hiện có trong `features/exhibition/ExhibitionExperience.tsx`. Tạo embedded mode cho canvas nếu cần, nhưng tránh khởi tạo nhiều WebGL canvas cùng lúc. Chỉ một scene được hiển thị tại một thời điểm.
- Đổi menu phải thay scene và cập nhật đích của CTA theo `slug` đã chọn. Hỗ trợ điều khiển chuột/bàn phím và touch trên mobile.
- Khởi tạo WebGL khi section gần viewport để giảm tải. Nếu trình duyệt không hỗ trợ hoặc scene lỗi, thay canvas bằng trạng thái chữ gọn và giữ CTA vào trang triển lãm; **không dùng ảnh thay thế dạng cover/poster**.
- Có trạng thái loading, lỗi kèm thử lại, empty state khi chưa có triển lãm đã xuất bản; không hiện tên mẫu trong runtime.
- Tôn trọng `prefers-reduced-motion`, không tự chạy slideshow hoặc camera animation.

## Trước khi sửa và kiểm tra

- Đọc `apps/web/AGENTS.md`, các file trong `apps/web/docs/skill/` và `apps/web/docs/design/COLOR-FONT.md`.
- Kiểm tra `PLAN.md`, `room-design/README.md`, `room-design/floor-plan.svg`, route public và cấu trúc landing page trước khi quyết định cách tái sử dụng renderer.
- Không dùng ảnh AI trong thư mục mockup làm tư liệu lịch sử hoặc ảnh thay cho canvas thật.
- Chạy `cd apps/web && bun run check-types`; mở landing page ở desktop và mobile để xác nhận section đúng vị trí, menu chọn được nhiều triển lãm, canvas có thể điều khiển và không tràn ngang.
