# Web App Guidelines (@apps/web)

React 19 + Vite + React Router 7 + Tailwind CSS v4 + shadcn/ui (Radix) + TanStack Query. Gọi API qua Hono RPC client (`src/lib/client.ts`, type từ `@repo/api/types`).

---

## 1. BẮT BUỘC đọc trước khi làm bất kỳ task nào liên quan đến web

Trước khi đọc hoặc sửa code trong `apps/web/`, **phải đọc đủ** các file dưới đây (không đọc trước thì không được bắt đầu task):

| File | Nội dung | Đọc khi |
|---|---|---|
| `docs/skill/ARCHITECTURE-FE-SKILL.md` | Kiến trúc theo feature, state, data fetching, `useEffect`, route, xử lý lỗi, UI stack | Luôn luôn |
| `docs/skill/PERMISSION-RULES-SKILL.md` | Quy tắc an toàn cho agent: hỏi trước khi chạy lệnh git, xoá/ghi đè/di chuyển file, lệnh nguy hiểm | Luôn luôn |
| `docs/design/COLOR-FONT.md` | Bảng màu, font, token của giao diện | Mọi việc đụng tới UI, style, màu, font |

Quy tắc trong các file này ưu tiên hơn thói quen cá nhân. Mâu thuẫn với file này thì hỏi lại người dùng.

---

## 2. Cấu trúc

```text
apps/web/src/
├── app/            # Router (routeConfig.tsx), providers, error fallback
├── pages/          # Một thư mục mỗi trang, chỉ ráp feature (landing, moderator)
├── features/       # Logic và UI theo nghiệp vụ (landing, moderator...)
│   └── <feature>/{components,data.ts,types.ts,theme.ts}
├── components/ui/  # shadcn/ui, source nằm trong repo
├── lib/            # client.ts (Hono RPC), api.ts, queryClient.ts, utils.ts (cn)
├── styles/         # globals.css: token và breakpoint
└── assets/
```

- Trang mới: thêm vào `src/app/routeConfig.tsx` bằng `lazy` import, giống `/moderator`.
- Code dùng chung nhiều feature mới đưa vào `components/` hoặc `lib/`; còn lại để trong feature.

---

## 3. Quy chuẩn

- **UI:** Tailwind utility + `src/styles/globals.css`. Component shadcn thêm vào `src/components/ui`. **Không** import Tamagui hay `@tamagui/*` (thuộc `apps/mobile`).
- **Token:** trang công khai dùng token trong `docs/design/COLOR-FONT.md`. Khu moderator (`/moderator`) dùng riêng token `--color-mod-*` và font Manrope (`--font-moderator`) định nghĩa trong `src/styles/globals.css`; render chữ qua `ModeratorText` hoặc class `font-moderator`. Không hardcode mã màu hay font.
- **Lịch sử:** kế hoạch và spec migrate sang Tailwind/shadcn nằm ở `docs/superpowers/` (chỉ để tham khảo).
- **Dữ liệu:** `@repo/shared` cho schema và type dùng chung với API. Không viết lại type response tay nếu `AppType` hoặc shared đã có.
- **Lỗi API:** body lỗi luôn là `{ error_code, message }` (`ErrorResponseSchema` trong `@repo/shared`). Tài liệu endpoint: `GET /docs` của API (`http://localhost:3005/docs`) và `apps/api/src/routes/docs/`.
- **TypeScript:** không `any`, không cast để truy cập thành viên. Không `TODO`/`FIXME`, không comment code cũ.
- **Tối giản:** không thêm abstraction hay dependency khi thư viện đã có sẵn.
- **Test:** đặt theo quy ước repo; `apps/web` chạy `bun test --pass-with-no-tests`.

---

## 4. Kiểm tra trước khi xong

```bash
cd apps/web && bun run check-types
```

Việc đụng giao diện: chạy `bun run dev` và mở trang đã sửa để xem thực tế, không chỉ dựa vào typecheck.
