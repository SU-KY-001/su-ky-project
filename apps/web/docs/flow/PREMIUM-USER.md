# ĐẶC TẢ NGHIỆP VỤ PREMIUM — USER

- **Phiên bản:** 1.0
- **Tài liệu nguồn:** PREMIUM.md
- **Đối tượng:** Người dùng, Product/BA, UI/UX, Frontend, Backend và QA
- **Phạm vi:** Quyền lợi Free/Premium, hạn mức trải nghiệm, hồ sơ thành viên, mua gói, thanh toán, gia hạn và thông báo.

## 1. Trạng thái thành viên

Người dùng có một trạng thái thành viên hiệu lực tại một thời điểm:

- **Free:** được dùng các tính năng đang mở cho Free, theo quota hoặc không giới hạn tùy cấu hình hiện tại.
- **Premium:** được dùng toàn bộ tính năng trải nghiệm, không bị hạn mức Free giới hạn trong thời gian gói còn hiệu lực.

Khi Premium hết hạn hoặc bị thu hồi, tài khoản tự trở về Free và chính sách/quota Free được áp dụng lại. Người chưa đăng nhập cần đăng nhập trước khi mua gói hoặc ghi nhận quyền lợi thành viên.

## 2. Quyền truy cập tính năng

Admin cấu hình chính sách cho từng tính năng trải nghiệm. Người dùng Free có thể gặp một trong ba chế độ:

| Chế độ tính năng | Quyền của Free | Quyền của Premium |
|---|---|---|
| **Giới hạn lượt Free** | Dùng trong quota/ngày | Không giới hạn |
| **Miễn phí không giới hạn** | Dùng không giới hạn | Dùng không giới hạn |
| **Chỉ Premium** | Bị khóa; được hướng dẫn nâng cấp | Dùng không giới hạn |

Nếu một tính năng yêu cầu Premium, giao diện cần giải thích lý do bị khóa và cung cấp đường dẫn hoặc CTA nâng cấp. Người dùng vẫn xem được nội dung công khai hoặc thông tin tính năng; hệ thống chặn khi bắt đầu tính năng cần quyền.

Premium bỏ qua quota Free và mở các tính năng trải nghiệm trong thời gian gói còn hiệu lực.

## 3. Hạn mức Free

Quota Free mặc định:

| Tính năng | Hạn mức mặc định |
|---|---:|
| Nghe podcast | 4 lượt/ngày |
| Làm quiz | 4 lượt/ngày |
| Tham quan triển lãm 3D | 1 lượt/ngày |

Admin có thể thay đổi quota hoặc chính sách truy cập. Mức mới có hiệu lực ngay. Nếu số lượt đã dùng bằng hoặc vượt quota mới thì người dùng Free không thể bắt đầu lượt mới trong ngày đó.

### 3.1. Cách tính lượt

Một lượt được tính khi bắt đầu sử dụng thành công. Lỗi xảy ra trước khi tính năng bắt đầu không trừ lượt.

- **Podcast:** bắt đầu phát thành công một tập mới tính một lượt. Nghe lại cùng tập trong cùng ngày hoặc đổi bản kể của cùng tập không trừ thêm. Nghe lại vào ngày khác tính vào quota ngày mới.
- **Quiz:** mỗi lần bắt đầu làm bài là một lượt mới, kể cả bắt đầu lại hoặc ôn lại cùng quiz. Lượt được tính khi vào bài thành công, không đợi nộp bài.
- **Triển lãm 3D:** một lần vào triển lãm thành công là một lượt. Quota mặc định của Free là một lượt tham quan mỗi ngày.

Hệ thống không được trừ lượt nhiều lần do thao tác lặp hoặc request được gửi lại. Khi hết lượt, người dùng vẫn xem được nội dung/thông tin được phép; chỉ thao tác bắt đầu lượt mới bị chặn.

### 3.2. Reset quota và bộ đếm

- Quota được tính theo ngày Việt Nam, múi giờ UTC+7.
- Quota tự reset lúc 00:00 mỗi ngày.
- Khi tính năng có quota, giao diện hiển thị lượt đã dùng, lượt còn lại và thời điểm reset.
- Nếu Admin chuyển tính năng sang Miễn phí không giới hạn, giao diện ẩn bộ đếm quota.
- Tài khoản Premium không hiển thị bộ đếm quota Free.

## 4. Gói Premium và thời hạn

Luồng mua mặc định có gói Premium tháng. Giá và thời hạn hiển thị theo thông tin gói hiện hành của hệ thống.

Quy tắc thời hạn:

1. Premium chỉ được kích hoạt sau khi thanh toán được xác nhận thành công hoặc Admin cấp thủ công.
2. Khi được kích hoạt, quyền Premium có hiệu lực ngay lập tức.
3. Nếu gia hạn khi gói còn hiệu lực, kỳ hạn mới nối tiếp sau ngày hết hạn hiện tại; người dùng không mất thời gian còn lại.
4. Nếu mua sau khi gói đã hết hạn, kỳ hạn mới bắt đầu khi thanh toán được xác nhận.
5. Khi hết hạn, tài khoản tự trở về Free.

## 5. Mua gói và trạng thái thanh toán

Người dùng có thể xem gói, tạo đơn, thanh toán và theo dõi kết quả. Giao diện thanh toán cần thể hiện số tiền, thông tin thanh toán và mã tham chiếu nếu có.

| Trạng thái đơn | Ý nghĩa đối với người dùng |
|---|---|
| **Chờ thanh toán** | Đơn đã tạo nhưng chưa xác nhận nhận tiền; tài khoản chưa được nâng cấp. |
| **Đã thanh toán** | Thanh toán hợp lệ đã được xác nhận; Premium được kích hoạt hoặc gia hạn. |
| **Cần đối soát** | Giao dịch đang được kiểm tra; Premium chưa tự kích hoạt. |
| **Bị từ chối** | Đơn không được chấp nhận; hiển thị lý do và hướng xử lý phù hợp. |

Các quy tắc bổ sung:

- Đơn chờ thanh toán vẫn xuất hiện trong lịch sử đơn.
- Thanh toán chưa xác nhận không làm thay đổi trạng thái thành viên.
- Nếu giao dịch cần đối soát, giao diện thông báo đang kiểm tra và không khẳng định thanh toán thành công/thất bại trước khi có kết quả.
- Một đơn không được kích hoạt hai lần dù hệ thống nhận thông báo thanh toán trùng lặp.
- Người dùng chỉ xem được lịch sử đơn hàng thuộc tài khoản của mình.
- Hoàn tiền và hủy gói chưa thuộc phạm vi phiên bản này.

## 6. Thông báo sắp hết hạn

Khi Premium còn **dưới 5 ngày**, hệ thống gửi thông báo gia hạn **một lần cho kỳ hạn đó** qua cả push notification và thông báo trong app.

Thông báo gồm:

- Gói Premium sắp hết hạn.
- Ngày hết hạn cụ thể.
- Số ngày còn lại.
- Nút hoặc đường dẫn đến trang gia hạn.

Sau lần nhắc duy nhất, số ngày còn lại tiếp tục giảm trên giao diện khi ngày trôi qua; không gửi nhắc lặp hằng ngày cho cùng kỳ hạn. Nếu gia hạn trước khi hết hạn, kỳ hạn mới nối tiếp kỳ hạn hiện tại và không gửi thêm nhắc cho kỳ hạn cũ.

Nếu người dùng tắt quyền nhận push trên thiết bị, thông báo trong app vẫn hiển thị. Push được gửi khi thiết bị và ứng dụng cho phép nhận.

## 7. Hồ sơ và trang thành viên

Người dùng có trang hồ sơ hoặc trang thành viên để:

- Xem thông tin tài khoản cơ bản.
- Xem trạng thái hiện tại: Free hoặc Premium.
- Xem gói đang dùng, ngày bắt đầu và ngày hết hạn.
- Xem quyền lợi của Free và Premium.
- Với Free: xem quota từng tính năng đang bị giới hạn, số lượt đã dùng/còn lại và giờ reset.
- Với Premium: xem số ngày còn lại và ngày hết hạn.
- Xem thông báo sắp hết hạn.
- Xem lịch sử đơn hàng và trạng thái thanh toán.
- Mua gói hoặc gia hạn.

Giao diện cần cập nhật số ngày Premium còn lại khi sang ngày mới. Nếu hệ thống không tải được trạng thái thành viên hoặc quota, giao diện không được tự giả định tài khoản đã có Premium hoặc cho phép vượt quota.

## 8. Tiêu chí nghiệm thu cho User

- Người dùng xem được trạng thái Free/Premium, quyền lợi và thông tin gói hiện tại.
- Free thấy quota và số lượt còn lại theo từng tính năng có giới hạn.
- Quota reset lúc 00:00 giờ Việt Nam (UTC+7).
- Podcast nghe lại cùng tập trong ngày không trừ thêm lượt.
- Mỗi lần bắt đầu quiz, kể cả làm lại hoặc ôn lại cùng quiz, tính một lượt mới.
- Free bị chặn khi hết quota hoặc khi tính năng chỉ dành cho Premium.
- Tính năng miễn phí không giới hạn không hiển thị bộ đếm.
- Premium đang hiệu lực dùng các tính năng trải nghiệm không bị quota Free giới hạn.
- Thanh toán chưa xác nhận không kích hoạt Premium.
- Thanh toán thành công kích hoạt hoặc gia hạn Premium đúng thời hạn.
- Gia hạn khi gói còn hiệu lực nối tiếp sau hạn hiện tại.
- Khi còn dưới 5 ngày, người dùng nhận một push notification và một thông báo trong app cho kỳ đó; giao diện tiếp tục giảm số ngày còn lại và không gửi nhắc lặp.
- Người dùng chỉ xem được đơn hàng thuộc tài khoản của mình.
