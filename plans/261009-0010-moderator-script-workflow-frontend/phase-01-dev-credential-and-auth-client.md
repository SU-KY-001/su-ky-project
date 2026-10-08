# Phase 1: Credential dev và client gửi cookie

**Mục tiêu:** có tài khoản `moderator` thật trong DB và đăng nhập được bằng một nút trên trang moderator, cookie session đi kèm mọi request từ web.

## Việc làm

1. **Hằng số credential dùng chung.** `packages/shared/src/dev-moderator.ts` export `DEV_MODERATOR = { name, email, password }` (named constant, có comment lý do: chỉ cho dev, người dùng chủ động chấp nhận). **Không** re-export từ index `@repo/shared` (web import tĩnh index ở nhiều nơi nên dynamic import không tách được chunk, và API cũng không cần kéo hằng số này). Thêm subpath riêng vào `exports` của `packages/shared/package.json`: `"./dev-moderator": "./src/dev-moderator.ts"`.
2. **Script seed.** `apps/api/src/scripts/seed-dev-moderator.ts`: dùng `auth.api.createUser({ body: { email, password, name, role: "moderator" } })` (plugin `admin` của Better Auth, mật khẩu được hash đúng). Idempotent: nếu email đã có thì đặt lại `role = "moderator"` **và đặt lại mật khẩu** từ `DEV_MODERATOR` (qua hash của Better Auth, ví dụ `ctx.password.hash` + cập nhật bảng account), để nút đăng nhập dev luôn khớp. Từ chối chạy khi `NODE_ENV=production`. Thêm script `seed:mod` trong `apps/api/package.json` (`bun --env-file=../../.env src/scripts/seed-dev-moderator.ts`).
3. **Client gửi cookie.** `apps/web/src/lib/client.ts`: `hc<AppType>(apiUrl, { init: { credentials: "include" } })`. Kiểm tra API đã cho phép origin `5173` (`CORS_ORIGIN`).
3b. **Trusted origin cho Better Auth.** `sign-in/email` có `formCsrfMiddleware`: request từ `5173` bị kiểm `Origin`, mà `trustedOrigins` mặc định chỉ chứa `baseURL` (`3005`) nên trả `403 INVALID_ORIGIN`. Tách phần đọc `CORS_ORIGIN` thành **một hàm chung** (`core/config/allowedOrigins.ts`) dùng cho cả `cors.ts` và `trustedOrigins` của `auth.ts`; loại mục `*` trước khi đưa cho Better Auth (không hoạt động như wildcard CORS). Xác minh bằng `curl -i -X POST localhost:3005/api/auth/sign-in/email -H "Origin: http://localhost:5173" -H "Content-Type: application/json" -d '{"email":"x@y.z","password":"wrongpass"}'`: trước khi sửa `403`, sau khi sửa `401`.
4. **Hàm đăng nhập.** `apps/web/src/features/auth-dev/loginDevModerator.ts`: `POST {apiUrl}/api/auth/sign-in/email` với `credentials: "include"`. Chỉ tham chiếu `@repo/shared/dev-moderator` bên trong `if (import.meta.env.DEV) { await import(...) }` để Vite loại khỏi bundle production; xác nhận bằng grep `dist/` (xem Acceptance). Seed script ở `apps/api` import cùng subpath.
5. **Nút "Đăng nhập Mod".** Đặt ở header của shell moderator (`ModeratorShell` ở phase 2; phase này tạm đặt ở `ModeratorDashboard` rồi chuyển). Chỉ render khi `import.meta.env.DEV`. Trạng thái: chưa đăng nhập, đang đăng nhập, đã đăng nhập (hiện tên + role), lỗi (toast kèm `message`). Dùng `Button` shadcn, token `mod-*`, `aria-live="polite"` cho kết quả.
6. **Hook phiên.** `useSession()` gọi `GET /api/auth/get-session`, trả `{ user, role } | null`; react-query, `retry: false`.

## UI/UX

- Nút có icon Phosphor + chữ, vùng bấm ≥ 44px, focus ring theo guideline.
- Nhãn "Chỉ dùng khi phát triển" nhỏ cạnh nút để không nhầm với đăng nhập thật của team FE.

## Acceptance

- `bun run seed:mod` chạy hai lần liên tiếp không lỗi, DB có đúng 1 user `role = moderator`.
- Bấm nút: `GET /api/auth/get-session` trả user moderator; reload trang vẫn đăng nhập.
- Build production (`bun run build`) không chứa chuỗi mật khẩu dev (grep `dist/`).
- `check-types` api, web, shared sạch.

## Đã xác minh (better-auth 1.7.7)

- `auth.api.createUser` gọi từ server **không cần** session admin (chỉ kiểm quyền khi có session) và nhận `role: "moderator"` vì plugin `admin` không khai báo `roles`. Email đã tồn tại thì trả `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, nên phải kiểm email trước rồi mới tạo.
- `GET /api/auth/get-session` trả `{ session, user } | null`; `role` nằm trong `user`.
