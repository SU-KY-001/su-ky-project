# ERD 04-quiz: Quiz

5 bảng chính, 2 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng stub: `episodes`, `media_assets`
- Hàng 1: `quizzes`, `quiz_workspace_drafts`
- Hàng 2: `quiz_questions`, `quiz_attempts`
- Hàng 3: `quiz_options`

## Bảng chính

### quizzes

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| episode_id | UUID | FK,UQ |  |
| pass_score_percent | SMALLINT |  |  |
| title | VARCHAR(200) |  | có |
| description | TEXT |  | có |
| poster_asset_id | UUID | FK | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### quiz_questions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| quiz_id | UUID | FK |  |
| question_text | TEXT |  |  |
| explanation | TEXT |  | có |
| time_limit | SMALLINT |  | có |
| sort_order | SMALLINT |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### quiz_options

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| question_id | UUID | FK |  |
| option_label | CHAR(1) |  |  |
| option_text | TEXT |  |  |
| is_correct | BOOLEAN |  |  |

Unique tổ hợp: (question_id, option_label)

### quiz_attempts

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| quiz_id | UUID | FK |  |
| user_id | VARCHAR(36) | FK |  |
| answers | JSONB |  |  |
| score_percent | SMALLINT |  |  |
| is_passed | BOOLEAN |  |  |
| submitted_at | TIMESTAMPTZ |  |  |

### quiz_workspace_drafts

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| episode_id | UUID | PK,FK |  |
| data | JSONB |  |  |
| revision | INTEGER |  |  |
| activated_revision | INTEGER |  |  |
| poster_asset_id | UUID | FK | có |
| updated_at | TIMESTAMPTZ |  |  |

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| quiz_questions.quiz_id | quizzes.id | 1 — N | CASCADE |
| quiz_options.question_id | quiz_questions.id | 1 — N | CASCADE |
| quiz_attempts.quiz_id | quizzes.id | 1 — N | CASCADE |

## Dây tới bảng stub

| Con (cột) | Stub (cha) | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| quizzes.episode_id | episodes.id | 1 — 1 | CASCADE |
| quiz_workspace_drafts.episode_id | episodes.id | 1 — 1 | CASCADE |
| quizzes.poster_asset_id | media_assets.id | 0..1 — N | RESTRICT |
| quiz_workspace_drafts.poster_asset_id | media_assets.id | 0..1 — N | RESTRICT |

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`quiz_attempts.user_id`
