# Su-Ky (Sử Ký) — Product Development Requirements (PDR)
## Web Development Project (WDP301) — Capstone Specification

- **Product Name:** **Su-Ky** (Sử Ký — Historical Podcast & Interactive Chronicle)
- **Course Code:** WDP301 (Web Development Project, FPT University)
- **Version:** 1.0.0 (Production Baseline)
- **Target Audience:** Young Vietnamese Adults aged 18–34
- **Date:** 2026-09-11 | **Status:** Approved Baseline

---

## 1. Product Identity & Academic Context

**Su-Ky (Sử Ký)** is an audio-centric historical knowledge platform engineered to modernize how young Vietnamese discover, internalize, and research national history. Developed under the FPT University WDP301 curriculum, the project combines modern web engineering (Turborepo, Bun 1.4, Hono RPC, React 19, PostgreSQL 17) with scholarly rigor.

```
       ┌────────────────────────────────────────────────────────┐
       │             SU-KY PRODUCT CORE IDENTITY                │
       ├────────────────────────────┬───────────────────────────┤
       │   Immersive Audio Player   │   Living Chronology Rail  │
       │ (Timestamped Transcripts)  │   (4,000-Year Timeline)   │
       ├────────────────────────────┼───────────────────────────┤
       │ Scholarly Citation Engine  │  2-Axis Content Matrix    │
       │(Primary Source Validation) │   (Timeline x Categories) │
       └────────────────────────────┴───────────────────────────┘
```

---

## 2. Problem Statement (Đặc Tả Bài Toán & Khoảng Trống Thị Trường)

### 2.1 The Audio Gap in Vietnamese History Education
While international platforms (BBC History, Hardcore History, Revolutions) have proven that audio storytelling is one of the most effective mediums for complex historical discourse, the Vietnamese domestic market faces a pronounced vacuum:
- **Textbook Exhaustion:** Traditional historical materials are delivered through dense textbooks or scanned PDFs that lack narrative drama and accessibility.
- **Video Dominance & Cognitive Overload:** Existing digital history efforts primarily exist as long YouTube documentaries or hyper-short TikTok clips. YouTube videos demand 100% visual attention (precluding multitasking), while short-form video trivializes historical nuance into clickbait.
- **Passive Commuter Opportunity:** Young urban Vietnamese spend an average of 45–90 minutes daily commuting, exercising, or doing chores—time slots ideal for podcast consumption that currently lack high-production historical storytelling.

### 2.2 The Disconnected Listening Experience
Standard podcast players (Spotify, Apple Podcasts) operate as purely linear streaming queues. For historical content, linear playback fails:
- **Loss of Temporal Mental Models:** Listeners hear about events in isolation ("hear then forget") without grasping where an event fits into the broader 4,000-year continuity.
- **Relational Blindspots:** Listeners cannot easily map how figures in one era influenced subsequent dynasties (e.g., how the administrative reforms of Lê Thánh Tông drew from earlier Lý-Trần codes).

### 2.3 Sourcing & Credibility Vacuum
Online historical discourse in Vietnam is plagued by unsourced folklore, dramatized film tropes mistaken for facts, and conflicting internet narratives. Serious listeners seeking source verification have no bridge connecting an engaging podcast to original canonical chronicles.

---

### 2.4 Formal Problem Statement Definition

> *"Young Vietnamese adults (18–34) lack a dedicated, high-quality audio chronicle platform organized across an interactive living timeline and relational thematic structure with verified scholarly citations, turning passive entertainment into deep historical understanding."*

---

## 3. Target Audience & Persona Archetypes

The primary demographic comprises Vietnamese digital natives aged **18 to 34** (Gen Z and younger Millennials).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TARGET DEMOGRAPHIC (18–34)                      │
├───────────────────────────────────┬────────────────────────────────────┤
│  Demographic Sub-Segment          │  Key Behavioral Attributes         │
├───────────────────────────────────┼────────────────────────────────────┤
│  University Students (18–22)      │  Mobile-first, visual learners,    │
│                                   │  researching for academic projects │
├───────────────────────────────────┼────────────────────────────────────┤
│  Young Professionals (23–29)      │  Commuters, multi-tasking audio    │
│                                   │  listeners, cultural re-discovery  │
├───────────────────────────────────┼────────────────────────────────────┤
│  Cultural Creators (30–34)        │  Writers, game designers, educators│
│                                   │  demanding strict source citations │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Persona 1: "Minh - The Inquisitive Commuter" (Age 24)
- **Role:** Junior Software Engineer in Ho Chi Minh City.
- **Behavior:** Spends 60 minutes daily commuting on public transit or motorbike with earphones.
- **Pain Points:** Wants to learn Vietnamese history without reading dry academic papers; forgets the chronological order of dynasties.
- **Su-Ky Value:** High-production audio episodes organized directly on an era timeline; resume playback seamlessly.

### Persona 2: "Linh - The Cultural Creative & Researcher" (Age 21)
- **Role:** Graphic Design & Multimedia Student at FPT University.
- **Behavior:** Works on creative projects inspired by traditional Vietnamese folklore, armor, and architecture.
- **Pain Points:** Needs verifiable historical details (names, dates, battle formations) and cannot risk citing unverified social media posts.
- **Su-Ky Value:** Direct access to verified citations from *Đại Việt Sử Ký Toàn Thư*, timestamped transcripts, and figure biographies.

---

## 4. Two-Axis Content Organization (Hệ Thống Phân Loại 2 Trục)

To eliminate the disjointed nature of conventional podcast catalogs, Su-Ky organizes all content along two intersecting conceptual axes: the **Chronological Timeline Axis (Horizontal)** and the **Thematic Category Axis (Vertical)**.

```
                  THEMATIC CATEGORIES (Trục Lĩnh Vực & Thể Loại)
                          ▲
     Quân Sự & Chiến Trận │   [Ep: Bạch Đằng 938]      [Ep: Vạn Kiếp 1285]
              (quan-su)   │
     Dựng Nước & Thể Chế  │   [Ep: Hồng Bàng Kỷ]       [Ep: Chiếu Dời Đô]
             (dung-nuoc)  │
     Văn Hóa & Tư Tưởng   │   [Ep: Trống Đồng]         [Ep: Thi Ca Lý-Trần]
              (van-hoa)   │
     Nhân Vật & Giai Thoại│   [Ep: Ngô Quyền]          [Ep: Trần Hưng Đạo]
             (nhan-vat)   │
                          └──────────────────────────────────────────────►
                            Hồng Bàng  ...  Ngô-Đinh-Tiền Lê  ...  Trần
                            CHRONOLOGICAL TIMELINE (Trục Dòng Thời Gian)
```

---

### 4.1 Horizontal Axis: 9 Canonical Historical Eras (`Period`)

Every episode and series is anchored to a specific historical epoch with defined starting and ending years:

| Order | Era Name (`name`) | Slug (`slug`) | Year Span | Historical Focus |
| :---: | :--- | :--- | :---: | :--- |
| **1** | Thời Kỳ Hồng Bàng & Văn Lang | `hong-bang-van-lang` | 2879 TCN – 258 TCN | Sơ khai dựng nước, 18 đời vua Hùng, văn hóa Đông Sơn |
| **2** | Âu Lạc & An Dương Vương | `au-lac-an-duong-vuong` | 257 TCN – 179 TCN | Hợp nhất Tây Âu - Lạc Việt, thành Cổ Loa, nỏ liên châu |
| **3** | Bắc Thuộc & Các Cuộc Khởi Nghĩa| `bac-thuoc-khoi-nghia` | 179 TCN – 938 SCN | Khởi nghĩa Hai Bà Trưng, Bà Triệu, Lý Bí, Mai Thúc Loan |
| **4** | Kỷ Nguyên Độc Lập: Ngô-Đinh-Lê | `ngo-dinh-tien-le` | 938 SCN – 1009 SCN | Bạch Đằng 938, dẹp loạn 12 sứ quân, kháng Tống |
| **5** | Triều Đại Nhà Lý | `trieu-ly` | 1009 SCN – 1225 SCN | Dời đô Thăng Long, Nam Quốc Sơn Hà, phòng tuyến Như Nguyệt|
| **6** | Triều Đại Nhà Trần | `trieu-tran` | 1225 SCN – 1400 SCN | Hào khí Đông A, ba lần đại thắng Nguyên Mông, Hịch Tướng Sĩ|
| **7** | Triều Đại Hậu Lê | `trieu-hau-le` | 1428 SCN – 1789 SCN | Khởi nghĩa Lam Sơn, Bình Ngô Đại Cáo, luật Hồng Đức |
| **8** | Triều Đại Tây Sơn | `trieu-tay-son` | 1778 SCN – 1802 SCN | Người áo vải cờ đào Quang Trung, đại phá 29 vạn quân Thanh |
| **9** | Triều Đại Nhà Nguyễn | `trieu-nguyen` | 1802 SCN – 1945 SCN | Thống nhất giang sơn, kinh thành Huế, đấu tranh chống Pháp |

---

### 4.2 Vertical Axis: 4 Thematic Categories (`PodcastCategoryEnum`)

Mapped in `@repo/shared/src/schemas/podcast.ts`:

1. **`dung-nuoc` (Quá trình dựng nước & Nhà nước):** Kiến thiết quốc gia, định đô, cải cách thể chế, bang giao và bang quốc.
2. **`quan-su` (Quân sự & Chiến trận):** Chiến dịch quân sự, nghệ thuật thủy chiến, chiến tranh vệ quốc, phòng tuyến hiểm yếu.
3. **`van-hoa` (Văn hóa, Tư tưởng & Nghệ thuật):** Tín ngưỡng, Nho - Phật - Đạo, thi ca cổ điển, kiến trúc chùa tháp, mỹ thuật thời đại.
4. **`nhan-vat` (Nhân vật & Giai thoại triều đình):** Danh tướng, hiền thần, anh quân, nữ kiệt và các điển cố triều chính.

---

### 4.3 Two-Axis Matrix Intersection Table

| Era / Category | `dung-nuoc` (Dựng Nước) | `quan-su` (Quân Sự) | `van-hoa` (Văn Hóa) | `nhan-vat` (Nhân Vật) |
| :--- | :--- | :--- | :--- | :--- |
| **Hồng Bàng** | Dựng nước Văn Lang | Chiến tranh Hùng Vương - Thục Phán | Trống đồng Đông Sơn & Bánh Chưng | 18 Đời Hùng Vương & Lạc Long Quân |
| **Âu Lạc** | Quốc hiệu Âu Lạc | Kỹ thuật thành Cổ Loa & Nỏ thần | Truyền thuyết Mỵ Châu - Trọng Thủy | Thục Phán An Dương Vương |
| **Bắc Thuộc** | Nước Vạn Xuân (Lý Nam Đế) | Khởi nghĩa Hai Bà Trưng, Phùng Hưng | Sự du nhập Phật giáo Giao Châu | Hai Bà Trưng & Triệu Thị Trinh |
| **Ngô - Đinh - Lê** | Xưng vương định đô Cổ Loa | Trận thủy chiến Bạch Đằng 938 | Tiền đồng Thái Bình Hưng Bảo | Tiền Ngô Vương & Đinh Bộ Lĩnh |
| **Nhà Lý** | Chiếu dời đô về Thăng Long | Phòng tuyến sông Như Nguyệt (1077) | Văn Miếu - Quốc Tử Giám (1070) | Lý Thái Tổ & Lý Thường Kiệt |
| **Nhà Trần** | Hội nghị Diên Hồng & Bình Than | Ba lần kháng chiến chống Mông Cổ | Thiền phái Trúc Lâm Yên Tử | Trần Hưng Đạo & Trần Nhân Tông |
| **Hậu Lê** | Bình Ngô Đại Cáo & Lập quốc | Trận Chi Lăng - Xương Giang (1427) | Bộ luật Hồng Đức & Bản đồ Hồng Đức | Lê Lợi & Nguyễn Trãi |
| **Tây Sơn** | Chính sách giáo dục chữ Nôm | Đại phá 29 vạn quân Thanh (1789) | Cải cách tiền tệ & Chiếu cầu hiền | Quang Trung Nguyễn Huệ |
| **Nhà Nguyễn** | Quốc hiệu Việt Nam (1804) | Trận Đà Nẵng (1858) & Giữ thành Hà Nội| Quần thể di tích Cố đô Huế | Gia Long & Hoàng Diệu |

---

## 5. Flagship Series Specification

### 5.1 Primary Flagship: *"Hành Trình Dựng Nước: Từ Văn Lang Đến Kỷ Nguyên Độc Lập"*
- **Slug:** `hanh-trinh-dung-nuoc`
- **Category:** `dung-nuoc`
- **Core Era Anchor:** `hong-bang-van-lang` to `ngo-dinh-tien-le`
- **Total Planned Episodes:** 10–12 episodes
- **Narrative Arc:**
  1. *Episode 1:* Nguồn cội Bách Việt & Huyền sử Rồng Tiên (Kỷ Hồng Bàng)
  2. *Episode 2:* Thời đại Hùng Vương & Nền văn minh sông Hồng
  3. *Episode 3:* Thục Phán dựng thành Cổ Loa và nỏ liên châu
  4. *Episode 4:* Bi kịch Mỵ Châu - Trọng Thủy & Mối họa nghìn năm
  5. *Episode 5:* Tiếng trống Mê Linh: Hai Bà Trưng phục thù cứu quốc
  6. *Episode 6:* Bà Triệu & Hào khí sông Mã
  7. *Episode 7:* Nước Vạn Xuân và dã tâm Tiêu Tư
  8. *Episode 8:* Mai Hắc Đế & Bố Cái Đại Vương Phùng Hưng
  9. *Episode 9:* Khúc Thừa Dụ tự chủ & Trận Bạch Đằng sơ khai
  10. *Episode 10:* Ngô Quyền cắm cọc Bạch Đằng: Khúc ca khải hoàn độc lập

### 5.2 Companion Military Series: *"Những Trận Thủy Chiến Lừng Lẫy Non Sông"*
- **Slug:** `nhung-tran-thuy-chien-lung-lay`
- **Category:** `quan-su`
- **Core Era Anchor:** `ngo-dinh-tien-le`, `trieu-ly`, `trieu-tran`, `trieu-tay-son`
- **Focus:** Phân tích chiến thuật quân sự thủy binh, địa hình sông rạch, chế tạo chiến thuyền và nghệ thuật đón triều rút của tổ tiên.

---

## 6. Scholarly Citations System (Hệ Thống Trích Dẫn Sử Liệu)

### 6.1 Academic Integrity Manifesto
To ensure utmost credibility and combat misinformation, Su-Ky enforces a strict **zero-unsourced-content policy**:
1. Every historical episode must possess at least 2 primary or approved secondary source citations.
2. Citations must reference specific volumes (*Quyển*), chapters (*Kỷ/Mục*), and passages.
3. Original quotations must be rendered verbatim with modern Vietnamese translation annotations where necessary.

```
       ┌────────────────────────────────────────────────────────┐
       │              EPISODE AUDIO & TRANSCRIPT                │
       ├────────────────────────────────────────────────────────┤
       │ "...Mùa đông năm 938, Ngô Quyền đóng cọc ngầm..." [05:12]
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼ (References Citation)
       ┌────────────────────────────────────────────────────────┐
       │             VERIFIED SCHOLARLY CITATION                │
       ├────────────────────────────────────────────────────────┤
       │ Book:    Đại Việt Sử Ký Toàn Thư                        │
       │ Volume:  Ngoại Kỷ - Quyển V                            │
       │ Chapter: Kỷ Nhà Ngô (Tiền Ngô Vương)                   │
       │ Quote:   "Tiền Ngô Vương có thể lấy quân mới nhóm..." │
       └────────────────────────────────────────────────────────┘
```

### 6.2 Canonical Primary Source Corpus

| Source Code | Full Title (Tên Thư Tịch) | Author / Compiler | Publication Era |
| :---: | :--- | :--- | :--- |
| **DVSKTT** | *Đại Việt Sử Ký Toàn Thư* | Lê Văn Hưu, Phan Phu Tiên, Ngô Sĩ Liên | Thế kỷ XV (Hậu Lê) |
| **KDVSTGCM**| *Khâm Định Việt Sử Thông Giám Cương Mục* | Quốc Sử Quán Triều Nguyễn | Thế kỷ XIX (Nhà Nguyễn) |
| **VNSL** | *Việt Nam Sử Lược* | Trần Trọng Kim | 1920 (Đầu thế kỷ XX) |
| **LTHCKC** | *Lịch Triều Hiến Chương Loại Chí* | Phan Huy Chú | Đầu thế kỷ XIX |

### 6.3 Citation Data Contract (`Citation`)
Modeled in Prisma schema and verified via Zod:
- `id`: UUID primary key
- `episodeId`: Foreign key to `episodes.id` (`onDelete: Cascade`)
- `bookTitle`: Canonical source name (e.g., *"Đại Việt Sử Ký Toàn Thư"*)
- `volume`: Volume identifier (e.g., *"Ngoại Kỷ - Quyển V"*)
- `chapter`: Section or reign (e.g., *"Kỷ Nhà Ngô"*)
- `passage`: Contextual description
- `quote`: Verbatim textual excerpt from the historical text

---

## 7. Functional Requirements Matrix (PDR Functional Spec)

| Code | Feature Area | User Story & Functional Requirement | Priority |
| :--- | :--- | :--- | :---: |
| **FR-01** | **Era Navigation Rail** | Users can swipe/scroll horizontally through 9 chronological periods, instantly filtering episodes and series associated with that era. | `P0 (MVP)` |
| **FR-02** | **Category Filter Tabs** | Users can toggle between `quan-su`, `van-hoa`, `nhan-vat`, and `dung-nuoc` filters to isolate specific content themes. | `P0 (MVP)` |
| **FR-03** | **Persistent Audio Player** | Sticky bottom player dock with play/pause, scrub bar, duration indicators, 15s forward/backward skip, and speed controls (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`). | `P0 (MVP)` |
| **FR-04** | **Synchronized Transcript** | Episode detail page renders paragraph-by-paragraph transcript with clickable timestamps (`[05:12]`) that jump audio directly to that mark. | `P0 (MVP)` |
| **FR-05** | **Citation Inspector** | Drawer or card displaying primary source citations, book titles, volume, chapter, and verified quotes for the current episode. | `P0 (MVP)` |
| **FR-06** | **Search & Catalog** | Multi-attribute search querying episode titles, descriptions, and figures with debounced input. | `P0 (MVP)` |
| **FR-07** | **Atomic Play Counter** | Trigger `POST /api/episodes/:slug/play` upon user listening session milestone to increment engagement analytics. | `P0 (MVP)` |
| **FR-08** | **Entity Relationship Graph**| Interactive visual node-link diagram mapping connections between figures, battles, and dynasties. | `P1` |
| **FR-09** | **User History & Sync** | User login (OAuth2) with cross-device audio progress synchronization beaconing every 10 seconds. | `P1` |
| **FR-10** | **Retention Mini-Quiz** | 3-question multiple choice knowledge check at the conclusion of each episode. | `P1` |
| **FR-11** | **Mobile Applications** | Native iOS & Android applications with offline caching and lock screen audio controls. | `P2` |
| **FR-12** | **AI Citation RAG** | Vector database pipeline cross-checking new scripts against digitized historical records. | `P2` |

---

## 8. Non-Functional Requirements & Performance Standards

1. **API Response Latency:**
   - Catalog queries (`/api/timeline`, `/api/series`, `/api/episodes`) must respond in `< 100ms` under standard development loads.
   - Healthcheck `/health` with PostgreSQL ping must respond in `< 20ms`.
2. **Accessibility (WCAG 2.1 AA Compliance):**
   - High contrast ratios (Parchment text `#FAF5EE` on Lacquer background `#0B0D13` achieves `14.8:1`).
   - Minimum touch target size of `44x44px` on mobile screens.
   - Comprehensive keyboard navigation support (`focus-visible` rings).
3. **Audio Streaming Reliability:**
   - Client player must support progressive buffer caching to prevent audio stalls on high-latency mobile networks.
4. **Typography & Vietnamese Character Set:**
   - Full support for Vietnamese diacritics across all font weights (`Playfair Display`, `Plus Jakarta Sans`, `JetBrains Mono`).
