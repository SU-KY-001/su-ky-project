# ERD 01-catalog: Catalog lịch sử và nguồn

9 bảng chính, 1 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `media_assets`
- Hàng 1: `historical_periods`, `sources`, `topics`
- Hàng 2: `historical_phases`, `source_pages`, `source_revisions`
- Hàng 3: `historical_entities`
- Hàng 4: `historical_entity_revisions`, `historical_citations`

## Bảng chính

### historical_periods

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| name | VARCHAR(255) | UQ |  |
| slug | VARCHAR(280) | UQ |  |
| start_year | INTEGER |  | có |
| end_year | INTEGER |  | có |
| sort_order | SMALLINT |  |  |
| is_active | BOOLEAN |  |  |
| created_by_id | VARCHAR(36) | FK | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| time | JSONB |  |  |
| version | INTEGER |  |  |
| deleted_at | TIMESTAMPTZ |  | có |
| summary | TEXT |  | có |

### historical_phases

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| period_id | UUID | FK |  |
| name | VARCHAR(255) |  |  |
| slug | VARCHAR(280) | UQ |  |
| start_year | INTEGER |  | có |
| end_year | INTEGER |  | có |
| note | TEXT |  | có |
| sort_order | SMALLINT |  |  |
| is_active | BOOLEAN |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| time | JSONB |  |  |
| version | INTEGER |  |  |
| deleted_at | TIMESTAMPTZ |  | có |
| summary | TEXT |  | có |
| created_by_id | VARCHAR(36) |  | có |

### historical_entities

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| entity_type | historical_entity_type |  |  |
| name | VARCHAR(255) |  |  |
| slug | VARCHAR(280) | UQ |  |
| aliases | TEXT |  | có |
| start_year | INTEGER |  | có |
| end_year | INTEGER |  | có |
| summary | TEXT |  | có |
| created_by_id | VARCHAR(36) | FK | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| time | JSONB |  |  |
| version | INTEGER |  |  |
| deleted_at | TIMESTAMPTZ |  | có |
| historical_phase_id | UUID | FK | có |

### historical_entity_revisions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| entity_id | UUID | FK |  |
| version | INTEGER |  |  |
| snapshot | JSONB |  |  |
| created_by_id | VARCHAR(36) |  | có |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (entity_id, version)

### historical_citations

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| period_id | UUID | FK | có |
| phase_id | UUID | FK | có |
| entity_id | UUID | FK | có |
| source_id | UUID | FK |  |
| source_revision_id | UUID | FK |  |
| locator | VARCHAR(255) |  |  |
| excerpt | TEXT |  | có |
| note | TEXT |  | có |
| sort_order | INTEGER |  |  |
| created_by_id | VARCHAR(36) |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### sources

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| tier | source_tier |  |  |
| title | VARCHAR(500) |  |  |
| original_title | VARCHAR(500) |  | có |
| author | VARCHAR(255) |  | có |
| translator | VARCHAR(255) |  | có |
| publisher | VARCHAR(255) |  | có |
| publication_year | INTEGER |  | có |
| edition | VARCHAR(100) |  | có |
| isbn | VARCHAR(17) |  | có |
| url | VARCHAR(2048) |  | có |
| created_by_id | VARCHAR(36) | FK | có |
| archived_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |
| file_asset_id | UUID | FK,UQ | có |
| version | INTEGER |  |  |
| verification_status | source_verification_status |  |  |
| verified_version | INTEGER |  | có |
| verified_by_id | VARCHAR(36) |  | có |
| verified_at | TIMESTAMPTZ |  | có |
| verification_note | TEXT |  | có |

### source_pages

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| source_id | UUID | FK |  |
| version | INTEGER |  |  |
| page | INTEGER |  |  |
| text | TEXT |  |  |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (source_id, version, page)

### source_revisions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| source_id | UUID | FK |  |
| version | INTEGER |  |  |
| snapshot | JSONB |  |  |
| file_asset_id | UUID | FK | có |
| created_by_id | VARCHAR(36) |  | có |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (source_id, version)

### topics

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| name | VARCHAR(255) | UQ |  |
| slug | VARCHAR(280) | UQ |  |
| sort_order | SMALLINT |  |  |
| is_active | BOOLEAN |  |  |
| created_by_id | VARCHAR(36) | FK | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| historical_phases.period_id | historical_periods.id | 1 — N | RESTRICT |
| historical_entities.historical_phase_id | historical_phases.id | 0..1 — N | RESTRICT |
| historical_entity_revisions.entity_id | historical_entities.id | 1 — N | RESTRICT |
| historical_citations.period_id | historical_periods.id | 0..1 — N | RESTRICT |
| historical_citations.phase_id | historical_phases.id | 0..1 — N | RESTRICT |
| historical_citations.entity_id | historical_entities.id | 0..1 — N | RESTRICT |
| historical_citations.source_id | sources.id | 1 — N | RESTRICT |
| historical_citations.source_revision_id | source_revisions.id | 1 — N | RESTRICT |
| source_pages.source_id | sources.id | 1 — N | CASCADE |
| source_revisions.source_id | sources.id | 1 — N | RESTRICT |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| sources.file_asset_id | media_assets.id | 0..1 — 1 | RESTRICT |
| source_revisions.file_asset_id | media_assets.id | 0..1 — N | RESTRICT |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`historical_periods.created_by_id`, `historical_entities.created_by_id`, `sources.created_by_id`, `topics.created_by_id`
