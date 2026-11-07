# ERD 06-ai-review: AI review

3 bảng chính, 1 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `episodes`
- Hàng 1: `ai_checks`, `ai_narrative_angles`
- Hàng 2: `ai_check_items`

## Bảng chính

### ai_checks

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| user_id | VARCHAR(36) |  |  |
| episode_id | UUID | FK |  |
| kind | ai_check_kind |  |  |
| status | ai_check_status |  |  |
| config | JSONB |  |  |
| total_blocks | INTEGER |  |  |
| processed_blocks | INTEGER |  |  |
| failed_blocks | INTEGER |  |  |
| tool_calls | INTEGER |  |  |
| sources_used | JSONB |  |  |
| input_tokens | INTEGER |  |  |
| output_tokens | INTEGER |  |  |
| model | VARCHAR(100) |  | có |
| prompt_version | VARCHAR(50) |  | có |
| heartbeat_at | TIMESTAMPTZ |  | có |
| error_code | VARCHAR(100) |  | có |
| started_at | TIMESTAMPTZ |  |  |
| finished_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |

### ai_check_items

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| check_id | UUID | FK |  |
| seq | INTEGER |  |  |
| block_ref | VARCHAR(32) |  |  |
| block_hash | VARCHAR(16) |  |  |
| block_prev_hash | VARCHAR(16) |  |  |
| block_dup | SMALLINT |  |  |
| kind | ai_issue_kind |  |  |
| severity | ai_issue_severity |  |  |
| basis | ai_item_basis |  |  |
| evidence | JSONB |  |  |
| message | TEXT |  |  |
| suggestion | TEXT |  | có |
| status | ai_item_status |  |  |
| applied_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (check_id, seq)

### ai_narrative_angles

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| user_id | VARCHAR(36) |  |  |
| name | VARCHAR(60) |  |  |
| description | VARCHAR(160) |  |  |
| guide | VARCHAR(500) |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| ai_check_items.check_id | ai_checks.id | 1 — N | CASCADE |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| ai_checks.episode_id | episodes.id | 1 — N | CASCADE |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

Không có.
