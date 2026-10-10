# API Changelog — Sử Ký Backend

Đối tượng: team FE. Mỗi mục ghi **endpoint bị ảnh hưởng**, **trước/sau** và **FE phải sửa gì**.
Nhãn: `BREAKING` (code cũ gọi sẽ lỗi hoặc sai), `ADDITIVE` (mới, không vỡ), `FIX` (sửa cho đúng spec).

## [0.0.1] - 2026-10-10 — Studio CRUD + Thời kỳ→Giai đoạn (commit `2af754a`)

### BREAKING — Workflow AI-first bị xóa
- `POST /api/script-workflows` và toàn bộ route workflow → **404**. Không có endpoint thay thế.
- FE phải sửa: gỡ mọi màn hình gọi workflow (đã gỡ ở web: `routeConfig.tsx`, `ModeratorDashboard.tsx`, `navItems.ts`).

### BREAKING — Nguồn chuyển từ episode lên series
- Xóa: route episode-sources (`/api/studio/episodes/:id/sources...`). `EpisodeWorkspace` không còn field `sources`. Schema `EpisodeSourceSchema` (kèm `origin`) trong shared `catalog.ts` bị xóa.
- Mới: `GET/POST /api/studio/series/:id/sources`, `PUT /api/studio/series/:id/sources/order` (body `{seriesSourceIds}`), `PATCH/DELETE /api/studio/series/:id/sources/:childId`.
- Item: `{id, sortOrder, locator, excerpt, source: {id, tier, title, author, publicationYear, url, fileUrl}}`.
- Lỗi mới: `SERIES_SOURCE_DUPLICATE`, `SERIES_SOURCE_ORDER_MISMATCH`, `REQUIRED_FOR_PUBLISHED` (xóa nguồn cuối của series đã publish).
- FE phải sửa: panel nguồn nằm ở Series detail, không còn ở Episode.

### BREAKING — `historicalPeriodId` → `historicalPhaseId`
- Series create/patch nhận `historicalPhaseId` (nullable ở DRAFT, bắt buộc khi publish). Field `historicalPeriodId` bị xóa.
- Series detail trả `historicalPhase: {id, name, period: {id, name}} | null`.
- Public `GET /api/series`: bỏ query `historicalPeriodId`, dùng `historicalPhaseId` + `periodId`.
- Cây thời kỳ: `GET /api/historical-periods` (public) và `GET /api/studio/historical-periods` trả `{items: [{id, slug, name, startYear, endYear, phases: [{id, slug, name, startYear, endYear, note}]}]}`.
- Quy ước: nửa kín `[start, end)`, `endYear: null` = đến nay, năm âm = TCN. Series giữ khoảng đóng (40–43 = đến hết 43).
- FE phải sửa: cascading select Thời kỳ → Giai đoạn; hiển thị "179 TCN – 43" + tooltip "đến trước năm 43"; năm ngoài phase chỉ cảnh báo mềm (`series.start < phase.end && series.end >= phase.start`, null = vô cực), không chặn.

### BREAKING — Bỏ trần năm 1945
- Trước: `HistoricalYearSchema` và DB check chặn năm > 1945 (`MAX_HISTORICAL_YEAR`).
- Sau: năm là SMALLINT khác 0 (âm = TCN, không có năm 0), giá trị như 2026 hợp lệ.
- FE phải sửa: mọi input/validation năm đang cap 1945 phải bỏ.

### BREAKING — Audio chỉ upload, script text thuần
- Xóa `audioProvider` / `AttachAudioSchema.provider`. Audio chỉ upload file.
- `PUT /api/studio/episodes/:id/narrations/THIRD_PERSON` chỉ nhận text thuần — có thẻ HTML → 422. Giới hạn `script.max_chars` (mặc định 60000, đọc từ system config).
- Checklist publish đổi key — Series: `TOPIC`, `HISTORICAL_PHASE`, `YEAR_RANGE`, `HAS_SOURCE`, `HAS_PUBLISHED_EPISODE`. Episode: `BASIC_INFO`, `THIRD_PERSON_SCRIPT`, `THIRD_PERSON_AUDIO`. Series publish bắt buộc ≥1 nguồn.
- FE phải sửa: editor script dùng `<textarea>`, không rich text.

### BREAKING — Public citations về cấp series
- Episode detail không còn `sources` top-level. Citations nằm ở `series.sources[]` (episode detail) và `sources[]` (series detail), mỗi item `{title, author, tier, locator, url, fileUrl}`.

### BREAKING — `GET /health` bỏ field `ai`
- `ai` bị xóa, `queue` giờ phản ánh maintenance boss. FE dashboard nào đọc `health.ai` phải sửa.

### ADDITIVE — Kho nguồn + PDF
- `POST /api/studio/sources` yêu cầu có `url` hoặc `fileAssetId`, response thêm `fileAssetId` + `file: {assetId, url, format, sizeBytes} | null`. Gán/gỡ PDF qua `fileAssetId` ở POST/PATCH (`null` = gỡ). Có `GET /sources/similar` cảnh báo trùng, archive/unarchive.
- Upload PDF 2 bước như cover/audio: `POST /api/studio/media-assets` với `kind: "DOCUMENT"`, mime `application/pdf` → upload → verify.
- Lưu ý: sách in chỉ có ISBN (không url/file) hiện tạo không được — đang chờ quyết định nới validation.

### Chưa verify
- Upload PDF raw Cloudinary thật (thiếu credential trong `.env`).
