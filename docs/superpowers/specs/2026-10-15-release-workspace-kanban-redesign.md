# Thiết kế lại không gian Lịch phát hành

Ngày: 2026-10-15

## Bối cảnh

Trang Admin hiện tách “Lịch phát hành” và “Điều phối sản xuất” thành hai mục. Lịch phát hành hiển thị theo ngày, trong khi Điều phối sản xuất chỉ tổng hợp số nhiệm vụ đang mở và gần hạn của từng moderator. Việc tách này khiến Admin phải đổi màn hình để hiểu một lịch đang ở đâu và ai đang phụ trách.

Thư mục `client` ở root cung cấp mẫu tham chiếu cho dashboard công việc: thanh công cụ gọn, hai chế độ bảng/Kanban, card kéo-thả theo cột và form trong dialog. Thiết kế mới lấy cấu trúc tương tác đó nhưng tiếp tục dùng typography, màu sắc, token, component và navigation hiện tại của Sử Ký Việt Nam.

## Mục tiêu

- Gộp chức năng Điều phối sản xuất vào trang Lịch phát hành.
- Cung cấp hai chế độ xem dùng chung dữ liệu: Kanban và bảng truyền thống.
- Biểu diễn luồng phát hành chính bằng bốn cột rõ ràng.
- Cho phép kéo-thả khi có một hành động nghiệp vụ hợp lệ phía sau.
- Mở thẳng form chỉnh sửa khi chọn một lịch; không có bước xem chi tiết trung gian.
- Giữ đầy đủ khả năng tạo lịch, phân công moderator, sửa thời gian, xử lý lỗi, hủy lịch và theo dõi tiến độ.

## Ngoài phạm vi

- Không cho Admin ép trực tiếp trạng thái trong database.
- Không cho kéo thủ công từ `PUBLISHING` sang `RELEASED`.
- Không thêm trường thứ tự card vào database; mỗi cột sắp xếp theo thời gian phát hành.
- Không thay đổi luồng moderator sản xuất, gửi duyệt và reviewer phê duyệt.
- Không thay đổi cơ chế worker tự động phát hành hoặc audit hiện có.

## Các phương án đã cân nhắc

### Chỉ dùng Kanban

Gọn và trực quan nhưng không phù hợp khi Admin cần quét nhiều bản ghi, so sánh thời gian hoặc thao tác bằng bàn phím. Không chọn.

### Duy trì hai màn hình Lịch phát hành và Điều phối sản xuất

Ít thay đổi code nhưng tiếp tục phân tán thông tin và không đạt mục tiêu hợp nhất vận hành. Không chọn.

### Một workspace, hai view dùng chung controller

Kanban phục vụ điều phối trực quan; bảng phục vụ tra cứu dữ liệu dày. Hai view dùng chung query, filter, selection, dialog và mutation. Đây là phương án được chọn.

## Kiến trúc thông tin

Sidebar Admin bỏ mục “Điều phối sản xuất”. Mục “Lịch phát hành” mở workspace mới gồm:

1. Header với tiêu đề, mô tả ngắn và nút “Tạo lịch phát hành”.
2. Thanh view gồm “Kanban” và “Bảng”.
3. Thanh tìm kiếm và bộ lọc theo moderator, khoảng thời gian và trạng thái ngoại lệ.
4. Khu vực “Cần xử lý” cho lịch `BLOCKED` hoặc `FAILED`.
5. Nội dung Kanban hoặc table tùy view đang chọn.

View gần nhất được lưu ở local storage theo khóa riêng của Admin release workspace. Nếu chưa có lựa chọn, mặc định là Kanban.

## View Kanban

### Bốn cột chính

| Cột | Trạng thái | Ý nghĩa |
|---|---|---|
| Đã lên lịch | `SCHEDULED` | Admin đã tạo lịch và phân công; nội dung có thể đang được sản xuất hoặc kiểm duyệt. |
| Sẵn sàng phát hành | `READY_TO_PUBLISH` | Đã liên kết podcast, đúng revision được duyệt, có audio và đạt checklist. |
| Đang phát hành | `PUBLISHING` | Worker hoặc lệnh phát hành ngay đã claim lịch và đang thực hiện publication use case. |
| Đã phát hành | `RELEASED` | Podcast đã phát hành thành công. |

Mỗi cột có tiêu đề, số lượng lịch, trạng thái loading/empty riêng và vùng nhận drop. Trên màn hình hẹp, bảng cuộn ngang và giữ chiều rộng cột đủ để đọc card.

### Card lịch phát hành

Card hiển thị:

- Tên kế hoạch hoặc podcast.
- Status badge.
- Thời gian phát hành.
- Hạn hoàn thành sản xuất.
- Các moderator dưới dạng name badge riêng.
- Cảnh báo gần hạn hoặc quá hạn được tính ở client.
- Thông tin revision/checklist ngắn khi có podcast liên kết.

Nhấn card mở dialog chỉnh sửa. Card có focus ring, hỗ trợ Enter/Space và không phụ thuộc duy nhất vào thao tác kéo-thả.

### Kéo-thả

Kéo-thả là lối tắt cho command nghiệp vụ, không phải cập nhật status tùy ý:

- `SCHEDULED → READY_TO_PUBLISH`: yêu cầu backend đánh giá lại readiness. Chỉ chuyển khi podcast đã liên kết, revision đã duyệt, có audio và checklist đạt.
- `READY_TO_PUBLISH → PUBLISHING`: mở xác nhận “Phát hành ngay”. Sau khi xác nhận, gọi publication use case hiện có. Phản hồi có thể đưa card thẳng sang `RELEASED` nếu phát hành hoàn tất nhanh.
- `PUBLISHING → RELEASED`: không cho thả; worker là tác nhân duy nhất hoàn tất trạng thái này.
- Không cho kéo ngược trạng thái.
- Không cho kéo giữa các vị trí trong cùng cột vì hệ thống không lưu thứ tự thủ công.

Khi bắt đầu kéo, chỉ các cột hợp lệ được nhấn mạnh. Cột không hợp lệ hiển thị trạng thái disabled. Mutation thất bại phải rollback card về cột cũ và hiển thị thông báo lỗi nghiệp vụ từ API.

Để hỗ trợ bàn phím và thiết bị không có drag, card có menu hành động tương đương. Native drag event được dùng theo mẫu trong `client`; không thêm thư viện drag-and-drop mới ở giai đoạn này.

## Trạng thái ngoại lệ

`BLOCKED` và `FAILED` không tạo thêm cột. Chúng xuất hiện trong một dải “Cần xử lý” phía trên nội dung chính, ưu tiên lịch gần thời gian phát hành nhất.

Mỗi item cho phép mở form chỉnh sửa và cung cấp hành động phù hợp:

- `FAILED`: thử lại, đổi lịch hoặc hủy.
- `BLOCKED`: sửa dữ liệu/lịch, đánh giá lại điều kiện, phát hành ngay hoặc hủy.

`CANCELLED` không xuất hiện trong Kanban hoạt động. Admin xem lịch đã hủy bằng bộ lọc trong table hoặc trang Lịch sử phát hành.

## View bảng

Table dùng cùng danh sách đã lọc với Kanban và gồm các cột:

- Podcast/kế hoạch.
- Moderator phụ trách.
- Hạn sản xuất.
- Thời gian phát hành.
- Trạng thái.
- Cảnh báo.
- Thao tác.

Nhấn một hàng hoặc chọn “Chỉnh sửa” đều mở cùng dialog edit. Table hỗ trợ empty state, loading skeleton, phân trang và sắp xếp theo thời gian phát hành. Trên mobile, các cột ít quan trọng được thu gọn thay vì ép bảng quá rộng.

## Điều phối moderator

Chức năng từ mục Điều phối sản xuất được giữ lại trong workspace:

- Bộ lọc moderator hiển thị số nhiệm vụ đang mở.
- Card và hàng table hiển thị rõ từng moderator được giao.
- Panel bộ lọc mở rộng hiển thị tải công việc và số lịch gần hạn trong 24 giờ của từng moderator.
- Thay đổi moderator được thực hiện ngay trong dialog edit.

Sau khi workspace mới hoạt động, navigation Admin loại bỏ section `coordination` và không còn render `ReleaseObservation` ở chế độ điều phối riêng.

## Dialog tạo và chỉnh sửa

### Chỉnh sửa

Nhấn card/hàng mở thẳng dialog ở chế độ edit. Không có chế độ view-only và không có nút “Chỉnh sửa” trung gian.

Form edit gồm:

- Tên kế hoạch/podcast.
- Hạn sản xuất.
- Thời gian phát hành.
- Moderator phụ trách.
- Podcast được liên kết nếu nghiệp vụ cho phép thay đổi.
- Trạng thái hiện tại và cảnh báo readiness ở phần đầu form.
- Tiến độ phát hành/audit ở khu vực thu gọn phía dưới.
- Các action ngoại lệ như thử lại, phát hành ngay hoặc hủy được đặt tách khỏi nút “Lưu thay đổi”.

Form gửi patch lịch và replace assignees bằng optimistic concurrency dựa trên `updatedAt`. Nếu nhận `STALE_WRITE`, form giữ dữ liệu đang nhập và yêu cầu Admin tải bản mới trước khi lưu lại.

### Tạo mới

Nút “Tạo lịch phát hành” mở dialog cùng ngôn ngữ thiết kế với form edit nhưng chỉ chứa dữ liệu cần tạo:

- Tên kế hoạch/podcast.
- Hạn sản xuất.
- Thời gian phát hành.
- Ít nhất một moderator.

Form giữ quy tắc hạn sản xuất phải trước thời gian phát hành. Sau khi tạo thành công, dialog đóng và card mới xuất hiện trong cột “Đã lên lịch”.

## Data flow frontend

Một controller hook của release workspace chịu trách nhiệm:

- Query danh sách lịch và moderator.
- Search/filter/sort và view preference.
- Gom record thành bốn cột và danh sách ngoại lệ.
- Quản lý selected schedule và trạng thái dialog create/edit.
- Điều phối mutation update, replace assignees, retry, publish-now, cancel và readiness check.
- Invalidate dashboard, list, progress và moderator workload sau mutation.

Kanban và table là presentational component, nhận cùng dữ liệu đã chuẩn hóa. Logic trạng thái và mutation không được nhân đôi giữa hai view.

## API và nghiệp vụ backend

Các endpoint create, update, replace assignees, publish-now, retry, cancel và progress hiện có tiếp tục được tái sử dụng.

Cần bổ sung command đánh giá readiness cho thao tác `SCHEDULED → READY_TO_PUBLISH`, ví dụ:

```text
POST /api/admin/releases/:id/check-readiness
```

Command này:

1. Chỉ Admin được gọi.
2. Đọc trạng thái và version hiện tại.
3. Chạy cùng policy readiness mà worker/review flow sử dụng.
4. Chỉ atomic transition từ `SCHEDULED` sang `READY_TO_PUBLISH` khi đủ điều kiện.
5. Trả lỗi nghiệp vụ kèm danh sách điều kiện còn thiếu nếu chưa sẵn sàng.
6. Ghi audit với actor Admin, from/to status và correlation ID.

Không tạo endpoint `set-status` tổng quát vì endpoint đó có thể phá vỡ kiểm duyệt, publication guard và tính nhất quán của audit.

## Trạng thái giao diện và lỗi

- Loading ban đầu dùng skeleton theo hình cột hoặc hàng table.
- Khi đổi view, giữ dữ liệu query hiện tại để tránh nhấp nháy.
- Empty state Kanban cho phép mở form tạo lịch mới.
- Lỗi từng command hiển thị bằng notification và nội dung chi tiết trong dialog khi liên quan đến form.
- `409 STALE_WRITE` không đóng dialog hoặc xóa dữ liệu Admin đã nhập.
- Card đang mutation bị khóa kéo và hiển thị tiến trình ngắn.
- Nếu worker cập nhật status trong lúc Admin đang xem, query refetch đưa card sang cột mới mà không cần reload trang.

## Accessibility

- View switch dùng semantics `tablist`/`tab` và có trạng thái `aria-selected`.
- Card dùng button semantics hoặc hỗ trợ Enter/Space để mở edit.
- Drag-and-drop luôn có menu hành động bàn phím tương đương.
- Dialog giữ focus trap, có title/description, đóng bằng Escape và trả focus về card/hàng đã mở.
- Thông báo chuyển trạng thái dùng vùng `aria-live` phù hợp.
- Màu cột và badge không phải tín hiệu duy nhất; mọi trạng thái đều có nhãn chữ.

## Component dự kiến

- `ReleaseWorkspace`: container/controller của toàn màn hình.
- `ReleaseWorkspaceToolbar`: view tabs, search, filters và nút tạo.
- `ReleaseKanbanBoard`: bố cục bốn cột.
- `ReleaseKanbanColumn`: header, count, empty/loading/drop state.
- `ReleaseKanbanCard`: nội dung lịch và drag source.
- `ReleaseScheduleTable`: view truyền thống.
- `ReleaseAttentionPanel`: `BLOCKED`/`FAILED`.
- `ReleaseScheduleDialog`: shell dialog create/edit.
- `ReleaseScheduleForm`: form dùng chung, nhận mode create/edit.
- `ModeratorWorkloadFilter`: filter và tải công việc moderator.

Component dùng lại `CardBadge`, button, input, dialog và token dashboard hiện có. Không copy CSS toàn cục hoặc sidebar từ `client`.

## Kiểm thử

### Frontend

- Unit test mapping trạng thái sang bốn cột và danh sách ngoại lệ.
- Component test view switch, filter và ghi nhớ view.
- Component test card/hàng mở thẳng dialog edit.
- Component test create dialog và validation.
- Drag/drop test cho transition hợp lệ, cột disabled, confirm publish-now và rollback khi mutation lỗi.
- Accessibility test cho keyboard action và dialog focus.

### Backend

- Service test readiness command với podcast thiếu, chưa duyệt, stale revision, thiếu audio và checklist thất bại.
- Test atomic transition và audit khi readiness đạt.
- Test từ chối transition sai trạng thái và quyền không phải Admin.
- Regression test publish-now, retry, cancel và worker publication.

### Xác minh cuối

- Chạy test tập trung cho release module ở API và web.
- Chạy toàn bộ test suite của API và web.
- Chạy typecheck toàn workspace.
- Kiểm tra thủ công Kanban và table ở desktop/mobile, gồm drag, bàn phím, dialog và trạng thái lỗi.

## Tiêu chí hoàn thành

- Sidebar không còn mục Điều phối sản xuất riêng.
- Lịch phát hành có hai view Kanban/Bảng và ghi nhớ view gần nhất.
- Kanban chỉ có bốn cột của luồng chính.
- Các transition kéo-thả tuân thủ policy và có audit; không tồn tại API ép status tổng quát.
- `BLOCKED`/`FAILED` vẫn nổi bật và thao tác được; `CANCELLED` vẫn tra cứu được.
- Card và hàng table mở trực tiếp form edit.
- Form tạo mới và edit dùng cùng design language tham chiếu từ `client`.
- Chức năng phân công và tải moderator không bị mất sau khi gộp navigation.
