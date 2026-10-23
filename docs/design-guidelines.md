# Hướng Dẫn Thiết Kế Hệ Thống Giao Diện "Sử Ký" (Su-Ky Design Guidelines)

> **Tài liệu đặc tả chuẩn thiết kế UI/UX cho Nền tảng Sử Ký & Dòng thời gian Lịch sử Việt Nam**
> **Phiên bản:** 1.1.0
> **Cập nhật:** 2026-10-09 (đồng bộ với `apps/web`)
> **Công nghệ áp dụng:** React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Magic UI (web), Expo + React Native + Tamagui (mobile), Hono RPC, PostgreSQL (Prisma), Bun

## Nguồn sự thật cho giao diện web

Khi tài liệu này lệch với `apps/web`, **web thắng**. Thứ tự ưu tiên:

1. `apps/web/docs/design/COLOR-FONT.md`, `apps/web/docs/skill/*`, `apps/web/AGENTS.md`.
2. Code `apps/web/src`, nhất là `apps/web/src/styles/globals.css` (token thật).
3. Tài liệu này: triết lý, hành vi, a11y, trạng thái giao diện.

Mọi token và font dưới đây lấy từ `globals.css`. Không có token `lacquer-*` hay `gold-*`.

---

## 1. Triết Lý Thiết Kế: "Khắc Họa Lịch Sử Bằng Trải Nghiệm Số"

Nền tảng **Sử Ký** không đơn thuần là một website tra cứu thông tin; đây là một **Viện Lưu Trữ Số & Đài Tưởng Niệm Kỹ Thuật Số (Digital Chronicle & Monumental Archive)** tái hiện hơn 4.000 năm dựng nước và giữ nước của dân tộc Việt Nam.

Thiết kế giao diện của Sử Ký tuân thủ 5 nguyên tắc cốt lõi:

1. **Khí chất Sử Thi & Trọng Lượng Văn Hóa (Epic & Dignified Gravitas):**
   Kết hợp chất liệu truyền thống (giấy dó, mực, son ấn chỉ, đồng thau, nền night) với phong cách giao diện tối giản hiện đại. Tránh tuyệt đối cảm giác lòe loẹt, diêm dúa hoặc rập khuôn thương mại.

2. **Dòng Thời Gian Là Trục Nhận Thức Chính (Timeline as Cognitive Backbone):**
   Mọi thực thể (nhân vật, chiến dịch, di tích, thư tịch cổ, podcast lịch sử) được neo trên dòng thời gian từ thời Hồng Bàng đến Hiện đại.

3. **Tính Chuẩn Xác & Tôn Trọng Lịch Sử (Scholarly Precision & Respect):**
   Cách xưng hô, niên đại, tước hiệu, quốc hiệu và tài liệu lưu trữ phải được trình bày trang nghiêm, khúc chiết, có nguồn trích dẫn minh bạch.

4. **Đa Phương Thức Truyền Tải (Multimodal Engagement):**
   Kho thư tịch chữ viết cùng âm thanh khẩu thuật ("Tiếng Vọng Ngàn Xưa"), podcast phân tích trận đánh.

5. **Tối Ưu Hiệu Năng & Khả Năng Tiếp Cận (Modern Performance & Accessibility):**
   WCAG 2.1 AA (tương phản chữ tối thiểu 4.5:1), hiển thị đủ dấu thanh tiếng Việt, tương thích từ di động 375px đến màn hình 4K.

---

## 2. Hệ Thống Màu Sắc & Tokens

### 2.1. Bảng màu thương hiệu (khu vực người nghe)

Khai báo trong `@theme inline` của `globals.css`, dùng qua class Tailwind (`bg-paper`, `text-ink`, `border-line`…).

| Token | CSS Variable | Hex | Công năng |
| :--- | :--- | :--- | :--- |
| **Paper** | `--color-paper` | `#F4ECDC` | Nền chính vùng đọc. |
| **Paper Soft** | `--color-paper-soft` | `#FAF6ED` | Bề mặt card, nội dung đặt trên nền night. |
| **Paper Deep** | `--color-paper-deep` | `#E9DCC2` | Nền section xen kẽ, panel. |
| **Night** | `--color-night` | `#14110F` | Nền hero, header, ngôi kể nhân vật. |
| **Night Soft** | `--color-night-soft` | `#29221E` | Bề mặt phụ trên nền night. |
| **Ink** | `--color-ink` | `#1C1714` | Chữ chính trên nền giấy. |
| **Ink Soft** | `--color-ink-soft` | `#5B4E44` | Chữ phụ, mô tả, metadata. |
| **Vermilion** | `--color-vermilion` | `#B8322A` | CTA, lựa chọn đang hoạt động, điểm nhấn. |
| **Vermilion Dark** | `--color-vermilion-dark` | `#96271F` | Trạng thái hover/pressed của vermilion. |
| **Bronze** | `--color-bronze` | `#B58A3C` | Viền mảnh, divider, node, điểm nhấn. |
| **Bronze Dark** | `--color-bronze-dark` | `#7A5A26` | Viền và chữ đồng cần tương phản cao hơn. |
| **Line** | `--color-line` | `#D9CDB7` | Đường viền, phân cách trên nền giấy. |
| **Focus** | `--color-focus` | `#2866A1` | Viền focus-visible. |

Biến ngữ nghĩa shadcn (`--background`, `--foreground`, `--primary`, `--card`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius: 0.5rem`) ánh xạ về cùng bảng màu trên; component shadcn dùng các biến này.

### 2.2. Bảng màu khu vực Moderator

Khu vực `/moderator` dùng bảng màu riêng, nền sáng xanh trung tính, tách khỏi giao diện giấy/son. Khai báo ở `:root` (`--modCanvas`…) và `@theme inline` (`--color-mod-*`); dùng qua `bg-mod-surface`, `text-mod-text`…

| Token | Hex | Công năng |
| :--- | :--- | :--- |
| `mod-canvas` / `mod-canvas-accent` | `#F8FAFC` / `#EDF4F8` | Nền trang, nền nhấn. |
| `mod-surface` / `mod-surface-glass` | `#FFFFFF` / trắng 82% | Card, header kính mờ. |
| `mod-primary` / `mod-primary-hover` | `#0284C7` / `#0369A1` | Hành động chính. |
| `mod-text` / `mod-text-muted` / `mod-text-secondary` / `mod-text-low` | `#0F172A` / `#475569` / `#64748B` / `#94A3B8` | Cấp chữ. `mod-text-low` chỉ cho chữ phụ không mang thông tin. |
| `mod-border` | `#E2E8F0` | Viền. |
| `mod-success` / `mod-attention` | `#15803D` / `#C2410C` | Trạng thái tốt / cần chú ý. |
| `mod-chart-sky` / `-violet` / `-emerald` | `#0284C7` / `#7C3AED` / `#059669` | Màu biểu đồ. |

### 2.3. Trạng thái hệ thống (chưa có token)

Chưa có token riêng. Khi cần, dùng hex dưới đây và thêm token vào `globals.css` trước khi dùng nhiều chỗ. Kiểm tương phản 4.5:1 với nền thực tế (chữ trên nền sáng nên dùng sắc đậm hơn nếu không đạt).

| Trạng thái | Hex | Ý nghĩa |
| :--- | :--- | :--- |
| Thành công / sẵn sàng | `#10B981` (Emerald) | Dịch vụ hoạt động, đã lưu. |
| Cảnh báo / đang xử lý | `#F59E0B` (Amber) | Dữ liệu đang nạp, cần chú ý. |
| Nguy hiểm / lỗi | `#EF4444` (Rose) | Lỗi kết nối, hành động không hoàn tác. |
| Thông tin | `#3B82F6` (Cobalt) | Chú thích học thuật, hướng dẫn. |

### 2.4. Hệ thống styling theo nền tảng

- **Web:** Tailwind CSS v4 qua Vite, **một** global stylesheet `apps/web/src/styles/globals.css`, token CSS-first, component shadcn/ui lưu trong source (`components/ui`), component Magic UI chọn từ registry.
- **Mobile:** Tamagui, Expo, Metro. Không đưa Tailwind, DOM component hay shadcn/ui vào native.
- Breakpoint web dùng CSS/Tailwind; mobile theo cấu hình Tamagui.

---

## 3. Hệ Thống Kiểu Chữ

### 3.1. Phân lớp phông chữ (`globals.css`)

| Token | Stack | Phạm vi |
| :--- | :--- | :--- |
| `--font-sans` | Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif | Toàn site (đã gồm glyph tiếng Việt), mặc định của `:root`. |
| `--font-serif` | Georgia, "Times New Roman", serif | Tiêu đề biên tập (fallback hệ thống, không tải font). |
| `--font-moderator` | Manrope, ui-sans-serif, system-ui, sans-serif | Chỉ khu moderator, tải cùng màn moderator (lazy). |

Không dùng font thứ ba. Số liệu, niên đại, mã dùng `font-mono` mặc định của Tailwind (không thêm font).

### 3.2. Thang đo kiểu chữ

| Phân cấp | Cỡ chữ / Line Height | Phông & độ đậm | Ví dụ |
| :--- | :--- | :--- | :--- |
| Hero Title (Display) | `clamp(2.5rem, 5vw, 4rem)` / 1.15 | Be Vietnam Pro 700 + serif | Tiêu đề series nổi bật |
| Era Heading (H1) | `2.25rem (36px)` / 1.25 | Be Vietnam Pro 700 + serif | Tên triều đại, sự kiện |
| Section Title (H2) | `1.75rem (28px)` / 1.3 | Be Vietnam Pro 700 + serif | Tiêu đề vùng nội dung |
| Card Header (H3) | `1.25rem (20px)` / 1.4 | Be Vietnam Pro 700 | Tiêu đề thẻ |
| Body Reading | `1.0625rem (17px)` / 1.65 | Be Vietnam Pro 400 | Trích đoạn, mô tả dài |
| Body UI | `0.9375rem (15px)` / 1.55 | Be Vietnam Pro 400 | Mô tả, danh sách |
| Moderator UI | `0.875rem (14px)` / 1.5 | Manrope 400–800 | Bảng điều khiển moderator |
| Caption / Badge | `0.75rem (12px)` / 1.4 | Be Vietnam Pro 600 | Nhãn, metadata |

---

## 4. Đặc Tả Thành Phần Giao Diện

Màu và viền trong mục này dùng token ở §2 (ví dụ nền `bg-night`, viền `border-line`/`border-bronze`, nhấn `vermilion`). Không dùng token ngoài `globals.css`.

### 4.1. Huy hiệu trạng thái hạ tầng
- **Vị trí:** góc trên header, cạnh thanh tìm kiếm toàn cục.
- **Nội dung:** pill trạng thái máy chủ, kết nối RPC và cơ sở dữ liệu; lấy từ `GET /health` (trường `ai`, `db`, `queue`…), không ghi cứng phiên bản.
- **Quy tắc:** chấm trạng thái màu Emerald khi tốt, Amber khi suy giảm, Rose khi lỗi (§2.3); hiệu ứng thở (`animate-pulse`) tắt khi `prefers-reduced-motion`. Có nút "Kiểm tra kết nối".

### 4.2. Thanh chọn thời kỳ lịch sử (Era chip rail)
- **Vị trí:** dưới thanh tìm kiếm, cố định khi cuộn. Cuộn ngang, ẩn thanh cuộn, có nút 2 đầu.
- **Danh sách thời kỳ:** Tất cả thời kỳ; Hồng Bàng & An Dương Vương (2879–179 TCN); Bắc thuộc & Khởi nghĩa (179 TCN–938); Ngô - Đinh - Tiền Lê (938–1009); Thời Lý (1009–1225); Thời Trần (1225–1400); Lê Sơ & Hậu Lê (1428–1789); Thời Tây Sơn (1778–1802); Thời Nguyễn (1802–1945); Cận - Hiện đại (1945–nay).
- **Trạng thái:** mặc định nền `paper-deep`, viền `line`, chữ `ink-soft`; hover viền `bronze`; active nền `vermilion`, chữ `paper-soft`.

### 4.3. Nút điểm dòng thời gian
- Cột mốc căn trái (so le trên máy tính); vạch nối dọc màu `bronze`.
- Điểm chốt là vòng tròn lồng nhau, màu theo loại: *Vermilion* (kháng chiến, chiến công), *Bronze* (kiến quốc, định đô, đăng quang), màu thứ ba cho văn hoá/khoa cử phải thêm token trước khi dùng (§2.3).
- Niên đại hiển thị bằng `font-mono` trong khung viền `bronze`.

### 4.4. Thẻ nhân vật lịch sử
- Viền mảnh `border-line`, hover `border-bronze`, chuyển tiếp 250ms (tắt khi reduced-motion).
- Khung ảnh chân dung bo góc `--radius-lg`; huy hiệu ấn triện góc phải trên; tên nhân vật dùng serif kèm tước vị; nút "Xem chi tiết" mở Drawer/Modal giữ nguyên vị trí cuộn.

### 4.5. Khung xem chi tiết nhân vật & sự kiện (Modal/Drawer)
- `Esc` hoặc bấm lớp phủ để đóng; khoá cuộn nền khi mở; nút "Đóng" nổi bật.
- Bố cục 2 cột: trái là niên biểu, hình minh hoạ, mốc thời gian; phải là tiểu sử, trích dẫn (blockquote viền `vermilion`), tài liệu tham khảo.
- Dùng `sheet` (Radix) trong `components/ui`.

### 4.6. Tìm kiếm & bộ lọc
- Tìm kiếm tức thì theo tên nhân vật, trận đánh, niên đại, địa danh cổ.
- Lọc theo nhóm (pill tabs): Tất cả, Nhân vật lịch sử, Chiến công & Sự kiện, Di tích & Thư tịch.
- Chuyển góc nhìn: Dòng thời gian / Lưới tra cứu.

### 4.7. Thẻ chỉ số đo lường
- Bộ 4 số liệu tổng quan trình bày bằng `font-mono` (tabular), viền `bronze`. Số liệu lấy từ dữ liệu thật, không ghi cứng trong giao diện.

### 4.8. Mô-đun âm thanh & podcast ("Tiếng Vọng Ngàn Xưa")
- Mini audio player ở góc màn hình hoặc trong thẻ sự kiện; nút Play/Pause viền `bronze`; thanh sóng âm (tắt chuyển động khi reduced-motion).
- Thông tin tập: tên tập, thời lượng (`14:20`), bản ghi chép (Transcript).

### 4.9. Trạng thái giao diện
- **Loading:** skeleton gradient xung nhịp nhẹ, màu `paper-deep` (khu moderator dùng `mod-border`); tắt xung nhịp khi reduced-motion.
- **Empty:** thông báo trang trọng kèm hành động rõ ("Xoá bộ lọc"), không để ngõ cụt.
- **Error:** thông báo lỗi kèm nút "Thử lại"; lỗi API hiện `message` từ body `{ error_code, message }` và mã yêu cầu (`X-Request-Id`).

---

## 5. Biểu Tượng & Tài Sản Đồ Hoạ

1. **Không dùng Emoji làm biểu tượng UI.** Dùng **Phosphor Icons** (`@phosphor-icons/react`) làm bộ chuẩn của web (toàn bộ `features/` và `app/` đang dùng). Ngoại lệ duy nhất: `components/ui/sheet.tsx` do shadcn sinh ra dùng `XIcon` của `lucide-react`; không thêm import `lucide-react` mới, khi sửa file shadcn thì đổi sang Phosphor.
   - Cỡ: 16px (nhãn, chip), 20px (nút, menu), 24px (tiêu đề phân mục).
   - Icon-only button phải có `aria-label`.
2. **Hoạ tiết lịch sử Việt Nam:** mây thời Lý, sen thời Trần, cúc thời Lê, vân mây cuộn sóng thời Nguyễn; SVG vector mờ (`opacity: 0.04 – 0.08`) làm nền chìm cho thẻ và tiêu đề chương.

---

## 6. Tiêu Chuẩn Tiếp Cận & Thao Tác

- **Vùng bấm:** nút và icon button trên thiết bị cảm ứng tối thiểu `44px x 44px`.
- **Focus ring:** `:focus-visible` toàn cục là `outline: 3px solid #2866a1; outline-offset: 3px` (token `--color-focus`). Không tự đặt vòng focus khác màu.
- **Chuyển động:** có `@media (prefers-reduced-motion: reduce)` trong `globals.css`; mọi animation mới phải tắt hoặc giảm theo truy vấn này.
- **Tương phản:** chữ thông tin đạt tối thiểu `4.5:1` (WCAG AA); `mod-text-low` và màu trạng thái chỉ dùng chữ khi đã kiểm.
- **Bàn phím:** mọi thao tác dùng được bằng phím; modal bẫy focus và trả focus về phần tử mở.

---

## 7. Wireframe

Bản wireframe tương tác độc lập: `docs/wireframe/index.html` (chuyển Timeline/Lưới, lọc thời kỳ, tìm kiếm, modal nhân vật, kiểm tra kết nối, trình phát âm thanh). Wireframe chỉ minh hoạ bố cục; màu và font theo §2 và §3, không theo wireframe nếu khác.
