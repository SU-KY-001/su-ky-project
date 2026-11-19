# ARD 03: Kiến trúc hệ thống Su-Ky (bản 02 + hàng đợi pg-boss)

Giống `02-system-architecture-arrows`, thêm ô **Job queue · pg-boss** và các mũi tên của nó. `00`, `01`, `02` giữ nguyên.

## Thêm gì so với 02

| Thêm | Ý nghĩa | Bằng chứng |
|---|---|---|
| Ô **Job queue · pg-boss** | Hàng đợi/lịch chạy job. pg-boss là thư viện, trạng thái lưu **trong PostgreSQL**; ô này vẽ riêng để thấy luồng job | `core/jobs/maintenance-jobs.ts`, `core/jobs/release-jobs.ts` |
| suky-api ⇄ Job queue · `pg-boss · schedule · run ⇄ jobs` | Tiến trình API tự tạo queue, lên lịch cron và chạy job bảo trì: dọn media (30 phút), purge idempotency và rate-limit (mỗi giờ), đóng AI check treo | `maintenance-jobs.ts`: `createQueue`, `schedule`, `work` |
| suky-worker ⇄ Job queue · `pg-boss · poll ⇄ jobs` | Worker lên lịch và chạy job `release.production-reminders` mỗi phút | `release-jobs.ts`, `worker.ts` |
| Job queue ⇄ PostgreSQL · `SQL / TCP · state ⇄ rows` | pg-boss đọc/ghi trạng thái job qua SQL | `new PgBoss({ connectionString })` |

Mũi tên suky-api ⇄ Job queue xuất phát từ cả khung `suky-api`, không từ một module, vì job bảo trì nằm ở `core/jobs`, không thuộc module nghiệp vụ nào.

## Quy ước, tiêu đề, chú giải

Như bản 02 (mũi tên hai đầu, nhãn `gửi ⇄ nhận`, dòng trên là giao thức/cơ chế). Danh sách 13 mũi tên của 02 vẫn đúng, trừ #7: worker không còn nối thẳng PostgreSQL mà đi qua Job queue. Tổng cộng bản này có 15 mũi tên.

## Lưu ý

- Ô Job queue là ô logic. Về vật lý nó là các bảng trong PostgreSQL, API và worker mỗi bên chạy một instance `PgBoss` riêng.
- Biểu tượng đồng hồ ⏱ là ký tự, không phải icon Simple Icons (Simple Icons không có pg-boss).
- Phần còn lại giữ nguyên như 02: chưa kiểm từng lời gọi từ Domain modules tới LibreOffice, AI Assist và ffmpeg; chưa kiểm riêng `SQL / TCP`; việc phát audio từ Cloudinary không vẽ.

## Cách sinh lại

```bash
node docs/ard/gen_sad_03.mjs docs/ard/03-system-architecture-queue.drawio
"C:\\Program Files\\draw.io\\draw.io.exe" -x -f png -s 2 -b 20 -o docs/ard/03-system-architecture-queue.png docs/ard/03-system-architecture-queue.drawio
```
