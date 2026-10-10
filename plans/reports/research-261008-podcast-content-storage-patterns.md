# Nghiên cứu: các nền tảng podcast lưu Series, tập, kịch bản, nguồn và audio thế nào, so với thiết kế Sử Ký

Ngày: 2026-10-08 · Phạm vi: **chỉ phần lưu trữ dữ liệu podcast phổ biến**. Không so workflow AI tạo kịch bản (phần riêng của Sử Ký).
So với: `su-ky-document/schema/schema_261008175553.dbml`, `plans/reports/brainstorm-261008-content-schema-and-moderator-flow.md`.

## Tóm tắt
- Khung dữ liệu của Sử Ký **khớp với cách làm phổ biến**: Show/Series → Episode, file audio có kèm metadata (dung lượng, định dạng, thời lượng), danh mục nguồn dùng chung tách khỏi từng lần trích dẫn (giống CSL-JSON/Zotero).
- Khác biệt có chủ đích:
  - Không có RSS nên không cần GUID/enclosure.
  - Thứ tự tập theo `sort_order` thay vì số tập.
- Đã sửa sau khi so sánh:
  1. **Thêm bảng `media_assets`** (giống bảng `media` của Castopod). Mọi file đều có dòng trong DB nên dọn file thừa chỉ cần một query. Đã áp vào ERD.
  2. Index tìm kiếm cho tiêu đề Series/tập.
  3. Thêm `accessed_at` cho nguồn web *(tùy chọn)*.

## Phương pháp
- 5 lượt web search + đọc nguồn gốc.
- Castopod: nền tảng host podcast mã nguồn mở, triển khai Podcasting 2.0. Đọc migration `episodes`, `media`, `episodes_persons` trên GitHub nhánh `develop`, và tài liệu API `POST /episodes`.
- Apple Podcasts: yêu cầu kỹ thuật cho RSS.
- Podcasting 2.0: bộ tag RSS mở rộng (`transcript`, `person`, `chapters`, `season`, `episode`).
- CSL-JSON/Zotero: cách tách dữ liệu tài liệu (item) và dữ liệu trích dẫn (cite-item).
- Hướng dẫn loudness cho podcast năm 2026.

## Phát hiện

### 1. Series → Episode
| Ngoài kia (Castopod) | Sử Ký | Đánh giá |
|---|---|---|
| `episodes.podcast_id` FK, cascade | `episodes.series_id`, restrict + xóa mềm | OK. Sử Ký chặt hơn do có BR-27 |
| `UNIQUE(podcast_id, slug)` | `episodes.slug` unique toàn hệ thống (URL `/episodes/:slug`) | OK, chặt hơn. Giữ unique toàn bảng, không partial: tập trong thùng rác vẫn giữ slug nên khôi phục không bị đụng slug |
| `guid` không bao giờ đổi (Apple bắt buộc) | Không có | OK: không phát RSS; `id` uuid làm định danh. Mở RSS sau thì `id` dùng luôn làm guid |
| `number`, `season_number`, `type` (full/trailer/bonus) | `sort_order` | OK theo BR-43 vế 1. Trailer/bonus không có trong PRD |
| `description_markdown` + `description_html` (lưu sẵn bản HTML) | `description` text | OK, YAGNI |
| `created_by`, `updated_by` | Quyền theo `series.owner_id` + `audit_logs` | OK |
| `published_at` null = nháp; đặt giờ tương lai = hẹn giờ | `status` + `published_at` | OK; hẹn giờ đăng đã bị loại khỏi scope |
| `FULLTEXT(title, description)` | Trigram chỉ có trên sources/entities | **Thêm** index trigram `unaccent(title)` cho series/episodes để tìm kiếm cho Guest |
| Bộ đếm (`comments_count`...) | Không có | OK, chưa cần |

### 2. Lưu file audio
Castopod có **bảng `media` riêng**: `file_path` unique, `file_size`, `file_mimetype`, `file_metadata` JSON, `type` (image/audio/transcript/chapters/...), `uploaded_by`. Episode trỏ tới bằng `audio_id`, `cover_id`, `transcript_id`, `chapters_id`.

| Cách | Ưu | Nhược |
|---|---|---|
| **Bảng `media_assets` riêng** (giống Castopod) | Mọi file có dòng trong DB; biết file nào đang dùng nhờ FK; dọn file = 1 query + gọi xóa | Thêm 1 bảng + 1 join |
| Cột ngay trên `episode_narrations` | Ít bảng hơn | File cũ/mồ côi không còn bản ghi để lần ra; phải gắn tag/folder và quản lý dọn bên Cloudinary |

→ **Chốt bảng `media_assets`** (người dùng chốt 261008). Thiết kế:
- Server **sinh `public_id` và tạo dòng `PENDING` trước khi cấp chữ ký upload**. Vì vậy mọi file trên Cloudinary đều có dòng trong DB, kể cả upload bỏ dở.
- Xác minh với Cloudinary xong → `READY` + `version`, `format`, `size_bytes`, `duration_ms`.
- Dùng ở đâu thì biết qua FK: `episode_narrations.audio_asset_id` (unique), `series.cover_image_asset_id`. **Không lưu cờ "đang dùng"** để tránh lệch với FK. FK `on delete restrict` chặn xóa nhầm file đang dùng.
- Thay audio = trỏ FK sang asset mới + ghi `detached_at` cho asset cũ trong cùng transaction.
- **Job dọn:** `status <> DELETED` + không còn FK trỏ tới + `COALESCE(detached_at, created_at) < now() - grace` → `destroy` trên Cloudinary ("not found" coi như xong) → `DELETED`. Grace lấy từ `system_configs`. Đếm từ `detached_at` chứ không từ `created_at`: file cũ thường đã tạo từ lâu, nếu đếm theo `created_at` nó bị xóa ngay lần chạy kế tiếp, cắt người đang nghe và mất khả năng khôi phục.
- MIME **không lưu cột riêng**: suy từ `format` bằng map tĩnh, tránh 2 nguồn dữ liệu lệch nhau. Castopod cần `file_mimetype` vì nó lưu file thô, không có `format` như Cloudinary.
- Phát nhạc: Apple yêu cầu server hỗ trợ **HEAD + byte-range** để tua và stream. Cloudinary có hỗ trợ; **kiểm tra cụ thể với URL `authenticated` có chữ ký** khi làm spike.

### 3. Kịch bản và transcript
- Ngoài kia, transcript là **file riêng**: `podcast:transcript` có `url`, `type` (text/plain, text/html, text/vtt, application/json, srt), `language`, `rel="captions"` nếu có mốc thời gian. Castopod lưu file qua `transcript_id` + `transcript_remote_url`.
- Sử Ký lưu `script_content` (text) trong DB. Với audio TTS, script chính là transcript. **Hợp lý**: Mod sửa trực tiếp được, tìm kiếm được, không phải quản lý thêm file.
- Lưu ý: chưa có mốc thời gian (VTT) nên không highlight câu đang phát được. PRD không yêu cầu → để sau. Nếu cần, thêm cột `captions_public_id`, không phải sửa schema lớn.

### 4. Nguồn tham khảo (đúng mô hình chuẩn)
CSL-JSON (Zotero và các trình quản lý trích dẫn khác) tách:
- **Item** (dữ liệu tài liệu): `type`, `title`, `author[]`, `translator`, `publisher`, `issued`, `ISBN`, `URL`, `container-title`, `volume`...
- **Cite-item** (từng lần trích dẫn): `locator`, `label` (page/chapter/section/volume…), `prefix`, `suffix`.

| CSL | Sử Ký | Đánh giá |
|---|---|---|
| Item | `sources` | Khớp |
| Cite-item `locator` | `episode_sources.locator` | Khớp |
| Cite-item `label` | Không có (locator là text tự do) | OK: sử Việt hay ghi "Bản kỷ, quyển 5, tờ 12", khó đưa về enum. YAGNI |
| `prefix`/`suffix` | `excerpt` | Khác mục đích; đủ dùng |
| `type` (book/article/webpage/manuscript) | Không có; `tier` là độ tin cậy, không phải loại tài liệu | OK hiện tại. Cần định dạng trích dẫn theo kiểu tài liệu thì thêm `source_type` |
| `accessed` (ngày truy cập URL) | Không có | **Tùy chọn:** thêm `sources.accessed_at`. Chuẩn trích dẫn web đều yêu cầu; rẻ |

### 5. Người / nhân vật
- Ngoài kia, `episodes_persons(person_id, person_group, person_role)` dùng cho **credit**: host, khách mời, biên tập, theo taxonomy `podcast:person`.
- Sử Ký dùng `historical_entities` + `episode_entity_tags` cho **đối tượng lịch sử**, không phải credit. Hai việc khác nhau, không cần gộp.
- Sử Ký không có credit người làm. PRD không yêu cầu → OK. Nếu cần ghi giọng ElevenLabs, `audio_provider` đã có.

### 6. Chất lượng audio (quy trình, không đụng schema)
- Mức loudness chuẩn cho podcast giọng nói: khoảng **-16 LUFS, true peak -1 dBTP**, thường mono.
- → Ghi vào hướng dẫn upload cho Mod (S4) cùng mức 64–96 kbps. Hệ thống không tự đo (YAGNI).

## Chênh lệch & đề xuất
| # | Việc | Mức | Đổi ERD? |
|---|---|---|---|
| 1 | Slug: giữ unique toàn bảng như hiện tại (khác Castopod, nhưng đơn giản hơn và khôi phục từ thùng rác an toàn) | Giữ | Không |
| 2 | Bảng `media_assets` + FK từ bản kể/Series + job dọn file | Nên | **Đã áp** |
| 3 | MIME suy từ `format`, không thêm cột | Giữ | Không |
| 4 | Index trigram `unaccent(title)` cho `series`, `episodes` | Nên | Có (SQL tay) |
| 5 | `sources.accessed_at` | Tùy chọn | Có |
| 6 | Kiểm tra byte-range với URL authenticated có chữ ký | Spike | Không |
| 7 | Hướng dẫn loudness/bitrate trong màn upload | Nhỏ | Không |

**Không nên làm** (có ở ngoài kia nhưng Sử Ký không cần): `guid`, season/episode type, explicit, location, credit người làm, bộ đếm, lưu sẵn HTML, file transcript/chapters.

## Câu hỏi còn mở
- Có cần định dạng trích dẫn theo chuẩn (APA/Chicago) không? Nếu có thì thêm `source_type` + nhãn locator.
- Cloudinary authenticated + signed URL có trả `Accept-Ranges` đầy đủ trên gói Free không: cần test thật.

## Nguồn
- Castopod `episodes`: https://raw.githubusercontent.com/ad-aures/castopod/develop/app/Database/Migrations/2021-06-05-170000_add_episodes.php
- Castopod `media`: https://raw.githubusercontent.com/ad-aures/castopod/develop/modules/Media/Database/Migrations/2021-05-29-120000_add_media.php
- Castopod `episodes_persons`: https://raw.githubusercontent.com/ad-aures/castopod/develop/app/Database/Migrations/2021-12-25-140000_add_episodes_persons.php
- Castopod API add episode: https://docs.castopod.org/develop/en/api/operations/add-episode/
- Apple RSS requirements: https://podcasters.apple.com/support/823-podcast-requirements
- Podcasting 2.0 namespace: https://podcasting2.org/docs/podcast-namespace/1.0 · transcript: https://podcasting2.org/docs/podcast-namespace/tags/transcript
- CSL cite-item (locator/label): https://raw.githubusercontent.com/fiduswriter/BiblioJSON/main/CITATIONS_IN_DOCS.md · CSL spec: https://docs.citationstyles.org/en/v1.0.2/specification.html
- Loudness: https://www.criticallisteninglab.com/en/learn/streaming/podcast-hosts
