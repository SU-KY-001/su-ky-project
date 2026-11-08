# ARD 00: Kiến trúc hệ thống Su-Ky

Chỉ vẽ thành phần **đang chạy**. Không vẽ Docker Hub hay CI/CD. Kiểu vẽ theo `example/arch.drawio.png`: khung có thanh tiêu đề, logo lớn, mũi tên có nhãn ngắn.

Nguồn: `apps/api/src/app.ts`, `worker.ts`, `core/jobs/*`, `apps/api/Dockerfile`, `docker-compose.prod.yml`, `.env.example`, `apps/*/package.json`.

## Cách vẽ

- Khung trên cùng: **Third-party Services**. Khung giữa: **Modular Monolith Server** chứa Hono và các module xếp dọc. Bên trái: **Client** và Traefik. Bên phải: PostgreSQL, worker, công cụ trong container.
- Pi coding agent engine chạy **trong tiến trình API**, nên gộp vào ô **AI Assist Module**, không vẽ riêng.
- Web chỉ vẽ là client của API. Repo không nói web host ở đâu.
- Traefik chạy ngoài stack compose, vào qua network `proxy-net`.
- Framework chi tiết (Tailwind, TanStack Query, React Router, Tamagui...) để trong bảng dưới, không vẽ vào hình cho gọn.

## Thành phần

| Thành phần | Vai trò | Bằng chứng trong repo |
|---|---|---|
| Web (React + Vite) | Trang người nghe + Studio cho moderator. Dùng Tailwind v4, TanStack Query, React Router 7, TipTap | `apps/web/package.json` |
| Mobile (Expo) | Ứng dụng người nghe. Dùng Expo Router, Tamagui, expo-audio | `apps/mobile/package.json` |
| Traefik | TLS, định tuyến theo host | `docker-compose.prod.yml` (labels traefik) |
| Hono (suky-api) | REST + SSE trên Bun, cổng 3005. Middleware: CORS, secureHeaders, bodyLimit. Validate bằng Zod | `app.ts` |
| Auth Module | Better Auth, đăng nhập email/password và Google | `modules/auth/auth.ts` |
| Catalog & Content | Lịch sử, nguồn, series, episode | `modules/catalog`, `modules/content` |
| Listening Module | Tiến độ nghe | `modules/listening` |
| Gamification Module | Quiz, nhiệm vụ tuần, XP | `modules/gamification` |
| Exhibition & Showcase | Triển lãm, trang giới thiệu | `modules/exhibition`, `modules/showcase` |
| Releases Module | Lịch phát hành, phân công sản xuất, duyệt | `modules/releases` |
| Media Module | Upload và quản lý media qua Cloudinary | `modules/media` |
| AI Assist Module | AI review/compose bằng Pi engine (in-process), tạo giọng đọc bằng Gemini TTS | `modules/ai-assist`, `modules/ai-engine` |
| PostgreSQL 18 | Dữ liệu chính, truy cập qua Prisma. Volume `postgres_data` | `docker-compose.prod.yml`, `packages/db` |
| suky-worker | Cùng image với API, chạy `bun src/worker.ts`. pg-boss nhắc hạn sản xuất mỗi phút, ghi heartbeat 30s | `worker.ts`, `core/jobs/release-jobs.ts` |
| LibreOffice Writer | Đổi DOC sang DOCX khi import quiz | `quiz-import/office-converter.ts`, Dockerfile |
| ffmpeg | Ghép WAV thành MP3 cho giọng đọc | `voice.service.ts`, Dockerfile |
| Google Gemini | LLM (review/compose) và TTS | `PI_PROVIDER`, `gemini-tts.ts` |
| Cloudinary | Lưu audio, ảnh, PDF nguồn | `CLOUDINARY_*` trong `.env.example` |
| Google OAuth | Đăng nhập Google | `GOOGLE_CLIENT_ID/SECRET` trong `.env.example` |

## Dây cần vẽ

| Từ | Đến | Nhãn |
|---|---|---|
| Web, Mobile | Traefik | HTTPS Request |
| Traefik | Client | JSON / SSE |
| Traefik | Server | HTTP Request |
| Server | Traefik | Response |
| Server | Gemini (2 chiều) | Prompt · TTS / Response |
| Server | Cloudinary (2 chiều) | Upload file / File URL |
| Server | Google OAuth (2 chiều) | OAuth |
| Server | PostgreSQL | Read / Write (Prisma) |
| PostgreSQL | Server | Return |
| Worker | PostgreSQL | pg-boss |
| Gamification Module | LibreOffice (2 chiều) | DOC file |
| AI Assist Module | ffmpeg (2 chiều) | WAV list |

## Điểm cần biết

- Job TTS lưu **trong bộ nhớ** (`TTS_JOB_TTL_MS`), nên API chỉ chạy một instance.
- Job bảo trì (media cleanup mỗi 30 phút, purge idempotency và rate-limit mỗi giờ, AI-check reaper) chạy trong tiến trình API qua pg-boss. Hình không vẽ riêng vì cùng ô server.
- Không vẽ `OutboxEvent` và `ReleaseReminder`: job outbox dispatcher đã bị gỡ trong `release-jobs.ts`.
- Các mũi tên nối module với LibreOffice và ffmpeg chỉ ra module sở hữu chức năng. Chưa kiểm tra từng lời gọi trong code.

## Cách sinh lại

```bash
node docs/ard/gen_sad.mjs docs/ard/00-system-architecture.drawio
```

Cần mạng để tải icon. Xuất PNG: `draw.io.exe -x -f png -s 2 -b 20 -o docs/ard/00-system-architecture.png docs/ard/00-system-architecture.drawio`.
