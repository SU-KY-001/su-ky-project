# Su-Ky (Sử Ký) — Nền Tảng Podcast Kể Chuyện Lịch Sử Việt Nam
## Tài Liệu Tầm Nhìn & Phạm Vi Đồ Án WDP301

- **Tên dự án**: **Su-Ky** (Sử Ký — Historical Podcast & Interactive Chronicle)
- **Môn học**: WDP301 (Web Development Project)
- **Nguồn tài liệu gốc**: `E:\FPT\Semester_8\WDP301\su-ky-document\brainstorm\raw-from-kimi\260910.md`
- **Ngày lập**: 2026-09-11
- **Trạng thái**: Đã phê duyệt phạm vi & định hướng

---

## 1. Đặt Vấn Đề (Problem Statement)

1. **Khoảng trống thị trường Audio**: Người trẻ Việt Nam (18–34 tuổi) có nhu cầu khám phá lịch sử nước nhà trong các khoảng thời gian di chuyển, làm việc nhà, thư giãn. Tuy nhiên, thị trường chỉ có các ứng dụng tra cứu văn bản khô khan hoặc video YouTube dài không tiện nghe thụ động.
2. **Trải nghiệm nghe thiếu tính kết nối tri thức**: Podcast truyền thống phát tuyến tính, khiến người nghe "nghe rồi quên", không thấy được mạch thời gian, không có bản đồ quan hệ giữa nhân vật và sự kiện.
3. **Phân mảnh và kiểm chứng nguồn**: Nội dung trôi nổi trên mạng thiếu nguồn trích dẫn đáng tin cậy.

> **Problem Statement Chốt**:
> *"Người trẻ Việt Nam (18–34 tuổi) thiếu một nền tảng podcast lịch sử chuyên biệt, chất lượng cao, tổ chức theo dòng thời gian sống và bản đồ quan hệ nhân vật – sự kiện, có trích dẫn nguồn sử liệu chính thống, giúp biến trải nghiệm nghe giải trí thành hiểu biết sâu sắc về mạch nguồn dân tộc."*

---

## 2. Phạm Vi Sản Phẩm (Product Scope)

### Lát cắt 1: Phạm vi địa lý & thời gian
- **Trọng tâm**: Lịch sử Việt Nam (Cổ đại – Trung đại – Cận đại, đến đầu thế kỷ 20).
- **Tránh**: Vùng nhạy cảm hiện đại sau 1954/1975 để tập trung vào giá trị văn hóa, anh hùng dân tộc và giai thoại kinh điển.

### Lát cắt 2: Trục tổ chức nội dung đa chiều
- **Trục 1 — Dòng thời gian sống (Interactive Timeline)**: Kéo/chọn triều đại (Hồng Bàng, An Dương Vương, Bắc thuộc, Ngô - Đinh - Tiền Lê, Lý, Trần, Hậu Lê, Tây Sơn, Nguyễn) → hiện các tập podcast tương ứng.
- **Trục 2 — Lĩnh vực & Chủ đề (Themes & Categories)**:
  - *Quân sự & Chiến trận* (Bạch Đằng, Như Nguyệt, Rạch Gầm - Xoài Mút...)
  - *Văn hóa, Tư tưởng & Nghệ thuật* (Nho giáo thời Lê, Thi ca thời Lý, Kiến trúc chùa tháp...)
  - *Nhân vật & Giai thoại triều đình* (Các bậc anh quân, nữ kiệt, danh thần...)
- **Flagship Series MVP**: *"Hành Trình Dựng Nước: Từ Văn Lang đến Kỷ Nguyên Độc Lập"* (10–15 tập).

### Lát cắt 3: Tính năng "Học Nhẹ" (Light-Learning & Citations)
- Mỗi tập podcast đi kèm:
  - **Audio Player chuyên dụng**: Play/pause, seek, tốc độ phát (0.75x–2x), thanh tiến trình, hẹn giờ tắt.
  - **Transcript & Dàn ý**: Bố cục nội dung chính kèm mốc phút:giây.
  - **Thuật ngữ & Chú thích**: Giải nghĩa danh xưng, địa danh cổ, quan chế.
  - **Trích dẫn minh chứng (Citations)**: Ghi rõ nguồn trích xuất (Đại Việt Sử Ký Toàn Thư, Khâm Định Việt Sử Thông Giám Cương Mục, Việt Nam Sử Lược...).
  - **Liên kết thực thể**: Gợi ý các tập liên quan về cùng nhân vật/chiến dịch.

---

## 3. Kiến Trúc Kỹ Thuật (Tech Stack Mapping)

- **Monorepo**: Turborepo 2.x + Bun v1.4.0 (Isolated workspaces).
- **Backend (`apps/api`)**: Hono v4 chạy trên Bun runtime, Hono RPC (`hc`) xuất kiểu dữ liệu trực tiếp sang frontend, Zod validation.
- **Frontend Web (`apps/web`)**: React 19 + Vite 8 + Tailwind CSS v4 + shadcn/ui + Magic UI + TanStack Query v5.
- **Frontend Mobile (`apps/mobile`)**: Expo 57 + React Native 0.86 + Tamagui.
- **Database (`packages/db`)**: PostgreSQL 17 + Drizzle ORM + Drizzle Kit.
  - Entities: `series`, `episodes`, `timeline_periods`, `figures`, `categories`, `citations`, `episode_relations`.
- **Shared Contracts (`packages/shared`)**: Schema Zod, DTOs và types dùng chung cho cả backend & frontend.

---

## 4. Lộ Trình Phát Triển (Roadmap)

| Giai đoạn | Nội dung trọng tâm |
| :--- | :--- |
| **P0 (MVP Demo Đồ Án)** | Monorepo Turborepo + Bun 1.4, Postgres DB với Drizzle, Hono API REST/RPC, Web UI với Timeline tương tác, Podcast Catalog, Audio Player, Trang chi tiết tập có Citations & Transcript, Bộ dữ liệu mẫu flagship series. |
| **P1 (Mở rộng tính năng)** | Bản đồ quan hệ nhân vật (Interactive Entity Graph), Đồng bộ tiến độ nghe (User listening history & bookmarks), Chế độ câu hỏi ôn tập nhẹ (Mini-quiz 3 câu). |
| **P2 (Nền tảng & Mobile)** | Mobile App (React Native/Flutter), Content Creator CMS & AI RAG pipeline hỗ trợ biên kịch và kiểm chứng chéo nguồn. |
