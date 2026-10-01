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
   - Roles chuẩn: `"user"` và `"admin"` (không dùng `"customer"`).

---

## 2. Template Cấu Trúc Thư Mục (Folder Structure Template)

```text
su-ky-monorepo/
│
├── packages/
│   ├── shared/                          # [Shared Contracts] Hợp đồng dữ liệu dùng chung FE & BE
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── auth.ts              # Zod schemas: SignIn, SignUp, UserRoleEnum ("user" | "admin")
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
        ├── tests/                       # 🌟 TOÀN BỘ TEST TẬP TRUNG TẠI ĐÂY (KHÔNG ĐẶT TRONG src/)
        │   ├── api.test.ts              # Global endpoints & middleware boundaries (/health, 404, CORS)
        │   ├── auth.test.ts             # Authentication & role-based guard tests
        │   └── [feature].test.ts        # Tests cho từng module tính năng
        │
        └── src/                         # MÃ NGUỒN BACKEND
            ├── index.ts                 # Server entrypoint (Bun.serve, load env)
            ├── app.ts                   # Hono app instance, global middlewares & router mounting
            ├── types.ts                 # Hono AppEnv (Variables: requestId, session, user)
            │
            ├── core/                    # Hạ tầng cross-cutting dùng chung toàn bộ app
            │   ├── middleware/          # requestId, logger, cors, errorHandler
            │   │   ├── requestId.ts
            │   │   ├── logger.ts
            │   │   ├── cors.ts
            │   │   ├── errorHandler.ts
            │   │   └── index.ts         # Barrel export
            │   └── errors/              # Custom application exceptions (nếu có)
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
   - Gọi Service và trả về response chuẩn `ApiResponse<T>`.

6. **Bước 6: Gắn Router vào `src/app.ts`**
   - Mount router vào `apps/api/src/app.ts` với tiền tố `/api/[feature]`.

7. **Bước 7: Viết Test tại `apps/api/tests/`**
   - Tạo `apps/api/tests/[feature].test.ts`.
   - Kiểm thử các use-case và endpoint HTTP bằng `bun:test`.

---

## 4. Quy Chuẩn Code (Coding Standards)

- **Response Envelope:** Luôn trả về đúng chuẩn `ApiResponse<T>`:
  - Thành công: `{ success: true, data: ... }`
  - Thất bại: `{ success: false, error: { code: "...", message: "..." }, meta: { requestId, timestamp } }`
- **Mã lỗi HTTP:**
  - 400: `VALIDATION_ERROR` hoặc `BAD_REQUEST`
  - 401: `UNAUTHORIZED` (Chưa đăng nhập / token không hợp lệ)
  - 403: `FORBIDDEN` (Không đủ quyền hạn)
  - 404: `NOT_FOUND`
  - 500: `INTERNAL_SERVER_ERROR`
- **Xử lý ngoại lệ:**
  - Ném `HTTPException` từ `hono/http-exception` để middleware `errorHandler` tự động bắt và đóng gói JSON envelope chuẩn.
