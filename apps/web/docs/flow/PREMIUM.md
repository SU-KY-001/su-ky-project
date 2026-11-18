# ĐẶC TẢ NGHIỆP VỤ — PREMIUM VÀ HẠN MỨC TRẢI NGHIỆM

- **Phiên bản:** 1.0 — Đã chốt nghiệp vụ
- **Đối tượng:** Product/BA, UI/UX, Frontend, Backend, QA và Admin vận hành
- **Mục tiêu:** Thống nhất cách hệ thống quản lý gói thành viên, thanh toán, quyền trải nghiệm tính năng, hạn mức Free, thông báo gia hạn và hoạt động của Admin.

## 1. Phạm vi và thuật ngữ

Hệ thống có hai nhóm tài khoản:

- **Free:** dùng các tính năng được mở cho Free, trong hạn mức do Admin cấu hình.
- **Premium:** được mở các tính năng trải nghiệm và không bị hạn mức Free giới hạn trong thời gian gói còn hiệu lực.

Mỗi tính năng trải nghiệm, chẳng hạn nghe podcast, làm quiz hoặc tham quan triển lãm 3D, có một chính sách quyền truy cập do Admin cấu hình.

**Hạn mức** là số lượt một tài khoản Free được sử dụng một tính năng trong một ngày. Mặc định:


| Tính năng              | Hạn mức Free mặc định |
| ---------------------- | ---------------------: |
| Nghe podcast           | 4 lượt/ngày           |
| Làm quiz               | 4 lượt/ngày           |
| Tham quan triển lãm 3D | 1 lượt/ngày           |


Hạn mức được tính theo ngày Việt Nam, từ 00:00 đến 23:59 giờ UTC+7, và tự đặt lại lúc 00:00 ngày hôm sau.

## 2. Quyền truy cập tính năng

Admin cấu hình chính sách cho từng tính năng. Mỗi tính năng ở một trong ba chế độ:


| Chế độ                      | Tài khoản Free                              | Tài khoản Premium        |
| --------------------------- | ------------------------------------------- | ------------------------ |
| **Giới hạn lượt Free**      | Được dùng trong hạn mức/ngày                | Không giới hạn           |
| **Miễn phí không giới hạn** | Được dùng không giới hạn                    | Được dùng không giới hạn |
| **Chỉ Premium**             | Bị khóa; hệ thống hiển thị lời mời nâng cấp | Được dùng không giới hạn |


Các quy tắc áp dụng:

1. Quyền Premium được áp dụng cho toàn bộ tính năng trải nghiệm được hệ thống hỗ trợ, không chỉ riêng tính năng có hạn mức Free.
2. Nếu tính năng đang ở chế độ Chỉ Premium, tài khoản Free cần được thông báo rõ lý do bị khóa và cách nâng cấp.
3. Nếu Admin chuyển một tính năng từ có hạn mức sang miễn phí không giới hạn, hệ thống ngừng chặn theo quota và giao diện không hiển thị số lượt còn lại cho tính năng đó.
4. Nếu Admin thay đổi hạn mức trong ngày, mức mới áp dụng ngay. Nếu số lượt Free đã sử dụng bằng hoặc vượt hạn mức mới, người dùng không được bắt đầu lượt mới trong ngày đó.
5. Việc khóa tính năng do chính sách quyền truy cập không xóa lịch sử sử dụng trước đó.

## 3. Quy tắc tính lượt Free

Một lượt được tính khi người dùng bắt đầu sử dụng thành công tính năng. Hệ thống không trừ lượt nếu thao tác thất bại trước khi tính năng bắt đầu.

Quy tắc theo tính năng:

- **Podcast:** lượt được tính khi bắt đầu phát thành công một tập mới. Nghe lại cùng tập trong cùng ngày hoặc đổi bản kể của cùng tập không trừ thêm lượt. Nghe tập đó vào ngày khác tính theo hạn mức ngày mới.
- **Quiz:** mỗi lần bắt đầu làm bài là một lượt mới, bao gồm bắt đầu lại và ôn lại cùng quiz. Lượt được ghi nhận lúc vào bài thành công, không đợi đến khi nộp bài.
- **Triển lãm 3D:** một lượt là một lần vào triển lãm thành công. Mỗi tài khoản Free có tối đa một lượt tham quan trong ngày theo hạn mức mặc định.

Hệ thống cần tránh trừ lượt nhiều lần do người dùng bấm lặp hoặc ứng dụng gửi lại cùng một yêu cầu. Người dùng vẫn xem được nội dung công khai hoặc thông tin tính năng khi đã hết lượt; hệ thống chỉ chặn lúc họ bắt đầu một lượt mới.

Giao diện tài khoản Free hiển thị số lượt đã dùng và còn lại trong ngày cho từng tính năng đang có hạn mức. Tính năng miễn phí không giới hạn không hiển thị bộ đếm.

## 4. Gói thành viên và thời hạn

Admin quản lý gói được bán cho người dùng, gồm tên, giá, thời hạn, trạng thái hoạt động. Phiên bản này chỉ hỗ trợ một gói Premium tháng có sẵn, mặc định 20.000đ/30 ngày; thời hạn và giá do Admin cấu hình. Admin không tạo thêm gói. Free là trạng thái tài khoản. Các gói cũ được giữ để tra cứu lịch sử.

Quy tắc:

1. Hệ thống chỉ kích hoạt Premium sau khi xác nhận thanh toán thành công hoặc Admin cấp thủ công.
2. Khi kích hoạt, tài khoản được chuyển sang Premium và được mở các tính năng Premium ngay lập tức.
3. Khi gói hết hạn, tài khoản tự trở về Free. Hạn mức Free được áp dụng lại từ thời điểm đó.
4. Nếu người dùng mua gia hạn khi gói hiện tại còn hiệu lực, thời hạn mới bắt đầu sau ngày hết hạn hiện tại. Người dùng không mất phần thời gian còn lại.
5. Nếu gói hiện tại đã hết hạn, thời hạn mới bắt đầu tại thời điểm thanh toán được xác nhận.
6. Việc Admin đổi giá hoặc thời hạn chỉ ảnh hưởng đến đơn hàng được tạo sau thay đổi; đơn đã tạo giữ nguyên giá và thời hạn tại thời điểm đặt mua.

## 5. Thanh toán và trạng thái đơn

Người dùng có thể xem gói, tạo đơn, thanh toán và theo dõi kết quả. Kênh thanh toán cụ thể do hệ thống tích hợp quyết định; giao diện cần thể hiện rõ số tiền, thông tin thanh toán và mã tham chiếu nếu có.

| Trạng thái         | Ý nghĩa                             | Ảnh hưởng đến Premium          |
| ------------------ | ----------------------------------- | ------------------------------ |
| **Chờ thanh toán** | Đơn đã tạo, chưa xác nhận nhận tiền | Chưa kích hoạt                 |
| **Đã thanh toán**  | Hệ thống xác nhận tiền hợp lệ       | Kích hoạt hoặc gia hạn Premium |
| **Cần đối soát**   | Giao dịch cần Admin kiểm tra        | Chưa kích hoạt tự động         |
| **Bị từ chối**     | Đơn không được chấp nhận, kèm lý do | Không kích hoạt                |


Quy tắc vận hành:

- Một đơn chỉ được kích hoạt một lần, kể cả khi hệ thống nhận thông báo thanh toán trùng lặp.
- Đơn chờ thanh toán vẫn hiển thị trong lịch sử đơn của người dùng.
- Giao dịch sai số tiền, không xác định được đơn hoặc phát sinh sau khi đơn kết thúc cần được ghi lại để Admin đối soát.
- Mọi thao tác duyệt, từ chối, điều chỉnh hoặc đối soát của Admin phải lưu người thực hiện, thời gian, trạng thái thay đổi và lý do.

## 6. Thông báo sắp hết hạn

Khi Premium còn **dưới 5 ngày** trước thời điểm hết hạn, hệ thống gửi thông báo gia hạn cho người dùng qua cả **push notification** và **thông báo trong app**.

Thông báo cần nêu:

- Gói Premium sắp hết hạn.
- Ngày hết hạn cụ thể và số ngày còn lại.
- Nút hoặc đường dẫn đến trang gia hạn.

Quy tắc gửi thông báo:

1. Gửi thông báo **một lần cho mỗi kỳ Premium**, vào lần đầu hệ thống phát hiện thời hạn còn dưới 5 ngày.
2. Không gửi thông báo nhắc lặp hằng ngày cho cùng kỳ hạn.
3. Sau thông báo đó, số ngày còn lại tiếp tục giảm trên giao diện theo thời gian. Khi sang ngày mới, giao diện cập nhật số ngày còn lại.
4. Nếu người dùng gia hạn trước khi hết hạn, kỳ hạn mới được nối tiếp sau kỳ hạn hiện tại. Không gửi thêm thông báo nhắc cho kỳ hạn cũ.
5. Thông báo trong app vẫn được tạo nếu người dùng tắt quyền nhận push trên thiết bị. Push notification được gửi khi thiết bị và ứng dụng cho phép nhận.

## 7. Khu vực hồ sơ người dùng

Người dùng có trang hồ sơ hoặc trang thành viên để:

- Xem thông tin tài khoản cơ bản.
- Xem trạng thái hiện tại: Free hoặc Premium.
- Xem gói đang dùng, ngày bắt đầu và ngày hết hạn.
- Xem quyền lợi của gói Free và Premium.
- Với Free: xem số lượt đã dùng, số lượt còn lại trong ngày và thời điểm reset.
- Với Premium: xem số ngày còn lại và ngày hết hạn.
- Xem thông báo sắp hết hạn.
- Xem lịch sử đơn hàng và trạng thái thanh toán.
- Mua gói hoặc gia hạn.

Nếu người dùng chưa đăng nhập, hệ thống cần yêu cầu đăng nhập trước khi mua gói hoặc ghi nhận quyền lợi thành viên.

## 8. Chức năng quản trị Admin

### 8.1. Quản lý gói thành viên

Admin có thể:

- Xem danh sách gói.
- Chỉnh sửa thông tin gói tháng có sẵn.
- Cấu hình tên, giá, thời hạn và trạng thái bán của gói tháng.
- Tắt gói không còn bán mà không xóa lịch sử giao dịch cũ.

### 8.2. Quản lý tài khoản và trạng thái thành viên

Admin có thể xem danh sách người dùng, tìm kiếm và lọc theo trạng thái Free hoặc Premium. Thông tin tài khoản cần đủ để quản trị, gồm trạng thái gói và thời hạn Premium nếu có.

Admin được phép cấp Premium thủ công. Thao tác cấp cần có lý do, người thực hiện, thời hạn và thời điểm hiệu lực; hệ thống ghi nhận thao tác trong lịch sử thành viên và audit log.

Admin được phép thu hồi Premium thủ công. Trước khi thu hồi, giao diện **bắt buộc hiển thị alert dialog xác nhận**. Dialog cần nêu tài khoản bị ảnh hưởng và yêu cầu Admin xác nhận. Thao tác thu hồi cần có lý do.

- Nếu Admin xác nhận, hệ thống thu hồi các kỳ hạn đang hiệu lực, chuyển tài khoản về Free ngay và ghi audit log.
- Nếu Admin hủy hoặc đóng dialog, hệ thống không thay đổi dữ liệu thành viên.

### 8.3. Quản lý thanh toán

Admin có thể xem danh sách đơn hàng và giao dịch, lọc theo trạng thái, người dùng và khoảng thời gian. Chi tiết cần hiển thị số tiền, gói, thời hạn, thời điểm giao dịch, trạng thái và lịch sử xử lý.

Admin được phép xử lý các trường hợp cần đối soát theo quy trình hệ thống. Mọi thao tác thay đổi trạng thái phải có lý do và được lưu trong audit log.

### 8.4. Quản lý chính sách tính năng và hạn mức Free

Admin có thể xem từng tính năng trải nghiệm và cấu hình:

- Tính năng giới hạn lượt Free, miễn phí không giới hạn, hoặc chỉ dành cho Premium.
- Hạn mức Free trong một ngày nếu tính năng có giới hạn.
- Trạng thái hoạt động của tính năng nếu hệ thống hỗ trợ bật/tắt.

Hạn mức mặc định:

- Podcast: 4 lượt/ngày.
- Quiz: 4 lượt/ngày.
- Triển lãm 3D: 1 lượt/ngày.

Khi chuyển tính năng sang miễn phí không giới hạn, người dùng Free được trải nghiệm không cần nâng cấp và giao diện ẩn bộ đếm quota. Khi chuyển sang Chỉ Premium, người dùng Free bị khóa tính năng đó và được hiển thị hướng dẫn nâng cấp.

### 8.5. Audit log

Audit log cần ghi nhận tối thiểu:

- Thay đổi gói, giá, thời hạn hoặc trạng thái bán.
- Thay đổi chính sách tính năng và hạn mức.
- Thanh toán được xác nhận, đối soát, duyệt hoặc từ chối.
- Cấp hoặc thu hồi quyền Premium thủ công.
- Thay đổi trạng thái tài khoản liên quan đến thành viên.

Mỗi bản ghi gồm người thực hiện, thời gian, đối tượng bị ảnh hưởng, giá trị trước/sau và lý do nếu có. Admin có thể tìm kiếm và lọc lịch sử để truy vết trạng thái.

## 9. Quyền hạn và các trường hợp lỗi

- Người dùng không thể tự sửa gói, giá, hạn mức hoặc trạng thái thành viên.
- Người dùng chỉ được xem lịch sử đơn hàng thuộc tài khoản của mình.
- Khi thanh toán chưa xác nhận, giao diện phải ghi rõ tài khoản chưa được nâng cấp.
- Khi thanh toán thất bại hoặc bị từ chối, cần hiển thị lý do phù hợp và hướng xử lý tiếp theo.
- Khi hết lượt Free, giao diện cần thông báo lượt sẽ được reset lúc 00:00 giờ Việt Nam, hoặc mời nâng cấp nếu tính năng chỉ dành cho Premium.
- Nếu hệ thống không tải được trạng thái quyền hoặc hạn mức, giao diện không được tự giả định người dùng đã được cấp Premium.
- Khi Admin thu hồi Premium, alert dialog là bước xác nhận bắt buộc. Hủy dialog không thay đổi dữ liệu.

## 10. Tiêu chí nghiệm thu chính

- Người dùng Free thấy chính xác trạng thái gói và hạn mức còn lại theo từng tính năng.
- Số lượt được reset tự động lúc 00:00 giờ Việt Nam.
- Người dùng Free bị chặn khi hết lượt hoặc khi tính năng chỉ dành cho Premium.
- Admin thay đổi hạn mức hoặc chính sách truy cập có hiệu lực theo quy tắc đã nêu.
- Thanh toán thành công tự kích hoạt hoặc gia hạn Premium và mở tính năng Premium.
- Thanh toán chưa xác nhận không kích hoạt Premium.
- Gói đang còn hạn được cộng nối tiếp khi người dùng gia hạn.
- Khi thời hạn Premium còn dưới 5 ngày, hệ thống gửi một push notification và tạo một thông báo trong app cho kỳ hạn đó; không gửi nhắc lặp.
- Số ngày Premium còn lại tiếp tục giảm trên giao diện khi ngày trôi qua.
- Admin xem được trạng thái tài khoản, giao dịch và audit log.
- Admin cấp Premium thủ công có lý do và audit log.
- Admin thu hồi Premium phải xác nhận qua alert dialog; hủy dialog không làm thay đổi quyền.
- Hoàn tiền và hủy gói chưa được triển khai trong phiên bản này.

## 11. Quyết định nghiệp vụ đã chốt


| Chủ đề                   | Quyết định                                                                       |
| ------------------------ | -------------------------------------------------------------------------------- |
| Kênh nhắc gia hạn        | Push notification và thông báo trong app.                                        |
| Số lần nhắc              | Một lần cho mỗi kỳ Premium khi thời hạn còn dưới 5 ngày.                         |
| Bộ đếm thời hạn          | Sau lần nhắc duy nhất, số ngày còn lại tiếp tục giảm trên giao diện mỗi ngày.    |
| Quiz làm lại/ôn tập      | Mỗi lần bắt đầu là một lượt mới, kể cả làm lại hoặc ôn lại cùng quiz.            |
| Cấp Premium thủ công     | Admin được phép cấp; cần lý do và audit log.                                     |
| Thu hồi Premium thủ công | Admin được phép thu hồi; cần lý do, audit log và alert dialog xác nhận bắt buộc. |
| Hoàn tiền/hủy gói        | Chưa triển khai trong phiên bản này.                                             |
| Quota mặc định           | Podcast 4 lượt/ngày, quiz 4 lượt/ngày, triển lãm 3D 1 lượt/ngày.                 |
| Múi giờ reset quota      | 00:00 giờ Việt Nam (UTC+7).                                                      |
