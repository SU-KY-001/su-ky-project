# Phase 1: Credential dev và client gửi cookie

**Mục tiêu:** có tài khoản `moderator` thật trong DB và đăng nhập được bằng một nút trên trang moderator, cookie session đi kèm mọi request từ web.

## Việc làm

1. **Hằng số credential dùng chung.** `packages/shared/src/dev-moderator.ts` export `DEV_MODERATOR = { name, email, password }` (named constant, có comment lý do: chỉ cho dev, người dùng chủ động chấp nhận). **Không** re-export từ index `@repo/shared` (web import tĩnh index ở nhiều nơi nên dynamic import không tách được chunk, và API cũng không cần kéo hằng số này). Thêm subpath riêng vào `exports` của `packages/shared/package.json`: `"./dev-moderator": "./src/dev-moderator.ts"`.
2. **Script seed.** `apps/api/src/scripts/seed-dev-moderator.ts`: dùng `auth.api.createUser({ body: { email, password, name, role: "moderator" } })` (plugin `admin` của Better Auth, mật khẩu được hash đúng). Idempotent: nếu email đã có thì cập nhật `role = "moderator"` bằng Prisma, không tạo trùng. Từ chối chạy khi `NODE_ENV=production`. Thêm script `seed:mod` trong `apps/api/package.json` (`bun --env-file=../../.env src/scripts/seed-dev-moderator.ts`).
3. **Client gửi cookie.** `apps/web/src/lib/client.ts`: `hc<AppType>(apiUrl, { init: { credentials: "include" } })`. Kiểm tra API đã cho phép origin `5173` (`CORS_ORIGIN`).
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

## Rủi ro

- Better Auth `admin` plugin có thể chặn `createUser` khi không có session admin. Nếu vậy dùng `auth.$context.internalAdapter` hoặc Prisma trực tiếp cộng với hash từ `better-auth/crypto`; xác minh bằng chạy thật trước khi chọn.
