# Prompt coding agent: section tham quan triển lãm 3D tương tác

Hãy làm section landing page giúp khách nhận ra ngay đây là **trải nghiệm tham quan 3D có thể điều khiển**, đồng thời chọn được giữa nhiều triển lãm. Section nằm sau phần lịch sử và trước podcast. Dùng `../07-landing-trien-lam-tuong-tac-3d.png` làm chuẩn bố cục.

## Khảo sát trước khi sửa

1. Đọc `apps/web/AGENTS.md`, ba tài liệu trong `apps/web/docs/skill/` và `apps/web/docs/design/COLOR-FONT.md`.
2. Đọc `apps/web/mockup/3D-gallery/PLAN.md`, `apps/web/mockup/3D-gallery/room-design/README.md`, `apps/web/mockup/3D-gallery/room-design/floor-plan.svg`, `features/exhibition/ExhibitionExperience.tsx`, scene/controls hiện có, route công khai triển lãm và thứ tự section landing.
3. API public hiện đọc được một triển lãm theo `slug`; API liệt kê đang thuộc studio moderator. Không gọi API moderator từ landing page.

## Bố cục và nội dung

- Heading: **“Tham quan triển lãm 3D”**.
- Mô tả ngắn: **“Tự do di chuyển trong không gian, quan sát hiện vật và mở tư liệu ngay trên tường.”**
- Tạo một vùng trải nghiệm ngang rộng. Đây phải là một **viewport 3D lớn, có phối cảnh chiều sâu và điều khiển nhìn thấy được**, không phải hàng poster hoặc ảnh bìa.
- Bên trái viewport là danh sách chọn triển lãm dạng danh sách chữ gọn, không phải gallery ảnh bìa. Hiển thị vài triển lãm đã xuất bản; một dòng được chọn rõ bằng accent. Tên và mô tả ngắn lấy từ dữ liệu public.
- Trong viewport hiển thị không gian thực của triển lãm đang chọn: tường/sàn/trần 3D, góc nhìn có chiều sâu, ảnh hoặc hiện vật được gắn lên vách. Làm rõ đây là cảnh bên trong bảo tàng có thể đi lại, không phải poster phim/podcast.
- Trên viewport có trạng thái phòng/chương hiện tại, một sơ đồ thu nhỏ các phòng với vị trí phòng đang đứng, một điểm tư liệu được highlight và affordance mở tư liệu. Mọi affordance phải nối với thao tác thật.
- Đặt gợi ý điều khiển dễ đọc ngay trong viewport: **“Kéo chuột để nhìn · WASD hoặc phím mũi tên để di chuyển”**. Trên mobile đổi thành gợi ý kéo và nút điều khiển cảm ứng phù hợp.
- Có CTA **“Vào tham quan”** mở trải nghiệm toàn màn hình của đúng triển lãm đang chọn. Việc chọn tên khác trong danh sách phải cập nhật viewport và slug của CTA.
- Duy trì style landing page hiện có: nền `--paper`, chữ `--ink`, chữ phụ `--ink-soft`, điểm nhấn `--vermilion`/`--bronze`, font Be Vietnam Pro. Tránh dựng dashboard nặng; khung trải nghiệm là nội dung chính.

## Dữ liệu và tương tác

- Bổ sung API public để liệt kê **chỉ triển lãm đã xuất bản**, chỉ trả trường cần cho bộ chọn và preview: `slug`, tiêu đề, mô tả ngắn, thumbnail nếu có. Không trả bản nháp, owner, revision nội bộ hoặc dữ liệu riêng. Không lấy list từ endpoint studio.
- Dùng Hono RPC, service và TanStack Query theo chuẩn repo.
- Tái sử dụng renderer `ExhibitionExperience`/scene/controls hiện có nếu phù hợp. Nếu cần chế độ embedded, trích xuất hoặc bổ sung mode trình bày có giới hạn khung nhìn; không tạo một renderer 3D thứ hai có kiến trúc phòng khác. Không render nhiều WebGL canvas cùng lúc.
- Nếu cần tối ưu tải, chỉ khởi tạo WebGL cho triển lãm đang chọn khi section gần viewport; trước đó vẫn để fallback/poster riêng của triển lãm và CTA dùng được. Khi WebGL lỗi hoặc không hỗ trợ, hiện ảnh preview và giữ đường vào trải nghiệm/ mục lục tư liệu.
- Liên kết bàn phím, focus, aria-label và nút điều khiển cảm ứng tới thao tác thực. Hỗ trợ `prefers-reduced-motion`; không tự chạy carousel/scene.
- Có loading, error kèm thử lại, và empty state khi chưa có triển lãm đã xuất bản. Không hiển thị nội dung tên mẫu từ mockup như dữ liệu runtime.

## Ràng buộc và nghiệm thu

- Chỉ sửa section landing page và API public tối thiểu cần cho danh sách. Không làm hỏng luồng moderator/editor hoặc route xem triển lãm hiện có.
- Không dùng ảnh AI trong thư mục mockup làm ảnh tư liệu lịch sử thật.
- Trên desktop, người mới nhìn vào phải thấy ngay viewport 3D, bộ chọn nhiều triển lãm, bản đồ phòng/điểm tương tác, cách điều khiển và CTA vào toàn màn hình.
- Trên mobile không tràn ngang; vùng xem 3D vẫn có thể thao tác bằng cảm ứng.
- Chạy `cd apps/web && bun run check-types`, mở trang thực tế và đối chiếu desktop/mobile với mockup.
