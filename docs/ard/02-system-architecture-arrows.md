# ARD 02: Kiến trúc hệ thống Su-Ky (kiểu tầng, mũi tên request/response)

Cùng bố cục với `01-system-architecture-tiers`, nhưng viết lại toàn bộ mũi tên và bỏ một ô không có trong code. `00` và `01` giữ nguyên.

## Quy ước mũi tên

- **Một mũi tên hai đầu cho mỗi tương tác**: bên gọi gửi yêu cầu, phản hồi quay về trên cùng mũi tên.
- Nhãn hai dòng: dòng trên là thao tác, dòng dưới là `gửi ⇄ nhận`.
- Hai mũi tên giữa cùng một cặp chỉ khi **cả hai bên cùng chủ động** (Cloudinary, #12 và #13).
- Nét liền: gọi qua mạng. Nét đứt: trong tiến trình hoặc tiến trình con cùng container.
- Mũi tên hai đầu không nói ai gọi trước; chiều gọi suy từ vị trí: client → server, API → dịch vụ ngoài, worker → DB.

## 13 mũi tên

| # | Cặp | Nét | Nhãn trên hình | Nội dung | Bằng chứng |
|---|---|---|---|---|---|
| 1 | Listener·Moderator ⇄ Client | liền | act ⇄ view | Người dùng thao tác, màn hình phản hồi | |
| 2 | Client ⇄ Traefik | liền | HTTPS · request ⇄ JSON · SSE | Client gọi, nhận JSON; SSE là server đẩy về trên kết nối client mở | `apps/web`, `apps/mobile` gọi `apiUrl` |
| 3 | Traefik ⇄ Hono API | liền | HTTP · forward ⇄ response | Chuyển tiếp theo host rồi trả phản hồi | labels `docker-compose.prod.yml` |
| 4 | Hono API ⇄ Domain modules | đứt | route · call ⇄ result | Điều phối tới module, trả kết quả | `app.ts` |
| 5 | Domain modules ⇄ Prisma | đứt | query · call ⇄ rows | Đọc/ghi dữ liệu, trả bản ghi | `packages/db` |
| 6 | Prisma ⇄ PostgreSQL | liền | SQL · query ⇄ rows | Truy vấn, trả hàng | `docker-compose.prod.yml` |
| 7 | suky-worker ⇄ PostgreSQL | liền | poll jobs · query ⇄ jobs | Worker hỏi, nhận job pg-boss (nhắc hạn sản xuất mỗi phút) | `worker.ts`, `release-jobs.ts` |
| 8 | Domain modules ⇄ LibreOffice | đứt | convert · DOC ⇄ DOCX | Gửi DOC, nhận DOCX khi import quiz | `quiz-import/office-converter.ts` |
| 9 | Domain modules ⇄ AI Assist | đứt | review · TTS · request ⇄ result | Rà kịch bản, tạo giọng đọc | `modules/ai-engine`, `ai-assist` |
| 10 | AI Assist ⇄ ffmpeg | đứt | encode · WAV ⇄ MP3 | Gửi WAV, nhận MP3 | `voice.service.ts` |
| 11 | AI Assist ⇄ Google Gemini | liền | prompt · TTS · request ⇄ text · audio | Gửi prompt, nhận văn bản hoặc âm thanh | `generativelanguage.googleapis.com` |
| 12 | Domain modules ⇄ Cloudinary | liền | sign · verify · delete · request ⇄ status | Ký ticket, kiểm tra asset (`api.resource`), xóa (`destroy`), nhận trạng thái | `media/infrastructure/cloudinary.gateway.ts` |
| 13 | Client ⇄ Cloudinary | liền | upload (signed) · file ⇄ result | Tải file **thẳng** lên Cloudinary bằng ticket đã ký, nhận kết quả | `catalogMediaService.ts` |

#12 và #13 cùng đích Cloudinary vì cả hai bên cùng chủ động: server ký/kiểm tra/xóa, client tải lên. Đây là cặp duy nhất có hai mũi tên giữa hai thành phần.

Dòng trên của mỗi nhãn là giao thức/cơ chế (theo khuyến nghị của [C4 Notation](https://c4model.com/diagrams/notation)): `HTTPS`, `HTTP`, `SQL / TCP` cho gọi qua mạng; `in-process` cho gọi hàm trong cùng tiến trình API; `exec` cho tiến trình con (LibreOffice, ffmpeg). Bảng trên giữ nhãn ngắn; nhãn trên hình có thêm dòng giao thức này. Tiêu đề hình: "Container diagram — Su-Ky production deployment".

Đã kiểm trong code: `exec` đúng với LibreOffice (`Bun.spawn` trong `quiz-import/office-converter.ts`) và ffmpeg (`execFile` trong `ai-assist/voice/voice.service.ts`). Ký ticket upload (`signUpload`) tính cục bộ, không gọi mạng, nên nhãn mũi tên Domain modules ⇄ Cloudinary chỉ ghi `verify · delete` (hai lời gọi `api.resource` và `uploader.destroy`). Phần `SQL / TCP` chưa kiểm riêng.

## Đã sửa so với 01

| Vấn đề ở 01 | Sửa ở 02 |
|---|---|
| 01 trộn mũi tên một chiều và hai chiều không theo quy tắc, nhiều mũi tên không cho thấy dữ liệu quay về | Mỗi tương tác là một mũi tên hai đầu; nhãn ghi rõ "gửi ⇄ trả về" |
| Nhãn chung chung, không nói dữ liệu | Mỗi nhãn có hai dòng: thao tác, rồi `gửi ⇄ nhận` (ví dụ `query ⇄ rows`) |
| Ô **Google OAuth** và mũi tên OAuth | Bỏ. `grep GOOGLE_CLIENT\|socialProviders\|signIn.social` trong `apps/` và `packages/` không ra kết quả. `auth.ts` chỉ bật `emailAndPassword`; biến Google chỉ có trong `.env.example` |
| Mũi tên "files" tới Cloudinary gộp hai luồng | Tách hai luồng thật: server ký/kiểm tra/xóa, client tải lên trực tiếp |
| Hình ngụ ý mọi file đi qua API | Mũi tên #13 đi vòng dưới khung VPS, không qua Traefik |

## Lưu ý

- Mũi tên #13 chỉ ghi `upload`. Việc client tải audio về bằng URL đã ký (`cloudinary.url` với `sign_url`) chưa thấy chỗ gọi trong client nên **không vẽ**.
- Mũi tên #8–#10 thể hiện module nào sở hữu chức năng nào; chưa kiểm từng lời gọi.
- Job TTS lưu trong bộ nhớ nên API chạy một instance.
- Không có chỗ nào chứng minh host của Web trong repo, nên Web chỉ vẽ như client của API.

## Cách sinh lại

```bash
node docs/ard/gen_sad_02.mjs docs/ard/02-system-architecture-arrows.drawio
"C:\\Program Files\\draw.io\\draw.io.exe" -x -f png -s 2 -b 20 -o docs/ard/02-system-architecture-arrows.png docs/ard/02-system-architecture-arrows.drawio
```

Cần mạng để tải icon (Simple Icons).
