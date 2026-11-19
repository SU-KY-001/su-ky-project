# ARD 01: Kiến trúc hệ thống Su-Ky (kiểu tầng)

Bản dùng để thuyết trình. Chỉ vẽ thành phần **đang chạy**. Không vẽ Docker Hub hay CI/CD.

Nguồn: `apps/api/src/app.ts`, `worker.ts`, `apps/api/Dockerfile`, `docker-compose.prod.yml`, `.env.example`, `apps/*/package.json`.

## Cách đọc hình

- Khung lồng nhau nghĩa là "chạy bên trong". Traefik nằm trong VPS nhưng **ngoài** Docker Compose, đúng với repo (Traefik chạy riêng, nối qua `proxy-net`).
- Nét liền: gọi qua mạng. Nét đứt: gọi trong tiến trình hoặc tiến trình con cùng container.
- Mỗi mũi tên có một nhãn ngắn. Các ô nói chuyện với nhau nằm cùng một đường tâm nên mũi tên thẳng.

## Thành phần

| Ô trong hình | Là gì | Bằng chứng trong repo |
|---|---|---|
| Web App | React 19, Vite, Tailwind v4. Gồm trang người nghe và Studio cho moderator | `apps/web/package.json` |
| Mobile App | Expo 58, React Native | `apps/mobile/package.json` |
| Traefik | TLS, định tuyến theo host | labels trong `docker-compose.prod.yml` |
| Hono API | REST + SSE, cổng 3005. Better Auth gắn tại `/api/auth/*` | `app.ts`, `modules/auth/auth.ts` |
| Domain modules | catalog, content, listening, gamification, exhibition, releases, media, admin | `app.ts` (route mounts) |
| Prisma | Lớp truy cập dữ liệu | `packages/db` |
| LibreOffice | Đổi DOC sang DOCX khi import quiz | `quiz-import/office-converter.ts`, Dockerfile |
| ffmpeg | Ghép WAV thành MP3 cho giọng đọc | `voice.service.ts`, Dockerfile |
| AI Assist (π) | Pi coding agent engine chạy trong tiến trình API, review/compose và tạo giọng đọc | `modules/ai-engine`, `modules/ai-assist` |
| PostgreSQL 18 | Dữ liệu chính, volume `postgres_data` | `docker-compose.prod.yml` |
| suky-worker | Cùng image với API, chạy `src/worker.ts`. pg-boss nhắc hạn sản xuất mỗi phút | `worker.ts`, `core/jobs/release-jobs.ts` |
| Google OAuth, Cloudinary, Google Gemini | Dịch vụ ngoài | `.env.example` |

## Đã lược khỏi hình, và lý do

Hình chỉ giữ một mức trừu tượng: thành phần chạy được hoặc lớp kiến trúc. Thư viện và chi tiết cài đặt đưa xuống bảng này.

| Bỏ | Lý do |
|---|---|
| Zod validator | Thư viện, không phải thành phần |
| Maintenance jobs (pg-boss cron) | Chạy trong tiến trình API: media cleanup 30 phút, purge idempotency và rate-limit mỗi giờ, AI-check reaper |
| Middleware (CORS, secureHeaders, bodyLimit) | Chi tiết cài đặt của Hono |
| TanStack Query, React Router, TipTap, Tamagui | Thư viện giao diện |
| `OutboxEvent`, `ReleaseReminder` | Job outbox dispatcher đã bị gỡ trong `release-jobs.ts` |

## Lỗi hay gặp khi vẽ ARD, đã kiểm lại

Tổng hợp từ [Ilograph: 7 Common Mistakes](https://www.ilograph.com/blog/posts/diagram-mistakes/).

| Lỗi | Bản cũ | Đã sửa |
|---|---|---|
| Trộn mức trừu tượng (thư viện cạnh dịch vụ) | Zod, Prisma, Maintenance jobs nằm cùng hàng với dịch vụ | Bỏ Zod và Maintenance jobs. Giữ Prisma vì là lớp truy cập dữ liệu |
| Mũi tên không nhãn | Nhiều mũi tên trống | Mọi mũi tên có nhãn ngắn |
| Khung gây hiểu sai (composition) | Traefik vẽ ngoài VPS | Traefik trong VPS, ngoài Compose |
| Quá nhiều chữ | Ô dài 2–3 dòng, liệt kê framework | Mỗi ô một tên, tối đa hai dòng |
| Lệch hàng, mũi tên gấp khúc | Cột và hàng không cùng lưới | Lưới 4 cột × 3 hàng, các ô liên quan cùng đường tâm |
| Thiếu chú giải | Không có | Thêm chú giải nét liền / nét đứt |
| Không đồng nhất cỡ icon | Icon 32px, có ô không icon | Icon 40px, Pi dùng ký hiệu π vì Simple Icons không có icon Pi |

## Nên nói khi thuyết trình

Hình chỉ cho biết **cái gì** và **nối với cái gì**. Cần nói thêm các lý do thiết kế:

- Modular monolith: một process Hono, module tách theo miền, dễ triển khai trên một VPS.
- Worker dùng chung image với API nhưng chạy riêng để job nhắc hạn không phụ thuộc vào request HTTP.
- Job TTS lưu **trong bộ nhớ**, nên API chạy một instance. Đây là giới hạn đã biết khi scale.
- pg-boss dùng chính PostgreSQL, không cần thêm Redis hay message broker.

## Cách sinh lại

```bash
node docs/ard/gen_sad_tiers.mjs docs/ard/01-system-architecture-tiers.drawio
```

Cần mạng để tải icon. Xuất PNG: `draw.io.exe -x -f png -s 2 -b 20 -o docs/ard/01-system-architecture-tiers.png docs/ard/01-system-architecture-tiers.drawio`.
