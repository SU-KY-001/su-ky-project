# API Changelog — Sử Ký Backend

Đối tượng: team FE. Mỗi mục ghi **endpoint bị ảnh hưởng**, **trước/sau** và **FE phải sửa gì**.
Nhãn: `BREAKING` (code cũ gọi sẽ lỗi hoặc sai), `ADDITIVE` (mới, không vỡ), `FIX` (sửa cho đúng spec).

## [Unreleased]

### ADDITIVE — Kịch bản hội thoại hai người (2026-10-27)
- `PUT /api/studio/episodes/:id/narrations/THIRD_PERSON` nhận `dialogue` (`speakers` A/B + `turns`); narration của workspace trả thêm `dialogue` (null với tập một người kể). Migration `20261027120000_episode_dialogue` (additive, nullable `episode_narrations.dialogue`).
- `POST /api/studio/episodes/:id/ai/voice`: `voice` nay tùy chọn. Tập hội thoại phải **bỏ** `voice`; tập một người kể vẫn phải gửi. `VoiceJob` thêm `mode` và `voice` nullable. FE đã cập nhật; client khác đọc `voice` cần chấp nhận null.
- Env mới `TTS_DIALOGUE_MODEL` (mặc định `gemini-3.8-flash-tts`).

### FIX — TTS chuyển key khi bị giới hạn (2026-10-23)
- `GEMINI_API_KEY` hỗ trợ danh sách phân cách bằng dấu phẩy. TTS chỉ fallback khi provider trả 429; thử mỗi key khác nhau tối đa một lần/chunk, dùng chung deadline và cancellation. Không đổi API/DTO; hết tất cả key vẫn trả lỗi `RATE_LIMITED` trong job. Review/compose lấy key đầu tiên khi không có `PI_API_KEY`.
- Logic chọn key, chuyển khi 429 và ghi nhớ key đã tách vào `createApiKeyRotation()` (`modules/ai-engine/api-key-rotation.ts`) để tái dùng; mỗi consumer tạo instance riêng. Caller giữ deadline, cancellation và mapping lỗi; hành vi TTS/API không đổi.

### BREAKING — Cổng duyệt và phát hành có kết luận trách nhiệm (2026-10-23)
- `POST /api/admin/releases/:id/review` và `/api/studio/releases/:id/review` với `decision: "APPROVE"` bắt buộc `assessment` (`editorialNote`, `rightsNote`, `audioNote` 10..5000 ký tự; `credits`, `rightsExpiresAt` ISO, `aiDisclosure`, `warningAcceptance` tùy chọn). Server từ chối khi quyền đã hết hạn (`RIGHTS_EXPIRED`), âm thanh giọng AI thiếu công khai (`AI_DISCLOSURE_REQUIRED`) hoặc còn cảnh báo mà thiếu lý do (`WARNING_ACCEPTANCE_REQUIRED`). `REQUEST_CHANGES` giữ nguyên.
- Gửi duyệt và quyết định chạy trong transaction khóa tập: revision cũ trả `STALE_WRITE`, quyết định thứ hai trên cùng phiên bản trả `INVALID_REVIEW_STATE`. `EpisodeReviewRecord.readinessSnapshot` lưu readiness + assessment tại lúc quyết định (`null` với bản duyệt cũ).
- Duyệt ghi `Episode.publicationApproval` cho đúng `contentRevision`; sửa kịch bản/âm thanh/thông tin tập làm approval hết hiệu lực. Phát hành theo lịch kiểm approval hiện hành, hạn quyền, công khai AI và cảnh báo ngay trong transaction phát hành (`APPROVAL_REQUIRED` nếu thiếu). Tập đã phát hành vẫn đọc được; phát hành mới không có snapshot cần duyệt lại.
- `POST /api/studio/episodes/:id/publish` nay là ngoại lệ **chỉ Admin**: body `{ baseUpdatedAt, exceptionReason (20..5000), assessment }`. Vai trò đọc lại từ DB trong transaction, ghi approval ngoại lệ và audit `episode.published_exception` (lý do, kết luận, revision). Không miễn checklist, bằng chứng nguồn hay tài sản. Moderator nhận `403`.
- Series có `language` (BCP 47, mặc định `vi`; nhận trong `POST/PATCH /api/studio/series`). Xuất bản Series cần thêm mô tả, ít nhất một ảnh bìa `READY` và ngôn ngữ (`publishChecklist` thêm `DESCRIPTION`, `COVER`, `LANGUAGE`; kiểm lại trong transaction). Owner là người chịu trách nhiệm nội dung.
- Gắn audio có `origin.kind = AI_VOICE` bắt buộc `origin.scriptHash`; server so với kịch bản hiện tại trong transaction, lệch trả `409 HASH_MISMATCH`.
- `GET /api/episodes/:slug` thêm `publicationInfo: { aiDisclosure, credits } | null`; ghi chú duyệt, căn cứ quyền và người duyệt không công khai. `EpisodeWorkspace.publicationApproval` chỉ trả approval của revision hiện tại.
- Migration `20261023120000_publication_gates` (additive): `series.language`, `episodes.publication_approval`, `episode_reviews.readiness_snapshot`.

### ADDITIVE — Tự nhập trang PDF khi lưu nguồn
- `POST /api/studio/sources` có PDF đã upload sẽ tải file, tách text từng trang và lưu `source_pages` cùng transaction tạo nguồn, trước khi trả `201`. Lỗi download/parser không tạo nguồn dở dang.
- Thay PDF khi sửa nguồn sẽ tách lại trang cho phiên bản mới; sửa metadata/lưu trữ/khôi phục giữ trang theo phiên bản, không ghi đè lịch sử.
- `SOURCE_PDF_TIMEOUT_MS` mặc định 120000 giới hạn download, extract và transaction; dung lượng dùng `media.document.max_bytes`. PDF scan chỉ lưu text sẵn có, không OCR.
- Form thêm/sửa nguồn tại moderator mở trong modal, hiển thị đang xử lý và không cho đóng khi lưu. Modal chỉ có một tiêu đề, nhóm thông tin ấn bản/tài liệu gốc, vùng chọn PDF hiển thị tên file; nội dung cuộn riêng, hàng nút luôn hiển thị. Giữ font, màu và style input/nút của moderator hiện có.

### ADDITIVE — Điều phối và tự động phát hành podcast (2026-10-15)
- Admin có nhóm endpoint `/api/admin/releases`: tạo/đổi lịch, phân công Moderator, xem tổng quan, “Tiến độ phát hành”, lịch sử, hủy lịch và thao tác cứu hộ khi lịch `BLOCKED`/`FAILED`.
- Moderator có nhóm endpoint `/api/studio/releases`: xem nhiệm vụ, gắn podcast nháp, gửi phiên bản để duyệt, kiểm duyệt độc lập, xem nhắc việc và tiến độ. Moderator được phân công có thể cộng tác trên podcast đã gắn với lịch đang hoạt động; không được tự duyệt nội dung mình tham gia sản xuất.
- Mọi lịch hợp lệ tự phát hành vào `scheduledAt`; không có trường chọn thủ công/tự động. `publish-now` chỉ là thao tác ngoại lệ và dùng chung publication service với worker.
- Worker riêng chạy bằng `bun run worker` trong `apps/api`. Worker dùng pg-boss, transactional outbox, delayed job theo version, retry sau 1/5/15 phút và reconciliation mỗi phút. Triển khai production phải chạy API và ít nhất một worker như hai process độc lập.
- Worker tạo lời nhắc bền vững cho từng Moderator trong 24 giờ trước `productionDeadline`. Unique key theo lịch, người nhận và version ngăn nhắc trùng; sự kiện xuất hiện trong “Tiến độ phát hành”.
- `GET /health` thêm `releaseWorker`; trạng thái sẽ degraded nếu heartbeat worker phát hành không còn mới.
- Migration `20261015120000_release_orchestration` thêm lịch phát hành, phân công, kiểm duyệt, nhắc việc, outbox, metadata audit và `episodes.content_revision`. Chạy `bun run db:deploy` trước khi bật worker.
- FE phải dùng các schema release từ `@repo/shared`; timestamp lưu UTC và hiển thị theo `Asia/Ho_Chi_Minh`.

### ADDITIVE — Ảnh nền ngang của Series (2026-10-15)
- `POST/PATCH /api/studio/series` nhận thêm `coverLandscapeAssetId` (uuid | `null` = gỡ). Response Studio (list + detail) và public (`/api/series`, `/api/series/:slug`, `/api/episodes/:slug` → `series`) thêm `coverLandscape` cùng dạng với `cover` (`null` khi chưa có). `cover` giữ nguyên, nay là ảnh **đứng**.
- Upload như cover: `POST /api/studio/media-assets` (`kind: "IMAGE"`) → upload → verify → gắn asset vào `coverLandscapeAssetId`.
- BEHAVIOR: server lưu `width/height` lúc verify và kiểm hướng khi gắn: `coverImageAssetId` cần ảnh đứng (cao > rộng), `coverLandscapeAssetId` cần ảnh ngang (rộng > cao), ảnh vuông bị từ chối; sai hướng trả `422 VALIDATION_ERROR`. Ảnh đã verify trước bản này (chưa có kích thước) không bị chặn.
- Audio episode không đổi: ticket → upload → verify → `PUT /api/studio/episodes/:id/narrations/:type/audio`.

## [0.1.0] - 2026-10-15 — Admin, Quiz và nhiệm vụ tuần (PR #13, chờ merge vào `dev`)

Bản `0.x`: thay đổi BREAKING tăng MINOR (`0.0.1` → `0.1.0`). `GET /health` và `info.version` của OpenAPI đọc từ `package.json` nên tự đổi theo.

### BREAKING — Ghi `historical-periods` chỉ còn Admin (2026-10-15)
- `POST/PATCH/DELETE` các route ghi của `/api/studio/historical-periods...` trước đây cho Moderator, nay yêu cầu **Admin**. Moderator gọi sẽ nhận `403 FORBIDDEN`. Các route đọc và các route ghi của tài nguyên khác (phase, entity) giữ nguyên quyền Moderator.
- FE phải sửa: ẩn nút tạo/sửa/xoá Thời kỳ với Moderator; Admin quản lý Thời kỳ qua `/api/admin/historical-periods`.

### ADDITIVE — Quiz và nhiệm vụ tuần (2026-10-15)
- Moderator (tập thuộc Series của mình; Admin bị loại):
  - `GET /api/studio/episodes/:episodeId/quiz`: quiz kèm đáp án đúng và giải thích.
  - `PUT /api/studio/episodes/:episodeId/quiz`: tạo hoặc thay toàn bộ câu hỏi. Trả `409 CONFLICT` nếu quiz đã có lượt làm.
  - `DELETE /api/studio/episodes/:episodeId/quiz`: `204`. Cũng `409 CONFLICT` nếu đã có lượt làm.
  - Cả ba trả thêm `403 CONTENT_LOCKED` (Admin đã khoá) và `409 CONTENT_IN_TRASH` (tập hoặc Series trong thùng rác).
- Người nghe:
  - `GET /api/episodes/:slug/quiz` (đăng nhập tuỳ chọn): quiz **không** có đáp án đúng. `404` nếu tập/Series chưa xuất bản, đã vào thùng rác, hoặc chưa có quiz.
  - `POST /api/quizzes/:quizId/attempts`: bắt buộc header `Idempotency-Key`. Trả `201` với kết quả chấm, đáp án đúng, XP và thay đổi nhiệm vụ. Lần đậu đầu tiên mới nhận XP; gửi lại cùng key trả kết quả cũ. `422 VALIDATION_ERROR` nếu thiếu câu trả lời hoặc đáp án không thuộc câu hỏi.
  - `GET /api/me/weekly-missions?weekStartDate=`: mặc định tuần hiện tại theo giờ Việt Nam. Query nhận thời điểm bất kỳ trong tuần, server tự chuẩn hoá về thứ Hai 00:00 Asia/Ho_Chi_Minh.
- `weekStartDate` và `weekEndDate` (ở cấp response và từng mission) là **thời điểm chính xác** (ISO 8601 UTC) của cửa sổ tuần, không phải mốc ngày. `status` là `IN_PROGRESS`, `COMPLETED` hoặc `EXPIRED` (chưa xong mà tuần đã hết).
- Mỗi quiz chỉ tính một lần vào từng nhiệm vụ `PASS_QUIZ` của tuần. Tiến độ nghe tập (`COMPLETE_EPISODE`) dùng chung logic tuần Việt Nam với quiz.
- FE phải làm: màn hình quiz cho Moderator và người nghe; màn hình nhiệm vụ tuần. Gửi `Idempotency-Key` mới cho mỗi lần nộp bài, giữ nguyên key khi thử lại cùng bài.

### ADDITIVE — API quản trị `/api/admin/*` (2026-10-15)
Tất cả yêu cầu vai trò `admin`. Thao tác ghi đều có audit log, ghi cùng transaction với thao tác, trừ tạo tài khoản: `signUpEmail` của Better Auth không tham gia được transaction Prisma, nên chỉ phần gán vai trò và audit log là atomic; nếu bước sau lỗi, tài khoản vừa tạo vẫn tồn tại.
- Tổng quan: `GET /api/admin`, `GET /api/admin/dashboard`.
- Tài khoản: `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id` (đổi vai trò), `POST /api/admin/users/:id/ban`, `POST /api/admin/users/:id/unban`. Admin tự hạ quyền hoặc tự khoá mình trả `409 CONFLICT`. Email trùng khi tạo trả `409 CONFLICT`.
- Danh mục: `/api/admin/topics` (kèm `/:id`), `/api/admin/historical-periods` (kèm `/:id`). Năm kết thúc nhỏ hơn năm bắt đầu trả `422 VALIDATION_ERROR`.
- Nội dung: `GET /api/admin/content`, `POST /api/admin/content/:kind/:id` (can thiệp: ẩn, khoá, thùng rác, khôi phục). Xoá Series còn tập hoạt động, hoặc khôi phục tập khi Series đang trong thùng rác, trả `409 HAS_DEPENDENCIES`.
- Cấu hình: `GET /api/admin/configs`, `PATCH /api/admin/configs/:key`. Chỉ khoá trong allowlist; khoá khác `404 NOT_FOUND`, giá trị sai `422 VALIDATION_ERROR`. Giá trị mới có hiệu lực ngay trên instance nhận yêu cầu, các instance khác có thể dùng giá trị cũ tới 60 giây.
- Nhật ký: `GET /api/admin/audit-logs`.
- Nhiệm vụ: `/api/admin/mission-templates` (kèm `/:id`), `GET/POST /api/admin/weekly-missions`. Kích hoạt mẫu hai lần trong cùng tuần trả `409 CONFLICT`; mẫu không hoạt động hoặc ngày không phải thứ Hai trả `422 VALIDATION_ERROR`.
- Admin vẫn sửa được nội dung bị khoá; Moderator không ghi đè được nội dung Admin đã ẩn hoặc đưa vào thùng rác (`403 CONTENT_LOCKED`).

### FIX — Quiz và quản trị (2026-10-15)
- Quiz của tập hoặc Series đã vào thùng rác không còn truy cập được và không còn trao XP.
- Moderator không còn vượt được khoá của Admin trên route quiz.
- Sửa hoặc xoá quiz đồng thời với lượt làm bài không còn tạo trạng thái lệch (khoá hàng ở DB); thay bằng `409 CONFLICT` rõ ràng.
- Chỉ các mã lỗi Prisma dự kiến mới được ánh xạ thành lỗi nghiệp vụ; lỗi khác trả `500`.
- Seed topic không còn xoá topic tự tạo, gán Series và chỉnh sửa của Admin.
- Seed nội dung dùng tài khoản Moderator từ biến môi trường, không còn tài khoản dev cố định.

### Chưa verify
- Bộ test API: 83 pass, 59 skip (chưa rõ lý do skip, có thể thiếu DB thật). Chưa chạy các test tích hợp quiz với DB thật.

### FIX — Verify audio (2026-10-10)
- `POST /api/studio/media-assets/:id/verify` với `kind: AUDIO` trước đây luôn trả `MEDIA_INVALID`. Nguyên nhân (xác nhận qua E2E + Admin API reference "Get details of a single resource by public ID": `media_metadata` mặc định `false`, áp dụng cho cả video/audio nên response thiếu `duration`): gateway không xin `duration` từ Cloudinary. Đã sửa: `fetchResource` truyền `media_metadata: true`. FE không cần đổi gì — flow ticket → upload → verify giờ trả `status: READY` kèm `durationMs`.

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
- Checklist publish đổi key — Series: `TOPIC`, `HISTORICAL_PHASE`, `YEAR_RANGE`, `HAS_PUBLISHED_EPISODE`. Episode: `BASIC_INFO`, `THIRD_PERSON_SCRIPT`, `THIRD_PERSON_AUDIO`. Series publish không còn bắt buộc nguồn (bỏ `HAS_SOURCE` và chốt `REQUIRED_FOR_PUBLISHED` khi xóa nguồn cuối).
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
- Upload PDF raw Cloudinary thật (đã có credential, chưa chạy lại e2e DOCUMENT).
