# Su-Ky (Sử Ký) — Monorepo

Nền tảng Podcast Kể Chuyện Lịch Sử Việt Nam (Đồ án WDP301).

## Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh) `v1.4.0`
- **Monorepo Engine**: [Turborepo](https://turbo.build) `2.x`
- **Backend API**: [Hono](https://hono.dev) `v4` with end-to-end typed RPC Client
- **Frontend Web**: [React](https://react.dev) `19` + [Vite](https://vite.dev) `8` + [Tailwind CSS](https://tailwindcss.com) `4` + [shadcn/ui](https://ui.shadcn.com) + [Magic UI](https://magicui.design) + [TanStack Query](https://tanstack.com/query) `v5`
- **Frontend Mobile**: [Expo](https://expo.dev) `57` + React Native `0.86` + Tamagui `2`
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
│   └── mobile/       # Expo 57 + React Native + Tamagui
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

### 4. Khởi động Môi trường Development
```bash
bun run dev
```
- **Web Client**: http://localhost:5173
- **API Server**: http://localhost:3005
- **API Health**: http://localhost:3005/health

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

---

## Tài Liệu Chi Tiết
Xem trong thư mục [`docs/`](./docs/):
- [`docs/README.md`](./docs/README.md) — Tài liệu hướng dẫn đầy đủ
- [`docs/project-overview-pdr.md`](./docs/project-overview-pdr.md) — Yêu cầu nghiệp vụ đồ án WDP301
- [`docs/system-architecture.md`](./docs/system-architecture.md) — Kiến trúc hệ thống & luồng dữ liệu
- [`docs/code-standards.md`](./docs/code-standards.md) — Quy chuẩn code & type safety
- [`docs/design-guidelines.md`](./docs/design-guidelines.md) — Hướng dẫn giao diện cho Frontend Team
- [`docs/wireframe/index.html`](./docs/wireframe/index.html) — Wireframe tương tác mẫu
