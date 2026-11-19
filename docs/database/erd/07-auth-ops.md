# ERD 07-auth-ops: Auth, hạ tầng, exhibitions

9 bảng chính, 0 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng 1: `users`, `verifications`, `idempotency_keys`, `rate_limit_buckets`, `system_configs`, `audit_logs`, `exhibitions`
- Hàng 2: `sessions`, `accounts`

## Bảng chính

### users

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | VARCHAR(36) | PK |  |
| name | VARCHAR(255) |  |  |
| email | VARCHAR(255) | UQ |  |
| email_verified | BOOLEAN |  |  |
| image | VARCHAR(2048) |  | có |
| role | VARCHAR(16) |  |  |
| banned | BOOLEAN |  |  |
| ban_reason | TEXT |  | có |
| ban_expires_at | TIMESTAMPTZ |  | có |
| total_xp | INTEGER |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### sessions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | VARCHAR(36) | PK |  |
| expires_at | TIMESTAMPTZ |  |  |
| token | VARCHAR(500) | UQ |  |
| ip_address | VARCHAR(45) |  | có |
| user_agent | TEXT |  | có |
| user_id | VARCHAR(36) | FK |  |
| impersonated_by_id | VARCHAR(36) |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### accounts

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | VARCHAR(36) | PK |  |
| account_id | TEXT |  |  |
| provider_id | VARCHAR(64) |  |  |
| user_id | VARCHAR(36) | FK |  |
| access_token | TEXT |  | có |
| refresh_token | TEXT |  | có |
| id_token | TEXT |  | có |
| access_token_expires_at | TIMESTAMPTZ |  | có |
| refresh_token_expires_at | TIMESTAMPTZ |  | có |
| scope | TEXT |  | có |
| password | TEXT |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### verifications

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | VARCHAR(36) | PK |  |
| identifier | TEXT |  |  |
| value | TEXT |  |  |
| expires_at | TIMESTAMPTZ |  |  |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

### idempotency_keys

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| user_id | VARCHAR(36) | FK |  |
| key | VARCHAR(255) |  |  |
| method | VARCHAR(10) |  |  |
| route | VARCHAR(255) |  |  |
| request_hash | CHAR(64) |  |  |
| status | VARCHAR(20) |  |  |
| response_status | SMALLINT |  | có |
| response_body | JSONB |  | có |
| response_location | VARCHAR(2048) |  | có |
| created_at | TIMESTAMPTZ |  |  |
| expires_at | TIMESTAMPTZ |  |  |

Unique tổ hợp: (user_id, key)

### rate_limit_buckets

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| bucket_key | VARCHAR(255) | PK |  |
| window_start | TIMESTAMPTZ | PK |  |
| count | INTEGER |  |  |

### system_configs

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| key | VARCHAR(100) | PK |  |
| value | JSONB |  |  |
| description | TEXT |  | có |
| updated_by_id | VARCHAR(36) | FK | có |
| updated_at | TIMESTAMPTZ |  |  |

### audit_logs

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| actor_id | VARCHAR(36) | FK | có |
| action | VARCHAR(64) |  |  |
| resource_type | VARCHAR(64) |  |  |
| resource_id | VARCHAR(128) |  |  |
| changes | JSONB |  |  |
| ip_address | VARCHAR(45) |  | có |
| actor_type | VARCHAR(16) |  |  |
| correlation_id | VARCHAR(64) |  | có |
| job_id | VARCHAR(128) |  | có |
| from_status | VARCHAR(64) |  | có |
| to_status | VARCHAR(64) |  | có |
| created_at | TIMESTAMPTZ |  |  |

### exhibitions

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| owner_id | VARCHAR(36) | FK |  |
| slug | VARCHAR(280) | UQ |  |
| title | VARCHAR(255) |  |  |
| draft_revision | INTEGER |  |  |
| draft_document | JSONB |  |  |
| published_document | JSONB |  | có |
| published_revision | INTEGER |  | có |
| published_at | TIMESTAMPTZ |  | có |
| created_at | TIMESTAMPTZ |  |  |
| updated_at | TIMESTAMPTZ |  |  |

## Dây cần vẽ (trong domain)

| Con (cột) | Cha | Quan hệ cha—con | ON DELETE |
|---|---|---|---|
| sessions.user_id | users.id | 1 — N | CASCADE |
| accounts.user_id | users.id | 1 — N | CASCADE |

## Dây tới bảng stub

Không có.

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`idempotency_keys.user_id`, `system_configs.updated_by_id`, `audit_logs.actor_id`, `exhibitions.owner_id`

## Ghi chú

- Dây nội bộ chỉ có `sessions` và `accounts` → `users`. Các bảng hạ tầng còn lại chỉ liệt kê, không có dây nội bộ.
