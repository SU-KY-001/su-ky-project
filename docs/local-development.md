# Chạy local sau khi pull code

## Điều kiện

- Bun theo phiên bản của repo; cài dependency bằng `bun install --frozen-lockfile`.
- PostgreSQL local đã chạy, database có sẵn của bạn và tài khoản có quyền chạy migration.
- Giữ `.env` riêng và cấu hình Cloudinary/AI của nhóm khi cần các chức năng tương ứng.
  Nhập DOCX/TXT/MD/PDF câu hỏi không cần Cloudinary hoặc AI.
- Nếu chưa có PostgreSQL: cấu hình `.env` từ `.env.example`, rồi
  `docker compose up -d --wait postgres`. Không bật thêm container trùng cổng nếu PostgreSQL đã chạy.

## Mỗi lần chạy

Tại thư mục gốc repo:

```bash
bun install --frozen-lockfile
bun run dev:local
```

Lệnh local thực hiện tuần tự:

1. Chọn `LOCAL_DATABASE_URL` nếu có, nếu không dùng `DATABASE_URL` của bạn.
2. Chỉ chấp nhận PostgreSQL tại localhost, 127.0.0.1, ::1 hoặc host.docker.internal.
   Dừng trước khi chạy migration nếu URL trỏ server chung.
3. Sinh Prisma Client theo schema mới và chạy `prisma migrate deploy` để áp dụng migration còn thiếu.
4. Khởi động API, worker nhắc hạn và FE. Bất kỳ bước chuẩn bị nào lỗi thì không mở các tiến trình dev.

FE: `http://localhost:3000`, BE: `http://localhost:3005`.
`VITE_API_URL`, `BETTER_AUTH_URL`, CORS và cổng API được đồng bộ cho local;
không sửa `.env` gốc. FE dùng strict port để không âm thầm chạy sang cổng 3001.
`Ctrl+C` dừng các tiến trình do lệnh tạo; không tắt PostgreSQL hoặc tiến trình của người khác.

Chỉ cập nhật schema, chưa chạy web:

```bash
bun run dev:local:prepare
```

Không có bước reset, xóa bảng hay tạo series/podcast/quiz mẫu. Các bản ghi đang có được giữ nguyên.
Mẫu chữ trong “Xem mẫu” của trình nhập quiz là hướng dẫn của giao diện, không phải dữ liệu seed.

## Chọn DB riêng hoặc đổi cổng API

Đặt trong `.env.local` (không commit file này), thay bằng thông tin local của bạn:

```dotenv
LOCAL_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/your_existing_local_db
LOCAL_API_PORT=3005
```

Không dùng tên database/đường dẫn máy của đồng đội. Cấu hình local không tự sao chép dữ liệu
từ BE deploy; series/tập hiển thị là dữ liệu thuộc database và tài khoản đang dùng.

## Chuyển FE sang BE deploy

```bash
bun run dev:deploy
```

Lệnh này chỉ chạy FE với URL BE chung, không build image, deploy BE hay migrate database server.
Dừng bằng `Ctrl+C`, rồi `bun run dev:local` để về local. Đừng bật hai FE cùng cổng 3000.
BE chung cần cùng phiên bản để hỗ trợ quiz chọn nhiều/điền và endpoint nhập tài liệu.
Cookie cross-site khi FE localhost nối BE domain có thể bị chế độ ẩn danh chặn;
test full local không xác nhận cấu hình cookie của môi trường deploy.

## Khi gặp lỗi

- **Thiếu DATABASE_URL:** tạo `.env` lần đầu và cấu hình URL PostgreSQL local.
- **Không kết nối được DB:** kiểm tra dịch vụ, cổng và quyền truy cập; lệnh không tự bật Docker/native PostgreSQL.
- **Migration lỗi:** dừng để kiểm tra lịch sử schema. Không chạy `migrate reset` hoặc `db push --force-reset`
  trên DB đang có dữ liệu. Dữ liệu được tạo ngoài migration có thể cần xử lý baseline riêng.
- **Cổng bị chiếm:** dừng đúng tiến trình cũ; script không tự giết tiến trình của người khác.
- **Không thấy series/tập:** kiểm tra DB local và tài khoản Moderator sở hữu nội dung; không cần seed nội dung mới.
- **Không đăng nhập được sau khi đổi môi trường:** đăng nhập lại đúng tài khoản của DB đang dùng.

## Kiểm tra trước khi gửi PR (không gồm mobile)

```bash
bun run check:local
bun run test:local
bun run --cwd apps/web build
bun run --cwd apps/api build
```

Test có database mặc định bị bỏ qua. Muốn kiểm tra lưu/chấm quiz và repository nhắc hạn,
dùng DB test riêng đã migrate (tên database phải có `test`), tuyệt đối không dùng DB có dữ liệu của nhóm:

```bash
cd apps/api
RUN_INTEGRATION=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/suky_test bun test tests/quiz-integration.test.ts tests/quiz-authoring-integration.test.ts tests/release-repository.test.ts
```

## Sau khi merge: lưu ý cho người deploy

Không có CI/CD trong PR này. Push/merge Git không tự thay code đang chạy trên server.
Người deploy cần backup DB, build/publish image BE mới từ commit đã merge, áp dụng migration,
rồi cập nhật API/worker và build FE với `VITE_API_URL` của môi trường đó.

Hai migration quiz thêm `quiz_questions.kind` (quiz cũ mặc định `SINGLE`) và bỏ unique index
chỉ cho một đáp án đúng. Không xóa quiz, lượt làm hoặc nhập nội dung mẫu.
`make -f Makefile.prod deploy` đã có bước migrate trước khi khởi động API/worker bằng image mới;
`deploy-api` riêng không chạy migration. Không chạy các lệnh server bằng `.env` local của người phát triển.
Mobile chưa hỗ trợ quiz chọn nhiều/điền; BE trả 409 cho client cũ thay vì cho đọc sai dạng câu hỏi.
