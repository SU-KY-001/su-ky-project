# Hướng Dẫn Thiết Kế Hệ Thống Giao Diện "Sử Ký" (Su-Ky Design Guidelines)

> **Tài liệu đặc tả chuẩn thiết kế UI/UX cho Nền tảng Sử Ký & Dòng thời gian Lịch sử Việt Nam**  
> **Phiên bản:** 1.0.0  
> **Ngày phê duyệt:** 2026-09-11  
> **Trạng thái:** Chuẩn sản phẩm (Production Standard)  
> **Công nghệ áp dụng:** React 19, Tailwind CSS v4, Hono RPC, PostgreSQL 17, Bun v1.4.0

---

## 1. Triết Lý Thiết Kế: "Khắc Họa Lịch Sử Bằng Trải Nghiệm Số"

Nền tảng **Sử Ký** không đơn thuần là một website tra cứu thông tin; đây là một **Viện Lưu Trữ Số & Đài Tưởng Niệm Kỹ Thuật Số (Digital Chronicle & Monumental Archive)** tái hiện hơn 4.000 năm dựng nước và giữ nước của dân tộc Việt Nam.

Thiết kế giao diện của Sử Ký tuân thủ 5 nguyên tắc cốt lõi:

1. **Khí chất Sử Thi & Trọng Lượng Văn Hóa (Epic & Dignified Gravitas):**
   Kết hợp hài hòa giữa chất liệu nghệ thuật truyền thống (sơn mài đen tuyền, thếp vàng hoàng tộc, sắc đỏ ấn chỉ son, ngọc bích cung đình và giấy dó cổ truyền) với phong cách giao diện tối giản hiện đại (Editorial Dark UI). Tránh tuyệt đối cảm giác lòe loẹt, diêm dúa hoặc rập khuôn thương mại.

2. **Dòng Thời Gian Là Trục Nhận Thức Chính (Timeline as Cognitive Backbone):**
   Mọi thực thể (nhân vật, chiến dịch, di tích, thư tịch cổ, podcast lịch sử) đều được neo giữ trên dòng thời gian từ thời Hồng Bàng đến Hiện đại. Trực quan hóa giúp người dùng cảm nhận được tính liên tục và sự chuyển giao giữa các triều đại.

3. **Tính Chuẩn Xác & Tôn Trọng Lịch Sử (Scholarly Precision & Respect):**
   Cách xưng hô, niên đại, tước hiệu, quốc hiệu và tài liệu lưu trữ phải được trình bày trang nghiêm, khúc chiết, có nguồn trích dẫn lịch sử minh bạch (Đại Việt Sử ký Toàn thư, Khâm định Việt sử Thông giám Cương mục,...).

4. **Đa Phương Thức Truyền Tải (Multimodal Engagement):**
   Tích hợp kho thư tịch chữ viết cùng âm thanh khẩu thuật ("Tiếng Vọng Ngàn Xưa"), podcast phân tích trận đánh, âm bản giọng đọc hào hùng mang đến trải nghiệm sống động chân thực.

5. **Tối Ưu Hiệu Năng & Khả Năng Tiếp Cận (Modern Performance & Accessibility):**
   Giao diện hỗ trợ chuẩn WCAG 2.1 AA (độ tương phản màu chữ tối thiểu 4.5:1), tối ưu hóa hiển thị toàn bộ hệ thống dấu thanh tiếng Việt (ă, â, đ, ê, ô, ơ, ư, dấu hỏi/ngã/nặng), tương thích mượt mà từ thiết bị di động 375px đến màn hình máy trạm 4K.

---

## 2. Hệ Thống Màu Sắc & Tokens (Color Tokens System)

Bảng màu Sử Ký lấy cảm hứng từ nghệ thuật cung đình Thăng Long - Huế kết hợp với nền giao diện Dark Mode cao cấp (OLED Obsidian Palette), tạo chiều sâu huyền bí và cảm giác tôn nghiêm.

### 2.1. Bảng Màu Cốt Lõi (Core Palette)

| Token Name | CSS Variable | Hex Code | Ý nghĩa văn hóa & Công năng giao diện |
| :--- | :--- | :--- | :--- |
| **Lacquer Obsidian 950** | `--color-bg-base` | `#0B0D13` | Nền chính sâu thẳm như phiến sơn mài cổ, giảm phát xạ sáng màn hình OLED. |
| **Lacquer Obsidian 900** | `--color-bg-surface` | `#11141E` | Nền các khối container, header, sidebar và thanh điều hướng chính. |
| **Lacquer Slate 800** | `--color-bg-card` | `#181C2B` | Bề mặt card nhân vật, card sự kiện, modal, popover nổi. |
| **Lacquer Slate 700** | `--color-bg-elevated` | `#22283C` | Bề mặt khi tương tác hover, dropdown menu, active state. |
| **Border Muted** | `--color-border-subtle`| `#252B40` | Đường viền ngăn cách phân khu nhẹ nhàng, không gây phân tâm. |
| **Border Accent Gold** | `--color-border-gold` | `#78531D` | Đường viền nhấn quý phái cho các khối triều đại, huân huy chương. |
| **Imperial Gold 500** | `--color-gold-primary` | `#F59E0B` | Sắc vàng hoàng gia rực rỡ, sử dụng cho điểm sáng chính, mốc lịch sử tối thượng. |
| **Imperial Amber 600** | `--color-gold-deep` | `#D97706` | Sắc vàng thau cung đình thâm trầm cho nút hành động chính (Primary CTA). |
| **Vermilion Crimson 600**| `--color-vermilion` | `#DC2626` | Sắc son triện đỏ (Ấn tín ngọc tỷ), dùng cho sự kiện chiến tranh, chiến công oanh liệt. |
| **Imperial Jade 500** | `--color-jade` | `#059669` | Màu ngọc bích, tượng trưng cho thái bình thịnh trị, di sản, văn hóa tư liệu và trạng thái trực tuyến. |
| **Parchment White** | `--color-text-primary` | `#FAF5EE` | Màu giấy dó ngà cao cấp, đảm bảo đọc lâu không mỏi mắt (Contrast 14.8:1). |
| **Silk Mist 400** | `--color-text-secondary`| `#CBD5E1` | Màu lụa tro nhạt cho văn bản mô tả phụ, trích dẫn ngắn. |
| **Ink Stone 500** | `--color-text-muted` | `#94A3B8` | Màu mực mờ cho niên đại, nguồn tư liệu, metadata kỹ thuật. |

### 2.2. Trạng Thái Hệ Thống (System Status Indicators)

| Trạng thái | Hex Token | Ý nghĩa áp dụng |
| :--- | :--- | :--- |
| **Online / Sync Active** | `#10B981` (Emerald) | Bun 1.4 Engine hoạt động, Postgres DB Connection sẵn sàng, Hono RPC OK |
| **Warning / Transition** | `#F59E0B` (Amber) | Triều đại đang trong giai đoạn biến động / dữ liệu đang nạp |
| **Danger / Conflict** | `#EF4444` (Rose) | Trận đánh đẫm máu / Lỗi kết nối máy chủ |
| **Informational** | `#3B82F6` (Cobalt) | Văn bản thông tư, chiếu chỉ, chú thích học thuật |

### 2.3. Tích Hợp Tailwind CSS v4 (`@theme`)

```css
@theme {
  --color-lacquer-950: #0B0D13;
  --color-lacquer-900: #11141E;
  --color-lacquer-800: #181C2B;
  --color-lacquer-700: #22283C;
  --color-lacquer-border: #252B40;
  
  --color-gold-400: #FBBF24;
  --color-gold-500: #F59E0B;
  --color-gold-600: #D97706;
  --color-gold-700: #B45309;

  --color-vermilion-500: #EF4444;
  --color-vermilion-600: #DC2626;
  --color-vermilion-700: #B91C1C;

  --color-jade-500: #10B981;
  --color-jade-600: #059669;

  --color-parchment-50: #FAF5EE;
  --color-parchment-100: #F3EBDD;
  --color-parchment-200: #E5D7C2;

  --font-serif-title: "Playfair Display", "Cinzel", Georgia, serif;
  --font-sans-ui: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --font-mono-chrono: "JetBrains Mono", Menlo, Consolas, monospace;

  --ease-editorial: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-normal: 250ms;
}
```

---

## 3. Hệ Thống Kiểu Chữ & Phông Chữ (Typography Scale)

### 3.1. Phân Lớp Phông Chữ (Font Stack Architecture)

1. **Phông Tiêu Đề Sử Thi (Historical & Editorial Display):**
   - **`Playfair Display`** (weights: 600, 700, 900)
   - Kết hợp nét thanh đậm tương phản cổ điển, thể hiện khí phách hùng tráng của tên triều đại, danh xưng hoàng đế, tên sự kiện lịch sử trọng đại.
   - Hỗ trợ trọn vẹn toàn bộ hệ thống ký tự tiếng Việt Unicode.

2. **Phông Giao Diện & Nội Dung Chính (Interface & Reading Sans):**
   - **`Plus Jakarta Sans`** (weights: 400, 500, 600, 700)
   - Thiết kế hình học hiện đại, độ cao chữ x-height thoáng đãng, hỗ trợ đọc văn bản dài, tiểu sử nhân vật với độ rõ nét cao trên màn hình retina.

3. **Phông Niên Biểu & Siêu Dữ Liệu Kỹ Thuật (Chronology & Technical Monospace):**
   - **`JetBrains Mono`** (weights: 500, 600)
   - Sử dụng cho niên đại (`938 SCN`, `1009 - 1225`), số liệu thống kê, mã văn tự, thời lượng audio podcast, thời gian thực thi Hono RPC và Bun runtime telemetry.

### 3.2. Bảng Thang Đo Kiểu Chữ (Type Scale)

| Phân Cấp (Level) | Cỡ chữ / Line Height | Phông Chữ & Độ đậm | Ví dụ Ứng Dụng |
| :--- | :--- | :--- | :--- |
| **Hero Title (Display 1)** | `clamp(2.5rem, 5vw, 4rem)` / 1.15 | Playfair Display 900 | "SỬ KÝ TOÀN THƯ", "ĐẠI VIỆT SỬ KÝ" |
| **Era Heading (H1)** | `2.25rem (36px)` / 1.25 | Playfair Display 700 | Tên Triều đại: "Nhà Lý (1009 - 1225)" |
| **Section Title (H2)** | `1.75rem (28px)` / 1.3 | Playfair Display 600 | "Chiến dịch Bạch Đằng", "Danh Tướng & Hiền Thần" |
| **Card Header (H3)** | `1.25rem (20px)` / 1.4 | Plus Jakarta Sans 700 | "Trần Hưng Đạo - Tiết chế Quốc công" |
| **Body Reading (Lớn)** | `1.0625rem (17px)` / 1.65 | Plus Jakarta Sans 400 | Trích đoạn chiếu chỉ, đoạn mở đầu biên niên sử |
| **Body UI (Tiêu chuẩn)** | `0.9375rem (15px)` / 1.55 | Plus Jakarta Sans 400 | Văn bản mô tả trên thẻ, nội dung danh sách |
| **Caption / Badge** | `0.75rem (12px)` / 1.4 | Plus Jakarta Sans 600 (Caps)| Thẻ phân loại: `CHIẾN DỊCH QUÂN SỰ`, `DI TÍCH` |
| **Chronological Mono** | `0.8125rem (13px)` / 1.4 | JetBrains Mono 500 | `NĂM 1288 SCN`, `LATENCY: 0.8ms`, `v1.4.0` |

---

## 4. Đặc Tả Thành Phần Giao Diện (UI Component Anatomy)

### 4.1. Huy Hiệu Trạng Thái Hạ Tầng (System Status Indicators)
- **Vị trí:** Góc trên Header bên cạnh thanh tìm kiếm toàn cục.
- **Cấu trúc:** Gồm 3 pill nhỏ gọn:
  1. `Bun v1.4.0`: Icon tia chớp vàng + nhịp tim xanh lục báo trạng thái máy chủ.
  2. `Hono RPC`: Báo kết nối RPC type-safe giữa frontend và API backend.
  3. `Postgres 17`: Báo trạng thái hồ bơi kết nối cơ sở dữ liệu (Drizzle ORM).
- **Quy tắc vi mô:** Chấm trạng thái có hiệu ứng thở (`animate-pulse`) màu xanh ngọc lục bảo (`#10B981`) khẳng định dữ liệu live. Có nút "Kiểm tra kết nối" (Refresh Status) tương tác trực tiếp.

### 4.2. Thanh Chọn Thời Kỳ Lịch Sử (Era Navigation Chip Rail)
- **Vị trí:** Ngay dưới thanh công cụ tìm kiếm, cố định khi cuộn.
- **Tương tác:** Cho phép cuộn ngang (Horizontal scroll) mượt mà với thanh cuộn ẩn, có nút di chuyển 2 đầu.
- **Danh sách thời kỳ chuẩn:**
  * `Tất cả thời kỳ` (Toàn cảnh 4000 năm)
  * `Hồng Bàng & An Dương Vương` (2879 - 179 TCN)
  * `Bắc thuộc & Khởi nghĩa` (179 TCN - 938)
  * `Ngô - Đinh - Tiền Lê` (938 - 1009)
  * `Thời Lý` (1009 - 1225)
  * `Thời Trần` (1225 - 1400)
  * `Lê Sơ & Hậu Lê` (1428 - 1789)
  * `Thời Tây Sơn` (1778 - 1802)
  * `Thời Nguyễn` (1802 - 1945)
  * `Cận - Hiện đại` (1945 - Nay)
- **Trạng thái:**
  * *Mặc định:* Nền mờ `bg-lacquer-800/80`, viền `border-lacquer-border`, chữ xám lụa.
  * *Hover:* Nền sáng nhẹ, viền vàng thau `border-gold-600/40`.
  * *Active:* Nền `bg-gradient-to-r from-gold-600 to-amber-700`, chữ vàng nhạt hoặc trắng ngà, viền sáng lấp lánh `ring-1 ring-gold-400`.

### 4.3. Nút Điểm Dòng Thời Gian (Timeline Milestone Nodes)
- **Cấu trúc:**
  * Cột mốc thời gian căn trái (hoặc so le trên máy tính).
  * Vạch kết nối dòng thời gian (`vertical stem`) làm bằng dải gradient từ vàng cung đình sang mực đen.
  * Điểm chốt (Pin Node): Vòng tròn lồng nhau, trung tâm phát sáng với màu phân loại:
    - *Đỏ son (Vermilion):* Kháng chiến chống ngoại xâm & Chiến công oanh liệt.
    - *Vàng hoàng kim (Imperial Gold):* Sự kiện kiến quốc, định đô, đăng quang hoàng đế.
    - *Xanh ngọc bích (Jade):* Văn hóa, giáo dục, khoa cử, biên soạn sử thư.
  * Niên đại hiển thị bằng phông Mono nổi bật trong khung viền kim loại cổ.

### 4.4. Thẻ Nhân Vật Lịch Sử (Figure Chronicle Card)
- **Cấu trúc thị giác:**
  * Viền mỏng `border border-lacquer-border hover:border-gold-500/50` với hiệu ứng chuyển tiếp 250ms.
  * Khung ảnh chân dung / họa đồ được xử lý bộ lọc tương phản nhẹ, bo góc tỉ lệ tiêu chuẩn vàng.
  * Huy hiệu ấn triện (Dynasty Seal) đóng dấu nổi ở góc phải trên.
  * Tên nhân vật nổi bật bằng phông có chân kết hợp tước vị lịch sử.
  * Danh mục thành tựu tóm tắt với thanh đo lường thời kỳ trị vì.
  * Nút "Xem Chi Tiết" (Quick Chronicle Preview) mở Drawer/Modal mà không làm mất vị trí cuộn.

### 4.5. Khung Xem Chi Tiết Nhân Vật & Sự Kiện (Chronicle Detail Modal / Drawer)
- **Khả năng tương tác:**
  * Phím tắt `ESC` hoặc click lớp phủ mờ (Backdrop Blur `bg-black/75 backdrop-blur-md`) đóng cửa sổ.
  * Khóa cuộn trang nền (`overflow: hidden`) khi mở modal.
  * Bố cục 2 cột:
    - *Cột trái:* Niên biểu cuộc đời, hình ảnh minh họa, các mốc thời gian lớn, quốc hiệu thời kỳ.
    - *Cột phải:* Tiểu sử toàn thư, trích dẫn danh ngôn lịch sử (blockquote son đỏ), các chiến công oanh liệt, tài liệu gốc tham khảo (Đại Việt Sử ký Toàn thư, Khâm định Việt sử).
  * Nút "Đóng" nổi bật có gắn phím tắt tiện dụng.

### 4.6. Thanh Tìm Kiếm & Đa Bộ Lọc (Multi-criteria Search & Filter Bar)
- **Chức năng:**
  * Ô tìm kiếm tức thì (Live text search): Hỗ trợ tìm kiếm theo tên nhân vật, tên trận đánh, niên đại, địa danh cổ.
  * Bộ lọc danh mục (Pill filter tabs): `Tất cả`, `Nhân vật lịch sử`, `Chiến công & Sự kiện`, `Di tích & Thư tịch`.
  * Bộ chuyển đổi góc nhìn (View Switcher): `Dòng thời gian (Timeline)` và `Lưới tra cứu (Chronicle Grid)`.

### 4.7. Thẻ Chỉ Số Đo Lường Lịch Sử (Chronicle Metric Counters)
- **Bộ 4 chỉ số thống kê tổng quan:**
  1. `4,120+` Sự kiện Lịch sử đã biên niên
  2. `1,840+` Danh nhân & Vị vua ghi nhận
  3. `18` Triều đại & Thời kỳ lớn
  4. `650+` Văn bia, Mộc bản & Thư tịch số hóa
- **Trình bày:** Sử dụng phông JetBrains Mono và Playfair Display với viền kim loại trầm và ánh sáng vàng mờ.

### 4.8. Mô-đun Âm Thanh & Podcast Di Sản ("Tiếng Vọng Ngàn Xưa")
- **Đặc tả trải nghiệm nghe (Audio Player Experience):**
  * Tích hợp thanh phát âm thanh thu nhỏ ở góc màn hình hoặc trong thẻ sự kiện (Mini Audio Player).
  * Nút Play/Pause có viền vàng hoàng gia và thanh sóng âm thanh chuyển động (Animated Audio Waveform).
  * Thông tin tập podcast: Tên tập sử ký, thời lượng nghe (`14:20`), giọng đọc truyền cảm hào sảng, tùy chọn tải bản ghi chép (Transcript).

### 4.9. Trạng Thái Giao Diện (UI States)
- **Loading Skeleton:** Khung giả lập với gradient xung nhịp nhẹ (`animate-pulse bg-lacquer-800/60`).
- **Empty State:** Khi bộ lọc không có kết quả, hiển thị thông báo trang trọng kèm nút "Xóa bộ lọc" để người dùng không gặp ngõ cụt UX.
- **Error Boundary:** Hiển thị thông báo mất kết nối Hono RPC cùng nút "Thử lại ngay".

---

## 5. Danh Mục Biểu Tượng & Tài Sản Đồ Họa (Iconography & Imagery)

1. **Tuyệt đối không dùng Emoji làm biểu tượng UI:**
   - Sử dụng SVG chuẩn theo phong cách `Lucide Icons` (stroke-width: 1.75px, viewBox: 24x24).
   - Biểu tượng đồng bộ kích thước: `w-4 h-4` (nhãn nhỏ/chip), `w-5 h-5` (nút bấm và menu), `w-6 h-6` (tiêu đề phân mục).

2. **Họa Tiết & Hoa Văn Lịch Sử Việt Nam (Vietnamese Historical Motifs):**
   - Hoa văn mây thời Lý, hoa sen thời Trần, hoa cúc thời Lê, vân mây cuộn sóng thời Nguyễn.
   - Các họa tiết được số hóa dưới dạng SVG vector mờ nhẹ (`opacity: 0.04 - 0.08`) làm nền chìm tinh tế cho các thẻ bài và tiêu đề chương.

---

## 6. Tiêu Chuẩn Tiếp Cận & Thao Tác (Accessibility & Interaction Rules)

- **Vùng bấm tương tác (Touch Target):** Mọi nút bấm, icon button trên thiết bị cảm ứng đều đạt kích thước tối thiểu `44px x 44px`.
- **Trạng thái lấy nét (Focus Ring):** Khi sử dụng phím Tab, toàn bộ phần tử tương tác hiển thị vòng viền rõ ràng: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-lacquer-950`.
- **Hiệu ứng chuyển động (Motion Sensitivity):** Luôn tích hợp truy vấn `@media (prefers-reduced-motion: reduce)` để tự động triệt tiêu các chuyển động cuộn hoặc xung động mạnh đối với người dùng nhạy cảm thị giác.
- **Độ tương phản màu văn bản:** Mọi đoạn văn bản thông tin đều được kiểm nghiệm đạt chỉ số tương phản tối thiểu `4.5:1` (chuẩn WCAG AA).

---

## 7. Cấu Trúc Bản Mẫu Wireframe Độc Lập (`docs/wireframe/index.html`)

Bản wireframe tương tác độc lập (Standalone Interactive Wireframe) được đặt tại:
`docs/wireframe/index.html`

Bản mẫu tích hợp:
- Bộ chuyển đổi chế độ xem: **Dòng thời gian (Timeline View)** $\leftrightarrow$ **Lưới tra cứu (Chronicle Grid)**.
- Bộ lọc thời gian phản hồi tức thì (Instant Filter by Era: Hồng Bàng, Ngô - Đinh - Tiền Lê, Lý, Trần, Lê Sơ, Tây Sơn, Nguyễn, Hiện đại).
- Ô tìm kiếm thông minh có gợi ý nhanh kết quả (Live debounced search).
- Modal tương tác sâu hiển thị thông tin Đại danh tướng Trần Hưng Đạo, Ngô Quyền, Vua Lý Thái Tổ, Nguyễn Trãi và Vua Quang Trung.
- Chỉ số kiểm tra tình trạng kết nối hệ thống thời gian thực (Bun 1.4, Hono RPC, Postgres 17) có nút kiểm tra kết nối tương tác.
- Trình phát âm thanh di sản "Tiếng Vọng Ngàn Xưa" (Interactive Audio Player Bar).
