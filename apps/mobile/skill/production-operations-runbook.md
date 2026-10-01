# COMQ Production Operations Runbook

Runbook vận hành COMQ trên Windows Server 2022, IIS, Node.js, MongoDB local và GitHub Actions self-hosted runner.

## 1. Mô hình production hiện tại

| Thành phần | Giá trị |
|---|---|
| Frontend | `https://comq.com.vn` |
| API | `https://api.comq.com.vn` |
| Source trên VPS | `C:\ComQ` |
| Backend | `C:\ComQ\backend` |
| Frontend | `C:\ComQ\frontend` |
| Upload/media | `C:\ComQ\backend\uploads` |
| IIS frontend proxy | `C:\ComQ\iis\frontend` |
| IIS API proxy | `C:\ComQ\iis\api` |
| Log ứng dụng | `C:\ComQ\logs` |
| MongoDB | `127.0.0.1:27017`, database `comq` |
| Windows services | `MongoDB`, `COMQ-Backend`, `COMQ-Frontend` |
| GitHub runner | `C:\actions-runner` |
| Runner label | `comq-production` |

Các file môi trường production nằm ngoài Git:

```text
C:\ComQ\backend\.env
C:\ComQ\frontend\.env.production
```

Không commit các file này, `node_modules`, `.next`, `dist`, database dump, upload/media, certificate hoặc secret.

### Mô hình xác thực admin production

Admin sử dụng session opaque lưu server-side trong MongoDB. Browser chỉ giữ session handle trong cookie `__Host-comq-admin-session`; cookie có `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` và không có `Domain`. Backend chỉ lưu SHA-256 hash của session handle, có TTL theo `expiresAt` và có thể revoke qua `revokedAt`.

JWT bearer không còn là transport hợp lệ sau cutover. Không tìm token auth trong `localStorage` hoặc `sessionStorage`. CSRF token được trả trong response của `login`/`me`, frontend giữ token trong memory và gửi bằng header `X-CSRF-Token` cho POST, PUT, PATCH, DELETE; không persist token này.

## 2. Quy trình deploy code mới

### 2.1. Kiểm tra và push trên máy local

Thực hiện trên máy local tại `D:\PROJECT\comq`:

```powershell
Set-Location "D:\PROJECT\comq"
git status --short
git diff --check
```

Build/test trước khi push:

```powershell
Set-Location "D:\PROJECT\comq\backend"
npm ci
npm run build
npm test

Set-Location "D:\PROJECT\comq\frontend"
npm ci
npm run build
```

Chỉ stage đúng file cần phát hành:

```powershell
Set-Location "D:\PROJECT\comq"
git add <cac-file-code-can-thay-doi>
git diff --cached --check
git commit -m "describe the change"
git push origin main
```

Không dùng `git add .` khi còn file local chưa kiểm tra.

### 2.2. GitHub Actions tự deploy

Workflow nằm tại:

```text
.github/workflows/deploy-production.yml
```

Tên workflow trên GitHub là **Deploy COMQ production**. Workflow chạy khi push vào `main` hoặc khi chọn **Run workflow** thủ công.

Workflow sử dụng self-hosted runner có các label:

```text
self-hosted, Windows, X64, comq-production
```

Script deploy:

```text
ops/deploy-production.ps1
```

Trình tự tự động:

1. Kiểm tra clone production ở branch `main` và không có thay đổi bất thường.
2. Backup MongoDB vào `C:\ComQ\backups\deploy-<timestamp>\database`.
3. Backup `C:\ComQ\backend\uploads` thành file ZIP.
4. `git fetch` và `git pull --ff-only origin main`.
5. Dừng `COMQ-Backend` và `COMQ-Frontend` trước khi thay `node_modules`.
6. Chạy `npm ci` và build backend/frontend.
7. Khởi động lại hai service.
8. Kiểm tra port local và URL public.

Không chạy `git pull`, `npm ci` hoặc restart thủ công cho deploy thông thường. Những thao tác đó đã nằm trong script CI/CD.

### 2.4. Cấu hình cookie session trên production

File thật trên VPS là `C:\ComQ\backend\.env`, không nằm trong Git. Các giá trị non-secret phải khớp:

```env
ADMIN_ORIGIN=https://comq.com.vn
AUTH_SESSION_COOKIE_NAME=__Host-comq-admin-session
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=strict
AUTH_SESSION_TTL_HOURS=8
```

`AUTH_COOKIE_SECURE=true` chỉ hoạt động đúng khi frontend/API đều truy cập qua HTTPS. Cookie `__Host-` phải được phát hành từ `api.comq.com.vn`, có `Path=/`, không có `Domain`; không đổi thành `Domain=.comq.com.vn`.

Frontend gọi API bằng `withCredentials=true` tới `https://api.comq.com.vn/api`. API phải trả CORS chính xác `Access-Control-Allow-Origin: https://comq.com.vn` và `Access-Control-Allow-Credentials: true`; không dùng wildcard `*`. IIS frontend/API proxy phải giữ nguyên header `Set-Cookie`, không rewrite cookie sang domain khác và không chặn OPTIONS preflight.

### 2.5. Cấu hình AI chat thu thập lead

Tính năng dùng hai endpoint public: `POST /api/public/assistant-chat/respond` để tạo câu trả lời và `POST /api/public/leads` để lưu thông tin khách hàng. Backend cần MongoDB như bình thường. Cấu hình AI và SMTP trong `C:\ComQ\backend\.env`; không đưa các khóa này vào frontend hoặc biến `NEXT_PUBLIC_*`.

```env
PUBLIC_ORIGIN=https://comq.com.vn
AI_API_URL=https://<ai-provider>/v1/chat/completions
AI_API_KEY=<server-side-secret>
AI_MODEL=<model-name>
AI_TIMEOUT_MS=15000
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<server-side-secret>
LEADS_FROM_EMAIL=<verified-sender>
LEADS_INBOX_EMAIL=<sales-inbox>
```

AI có thể để trống cả nhóm `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` trong môi trường chưa bật tính năng. Nếu bật, phải điền đủ cả ba. SMTP cũng có thể để trống; nếu bật email thông báo thì phải điền đủ thông tin SMTP và email gửi/nhận. `AI_TIMEOUT_MS` mặc định 15000 ms. Khi AI lỗi, biểu mẫu liên hệ vẫn dùng được; khi gửi email lỗi, lead đã lưu vẫn được giữ và trạng thái thông báo được đánh dấu thất bại.

Lead lưu thông tin liên hệ, nhu cầu, tóm tắt, URL nguồn, thời điểm đồng ý và trạng thái xử lý trong MongoDB; nội dung hội thoại không được lưu. Trước khi bật production, chủ sản phẩm cần chốt thời hạn lưu lead và quy trình xóa dữ liệu hết hạn, rồi đưa vào lịch vận hành. Không ghi API key, SMTP password, email/điện thoại khách hàng hoặc nội dung form vào log.

API dựa vào IP do IIS ARR chuyển tiếp để áp dụng giới hạn gửi chat và lead theo từng khách. Backend chỉ tin proxy kết nối qua loopback. Cấu hình ARR để ghi đè `X-Forwarded-For` bằng địa chỉ client đã xác minh; không chuyển tiếp nguyên giá trị header do client gửi lên.

Sau cutover, xóa `JWT_SECRET` và `JWT_EXPIRES_IN` khỏi `C:\ComQ\backend\.env` theo quy trình thay đổi production. Không ghi cookie, CSRF token, mật khẩu hoặc nội dung `.env` vào log.

### 2.3. Theo dõi kết quả deploy

Vào:

```text
GitHub → Actions → Deploy COMQ production
```

Run thành công phải có các health-check cho:

```text
http://127.0.0.1:4000/api/public/products?limit=1&page=1
http://127.0.0.1:3000
https://api.comq.com.vn/api/public/products?limit=1&page=1
https://comq.com.vn
```

Không kết luận deploy thành công chỉ vì GitHub đã nhận commit; phải kiểm tra job màu xanh và các health-check.

## 3. Kiểm tra sau deploy

Trên trình duyệt kiểm tra:

- Trang chủ và `/products` mở được.
- Mở trực tiếp `/login`, kể cả khi browser còn session cookie hợp lệ; trang login phải render và không tự route sang `/admin`.
- Đăng nhập admin; Network response phải có `Set-Cookie` cho `__Host-comq-admin-session` với `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, không có `Domain`.
- Response login chỉ có `admin` và `csrfToken`, không có `accessToken`, bearer token hoặc session handle. CSRF token chỉ tồn tại trong memory của frontend.
- Refresh `/admin`; request `/api/admin/auth/me` phải thành công bằng cookie credentialed.
- Đăng xuất; `/api/admin/auth/logout` revoke session và browser xóa cookie. Truy cập lại `/admin` phải về `/login`.
- Gửi mutation thiếu hoặc sai `X-CSRF-Token`, hoặc sai `Origin`; API phải trả lỗi 403.
- Danh sách, chi tiết và tìm kiếm sản phẩm.
- Hình ảnh sản phẩm tải được, không fallback.
- Upload một ảnh thử nghiệm nếu deploy có liên quan media.
- Console không có `ERR_CONNECTION_REFUSED`, mixed-content hoặc URL `localhost:4000`.
- Mở chat widget, kiểm tra hội thoại và luồng fallback khi AI chưa cấu hình hoặc provider lỗi.
- Gửi lead thử nghiệm với sự đồng ý; xác nhận document được lưu một lần trong MongoDB và email đến inbox nếu SMTP đã cấu hình.
- Khi SMTP lỗi, xác nhận lead vẫn được lưu và trạng thái gửi thông báo thất bại được ghi nhận; xóa lead thử nghiệm theo quy trình dữ liệu đã chốt.

Trên VPS có thể kiểm tra nhanh:

```powershell
Get-Service COMQ-Backend,COMQ-Frontend,MongoDB
Test-NetConnection 127.0.0.1 -Port 3000
Test-NetConnection 127.0.0.1 -Port 4000
Test-NetConnection 127.0.0.1 -Port 27017
```

## 4. MongoDB và migration

COMQ dùng NestJS + Mongoose + MongoDB, không dùng Prisma hoặc TypeORM migration. MongoDB dùng collection/document thay cho table/row.

Các thay đổi chỉ thêm field tùy chọn thường không cần migration nếu code xử lý được document cũ. Cần migration khi:

- Đổi tên hoặc chuyển đổi field.
- Tách/gộp collection.
- Backfill dữ liệu cũ.
- Tạo index hoặc reference mới.
- Xóa hoặc chuyển đổi dữ liệu.

Collection `admin_sessions` được tạo bởi Mongoose khi backend khởi động; index unique trên `tokenHash` và TTL trên `expiresAt` phải xuất hiện sau deploy. Không cần backfill session cũ: mọi JWT/localStorage session cũ bị vô hiệu hóa ở cutover và admin đăng nhập lại.

Các script hiện có ở:

```text
C:\ComQ\backend\src\scripts
```

Quy trình migration production:

1. Tạo script migration có thể chạy lặp an toàn hoặc có kiểm tra trạng thái.
2. Chạy thử trên MongoDB local.
3. Commit script và deploy code.
4. Backup MongoDB production.
5. Dừng `COMQ-Backend` nếu migration cần tránh ghi đồng thời.
6. Chạy đúng migration trên VPS.
7. Khởi động backend và kiểm tra API/dữ liệu.

CI/CD hiện tại **không tự chạy migration**. Đây là chủ ý để tránh migration phá dữ liệu ngoài kế hoạch.

Không dùng `npm run seed` để đồng bộ local với production. Seed chỉ phục vụ dữ liệu mẫu hoặc khởi tạo theo logic trong `backend/src/seed.ts`.

## 5. Backup và khôi phục

Mỗi deployment tự tạo backup tại:

```text
C:\ComQ\backups\deploy-YYYYMMDD-HHmmss\database
C:\ComQ\backups\deploy-YYYYMMDD-HHmmss\uploads.zip
```

Kiểm tra backup mới nhất:

```powershell
Get-ChildItem "C:\ComQ\backups" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5
```

Backup thủ công MongoDB khi cần:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "C:\ComQ\backups\manual-$stamp\database"
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null

$mongodump = Get-ChildItem "C:\Tools" -Filter "mongodump.exe" -Recurse -File |
  Select-Object -First 1 -ExpandProperty FullName

& $mongodump `
  --uri="mongodb://127.0.0.1:27017/comq" `
  --out="$backupPath"
```

Backup uploads:

```powershell
Compress-Archive `
  -Path "C:\ComQ\backend\uploads\*" `
  -DestinationPath "C:\ComQ\backups\uploads-$stamp.zip" `
  -Force
```

Backup chỉ nằm trên cùng VPS không đủ an toàn. Định kỳ sao chép backup sang máy hoặc storage khác.

### Khôi phục MongoDB

Chỉ thực hiện sau khi đã xác nhận đúng backup và có kế hoạch dừng hệ thống:

```powershell
Stop-Service "COMQ-Backend"

$mongorestore = Get-ChildItem "C:\Tools" -Filter "mongorestore.exe" -Recurse -File |
  Select-Object -First 1 -ExpandProperty FullName

& $mongorestore `
  --uri="mongodb://127.0.0.1:27017/comq" `
  --drop `
  "C:\ComQ\backups\<backup-folder>\database\comq"

Start-Service "COMQ-Backend"
```

Tùy chọn `--drop` sẽ xóa collection hiện tại trước khi restore; luôn xác nhận backup và phạm vi ảnh hưởng trước khi chạy.

## 6. Xử lý lỗi deploy và production

### 6.1. Phân loại mức độ

- **P0:** Website hoặc API ngừng hoạt động.
- **P1:** Chức năng chính lỗi, nhiều người dùng bị ảnh hưởng.
- **P2:** Một chức năng nhỏ lỗi.
- **P3:** Lỗi giao diện hoặc cải tiến nhỏ.

### 6.2. Khi GitHub Actions thất bại

Đọc lỗi đầu tiên trong step **Deploy and health-check**, không chỉ dòng `exit code 1`.

Các lỗi thường gặp:

| Lỗi | Nguyên nhân/xử lý |
|---|---|
| Runner offline | Kiểm tra `Get-Service "actions.runner*"`; service phải `Running`. |
| Local changes trong `C:\ComQ` | Chỉ khôi phục file đã xác định; không dùng `git clean -fd`. |
| `npm EPERM` trên Sharp/libvips | Script phải stop hai Node service trước `npm ci`; kiểm tra lại run có commit mới nhất. |
| `mongodump` không tìm thấy | Kiểm tra `mongodump.exe` trong `C:\Tools` hoặc cài MongoDB Database Tools. |
| Port 3000/4000 không mở | Kiểm tra Windows service, NSSM log và `C:\ComQ\logs`. |
| API 502.3 | Backend chưa chạy hoặc IIS ARR không kết nối được `127.0.0.1:4000`. |
| 500.19 | Kiểm tra `web.config`, IIS URL Rewrite và ARR. |
| Hình ảnh fallback | Tìm URL `localhost:4000` trong API; URL production phải dùng `https://api.comq.com.vn`. |

Kiểm tra VPS:

```powershell
Get-Service COMQ-Backend,COMQ-Frontend,MongoDB
Get-ChildItem "C:\ComQ\logs" -Recurse -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 20

Get-ChildItem "C:\inetpub\logs\LogFiles" -Recurse -Filter "*.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5
```

### 6.3. Rollback code

Ưu tiên rollback bằng Git để giữ lịch sử:

1. Xác định commit gây lỗi và commit ổn định.
2. Tạo revert trên local.
3. Test local.
4. Push revert vào `main` để CI/CD tự deploy.

```powershell
Set-Location "D:\PROJECT\comq"
git log --oneline -10
git revert <bad-commit>
git push origin main
```

Không dùng `git reset --hard` trên production. Nếu code mới đi kèm thay đổi schema không tương thích, cần xử lý database riêng trước hoặc sau rollback code.

Kết thúc incident phải ghi lại: thời gian, URL/API lỗi, commit, log, nguyên nhân, cách khắc phục và biện pháp phòng ngừa.

### 6.4. Revoke, rotation và incident auth

- **Session bị lộ:** xác định admin bị ảnh hưởng, revoke session trong MongoDB bằng cách set `revokedAt`, rồi buộc đăng nhập lại. Không đưa giá trị cookie vào ticket, log hoặc lệnh shell.
- **Cần revoke toàn bộ session:** backup MongoDB trước, dừng backend nếu cần thao tác tránh ghi đồng thời, cập nhật toàn bộ document `admin_sessions` chưa revoke với `revokedAt`, khởi động lại backend và kiểm tra login mới.
- **Đổi cookie name hoặc cấu hình Secure/SameSite:** thay `AUTH_*` ở `C:\ComQ\backend\.env`, review IIS/CORS, deploy backend/frontend cùng commit và kiểm tra Set-Cookie; đổi cookie name sẽ làm các session cũ không còn được nhận diện.
- **Đổi mật khẩu admin:** cập nhật secret ngoài Git, restart `COMQ-Backend`, revoke session hiện tại và thực hiện login smoke test.
- **CORS/cookie lỗi:** kiểm tra Network headers, `Set-Cookie`, OPTIONS response, IIS proxy và backend `ADMIN_ORIGIN`. Chỉ log status/code, không log cookie/CSRF/password.
- **Rollback:** rollback một cặp frontend/backend tương thích. Không bật lại bearer tạm thời nếu chưa có kế hoạch cutover rõ ràng và thời hạn kết thúc.

## 7. Runner và bảo mật

Kiểm tra runner trên VPS:

```powershell
Get-Service "actions.runner*" |
  Format-Table Name,Status,StartType
```

Kỳ vọng là `Running` và `Automatic`. Trên GitHub, runner phải hiển thị `Online` và có label `comq-production`.

Runner hiện chạy bằng tài khoản local Administrator để có quyền build, điều khiển service và backup. Đây là quyền cao; về sau nên tạo tài khoản deploy riêng với quyền tối thiểu cần thiết.

Chỉ cho workflow deploy chạy từ branch `main`, không chạy code từ Pull Request trên runner production. Nên bật branch protection và yêu cầu Pull Request review trước khi merge vào `main`.

Không đưa registration token, JWT secret, mật khẩu admin hoặc nội dung `.env` vào log, commit hay issue GitHub.

## 8. Lịch vận hành

### Hằng ngày

- Kiểm tra cảnh báo health-check nếu đã có monitoring.
- Không cần mở RDP mỗi ngày khi service, runner và monitoring đang hoạt động.

### Hằng tuần

- Kiểm tra workflow deploy gần nhất.
- Kiểm tra log lỗi.
- Kiểm tra dung lượng `C:\ComQ\backups`, `C:\ComQ\logs` và `C:\ComQ\backend\uploads`.
- Kiểm tra backup mới nhất có tồn tại.
- Kiểm tra lịch gia hạn SSL:

```powershell
Get-ScheduledTask |
  Where-Object { $_.TaskName -like "*win-acme*" }
```

### Hằng tháng

- Cập nhật Windows Server theo kế hoạch bảo trì.
- Kiểm tra IIS, ARR, URL Rewrite, Node.js và MongoDB.
- Rà soát firewall, RDP và tài khoản Administrator.
- Rà soát session cookie configuration, session TTL và mật khẩu admin.
- Thử restore một bản backup ở môi trường riêng hoặc thời điểm bảo trì.

## 9. Quy trình chuẩn

```text
Local test/build
      ↓
Pull Request hoặc review thay đổi
      ↓
Merge/push main
      ↓
GitHub Actions self-hosted runner
      ↓
Backup MongoDB + uploads
      ↓
Pull source production
      ↓
Stop service → npm ci → build
      ↓
Start service + health-check
      ↓
Kiểm tra website, API, cookie-session login, CSRF và media
      ↓
Theo dõi log/monitoring
```

Production hiện đã có quy trình deploy tự động. Việc còn lại là duy trì backup ngoài VPS, review code trước khi merge và kiểm tra cảnh báo định kỳ.
