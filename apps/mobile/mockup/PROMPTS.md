# Sử Ký Mobile — bộ mockup người dùng

## Phạm vi
Thiết kế ứng dụng mobile dành cho người nghe/người học lịch sử. Chỉ có trải nghiệm user công khai và tài khoản user; không dựng màn hình hay quyền moderator/admin. Bộ tham chiếu gồm các luồng: khám phá, duyệt lịch sử và tư liệu, series/tập podcast và player, quiz, lịch phát, hành trình/đăng nhập.

## Hệ hình ảnh dùng xuyên suốt
- Nền giấy dó `#F4ECDC`, bề mặt sáng `#FAF6ED`, mực `#1C1714`, chữ phụ `#5B4E44`, đỏ son `#B8322A`, đồng `#B58A3C`, tối `#14110F`; Be Vietnam Pro.
- Cross-platform premium neutral theo Expo/React Native, safe-area chuẩn, status bar rõ, bottom tab bar ổn định: Khám phá / Lịch sử / Podcast / Quiz / Tôi. Player mini khi có audio.
- Cảm hứng thư tịch và bảo tàng Việt Nam: giấy dó có vân nhẹ, mực khắc, ảnh tư liệu lịch sử có tông ấm; dùng tiết chế, độ tương phản và chữ dễ đọc là ưu tiên.
- Không gradient xanh/tím, không glassmorphism, không thẻ chồng lồng, không dashboard quản trị. Tỉ lệ màn 9:19.5, điện thoại hiện đại, khung máy mảnh và nhất quán.
- Nội dung mẫu dùng tiếng Việt tự nhiên, các tên lịch sử như Bạch Đằng 938, Hai Bà Trưng, Điện Biên Phủ 1954. Các màn cùng một app và cùng hệ thống icon nét gọn.

## Danh mục màn hình và prompt tái tạo

### 01 — Khám phá
Mục tiêu: lối vào app, tìm câu chuyện và tiếp tục nghe.
Prompt: Tạo màn app iOS/Android trung tính cho ứng dụng văn hóa lịch sử Việt Nam Sử Ký, màn “Khám phá”. Trên cùng có wordmark nhỏ SỬ KÝ, avatar tròn và nút tìm kiếm. Hero ảnh tư liệu giàu cảm xúc về trống đồng/chiến thuyền trên nền tối, tiêu đề lớn “Mỗi trang sử, một câu chuyện”, mô tả ngắn, CTA đỏ son “Khám phá ngay”. Tiếp theo là hàng “Nghe tiếp” với cover podcast Bạch Đằng 938, tiêu đề tập, tiến độ nghe và play tròn; hàng ngang “Chủ đề nổi bật” có 3 ảnh poster lịch sử khác nhau; một mục “Dòng lịch sử” biểu diễn timeline nằm ngang với node đồng/đỏ. Bottom navigation 5 mục, Khám phá active; mini-player chỉ hiện nếu bố cục còn thoáng. Nền giấy dó, typography Be Vietnam Pro, khoảng thở rộng, không biến thành trang web thu nhỏ.

### 02 — Duyệt lịch sử
Mục tiêu: lọc theo thời kỳ/giai đoạn và mở sự kiện.
Prompt: Màn “Lịch sử” app Sử Ký. App bar có back hoặc wordmark nhỏ và search. Tiêu đề “Dòng chảy lịch sử”, phụ đề ngắn. Bộ lọc thời kỳ dạng chips ngang gọn: Cổ đại, Trung đại, Cận đại, Hiện đại; trạng thái chọn đỏ son. Dưới là danh sách sự kiện theo timeline dọc trên giấy: mỗi hàng có niên đại rõ, đường timeline mảnh đồng, thumbnail tư liệu hình chữ nhật bo nhẹ, tên “Khởi nghĩa Hai Bà Trưng”, “Chiến thắng Bạch Đằng”, mô tả 1–2 dòng và dấu chevron. Bottom tab Lịch sử active. Ưu tiên nội dung, không dùng tree desktop; cảm giác thư viện tuyển chọn.

### 03 — Chi tiết sự kiện và nguồn
Mục tiêu: đọc tóm tắt sự kiện lịch sử có trích dẫn.
Prompt: Màn chi tiết sự kiện “Chiến thắng Bạch Đằng năm 938”. Ảnh bìa lịch sử toàn chiều ngang phía trên với lớp chuyển tối nhẹ để đặt tiêu đề trắng; thanh điều hướng back và bookmark. Dưới ảnh là breadcrumb “Thời Bắc thuộc / Nhà Ngô”, thời gian “Năm 938”, tiêu đề lớn, đoạn tóm tắt dễ đọc theo chiều rộng mobile. Phần “Nguồn tư liệu” gồm 2 mục nguồn gọn, icon tài liệu, tên nguồn và nút mở. Cuối màn có nút “Nghe câu chuyện liên quan” đỏ son và hàng podcast liên quan. Nền giấy ấm, phân cấp chữ rõ; tab bar ẩn trên màn đọc sâu hoặc giữ bottom bar tối giản.

### 04 — Thư viện podcast
Mục tiêu: khám phá series và chọn tập.
Prompt: Màn “Podcast” của Sử Ký, app bar có tiêu đề và search. Một series nổi bật có poster lớn phong cách tranh khắc/ảnh tư liệu “Hào khí Bạch Đằng”, nhãn số tập, mô tả ngắn và nút xem series. Bên dưới “Series dành cho bạn” dạng danh sách ngang cover vuông, tên series dễ đọc; tiếp theo “Tập mới phát hành” dạng list dọc với ảnh vuông nhỏ, tên tập, series, thời lượng và nút play đỏ. Bottom tabs Podcast active; mini-player dính ngay trên tab bar hiển thị khi đang nghe. Tuyệt đối đừng dùng lưới desktop hoặc card dày đặc.

### 05 — Chi tiết series / danh sách tập
Mục tiêu: hiểu series, phát tiếp và chọn từng tập.
Prompt: Màn series podcast “Hào khí Bạch Đằng”. Hero artwork chiếm khoảng 1/3 màn hình, nút back và share nổi nhẹ trên vùng ảnh. Tên series lớn, creator “Sử Ký”, mô tả 2 dòng, tổng “6 tập · 2 giờ 18 phút”, nút chính “Phát tập đầu” đỏ son. Phần “Các tập” là list đánh số với cover nhỏ, title “Bạch Đằng 938 — trận thủy chiến quyết định”, ngày phát, thời lượng, mô tả ngắn và play. Đang phát có nền giấy đậm/viền đỏ thanh lịch. Bottom tabs Podcast active và mini-player nếu đang phát.

### 06 — Podcast đang phát
Mục tiêu: nghe tập, điều khiển phát, tua và xem tiến độ.
Prompt: Màn audio player toàn màn hình native cho Sử Ký. Background tối mực `#14110F` với texture giấy/mộc bản cực nhẹ. Header có nút thu nhỏ, nhãn “ĐANG PHÁT”, menu. Cover vuông lớn khoảng giữa màn: minh họa cọc gỗ trên sông Bạch Đằng, không chữ rối. Tên tập “Bạch Đằng 938 — Trận thủy chiến quyết định”, series và người kể. Thanh tiến độ đỏ son mảnh có elapsed/remaining, nút -15s, play/pause lớn, +30s. Dưới có tốc độ 1x, hẹn giờ ngủ và danh sách tập. Màu chữ kem, nút tròn lớn thân thiện chạm; màn player không có bottom tab bar.

### 07 — Quiz: chọn bộ và làm câu hỏi
Mục tiêu: khám phá quiz, trả lời nhiều lựa chọn.
Prompt: Thiết kế hai màn mobile nhất quán theo dạng hai điện thoại cạnh nhau: trái là danh sách quiz, phải là quiz đang làm. Danh sách quiz nền giấy, tiêu đề “Thử tài hiểu sử”, filter chủ đề dạng selector đơn, quiz cards thoáng với poster ảnh, tên quiz, số câu, series liên quan và CTA “Bắt đầu”. Màn đang làm có progress “Câu 3/10”, thanh tiến độ đỏ son, nhãn chủ đề, câu hỏi lớn “Chiến thắng Bạch Đằng năm 938 gắn với vị tướng nào?”, bốn đáp án dạng hàng chọn chạm rộng; một đáp án được chọn có outline đỏ, CTA “Trả lời”. Có nút thoát xác nhận nhỏ. Bottom tab Quiz active ở màn danh sách; trong quiz tập trung vào nhiệm vụ.

### 08 — Quiz: kết quả và giải thích
Mục tiêu: tổng kết điểm, học từ đáp án và tiếp tục nghe.
Prompt: Màn kết quả quiz Sử Ký sau khi hoàn thành. Nền giấy sáng, huy hiệu đồng/đỏ tinh tế (không confetti), điểm lớn “8/10”, tiêu đề “Bạn đã nắm vững hào khí sông Bạch Đằng”, XP nhận được +80 XP. Một câu trả lời được mở rộng với nhãn “Đáp án đúng”, giải thích lịch sử ngắn, citation nguồn. Có CTA chính “Làm lại” viền và “Nghe podcast liên quan” đỏ son. Bottom tab Quiz active, thanh tiến độ/đánh giá dễ hiểu.

### 09 — Lịch phát
Mục tiêu: xem tập đã phát và sắp phát theo thời gian.
Prompt: Màn “Lịch phát” mobile-first. App bar tiêu đề, chuyển segmented Tuần/Tháng, điều hướng tháng và bộ lọc series dạng dropdown. Thay lưới desktop bằng agenda theo ngày: marker ngày lớn “Thứ Sáu, 24 tháng 10”, dưới là episode row có poster nhỏ, tên tập, series, giờ GMT+7, badge “Sắp phát” hoặc “Đã phát”; tập đã phát có CTA nghe. Một ngày được highlight đỏ son nhẹ, timeline dọc có chấm bronze. Bottom tabs có Lịch phát thay cho mục ít ưu tiên hoặc entry qua tab Khám phá; giữ nhất quán nav 5 mục.

### 10 — Tôi / hành trình và đăng nhập
Mục tiêu: theo dõi XP, nhiệm vụ, lịch sử nghe và tài khoản.
Prompt: Hai màn mobile side-by-side cùng app: màn “Tôi” cho user đã đăng nhập và màn đăng nhập. Profile có avatar, tên “Minh Anh”, tổng XP, chuỗi ngày nghe nhỏ; panel “Nhiệm vụ tuần” 2–3 nhiệm vụ dạng progress line (nghe trọn 2 tập, hoàn thành quiz), “Nghe gần đây” list 2 tập, “Bảng vinh danh” switch Tuần/Tháng. Màn login nền giấy dó có logo Sử Ký, headline “Lưu hành trình nghe của bạn”, input email/mật khẩu lớn, nút đỏ son “Đăng nhập”, liên kết quên mật khẩu và đăng ký. Cả hai dùng nav/account patterns nhẹ, không đưa quản trị vào.

## Gợi ý thực hiện lại
Giữ nguyên thứ tự thông tin, state active, tên tiếng Việt, kích thước tap target và palette. Có thể thay ảnh minh họa bằng asset lịch sử tương tự nếu đúng chủ đề và tone. Danh mục màn hình lấy từ tính năng công khai của web; không tự thêm chức năng chưa hiện hữu.

### 11 — Lịch sử nghe và tiến độ
Mục tiêu: quay lại tập đã nghe, xem tiến độ lưu và tiếp tục phát.
Prompt: Tạo màn mobile Sử Ký “Nghe gần đây”. App bar back, tiêu đề, menu sắp xếp. Bộ lọc gọn “Tất cả / Đang nghe / Đã nghe”. Danh sách tập dọc mỗi hàng có cover vuông nhỏ, tên tập, series, lần nghe gần nhất, thanh tiến độ mảnh màu đỏ son (ví dụ 18:32 / 42:10) và nút tiếp tục phát. Trạng thái rỗng có minh họa sách mở và lời mời khám phá podcast. Giữ nền giấy dó, typography Be Vietnam Pro, UI user-only; đây là dữ liệu lịch sử nghe của chính user.

### 12 — Triển lãm 3D công khai
Mục tiêu: mở trải nghiệm triển lãm lịch sử tương tác trên mobile.
Prompt: Tạo màn mobile Sử Ký “Triển lãm: Dấu tích một thời”. Dùng trải nghiệm như cổng vào bảo tàng số: ảnh/khung preview không gian trưng bày tối, ánh sáng vàng đồng, artifact lịch sử đặt giữa; tiêu đề, đoạn giới thiệu, số hiện vật/thời lượng dự kiến; nút đỏ son “Bước vào triển lãm”. Có hướng dẫn thao tác ngắn vuốt để xoay, chạm để xem chi tiết, nút âm thanh/toàn màn hình rõ ràng và khả năng đóng/trở về. Phong cách premium di sản, nền đêm mực và ánh đồng, typography dễ đọc, tránh dựng giao diện moderator/editor hay điều khiển desktop 3D.

### 13 — Đăng ký và khôi phục mật khẩu
Mục tiêu: hỗ trợ các mode auth đã có trên web.
Prompt: Màn auth mobile Sử Ký dùng chung hệ màu giấy dó, logo, khoảng thở và input bo nhẹ. Mode tạo tài khoản có tên hiển thị, email, mật khẩu, xác nhận mật khẩu và CTA “Tạo tài khoản”; mode khôi phục dùng headline “Đặt lại mật khẩu”, trường email và CTA “Gửi hướng dẫn”, trạng thái xác nhận đã gửi. Cùng một ngôn ngữ thiết kế với màn đăng nhập, không tự thêm đăng nhập mạng xã hội nếu web không hỗ trợ.

## Luồng điều hướng tham chiếu
Khám phá → chủ đề/tìm kiếm → danh sách sự kiện → chi tiết sự kiện → podcast/series → tập → player. Khám phá → quiz → câu hỏi → kết quả/giải thích → tập liên quan. Lịch phát → tập đã phát → player. Tôi → nhiệm vụ/XP, nghe gần đây, bảng vinh danh, đăng nhập/đăng xuất. Public exhibition mở từ nội dung khám phá và vào trải nghiệm 3D riêng.
