# Su-Ky (Sử Ký) — Monorepo

Nền tảng Podcast Kể Chuyện Lịch Sử Việt Nam (Đồ án WDP301).

## Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh) `v1.4.0`
- **Monorepo Engine**: [Turborepo](https://turbo.build) `2.x`
- **Backend API**: [Hono](https://hono.dev) `v4` with end-to-end typed RPC Client
- **Frontend Web**: [React](https://react.dev) `19` + [Vite](https://vite.dev) `8` + [Tailwind CSS](https://tailwindcss.com) `4` + [shadcn/ui](https://ui.shadcn.com) + [Magic UI](https://magicui.design) + [TanStack Query](https://tanstack.com/query) `v5`
- **Frontend Mobile**: [Expo](https://expo.dev) `58` + React Native `0.88` + NativeWind `4.2` + Tailwind CSS `3.4`
- **Database & ORM**: PostgreSQL 18 ([Docker Compose](./compose.yaml) image `postgres:18-alpine`) + [Prisma ORM](https://www.prisma.io) `v6`
- **Contracts**: [Zod](https://zod.dev) schemas in `@repo/shared`
- **AI engine** (`apps/api/src/modules/ai-engine`): Pi SDK, chưa nối vào logic chính, khởi tạo lười, khoá AI trong `.env` là tùy chọn. Pipeline workflow AI-first cũ nằm ở [archive/script-workflow](./archive/script-workflow/README.md)

---

## Cấu Trúc Monorepo

```
su-ky-project/
├── apps/
│   ├── api/          # Hono v4 backend (Bun runtime; exports type AppType)
│   ├── web/          # React 19 + Vite 8 + Tailwind CSS + shadcn/ui + Magic UI
│   └── mobile/       # Expo 58 + React Native + NativeWind
├── packages/
│   ├── db/           # Prisma schema, client, migrations & seed
│   ├── shared/       # Zod schemas, domain types, contracts
│   └── tsconfig/     # Shared tsconfig presets
├── docs/             # Toàn bộ tài liệu kỹ thuật & kiến trúc
├── compose.yaml      # PostgreSQL 17 container
├── bunfig.toml       # Bun workspace configuration (isolated linker)
└── turbo.json        # Turborepo task pipeline
```

---

## Khởi Động Nhanh (Quickstart)

### 1. Khởi động Database PostgreSQL
```bash
docker compose up -d
```

### 2. Cài đặt Dependencies (dùng Bun v1.4.0)
```bash
bun install
```

### 3. Khởi tạo Database Schema & Dữ Liệu Mẫu
```bash
bun run db:deploy
bun run db:seed
```

### Podcast: cổng duyệt và ngoại lệ Admin

- Chạy `bun run db:generate` và `bun run db:deploy` trong `packages/db` khi cập nhật schema.
- Duyệt tập ghi kết luận nội dung/nguồn, quyền, bản nghe, thông báo AI và lý do chấp nhận cảnh báo theo đúng phiên bản.
- Admin có thể xuất bản thẳng từ màn chi tiết kiểm duyệt, nhưng phải ghi lý do ngoại lệ (tối thiểu 20 ký tự) và hồ sơ kết luận; vẫn kiểm nguồn/audio, hạn quyền và ghi audit.
- Audio AI mới gắn với hash kịch bản lúc tạo. Job TTS chưa gắn vẫn ở RAM/temp và mất khi API restart.
- Profile hiện tại là thư viện Sử Ký, không RSS/Apple/Spotify. Chi tiết: [Podcast AI và cổng xuất bản](docs/PODCAST-AI-BACKEND-NOTES.md).

Để nạp series/tập/nguồn mẫu cho trang moderator (qua HTTP API, API phải đang chạy), đặt `SEED_MOD_EMAIL`, `SEED_MOD_PASSWORD` của một tài khoản moderator **đã có trong DB** và `SEED_SOURCE_URL_BASE` (URL gốc cho link nguồn mẫu) rồi chạy:
```bash
cd apps/api && bun run seed:content
```
Script không tạo tài khoản. Mỗi lần chạy nó đọc trạng thái hiện có và chỉ tạo phần còn thiếu (series, từng tập, từng bản kể), nên chạy lại an toàn kể cả sau khi lần trước lỗi giữa chừng. Series chỉ hiện với tài khoản đã seed.

Để có dữ liệu đầy đủ cho UI moderator (ảnh bìa đứng/ngang, audio, series đủ trạng thái, lịch phát hành, phân công, review, ticket đổi người), chạy **sau** `db:deploy` + `db:seed`:
```bash
cd apps/api && bun run seed:demo
```
Ghi thẳng vào DB, cần `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `.env` (Cloudinary tự tải ảnh/audio từ URL công khai nên asset là thật). Tuỳ chọn: `CLOUDINARY_FOLDER` (mặc định `su-ky`), `CLOUDINARY_TIMEOUT_MS` (mặc định 10000), `CLOUDINARY_DOCUMENT_DELIVERY_TTL_SECONDS` (mặc định 3600; thời hạn URL ký để mở PDF), `SEED_PORTRAIT_URL_BASE`, `SEED_LANDSCAPE_URL_BASE` (mặc định picsum.photos), `SEED_AUDIO_URL` (mặc định mp3 mẫu của SoundHelix). Series nhận diện theo slug; chạy lại an toàn kể cả sau lần lỗi giữa chừng. Phân công dùng tài khoản moderator có sẵn, chỉ thêm `demo-mod-N@suky.local` (không đăng nhập được) khi có dưới 2 moderator. Test phục hồi: `RUN_INTEGRATION=1 bun test tests/seed-demo.test.ts` với `DATABASE_URL` trỏ DB có chữ `test` (xem `.env.test.example`).

Nguồn tạo/sửa bằng PDF upload được tự tách text từng trang vào PostgreSQL trước khi lưu thành công. `SOURCE_PDF_TIMEOUT_MS` mặc định `120000` giới hạn thời gian download, extract và transaction; dung lượng dùng cấu hình `media.document.max_bytes`. PDF scan không có text layer cần OCR ngoài luồng (chưa hỗ trợ).

### 4. Khởi động Môi trường Development
```bash
bun run dev
```
- **Web Client**: http://localhost:5173
- **API Server**: http://localhost:3005
- **API Health**: http://localhost:3005/health

Moderator dùng URL riêng cho từng màn: `/moderator/quizzes` mở quiz bản xem trước (dữ liệu mẫu), `/moderator/angles` mở quản lý góc kể. Sidebar điều hướng theo URL; có thể mở trực tiếp hoặc tải lại từng đường dẫn.

---

## Các Lệnh Thường Dùng (Makefile & Bun)

Bạn có thể sử dụng `make` hoặc gọi trực tiếp bằng `bun`:

| Tác vụ | Lệnh `make` | Lệnh tương đương với `bun` |
| :--- | :--- | :--- |
| **Cài đặt dependencies** | `make install` | `bun install` |
| **Chạy dev (API & Web)** | `make dev` | `bun run dev` |
| **Build production** | `make build` | `bun run build` |
| **Kiểm tra kiểu dữ liệu** | `make check-types` | `bun run check-types` |
| **Chạy automated tests** | `make test` | `bun test` |
| **Bật PostgreSQL Docker** | `make db-up` | `docker compose up -d` |
| **Tắt PostgreSQL Docker** | `make db-down` | `docker compose down` |
| **Sinh Prisma Client** | `make db-generate` | `bun run db:generate` |
| **Áp dụng Prisma migrations** | `make db-deploy` | `bun run db:deploy` |
| **Nạp dữ liệu mẫu (Seed)** | `make db-seed` | `bun run db:seed` |
| **Mở Prisma Studio UI** | `make db-studio` | `cd packages/db && bun run prisma studio` |
| **Dọn dẹp cache & build** | `make clean` | `bun run clean` |

### AI soạn thảo (dàn ý, viết phần, viết lại)

`POST /api/studio/episodes/:id/ai/{outline,draft-section,rewrite}` chạy đồng bộ, không lưu DB, qua `model-gate` và cờ `ai_assist.enabled`. Cấu hình trong `.env` (đều tùy chọn): `AI_ASSIST_CALL_TIMEOUT_MS` (mặc định 90000, hạn chót một lời gọi, gồm thời gian chờ slot), `AI_REWRITE_MAX_VARIANTS` (mặc định 10, tối đa 10), `AI_ASSIST_MAX_SOURCE_CHARS` (mặc định 8000, tổng ký tự trích đoạn nguồn của series đưa vào prompt), `AI_ASSIST_MAX_CONCURRENT_PER_USER` dùng chung. Hạn mức: `rate_limit.ai_generate` trong SystemConfig. Log chỉ ghi độ dài, token, thời gian; không ghi nội dung kịch bản hay prompt. Đo thời lượng bằng số từ chia `script.words_per_minute`. Đổi prompt = tăng `*_PROMPT_VERSION` trong `compose/constants.ts` và chạy lại ca vàng (`apps/api/src/modules/ai-assist/compose/golden/*.golden.ts`, dữ liệu ca; chưa có test runner).

---

## Tài Liệu Chi Tiết
Xem trong thư mục [`docs/`](./docs/):
- [`docs/README.md`](./docs/README.md) — Tài liệu hướng dẫn đầy đủ
- [`docs/project-overview-pdr.md`](./docs/project-overview-pdr.md) — Yêu cầu nghiệp vụ đồ án WDP301
- [`docs/system-architecture.md`](./docs/system-architecture.md) — Kiến trúc hệ thống & luồng dữ liệu
- [`docs/code-standards.md`](./docs/code-standards.md) — Quy chuẩn code & type safety
- [`docs/design-guidelines.md`](./docs/design-guidelines.md) — Hướng dẫn giao diện cho Frontend Team
- [`docs/wireframe/index.html`](./docs/wireframe/index.html) — Wireframe tương tác mẫu


