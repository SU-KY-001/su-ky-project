# ĐẶC TẢ NGHIỆP VỤ PREMIUM — ADMIN

- **Phiên bản:** 1.0
- **Tài liệu nguồn:** PREMIUM.md
- **Đối tượng:** Admin vận hành, Product/BA, UI/UX, Frontend, Backend và QA
- **Phạm vi:** Quản lý gói Premium, chính sách truy cập tính năng, hạn mức Free, thành viên, thanh toán, thông báo gia hạn và audit log.

## 1. Vai trò Admin

Admin là vai trò quản trị hệ thống, có quyền quản lý gói thành viên, chính sách quyền truy cập các tính năng, trạng thái thành viên, các giao dịch thanh toán và lịch sử audit.

Moderator không mặc nhiên có quyền quản trị gói, thành viên, thanh toán hoặc cấu hình hạn mức.

Tài khoản người dùng có trạng thái thành viên hiệu lực là Free hoặc Premium. Premium hết hạn hoặc bị Admin thu hồi thì tài khoản trở về Free và chính sách/quota Free được áp dụng lại.

## 2. Quản lý gói thành viên

Admin có thể:

- Xem danh sách gói.
- Chỉnh sửa gói tháng có sẵn.
- Cấu hình tên, giá, thời hạn và trạng thái mở bán của gói tháng.
- Tắt gói không còn bán mà không xóa lịch sử giao dịch cũ.

Phiên bản này chỉ hỗ trợ một gói Premium tháng có sẵn, mặc định 20.000đ/30 ngày. Admin không tạo thêm gói. Free là trạng thái tài khoản; gói cũ được giữ để tra cứu lịch sử. Giá và thời hạn có thể được Admin cấu hình và không được ghi cứng trên giao diện.

Quy tắc đơn hàng:

- Đơn lưu snapshot tên gói, giá và thời hạn tại thời điểm tạo.
- Thay đổi giá hoặc thời hạn chỉ ảnh hưởng các đơn tạo sau thay đổi.
- Gói đã có giao dịch không bị xóa khỏi lịch sử.
- Gói không mở bán không được cung cấp trong luồng mua người dùng.

Mọi thay đổi gói được ghi vào audit log với người thực hiện, thời gian và giá trị trước/sau.

## 3. Quản lý chính sách tính năng và quota Free

Admin cấu hình chính sách cho từng tính năng trong danh mục trải nghiệm. Mỗi tính năng ở một trong ba chế độ:

| Chế độ | Quyền của Free | Quyền của Premium |
|---|---|---|
| **Giới hạn lượt Free** | Được dùng tối đa quota/ngày | Không giới hạn |
| **Miễn phí không giới hạn** | Được dùng không giới hạn | Được dùng không giới hạn |
| **Chỉ Premium** | Bị khóa; UI hướng dẫn nâng cấp | Được dùng không giới hạn |

Quota mặc định:

| Tính năng | Chế độ mặc định | Quota Free |
|---|---|---:|
| Nghe podcast | Giới hạn lượt Free | 4 lượt/ngày |
| Làm quiz | Giới hạn lượt Free | 4 lượt/ngày |
| Tham quan triển lãm 3D | Giới hạn lượt Free | 1 lượt/ngày |

Admin có thể thay đổi chế độ và quota của từng tính năng. Khi đổi sang Miễn phí không giới hạn, hệ thống ngừng chặn theo quota và giao diện người dùng ẩn bộ đếm. Khi đổi sang Chỉ Premium, tài khoản Free bị chặn ở lần bắt đầu sử dụng tiếp theo.

Thay đổi quota có hiệu lực ngay. Nếu số lượt Free đã dùng trong ngày bằng hoặc vượt quota mới thì người dùng không được bắt đầu lượt mới trong ngày đó. Thay đổi chính sách không xóa lịch sử sử dụng trước đó.

Đặt quota bằng 0 không phải cách khóa Free; muốn giới hạn quyền Free thì Admin chọn chế độ Chỉ Premium.

### 3.1. Quy tắc ghi nhận lượt

Hệ thống tính lượt khi người dùng bắt đầu sử dụng tính năng thành công. Lỗi xảy ra trước khi tính năng bắt đầu không trừ lượt. Hệ thống phải tránh ghi trùng do bấm lặp hoặc request gửi lại.

- **Podcast:** API lấy thông tin phát chỉ kiểm tra quyền và trả thông tin audio, chưa ghi lượt. Player web/mobile xác nhận lượt qua API riêng khi audio thực sự bắt đầu phát. Server kiểm tra lại quyền và phiên bản audio rồi ghi lượt theo tập/ngày. Retry hoặc nghe lại cùng tập trong ngày không ghi trùng. Nếu xác nhận thất bại, player dừng và thông báo lỗi.
- **Quiz:** mỗi lần bắt đầu làm bài tính một lượt mới, kể cả bắt đầu lại hoặc ôn lại cùng quiz. Lượt tính lúc vào bài thành công, không đợi nộp bài.
- **Triển lãm 3D:** mỗi lần vào triển lãm thành công là một lượt. Quota mặc định của Free là một lượt tham quan trong ngày.

Ngày quota theo giờ Việt Nam UTC+7, reset lúc 00:00. Giao diện người dùng hiển thị lượt đã dùng, còn lại và thời điểm reset cho các tính năng đang có quota.

## 4. Danh sách và quản lý thành viên

Admin có thể xem, tìm kiếm và lọc tài khoản theo trạng thái Free hoặc Premium, thời hạn và trạng thái còn hiệu lực/hết hạn.

Thông tin thành viên tối thiểu:

- Tài khoản người dùng.
- Trạng thái Free/Premium.
- Gói thành viên.
- Thời điểm bắt đầu và hết hạn.
- Nguồn cấp quyền: thanh toán hay Admin.
- Trạng thái thu hồi và lý do nếu có.

### 4.1. Cấp Premium thủ công

Admin được phép cấp Premium thủ công. Thao tác cần lưu:

- Tài khoản được cấp.
- Gói/thời hạn và thời điểm hiệu lực.
- Admin thực hiện.
- Lý do cấp.
- Thời gian thao tác.

Quyền Premium có hiệu lực theo thời hạn đã cấp và mở các tính năng trải nghiệm ngay lập tức. Thao tác được ghi vào lịch sử thành viên và audit log.

### 4.2. Thu hồi Premium thủ công

Admin được phép thu hồi Premium thủ công. Trước khi thực hiện, UI bắt buộc hiển thị alert dialog xác nhận. Dialog nêu tài khoản bị ảnh hưởng và yêu cầu Admin xác nhận.

- Thao tác thu hồi cần có lý do.
- Nếu Admin xác nhận, hệ thống thu hồi các kỳ hạn đang hiệu lực và chuyển tài khoản về Free ngay.
- Nếu Admin hủy hoặc đóng dialog, hệ thống không thay đổi dữ liệu thành viên.
- Thao tác và lý do được ghi vào lịch sử thành viên và audit log.

## 5. Quản lý thanh toán

Admin có thể xem danh sách đơn hàng và giao dịch, lọc theo trạng thái, người dùng và khoảng thời gian.

Chi tiết đơn/giao dịch cần hiển thị:

- Người dùng và đơn liên quan.
- Gói, giá và thời hạn.
- Mã giao dịch hoặc mã tham chiếu nếu có.
- Thời điểm nhận tiền.
- Trạng thái hiện tại và lịch sử chuyển trạng thái.
- Nguồn cập nhật: hệ thống tự động hay Admin.
- Lý do cần đối soát, bị từ chối hoặc điều chỉnh.

### 5.1. Trạng thái đơn hàng

| Trạng thái | Ý nghĩa | Ảnh hưởng đến Premium |
|---|---|---|
| **Chờ thanh toán** | Đơn đã tạo, chưa xác nhận nhận tiền | Chưa kích hoạt |
| **Đã thanh toán** | Hệ thống xác nhận tiền hợp lệ | Kích hoạt hoặc gia hạn Premium |
| **Cần đối soát** | Giao dịch cần Admin kiểm tra | Chưa kích hoạt tự động |
| **Bị từ chối** | Đơn không được chấp nhận, kèm lý do | Không kích hoạt |

Quy tắc:

- Một đơn chỉ được kích hoạt một lần, kể cả khi nhận thông báo thanh toán trùng lặp.
- Đơn chờ thanh toán vẫn được lưu trong lịch sử.
- Giao dịch sai số tiền, không xác định được đơn hoặc phát sinh sau khi đơn kết thúc phải được lưu để Admin đối soát.
- Tài khoản chỉ được kích hoạt Premium sau khi thanh toán được xác nhận thành công hoặc Admin cấp thủ công.
- Thanh toán chưa xác nhận hoặc đang đối soát không tự cấp quyền Premium.

Mọi thao tác duyệt, từ chối, gán giao dịch, bỏ qua hoặc điều chỉnh phải lưu Admin thực hiện, thời gian, dữ liệu/trạng thái trước và sau, cùng lý do hoặc ghi chú.

## 6. Theo dõi kỳ hạn và thông báo gia hạn

Premium hết hiệu lực tại thời điểm hết hạn đã lưu. Khi hết hạn, tài khoản tự trở về Free và quota Free hiện hành được áp dụng cho các lượt tiếp theo.

Khi người dùng gia hạn:

- Nếu Premium còn hiệu lực, kỳ hạn mới nối tiếp sau ngày hết hạn hiện tại.
- Nếu Premium đã hết hạn, kỳ hạn mới bắt đầu tại thời điểm xác nhận thanh toán.

Khi thời hạn còn **dưới 5 ngày**, hệ thống gửi một lần cho mỗi kỳ Premium qua cả push notification và thông báo trong app. Thông báo gồm gói sắp hết hạn, ngày hết hạn, số ngày còn lại và đường dẫn gia hạn.

Không gửi nhắc lặp hằng ngày cho cùng một kỳ hạn. Sau lần nhắc duy nhất, số ngày còn lại tiếp tục giảm trên giao diện khi ngày trôi qua. Nếu người dùng tắt quyền push, thông báo trong app vẫn được tạo. Nếu gia hạn trước hạn, không gửi thêm thông báo nhắc cho kỳ hạn cũ.

## 7. Audit log

Audit log là lịch sử để Admin truy vết thay đổi. Mỗi sự kiện quản trị hoặc thay đổi trạng thái quan trọng cần lưu tối thiểu:

- Loại hành động và mã sự kiện.
- Người thực hiện: Admin, người dùng hoặc hệ thống.
- Đối tượng bị ảnh hưởng: tài khoản, gói, đơn, giao dịch hoặc tính năng.
- Thời điểm.
- Trạng thái/giá trị trước và sau.
- Lý do hoặc ghi chú nếu có.
- Mã đơn/giao dịch liên quan nếu có.

Các hoạt động tối thiểu phải có log:

- Thay đổi gói, giá, thời hạn hoặc trạng thái mở bán.
- Thay đổi chính sách tính năng và quota.
- Thanh toán được xác nhận, đối soát, duyệt hoặc từ chối.
- Cấp hoặc thu hồi Premium thủ công.
- Thay đổi trạng thái tài khoản liên quan đến thành viên.

Audit log chỉ ghi thêm, không cho sửa hoặc xóa từ giao diện quản trị. Admin có thể tìm kiếm và lọc lịch sử. Lịch sử đơn/giao dịch phải thể hiện chuỗi trạng thái theo thời gian, không chỉ trạng thái cuối.

## 8. Ngoài phạm vi

Phiên bản này chưa bao gồm hoàn tiền, hủy gói, tự động gia hạn, ví/số dư, mã giảm giá, gói năm, quảng cáo chèn giữa hoặc tải offline.

## 9. Tiêu chí nghiệm thu cho Admin

- Admin xem, tìm kiếm và lọc được tài khoản Free/Premium cùng thời hạn thành viên.
- Admin quản lý được thông tin gói và trạng thái mở bán.
- Admin cấu hình được chế độ truy cập và quota của từng tính năng.
- Quota mặc định là podcast 4/ngày, quiz 4/ngày, triển lãm 3D 1/ngày.
- Thay đổi quota/chính sách có hiệu lực theo quy tắc trong tài liệu.
- Admin xem được đơn, giao dịch, trạng thái và lịch sử xử lý.
- Thanh toán chưa xác nhận không kích hoạt Premium.
- Admin cấp Premium thủ công có lý do và audit log.
- Thu hồi Premium yêu cầu alert dialog; hủy dialog không làm thay đổi dữ liệu.
- Admin có thể tra cứu audit log có đủ người thực hiện, thời gian, đối tượng và thay đổi.
- Hệ thống gửi một push notification và tạo một thông báo trong app khi kỳ Premium lần đầu bước vào ngưỡng còn dưới 5 ngày; không nhắc lặp cho kỳ đó.
