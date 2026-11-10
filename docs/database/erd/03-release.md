# ERD 03-release: Phát hành và duyệt

6 bảng chính, 1 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `episodes`
- Hàng 1: `release_schedules`, `outbox_events`
- Hàng 2: `production_assignments`, `release_reassignment_tickets`, `episode_reviews`, `release_reminders`

## Bảng chính

### release_schedules

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| episode_id | UUID | FK | có |
| title | VARCHAR(255) |  |  |
| production_deadline | TIMESTAMPTZ |  |  |
| scheduled_at | TIMESTAMPTZ |  |  |
| status | release_schedule_status |  |  |
| version | INTEGER |  |  |
| created_by_id | VARCHAR(36) | FK |  |
| published_at | TIMESTAMPTZ |  | có |
| cancelled_at | TIMESTAMPTZ |  | có |
| failure_code | VARCHAR(64) |  | có |
| failure_message | TEXT |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### production_assignments

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| schedule_id | UUID | PK,FK |  |
| moderator_id | VARCHAR(36) | PK,FK |  |
| assigned_by_id | VARCHAR(36) | FK |  |
| assigned_at | TIMESTAMPTZ | PK |  |
| removed_at | TIMESTAMPTZ |  | có |

### release_reassignment_tickets

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| schedule_id | UUID | FK |  |
| requested_by_id | VARCHAR(36) | FK |  |
| reason | TEXT |  |  |
| status | release_reassignment_ticket_status |  |  |
| replacement_moderator_id | VARCHAR(36) | FK | có |
| resolved_by_id | VARCHAR(36) | FK | có |
| decision_reason | TEXT |  | có |
| resolved_at | TIMESTAMPTZ |  | có |
| cancelled_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### episode_reviews

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| schedule_id | UUID | FK |  |
| episode_id | UUID | FK |  |
| revision | INTEGER |  |  |
| status | episode_review_status |  |  |
| submitted_by_id | VARCHAR(36) | FK |  |
| submitted_at | TIMESTAMPTZ |  |  |
| reviewed_by_id | VARCHAR(36) | FK | có |
| reviewed_at | TIMESTAMPTZ |  | có |
| review_note | TEXT |  | có |
| readiness_snapshot | JSONB |  | có |

### release_reminders

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| schedule_id | UUID | FK |  |
| moderator_id | VARCHAR(36) | FK |  |
| schedule_version | INTEGER |  |  |
| message | TEXT |  |  |
| created_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (schedule_id, moderator_id, schedule_version)

### outbox_events

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| event_type | VARCHAR(100) |  |  |
| aggregate_type | VARCHAR(64) |  |  |
| aggregate_id | VARCHAR(128) |  |  |
| payload | JSONB |  |  |
| created_at | TIMESTAMPTZ |  |  |
| dispatched_at | TIMESTAMPTZ |  | có |
| attempts | INTEGER |  |  |
| last_error | TEXT |  | có |

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| production_assignments.schedule_id | release_schedules.id | 1 — N | CASCADE |
| release_reassignment_tickets.schedule_id | release_schedules.id | 1 — N | CASCADE |
| episode_reviews.schedule_id | release_schedules.id | 1 — N | CASCADE |
| release_reminders.schedule_id | release_schedules.id | 1 — N | CASCADE |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| release_schedules.episode_id | episodes.id | 0..1 — N | RESTRICT |
| episode_reviews.episode_id | episodes.id | 1 — N | CASCADE |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`release_schedules.created_by_id`, `production_assignments.moderator_id`, `production_assignments.assigned_by_id`, `release_reassignment_tickets.requested_by_id`, `release_reassignment_tickets.replacement_moderator_id`, `release_reassignment_tickets.resolved_by_id`, `episode_reviews.submitted_by_id`, `episode_reviews.reviewed_by_id`, `release_reminders.moderator_id`
