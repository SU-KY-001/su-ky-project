# ERD 05-engagement: Nghe và gamification

6 bảng chính, 3 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `episode_narrations`, `episodes`, `media_assets`
- Hàng 1: `listening_progress`, `mission_templates`, `xp_awards`
- Hàng 2: `weekly_missions`
- Hàng 3: `user_weekly_missions`
- Hàng 4: `user_weekly_mission_items`

## Bảng chính

### listening_progress

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| user_id | VARCHAR(36) | FK |  |
| narration_id | UUID | FK |  |
| episode_id | UUID | FK |  |
| audio_asset_id | UUID | FK |  |
| position_ms | INTEGER |  |  |
| played_bitmap | BYTEA |  |  |
| played_seconds | INTEGER |  |  |
| completed_at | TIMESTAMPTZ |  | có |
| last_listened_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (user_id, narration_id)

### mission_templates

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| title | VARCHAR(255) |  |  |
| description | TEXT |  | có |
| activity_type | mission_activity_type |  |  |
| target_count | SMALLINT |  |  |
| xp_reward | INTEGER |  |  |
| is_active | BOOLEAN |  |  |
| created_by_id | VARCHAR(36) | FK | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### weekly_missions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| mission_template_id | UUID | FK |  |
| week_start_date | DATE |  |  |
| title | VARCHAR(255) |  |  |
| activity_type | mission_activity_type |  |  |
| target_count | SMALLINT |  |  |
| xp_reward | INTEGER |  |  |
| activated_at | TIMESTAMPTZ |  |  |
| activated_by_id | VARCHAR(36) | FK |  |

Unique tổ hợp: (mission_template_id, week_start_date)

### user_weekly_missions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| weekly_mission_id | UUID | FK |  |
| user_id | VARCHAR(36) | FK |  |
| progress_count | SMALLINT |  |  |
| completed_at | TIMESTAMPTZ |  | có |
| updated_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (weekly_mission_id, user_id)

### user_weekly_mission_items

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| user_weekly_mission_id | UUID | PK,FK |  |
| content_id | UUID | PK |  |
| counted_at | TIMESTAMPTZ |  |  |

### xp_awards

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| user_id | VARCHAR(36) | FK |  |
| source_type | xp_source_type |  |  |
| source_id | UUID |  |  |
| xp_amount | INTEGER |  |  |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (user_id, source_type, source_id)

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| weekly_missions.mission_template_id | mission_templates.id | 1 — N | RESTRICT |
| user_weekly_missions.weekly_mission_id | weekly_missions.id | 1 — N | CASCADE |
| user_weekly_mission_items.user_weekly_mission_id | user_weekly_missions.id | 1 — N | CASCADE |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| listening_progress.narration_id | episode_narrations.id | 1 — N | CASCADE |
| listening_progress.episode_id | episodes.id | 1 — N | RESTRICT |
| listening_progress.audio_asset_id | media_assets.id | 1 — N | RESTRICT |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`listening_progress.user_id`, `mission_templates.created_by_id`, `weekly_missions.activated_by_id`, `user_weekly_missions.user_id`, `xp_awards.user_id`

## Quan hệ không có FK (ghi chú bằng chữ)

- `user_weekly_mission_items.content_id` và `xp_awards.source_id` trỏ đa hình, không có FK.
