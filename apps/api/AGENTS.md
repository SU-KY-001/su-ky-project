# Backend Architecture Guidelines (@apps/api)

Tài liệu này quy định cấu trúc thư mục, kiến trúc phân tầng (Clean Architecture Monolith) và các quy chuẩn bắt buộc khi phát triển backend API với Bun và Hono.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Ponytail Mindset (Thực dụng & Tối giản):**
   - Không tự vẽ thêm các tầng trung gian hoặc abstraction rườm rà nếu thư viện (Better Auth, Hono, Prisma) hoặc TypeScript/JavaScript platform đã hỗ trợ sẵn.
   - Tránh code dư thừa (YAGNI). Giải pháp ngắn gọn, trực diện và dễ kiểm soát luôn được ưu tiên.

2. **Tách biệt Test hoàn toàn khỏi `src/`:**
   - **TẤT CẢ các file test (`*.test.ts`, `*.spec.ts`) BẮT BUỘC nằm trong thư mục `apps/api/tests/`**.
   - Tuyệt đối không để file test rải rác bên trong `apps/api/src/`.
   - Cấu hình `apps/api/tsconfig.json` bao gồm cả `tests/**/*`.

3. **Hợp đồng Dữ liệu Dùng Chung (`@repo/shared`):**
   - Mọi Zod Schema, DTOs, Enums dùng chung cho cả Backend và Frontend (Web/Mobile) phải đặt tại `packages/shared/src/schemas/`.
   - Backend chỉ import types và schemas từ `@repo/shared` để parse/validate request body & query params.

4. **Chuẩn hóa Phân quyền (Authentication & Authorization):**
   - Sử dụng Better Auth với plugin `admin` và `bearer`.
   - Roles chuẩn: `"user"`, `"moderator"` và `"admin"` (không dùng `"customer"`). Moderator biên tập nội dung qua `/api/studio/*`; Admin không sửa kịch bản (BR-22). `modules/ai-engine` là thư viện gọi LLM, không có route và không được import từ module nghiệp vụ.

5. **Chuẩn hóa Logging (Pino & `logs/error.log`):**
   - Không sử dụng `console.log` / `console.error` tùy tiện trong mã nguồn production.
   - Sử dụng thư viện `pino` tập trung tại `src/core/logger.ts` với cơ chế multi-stream:
     - Toàn bộ log (info, warn, error) được định dạng structured JSON ghi ra `stdout`.
     - Tất cả các log lỗi (`level >= error` / level 50) được tự động nối vào file `apps/api/logs/error.log`.
   - Thư mục `logs/` được giữ bằng `.gitkeep` và file `*.log` được loại trừ khỏi git qua `.gitignore`.

6. **Quản lý & Kiểm định Biến Môi Trường (Type-Safe Env Validation):**
   - Bun tự động đọc các file `.env` mà không cần thư viện `dotenv`.
   - Toàn bộ biến môi trường bắt buộc được parse & validate qua Zod tại `src/core/env.ts` (Fail-Fast ngay khi khởi động nếu thiếu biến hoặc sai format ở production).

7. **Production Middlewares & Bảo Mật:**
   - `secureHeaders()`: Bảo vệ HTTP headers (HSTS, nosniff, frameguard, CSP-ready).
   - `compress()`: Tự động nén gzip/deflate response.
   - `etag()`: Tự động sinh ETag cho caching chuẩn RFC 7232.
   - `bodyLimit()`: Giới hạn payload request tối đa 10MB, trả về 413 nếu vượt quá.

8. **Tài liệu API & OpenAPI (Scalar API Reference):**
   - OpenAPI 3.1 JSON spec tại `GET /openapi.json`.
   - Giao diện tra cứu API tương tác tại `GET /docs` sử dụng `@scalar/hono-api-reference`.
   - Đổi API (thêm, sửa, xoá route, đổi response hoặc mã lỗi) phải cập nhật spec trong `src/routes/docs/` theo `src/routes/docs/AGENTS.md`; `tests/openapi.test.ts` fail nếu spec lệch route.

9. **Graceful Shutdown:**
   - Xử lý các tín hiệu `SIGINT` và `SIGTERM` tại `src/index.ts`.
   - Tự động ngắt kết nối `prisma.$disconnect()` và giải phóng cổng mạng an toàn trước khi tắt process.

---

## 2. Template Cấu Trúc Thư Mục (Folder Structure Template)

```text
su-ky-monorepo/
│
├── packages/
│   ├── shared/                          # [Shared Contracts] Hợp đồng dữ liệu dùng chung FE & BE
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── auth.ts              # Zod schemas: SignIn, SignUp, UserRoleEnum ("user" | "moderator" | "admin")
│   │       │   ├── podcast.ts           # Zod schemas: Series, Episode, EpisodeFilterQuery
│   │       │   ├── timeline.ts          # Zod schemas: Period, TimelineEvent
│   │       │   └── figure.ts            # Zod schemas: Historical Figure
│   │       └── types/                   # Inferred DTOs (z.infer<typeof ...>)
│   │
│   └── db/                              # [Persistence Schema]
│       └── prisma/
│           └── schema.prisma            # Database models (User, Session, Account, Period, Episode...)
│
└── apps/
    └── api/                             # [Backend Monolith Application]
        ├── package.json
        ├── tsconfig.json                # include: ["src/**/*", "tests/**/*"]
        │
        ├── logs/                        # Thư mục chứa log runtime
        │   ├── .gitkeep                 # Tracked by git
        │   └── error.log                # Chứa log lỗi (level >= error), ignored by git
        │
        ├── tests/                       # 🌟 TOÀN BỘ TEST TẬP TRUNG TẠI ĐÂY (KHÔNG ĐẶT TRONG src/)
        │   ├── api.test.ts              # Global endpoints & middleware boundaries (/health, docs, etag, 404, CORS)
        │   ├── auth.test.ts             # Authentication & role-based guard tests
        │   ├── env.test.ts              # Kiểm thử parse & validate biến môi trường Zod
        │   ├── logger.test.ts           # Kiểm thử Pino logger và ghi file error.log
        │   ├── historical-phases.test.ts # Seed Thời kỳ → Giai đoạn (nửa kín) + helper năm; không cần DB
        │   ├── series-sources.test.ts   # Nguồn series-level, publish checklist, lọc theo giai đoạn, PDF, dọn media; cần DB (xem dưới)
        │   ├── support/integration.ts   # Helper test có DB; chặn chạy nếu DATABASE_URL không chứa "test"
        │   └── [feature].test.ts        # Tests cho từng module tính năng
        │
        │   Test có DB chỉ chạy khi `RUN_INTEGRATION=1` (mặc định bị skip), ví dụ:
        │   `bun --env-file=../../.env.test test` (xem `.env.test.example`; DB phải được migrate: `bun run db:test:reset` ở `packages/db`).
        │
        └── src/                         # MÃ NGUỒN BACKEND
            ├── index.ts                 # Server entrypoint (Bun.serve, graceful shutdown)
            ├── app.ts                   # Hono app instance, security/perf middlewares & router mounting
            ├── types.ts                 # Hono AppEnv (Variables: requestId, session, user)
            │
            ├── core/                    # Hạ tầng cross-cutting dùng chung toàn bộ app
            │   ├── env.ts               # Type-safe environment validation với Zod
            │   ├── logger.ts            # Pino logger instance (stdout + logs/error.log)
            │   ├── index.ts             # Barrel export env, logger và middlewares
            │   ├── middleware/          # requestId, logger, cors, errorHandler
            │   │   ├── requestId.ts
            │   │   ├── logger.ts
            │   │   ├── cors.ts
            │   │   ├── errorHandler.ts
            │   │   └── index.ts         # Barrel export
            │   └── errors/              # Custom application exceptions (nếu có)
            │
            ├── routes/                  # Global routes (docs, health, placeholder resources)
            │   ├── docs/                # OpenAPI 3.1 & Scalar (/docs); xem docs/AGENTS.md
            │   ├── health.ts            # Hệ thống health check & DB ping
            │   └── ...
            │
            └── modules/                 # Cấu trúc Clean Architecture / Vertical Slice theo Domain
                │
                ├── auth/                # Module Authentication & Authorization (Better Auth)
                │   ├── auth.ts          # Cấu hình Better Auth instance (Prisma adapter, plugins)
                │   ├── auth.middleware.ts # requireAuth, requireRole, requireAdmin guards
                │   ├── auth.routes.ts   # Handler /api/auth/*, /api/me, /api/admin
                │   └── index.ts         # Public API của module auth
                │
                └── [feature]/           # Template cho các domain nghiệp vụ (podcast, timeline, figure...)
                    ├── domain/          # [Layer 1 - Domain]
                    │   ├── [feature].entity.ts      # Entity nghiệp vụ thuần túy
                    │   └── [feature].repository.ts  # Interface repository (Port)
                    │
                    ├── application/     # [Layer 2 - Application]
                    │   └── [feature].service.ts     # Use-cases & business orchestration
                    │
                    ├── infrastructure/  # [Layer 3 - Infrastructure]
                    │   └── prisma-[feature].repository.ts # Adapter truy vấn DB với Prisma
                    │
                    └── presentation/    # [Layer 4 - Presentation]
                        └── [feature].routes.ts      # Hono HTTP router & controller handlers
```

---

## 3. Hướng Dẫn Triển Khai Module Mới (Step-by-Step Domain Workflow)

Khi bổ sung một module tính năng mới (ví dụ `podcast`):

1. **Bước 1: Hợp đồng dữ liệu tại `@repo/shared`**
   - Khai báo Zod schema request/response tại `packages/shared/src/schemas/podcast.ts`.
   - Export schema và type DTO qua `packages/shared/src/index.ts`.

2. **Bước 2: Domain Layer (`src/modules/[feature]/domain/`)**
   - Định nghĩa Entity và interface Repository thuần TypeScript (không phụ thuộc Prisma hay framework).

3. **Bước 3: Application Layer (`src/modules/[feature]/application/`)**
   - Viết Service class nhận Repository interface qua Dependency Injection (constructor).
   - Chứa logic nghiệp vụ, tính toán, kiểm tra trạng thái.

4. **Bước 4: Infrastructure Layer (`src/modules/[feature]/infrastructure/`)**
   - Triển khai Repository bằng Prisma (`import { prisma } from "@repo/db"`).

5. **Bước 5: Presentation Layer (`src/modules/[feature]/presentation/`)**
   - Khởi tạo Hono router.
   - Dùng Zod validator từ `@repo/shared` để xác thực input.
   - Trả thẳng dữ liệu thành công; không bọc response envelope.

6. **Bước 6: Gắn Router vào `src/app.ts`**
   - Mount router vào `apps/api/src/app.ts` với tiền tố `/api/[feature]`.

7. **Bước 7: Viết Test tại `apps/api/tests/`**
   - Tạo `apps/api/tests/[feature].test.ts`.
   - Kiểm thử các use-case và endpoint HTTP bằng `bun:test`.

8. **Bước 8: Cập nhật OpenAPI spec**
   - Thêm operation cho mọi route mới vào `src/routes/docs/paths/` theo `src/routes/docs/AGENTS.md`.
   - `tests/openapi.test.ts` sẽ fail cho đến khi route được ghi trong spec.

---

## 4. Quy Chuẩn Code (Coding Standards)

- **Response:** Trả thẳng dữ liệu thành công. Lỗi chỉ có `{ error_code, message }`.
- **Mã lỗi HTTP:**
  - 400: `VALIDATION_ERROR` hoặc `BAD_REQUEST`
  - 401: `AUTH_REQUIRED`
  - 403: `FORBIDDEN`
  - 404: `NOT_FOUND`
  - 500: `INTERNAL_SERVER_ERROR`
- **Xử lý ngoại lệ:**
  - Ném `DomainError` cho lỗi nghiệp vụ hoặc `HTTPException` cho lỗi HTTP; `errorHandler` chuyển thành `{ error_code, message }`.
