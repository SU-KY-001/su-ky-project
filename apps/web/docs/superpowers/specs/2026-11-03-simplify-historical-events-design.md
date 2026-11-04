# Đơn giản hóa mục Sự kiện

## Yêu cầu đã xác nhận

- Mục đích chính: gỡ điều kiện phát hành series phụ thuộc vào nguồn tư liệu và kiểm duyệt của sự kiện liên kết. Việc bỏ nguồn sự kiện phải có hiệu lực ở điều kiện phát hành backend, không chỉ trên giao diện.
- Nguồn/tài liệu thuộc luồng podcast vẫn giữ nguyên vì độc lập với nguồn sự kiện.
- Bỏ Nguồn, Trạng thái, Tài liệu và Kiểm duyệt của sự kiện ở cả giao diện và dữ liệu/API.
- Bảng Sự kiện có đúng sáu cột: Sự kiện, Thời kỳ, Giai đoạn, Mốc thời gian, Podcast, Thao tác.
- Thao tác dùng nút chữ “Xem chi tiết”, mở popup trực tiếp qua `DashboardRowActions` với `id: "detail"`.
- Bỏ thao tác bấm hàng hoặc tên sự kiện để xổ thông tin bên dưới.
- Giữ luồng tạo “Tạo nội dung lịch sử” trong mục Dòng lịch sử; không tạo luồng tạo sự kiện mới.
- Giữ nguyên thuộc tính nhập/lưu của luồng tạo cũ, đồng bộ FE và backend; không thêm hoặc thay đổi ý nghĩa trường dữ liệu trong form.
- Thông tin nghiệp vụ của sự kiện lấy từ nội dung đã tạo thành công: tên, giai đoạn cha, thời gian và mô tả. Thời kỳ được suy ra từ giai đoạn; số podcast được tính từ liên kết hiện có.

## Hướng thực hiện

Chọn thay đổi đồng bộ giao diện, hợp đồng dữ liệu, API và phần lưu trữ. Chỉ ẩn cột sẽ không đáp ứng yêu cầu bỏ lưu; sửa riêng API sẽ để lại giao diện và các điều kiện phát hành phụ thuộc dữ liệu đã bỏ.

### Giao diện

- `HistoricalCatalogList`: bỏ lọc trạng thái ở mục Sự kiện; tách cột Thời kỳ và Giai đoạn; bỏ các cột Nguồn, Trạng thái, Cập nhật; dùng hàng bảng thông thường.
- Popup chi tiết hiển thị tên, thời kỳ, giai đoạn, mốc thời gian, mô tả và số podcast liên kết. Không hiển thị nguồn, tài liệu, kiểm duyệt hoặc trạng thái hoàn thiện.
- Đồng bộ các vị trí hiển thị cùng sự kiện trong chi tiết Dòng lịch sử để không gọi hoặc hiển thị nguồn/kiểm duyệt của sự kiện nữa. Cây Thời kỳ → Giai đoạn → Sự kiện trong Dòng lịch sử vẫn được mở/thu gọn; yêu cầu bỏ xổ hàng áp dụng cho bảng của mục Sự kiện.
- Giữ các component bảng, popup và nút thao tác dùng chung cùng token hiện tại.
- Nội dung trợ giúp của form tạo phải bỏ lời nhắc bổ sung nguồn/lưu nháp khi loại nội dung được chọn là Sự kiện.

### API và dữ liệu

- DTO sự kiện và API đọc/ghi không còn nguồn, tài liệu, trạng thái duyệt, nhận xét/ngày/người duyệt hay trạng thái suy ra từ nguồn/kiểm duyệt.
- Ngừng cung cấp thao tác gắn nguồn, gửi duyệt và duyệt cho sự kiện; cập nhật OpenAPI và client tương ứng.
- Giữ ID, slug, phiên bản, dấu thời gian và thông tin xóa mềm phục vụ liên kết, chống ghi đè và quản trị dữ liệu; đây là metadata kỹ thuật, không thêm trường nhập mới vào form.
- Rà soát schema lưu trữ và chuẩn bị migration để bỏ dữ liệu riêng của nguồn/kiểm duyệt sự kiện. Không chạy migration xóa dữ liệu trên database đang sử dụng trong bước sửa code; phải báo rõ tác động trước khi áp dụng.
- Không xóa nguồn tư liệu dùng chung hoặc nguồn của series/podcast. Kiểm tra liên kết trích dẫn cũ trước khi chuyển đổi để không làm mất nguồn mà podcast đang sử dụng.
- Các trang công khai và điều kiện dùng sự kiện cho podcast không còn phụ thuộc nguồn hoặc kiểm duyệt sự kiện. Giữ kiểm tra sự tồn tại, xóa mềm, liên kết cha hợp lệ và phiên bản hiện hành.
- Phát hành series không bị chặn vì sự kiện thiếu nguồn/tài liệu hoặc chưa được kiểm duyệt. Không chuyển điều kiện nguồn sự kiện thành điều kiện nguồn khác để tiếp tục chặn series. Các ràng buộc độc lập khác của series được giữ nguyên.
- Giữ nguyên nguồn/tài liệu, kiểm duyệt và các điều kiện độc lập thuộc luồng podcast. Không xóa, bỏ qua hoặc nới lỏng chúng khi gỡ ràng buộc phát hành series từ sự kiện.
- Lưu thất bại không tạo bản ghi một phần; form và lựa chọn hiện có được giữ theo xử lý lỗi hiện tại.

## Giới hạn phạm vi

- Không bổ sung nút hoặc form tạo sự kiện tại mục Sự kiện.
- Không thay đổi quy trình tạo Thời kỳ/Giai đoạn hay bỏ nguồn riêng của chúng.
- Không tự công khai hàng loạt dữ liệu cũ bằng cách giả lập trạng thái “Đã duyệt”.
- Các trang công khai và API dùng dữ liệu sự kiện phải được kiểm tra cùng thay đổi này, không để lại điều kiện yêu cầu thuộc tính đã bỏ.

## Kiểm tra

- Kiểm tra bảng có đủ sáu cột theo thứ tự yêu cầu, hàng không xổ, nút “Xem chi tiết” mở đúng sự kiện và dùng được bằng bàn phím.
- Kiểm tra popup không hiển thị hoặc gọi API nguồn/kiểm duyệt sự kiện.
- Kiểm tra tạo Sự kiện từ Dòng lịch sử vẫn hoạt động; dữ liệu hiển thị sau khi API lưu thành công.
- Kiểm tra hợp đồng API loại bỏ thuộc tính cũ và không còn ghi nguồn/kiểm duyệt của sự kiện.
- Kiểm tra trang công khai, liên kết sự kiện với podcast và các ràng buộc phiên bản/cha hợp lệ.
- Kiểm tra series liên kết sự kiện không có nguồn/kiểm duyệt vẫn vượt qua điều kiện phát hành liên quan đến sự kiện; nguồn/tài liệu và điều kiện độc lập của luồng podcast tiếp tục hoạt động như trước.
- Chạy kiểm tra TypeScript, các test liên quan và kiểm tra tính khớp OpenAPI. Kiểm tra giao diện thực tế khi có quyền chạy trình duyệt theo quy tắc dự án.

## Trạng thái

Người dùng đã duyệt triển khai. Đã sửa mã nguồn và kiểm tra; migration xóa thuộc tính duyệt và liên kết nguồn sự kiện đã được kiểm thử rollback trong schema test độc lập, chưa áp dụng vào database đang dùng.
