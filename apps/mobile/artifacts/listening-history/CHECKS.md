# Bước 2 — Kiểm tra Android

UI Tamagui, emulator Android API35, Expo Go, ngày 2026-11-09.

- Profile preview: limit=4; Xem tất cả mở màn Lịch sử nghe.
- Danh sách: 5 tập/trang, ba bộ lọc Tất cả/Đang nghe/Đã nghe, tổng số theo bộ lọc.
- Đã thao tác lọc đang nghe, đã nghe, Trang sau (trang2), đổi bộ lọc về trang1, Android Back từ player.
- Đã mở và nghe lại tập Trịnh Nguyễn phân tranh qua lịch sử; luồng player giữ được hoạt động. Tiến độ nghe của tài khoản có cập nhật khi phát thật.
- Đã kiểm tra lỗi mất mạng và nút thử lại; tắt chế độ máy bay và bật lại Wi-Fi sau kiểm tra.
- Đã tự xem các ảnh preview.png, all.png, in-progress.png, completed-page2.png, player-resume.png, resume-repeat.png, error.png.
- `all.png` chụp trước khi chốt page size=5 nên footer ảnh này còn Trang 1/1; `completed-page2.png` phản ánh đúng cấu hình phân trang cuối cùng. `loading.png` thực tế bắt được trạng thái lỗi vì request kết thúc nhanh khi offline; không dùng ảnh này làm bằng chứng đã chụp loading.
- Chưa có dữ liệu để kiểm tra trực quan guest/empty/unavailable và nhiều bản kể. Không xác nhận vị trí DB tới mili giây: DB local port5433 không truy cập được. Code resume dùng lastNarrationId/lastPositionMs, tiêu thụ token sau seek; review không còn lỗi quan trọng.
- TypeScript đạt; 5 test navigation/auth có sẵn đạt. Test NativeWind cũ từng fail vì kiểm tra utility không còn trong UI Tamagui; sau review đã bỏ test lỗi thời này và đổi script thành `bun test` để tự tìm toàn bộ test mobile. Xem kết quả bảo trì test trong plan.

Không thay backend hoặc DB schema, không thêm dependency, không làm Bước 3. Chờ người dùng nghiệm thu Bước 2.
