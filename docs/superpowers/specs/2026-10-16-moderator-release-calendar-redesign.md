# Thiết kế lại lịch phát hành Moderator

**Ngày:** 2026-10-16

**Trạng thái:** Đã duyệt hướng mockup, chờ duyệt kế hoạch triển khai.

## Mục tiêu

Tách mục “Lịch phát hành” khỏi màn hình “Nhiệm vụ của tôi” và trình bày lịch theo hai chế độ dễ quản lý: thời khóa biểu tuần và lịch tiến độ tháng. Giao diện dùng mockup đã duyệt làm chuẩn chức năng, nhưng phải đồng bộ với workspace Moderator hiện tại bằng token `--color-mod-*`, font Moderator, component chung và shadcn/ui.

## Phạm vi

- Tạo màn hình lịch riêng cho mục điều hướng `schedule`.
- Dùng dữ liệu thật từ `moderatorReleaseService.assignments()`.
- Chế độ tuần hiển thị đủ thứ hai đến chủ nhật và ba buổi sáng, chiều, tối.
- Mỗi lịch là một card trong đúng ngày và buổi, không chia timeline chi tiết theo giờ.
- Chế độ tháng dùng `Calendar` chung; ngày có lịch được đánh dấu theo trạng thái quan trọng nhất.
- Khi chọn ngày trong tháng, hiển thị danh sách lịch của ngày đó bên cạnh hoặc phía dưới trên màn hình hẹp.
- Có điều hướng tuần, tháng và nút quay về hiện tại.
- Có trạng thái loading, error và empty phù hợp với hình dạng lịch.
- Giữ nguyên màn hình “Nhiệm vụ của tôi” và các thao tác gắn podcast, gửi duyệt.

Không bao gồm:

- Thay đổi API hoặc schema release.
- Hiển thị ticket giả khi hệ thống chưa có dữ liệu ticket.
- Xây luồng tạo, duyệt hoặc hủy ticket trong task này.
- Thay đổi nhãn điều hướng, route hoặc information architecture ngoài việc tách nội dung schedule.

## Quy tắc hiển thị thời gian

- Mọi thời gian hiển thị theo `Asia/Ho_Chi_Minh`.
- Tuần bắt đầu vào thứ hai.
- Buổi sáng: trước 12:00.
- Buổi chiều: từ 12:00 đến trước 18:00.
- Buổi tối: từ 18:00 trở đi.
- Card luôn hiển thị giờ phát hành, tên lịch, trạng thái, hạn sản xuất và thông tin podcast nháp nếu đã liên kết.

## Trạng thái trình bày

Màu chỉ là tín hiệu bổ sung. Card luôn có nhãn và icon trạng thái.

- `SCHEDULED`: đang sản xuất, dùng màu nhấn Moderator.
- `READY_TO_PUBLISH`: đã duyệt, dùng màu thành công.
- `PUBLISHING`: đang phát hành, dùng màu nhấn Moderator.
- `RELEASED`: đã hoàn thành, dùng màu thành công.
- `BLOCKED`: cần xử lý, dùng màu cảnh báo.
- `FAILED`: phát hành thất bại, dùng màu nguy hiểm.
- `CANCELLED`: đã hủy, dùng màu trung tính.
- Lịch `SCHEDULED` đã quá hạn sản xuất được nâng lên trạng thái trình bày “Quá hạn”.
- Lịch `SCHEDULED` còn không quá 24 giờ tới hạn được trình bày “Gần hạn”.

Màu card là lớp nền dịu tạo bằng token hiện có; không hardcode palette mới. Không dùng đường viền màu ở đầu hoặc cạnh card.

## Ngôn ngữ thiết kế

- Redesign bảo toàn, không tạo design system mới.
- `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 7`.
- Hệ bo góc nhất quán: panel 16px, card lịch 14px, control 10-12px.
- Panel bao quanh dùng `Card` shadcn với viền token và shadow mềm có chiều sâu tương tự dashboard Moderator.
- Dùng `Button`, `Card`, `Badge`, `Calendar`, `Tooltip` và `Skeleton` từ thư mục shared khi phù hợp.
- Dùng Phosphor Icons đang có trong dự án; không thêm thư viện icon hoặc dependency mới.
- Không gradient trang trí, glow, glassmorphism hoặc animation tự chạy.
- Chỉ dùng transition ngắn cho hover, focus và trạng thái chọn; hỗ trợ reduced motion theo hệ thống hiện tại.

## Responsive và accessibility

- Desktop giữ lưới tuần ngang; vùng lịch được phép cuộn ngang khi không đủ chiều rộng.
- Dưới 768px, toolbar xếp gọn, lịch tháng và agenda xếp dọc.
- Nút chuyển chế độ dùng `aria-pressed`; nút điều hướng có nhãn truy cập rõ ràng.
- Card lịch là phần tử có thể focus nếu có hành động xem chi tiết; không phụ thuộc hover để đọc thông tin.
- Màu trạng thái luôn đi cùng chữ và icon.

## Tiêu chí hoàn thành

- Chọn “Lịch phát hành” không còn hiển thị màn hình nhiệm vụ dạng card hai cột.
- Dữ liệu được nhóm đúng ngày, đúng buổi và đúng tuần theo múi giờ Việt Nam.
- Chuyển được giữa thời khóa biểu và lịch tiến độ.
- Chọn một ngày tháng hiển thị đúng các lịch tương ứng.
- Tất cả status release hiện có có nhãn, icon và tone xác định.
- Giao diện chỉ dùng token Moderator, component chung và shadcn/ui sẵn có.
- Loading, error, empty, desktop và mobile đều có trạng thái rõ ràng.
- Test mục tiêu, toàn bộ web test, typecheck và build đều được chạy trước khi bàn giao.
