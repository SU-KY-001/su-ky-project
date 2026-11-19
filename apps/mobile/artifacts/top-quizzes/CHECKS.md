# Task 3 — Top quiz cá nhân

## Đã kiểm tra

- Mobile preview tối đa4, màn riêng phân trang5; UI dùng Tamagui/token/shared UI.
- Mở trực tiếp app Android emulator API35: kéo tới khu vực top quiz trên Profile, bấm Xem tất cả, thấy loading/error và nút Thử lại. Đã chụp/tự xem `preview.png` và `list-error.png`.
- TypeScript API/shared/mobile đạt; test mobile5 pass; test API/OpenAPI11 pass, test PostgreSQL1 skip do chưa bật/chưa có DB test sẵn sàng.
- Review code không phát hiện lỗi quan trọng còn lại.

## Chưa nghiệm thu dữ liệu thật

Mobile đang trỏ API remote; route mới chỉ nằm trong source local. Chưa deploy hoặc đổi môi trường app. DB local không sẵn sàng và Docker daemon chưa chạy. Vì vậy ảnh hiện tại chỉ chứng minh UI lỗi/loading và điều hướng, không phải dữ liệu ranking thành công.

Sau khi backend có endpoint mới, kiểm tra:

1. Profile4 quiz, list5/trang, prev/next và thứ tự count/latest/ID.
2. Đếm cả lượt đạt/chưa đạt của đúng tài khoản, không cộng user khác.
3. Empty CTA, quiz unavailable disabled; mở quiz preflight còn đúng ID/công khai.
4. Submit bằng luồng quiz hiện có; quay lại đúng trang và thấy lượt mới.
5. Guest, retry, tap lặp và đổi user không gây rò dữ liệu/điều hướng muộn.

Không tạo dữ liệu giả trên product UI để thay bằng chứng. Không làm Task4 trước khi nghiệm thu Task3.
