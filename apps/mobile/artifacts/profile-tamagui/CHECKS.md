# Kiểm tra giao diện hồ sơ Tamagui

## Thay đổi cuối cùng

- `src/features/heritage-app/screens/ProfileScreen.tsx`: chuyển layout, chữ, nút, card, progress sang Tamagui và component dùng chung; giữ header có mũi tên mở hồ sơ.
- `src/features/profile/screens/ProfileEditor.tsx`: dùng AppHeader, Tamagui ScrollView, card, spinner; KeyboardAvoidingView được styled bằng Tamagui và nhận safe-area qua pt/pb.
- `src/features/profile/components/ProfileEditorForm.tsx`: Tamagui Input và PrimaryButton; avatar có nút bút mở thư viện ảnh, tên và email ở dưới. Giữ gỡ avatar khi có ảnh. Bỏ chữ chọn ảnh, mô tả định dạng, email trong card nhập và toàn bộ giao diện xóa tài khoản theo yêu cầu bổ sung.
- `src/app/profile.tsx`: chỉ chuyển loading sang Tamagui; giữ nguyên hydrate, redirect và điều hướng.
- Xóa `src/features/profile/components/profileStyles.ts` sau khi không còn import.

Không sửa HeritageApp, hook, service, API/schema/auth/upload/backend, dependency hoặc token. Không thêm test. Không còn className, StyleSheet, mã màu hex hay style prop trong bốn file giao diện nói trên.

## Kết quả

- TypeScript mobile: đạt.
- Kiểm tra trực tiếp Expo Go, Android emulator API 35 (emulator-5554).
- Đã mở, chụp và tự xem màn hồ sơ chính (`main.png`) và màn chỉnh sửa cuối cùng (`editor.png`): nền giấy, token chữ/nút, avatar, viền card, safe area, cuộn hiển thị đúng.
- Đã kiểm tra validation tên trống và input focus; thông báo lỗi và viền đỏ hiển thị. Ảnh `validation.png`/`keyboard.png` được chụp trước lần tinh giản form cuối cùng.
- Đã kiểm tra loading thực (`loading.png`), lỗi mất mạng và nút thử lại (`error.png`). Đã khôi phục mạng, tắt chế độ máy bay và thử lại thành công.
- Đã kiểm tra xác nhận xóa/disabled khi mật khẩu trống trước khi người dùng yêu cầu bỏ khu vực này; `delete-confirmation.png` là ảnh lịch sử, không còn mô tả UI cuối cùng.
- Không gửi yêu cầu xóa tài khoản hay thay đổi thông tin tài khoản trong quá trình kiểm tra.
- Đã nhấn nút bút trên avatar ở giao diện cuối cùng: mở đúng bộ chọn ảnh Android; hủy chọn và trở lại màn hồ sơ, không upload file.
