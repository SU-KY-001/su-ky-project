# ERD 02-content: Nội dung: series, episode

6 bảng chính, 8 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `topics`, `historical_phases`, `media_assets`, `historical_entities`, `historical_entity_revisions`, `sources`, `source_revisions`, `historical_citations`
- Hàng 1: `series`
- Hàng 2: `episodes`, `series_sources`
- Hàng 3: `episode_narrations`, `episode_attachments`, `episode_entity_tags`

## Bảng chính

### series

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| owner_id | VARCHAR(36) | FK |  |
| topic_id | UUID | FK | có |
| historical_phase_id | UUID | FK | có |
| title | VARCHAR(255) |  |  |
| slug | VARCHAR(280) | UQ |  |
| description | TEXT |  | có |
| language | VARCHAR(35) |  |  |
| cover_image_asset_id | UUID | FK | có |
| cover_landscape_asset_id | UUID | FK | có |
| start_year | INTEGER |  | có |
| end_year | INTEGER |  | có |
| status | content_status |  |  |
| status_before_delete | content_status |  | có |
| admin_locked_at | TIMESTAMPTZ |  | có |
| admin_locked_by_id | VARCHAR(36) | FK | có |
| published_at | TIMESTAMPTZ |  | có |
| deleted_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| primary_historical_event_id | UUID | FK | có |
| historical_entity_revision_id | UUID | FK | có |
| publication_evidence | JSONB |  | có |

### episodes

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| series_id | UUID | FK |  |
| title | VARCHAR(255) |  |  |
| slug | VARCHAR(280) | UQ |  |
| description | TEXT |  | có |
| sort_order | INTEGER |  |  |
| status | content_status |  |  |
| status_before_delete | content_status |  | có |
| admin_locked_at | TIMESTAMPTZ |  | có |
| admin_locked_by_id | VARCHAR(36) | FK | có |
| published_at | TIMESTAMPTZ |  | có |
| deleted_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| content_revision | INTEGER |  |  |
| publication_approval | JSONB |  | có |

### episode_narrations

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| episode_id | UUID | FK |  |
| narration_type | narration_type |  |  |
| narrator_entity_id | UUID | FK | có |
| script_content | TEXT |  | có |
| script_document | JSONB |  | có |
| dialogue | JSONB |  | có |
| audio_analysis | JSONB |  | có |
| audio_asset_id | UUID | FK,UQ | có |
| script_updated_at | TIMESTAMPTZ |  | có |
| audio_attached_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (episode_id, narration_type)

### episode_attachments

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| episode_id | UUID | FK |  |
| media_asset_id | UUID | FK,UQ |  |
| file_name | VARCHAR(255) |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### episode_entity_tags

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| episode_id | UUID | FK |  |
| entity_id | UUID | FK |  |
| status | entity_tag_status |  |  |
| origin | tag_origin |  |  |
| confirmed_by_id | VARCHAR(36) | FK | có |
| confirmed_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (episode_id, entity_id)

### series_sources

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| series_id | UUID | FK |  |
| source_id | UUID | FK |  |
| locator | VARCHAR(255) |  |  |
| excerpt | TEXT |  | có |
| sort_order | SMALLINT |  |  |
| created_at | TIMESTAMPTZ |  |  |
| source_revision_id | UUID | FK | có |
| historical_citation_id | UUID | FK | có |

Unique tổ hợp: (series_id, source_id, locator)

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| episodes.series_id | series.id | 1 — N | RESTRICT |
| episode_narrations.episode_id | episodes.id | 1 — N | CASCADE |
| episode_attachments.episode_id | episodes.id | 1 — N | CASCADE |
| episode_entity_tags.episode_id | episodes.id | 1 — N | CASCADE |
| series_sources.series_id | series.id | 1 — N | CASCADE |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| series.topic_id | topics.id | 0..1 — N | RESTRICT |
| series.historical_phase_id | historical_phases.id | 0..1 — N | RESTRICT |
| series.cover_image_asset_id | media_assets.id | 0..1 — N | RESTRICT |
| series.cover_landscape_asset_id | media_assets.id | 0..1 — N | RESTRICT |
| episode_narrations.audio_asset_id | media_assets.id | 0..1 — 1 | RESTRICT |
| episode_attachments.media_asset_id | media_assets.id | 1 — 1 | RESTRICT |
| series.primary_historical_event_id | historical_entities.id | 0..1 — N | RESTRICT |
| episode_narrations.narrator_entity_id | historical_entities.id | 0..1 — N | RESTRICT |
| episode_entity_tags.entity_id | historical_entities.id | 1 — N | RESTRICT |
| series.historical_entity_revision_id | historical_entity_revisions.id | 0..1 — N | RESTRICT |
| series_sources.source_id | sources.id | 1 — N | RESTRICT |
| series_sources.source_revision_id | source_revisions.id | 0..1 — N | RESTRICT |
| series_sources.historical_citation_id | historical_citations.id | 0..1 — N | RESTRICT |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`series.owner_id`, `series.admin_locked_by_id`, `episodes.admin_locked_by_id`, `episode_entity_tags.confirmed_by_id`
