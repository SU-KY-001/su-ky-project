---
title: "Frontend: Moderator tạo kịch bản podcast (Script Workflow UI)"
description: "Nối apps/web với API /api/script-workflows: danh sách, tạo, workspace 7 bước + 3 cổng duyệt, SSE, xuất bản"
status: done
priority: P1
effort: 38h
branch: feat/script-workflow
tags: [frontend, react, moderator, script-workflow, sse, tanstack-query]
blockedBy: []
blocks: []
created: 2026-10-09
---

# Frontend: Moderator tạo kịch bản podcast

## Context

API workflow đã xong (26 route, spec ở `http://localhost:3005/docs`, hợp đồng ở `docs/api-docs/script-workflow-api.md`). Đặc tả màn hình đã có sẵn: **`docs/ux/script-workflow-ux.md`** (S1 danh sách, S2 tạo, S3 workspace, S4 xuất bản, S5 cây). Plan này **không thiết kế lại UX**, chỉ cụ thể hoá thành việc làm trong `apps/web`.

Hiện trạng `apps/web`: chỉ có `/` (landing) và `/moderator` (dashboard dữ liệu mẫu, shell sidebar nằm thẳng trong `ModeratorDashboard.tsx`). Chưa có đăng nhập, chưa gọi API nào, `lib/client.ts` là `hc<AppType>` không gửi cookie.

## Quy tắc UI/UX bắt buộc (đọc trước khi làm)

**Thứ tự ưu tiên khi các nguồn khác nhau:** (1) `apps/web/docs/{design,skill}` và `apps/web/AGENTS.md`, (2) code hiện có trong `apps/web/src` (đặc biệt `styles/globals.css`), (3) `docs/design-guidelines.md` và `docs/ux/script-workflow-ux.md`. Hai tài liệu cấp 3 chỉ dùng để mượn **hành vi** (a11y, vùng bấm, reduced-motion, skeleton/rỗng/lỗi, bố cục màn hình), không mượn token, font, icon.

Đọc `apps/web/AGENTS.md` và 3 file trong `apps/web/docs/{skill,design}`. Tóm tắt những gì ràng buộc plan này:

| Nguồn | Quy tắc |
|---|---|
| `ARCHITECTURE-FE-SKILL.md` | Kiến trúc theo feature (`features/script-workflow/`), react-query cho server state, zustand cho UI state, tránh `useEffect` trừ khi đồng bộ với hệ ngoài React (SSE là đúng trường hợp này) |
| `PERMISSION-RULES-SKILL.md` | Hỏi trước khi chạy lệnh git, xoá/ghi đè/di chuyển file, lệnh nguy hiểm |
| `docs/design-guidelines.md` (cấp 3) | Chỉ mượn: WCAG 2.1 AA (tương phản chữ 4.5:1), vùng bấm tối thiểu 44px, `prefers-reduced-motion`, không emoji làm icon, mọi trạng thái màu kèm chữ + icon, mẫu trạng thái skeleton/rỗng/lỗi. Token, font, icon: theo bảng bên dưới |
| `docs/ux/script-workflow-ux.md` §7, §8 | Microcopy tiếng Việt: gọi "AI/trợ lý biên tập", không hiện `agent/node/fork/STALE`; ngày `dd/MM/yyyy HH:mm`; stepper `aria-current`, `aria-live="polite"`, hộp thoại bẫy focus |
| `globals.css` | Khu moderator dùng token `--color-mod-*` và `font-moderator` (Manrope), chữ qua `ModeratorText`. Không hardcode màu |
| `AGENTS.md` gốc | Không `any`, không cast truy cập thành viên, không `TODO`, không magic number (hằng số đặt tên) |

## Mâu thuẫn giữa các tài liệu UI (đã chốt theo thứ tự ưu tiên ở trên)

`apps/web/docs/design/COLOR-FONT.md` **không mâu thuẫn** với `docs/design-guidelines.md`: 7 token và hex trùng khớp, cùng dùng Be Vietnam Pro. COLOR-FONT chỉ là tập con. Mọi chỗ lệch bên dưới đều thuộc `design-guidelines.md`, và theo thứ tự ưu tiên thì **thắng là `apps/web/docs` + code**:

| Chủ đề | `design-guidelines.md` | Code thực tế (`apps/web/src`) | Plan này dùng |
|---|---|---|---|
| Thư viện icon | §5: Lucide | Phosphor (16 file), Lucide chỉ 1 file | **Phosphor** |
| Focus ring | §6: `ring-amber-500`, `ring-offset-lacquer-950`; §2.1: `--focus #2866A1` (tự mâu thuẫn) | `--color-focus: #2866a1`, `:focus-visible` toàn cục; không có token `lacquer` (0 chỗ dùng) | **`--color-focus`** |
| Font mono (niên đại) | §4.3, §4.7: JetBrains Mono, Playfair Display; nhưng §3.1: "không thêm họ font thứ ba" | `globals.css` chỉ có `--font-sans`, `--font-serif`, `--font-moderator`; JetBrains/Playfair 0 chỗ dùng | Tailwind `font-mono` mặc định, **không thêm font** |
| Token khu moderator | Chỉ nói "Manrope cho moderator" | `--color-mod-*` + `font-moderator` trong `globals.css`, không có trong COLOR-FONT hay guidelines | **`mod-*`** (nguồn là `globals.css`) |
| Màu trạng thái (Emerald, Amber, Rose, Cobalt) | §2.2 | Chưa có token trong `globals.css` | Dùng đúng hex §2.2; kiểm tương phản 4.5:1 trên nền `mod-surface` trước khi chốt; nếu cần thì thêm token vào `globals.css` (phase 2), không viết hex rời trong component |
| Token `lacquer-*`, `gold-*` (§4.2 đến §4.5) | Có | Không tồn tại | **Bỏ qua**: phần đó là mẫu cho trang công khai, không áp dụng cho khu moderator |

## Quyết định đã chốt với người dùng

1. Phạm vi: chỉ workflow tạo kịch bản. Không làm trang đăng nhập (team FE làm).
2. Cần credential: seed 1 tài khoản moderator vào DB + **nút "Đăng nhập Mod" ở trang moderator, credential cứng**. Người dùng chủ động chấp nhận hardcode vì chỉ dùng dev (ngoại lệ so với `~/.claude/CLAUDE.md` mục 2). Giảm rủi ro: nút chỉ hiện khi `import.meta.env.DEV`, hằng số đặt tên ở một chỗ.
3. Realtime dùng **SSE** (`EventSource`, `withCredentials: true`), fallback polling theo UX §3.2.
4. Nguồn: agent tự tìm; Moderator **thêm, sửa, xoá** nguồn sau bước research (Gate 0) bằng `DIRECT_EDIT` rồi `CONTINUE`. Không có màn sửa `EvaluatedSource` (bước tự động, `DIRECT_EDIT` ở đó trả 409).


## Phases

| # | File | Nội dung | Ước lượng | Trạng thái |
|---|---|---|---|---|
| 1 | [phase-01-dev-credential-and-auth-client.md](phase-01-dev-credential-and-auth-client.md) | Seed acc mod, nút đăng nhập dev, client gửi cookie | 3h | done 2026-10-09 |
| 2 | [phase-02-foundation-hooks-shell-routes.md](phase-02-foundation-hooks-shell-routes.md) | Helper lỗi/idempotency, hooks, SSE, `ModeratorShell`, route, guard | 6h | done 2026-10-09 |
| 3 | [phase-03-list-and-create.md](phase-03-list-and-create.md) | S1 danh sách, S2 tạo | 4h | done 2026-10-09 |
| 4 | [phase-04-workspace-readonly-steps.md](phase-04-workspace-readonly-steps.md) | S3 khung, stepper, version switcher, panel chỉ đọc | 7h | done 2026-10-09 |
| 5 | [phase-05-gate0-sources-and-focus.md](phase-05-gate0-sources-and-focus.md) | Gate 0: sửa nguồn + chọn trọng tâm | 5h | done 2026-10-09 |
| 6 | [phase-06-gate1-rerun-direct-edit.md](phase-06-gate1-rerun-direct-edit.md) | Gate 1, hộp thoại Làm lại, trình Sửa tay | 4h | done 2026-10-09 |
| 7 | [phase-07-gate2-and-publication.md](phase-07-gate2-and-publication.md) | Gate 2 báo cáo kiểm định, S4 xuất bản | 4h | done 2026-10-09 |
| 8 | [phase-08-tree-and-event-log.md](phase-08-tree-and-event-log.md) | S5 cây lịch sử, tab Nhật ký | 1h+ | done 2026-10-09 |
| 9 | [phase-09-cms-import.md](phase-09-cms-import.md) | Nút "Nhập vào Studio": điền sẵn Series + 3 tập nháp từ kịch bản đã duyệt | 4h | done 2026-10-09 |

Thứ tự bắt buộc: 1 → 2 → (3, 4) → 5 → 6 → 7 → 9. Phase 8 (cây, nhật ký) độc lập sau phase 7, làm sau cùng. Phase 3 và 4 chỉ cùng phụ thuộc phase 2.

## Rủi ro chính

| Rủi ro | Xử lý |
|---|---|
| `EventSource` khác origin (`5173` ↔ `3005`) cần `withCredentials` và CORS `credentials: true` | API đã bật (`cors.ts`). Phase 2 kiểm bằng request thật trước khi dựng UI |
| Better Auth chặn đăng nhập từ `5173` (`403 INVALID_ORIGIN`): `trustedOrigins` mặc định chỉ có `baseURL` (`3005`) | Phase 1 thêm `trustedOrigins` vào `auth.ts`, dùng chung danh sách `CORS_ORIGIN` với `cors.ts` |
| `baseVersion` lệch gây `409 STALE_WRITE` | Luôn lấy từ `currentVersion` của lần fetch mới nhất; zustand giữ nháp để không mất dữ liệu khi 409 |
| `DIRECT_EDIT` phải khớp đúng schema bước (`400 VALIDATION_ERROR`) | Validate phía client bằng `STEP_OUTPUT_SCHEMAS[stepType]` (`@repo/shared`) trước khi gửi; server chỉ trả `message` |
| `GET /health` trả `503` khi DB/hàng đợi lỗi | Đọc body ở cả `200` và `503` (không đi qua `unwrap`), lấy trường `ai` ở gốc |
| Type response từ `hc<AppType>` có thể rộng | Parse bằng schema `@repo/shared` (`GetWorkflowResponseSchema`...) thay vì cast |
| Kịch bản AI chạy lâu (vài chục giây đến vài phút) | Trạng thái chờ rõ ràng, đồng hồ đếm, nhắc khi >5 phút (UX §3.2) |

## Success criteria

- Đăng nhập Mod bằng một nút, cookie session hoạt động qua `5173 → 3005`.
- Tạo kịch bản từ chủ đề, theo dõi realtime tới Gate 0, sửa nguồn, chọn trọng tâm, duyệt, tới Gate 1, Gate 2 và xuất bản; copy kịch bản từng tập.
- Mọi lỗi (`400/401/403/404/409/429/503/FAILED`) hiển thị đúng theo UX §6, không mất dữ liệu nhập.
- `bun run check-types` sạch ở `apps/web`; thử thật trên trình duyệt (không chỉ typecheck).
- Đạt checklist UI/UX: WCAG AA, 44px, focus ring, reduced-motion, microcopy tiếng Việt.
