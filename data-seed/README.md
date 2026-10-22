# Seed series và podcast Việt Nam

Seed thêm 4 series và 9 tập được khai báo trong `apps/api/src/scripts/vietnam-podcast-seed-data.ts`.
Tên được giữ nguyên theo yêu cầu, bao gồm “Văn hóa Đồng Sơn”.

```powershell
bun run --cwd apps/api seed:vietnam-podcasts --check
bun run --cwd apps/api seed:vietnam-podcasts
```

- Dùng `.env` ở root: `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` và tùy chọn `CLOUDINARY_FOLDER`.
- Chọn tài khoản moderator bằng `SEED_OWNER_EMAIL` hoặc `SEED_MOD_EMAIL`. Nếu chưa đặt, database phải có đúng một moderator không bị khóa. Seed không tạo tài khoản hoặc thay đổi mật khẩu/quyền.
- MP3 mặc định: `data-seed/podcast_bb6ad694-ca94-4fdb-99e3-a2347af19d12.mp3`. Có thể đổi bằng `SEED_AUDIO_FILE` (đường dẫn tuyệt đối hoặc tương đối với root project).
- Mỗi tập có một bản kể `THIRD_PERSON` và một audio asset riêng vì database yêu cầu quan hệ audio một-một. Cùng MP3 mẫu được upload vào các public ID xác định, dưới loại Cloudinary `authenticated`; không mở audio thành file công khai.
- Thời lượng và dung lượng lấy từ MP3 thực tế qua Cloudinary. Không tạo kịch bản giả để khớp với bản thu.
- Series và tập mới ở trạng thái `DRAFT`; seed không tự phê duyệt hoặc xuất bản. Không tự đặt sự kiện, giai đoạn hay nguồn lịch sử chưa được cung cấp.
- Chạy lại giữ nguyên series/tập/bản thu đã có và chỉ bổ sung phần thiếu. Public ID theo slug và checksum cho phép tiếp tục khi upload đã xong nhưng lưu database bị gián đoạn. Không dùng reset, xóa dữ liệu hay chạy lại seed tài khoản.

Đây là bản thu mẫu dùng để kiểm tra giao diện và phát audio, không phải nội dung lịch sử riêng cho từng tập.
