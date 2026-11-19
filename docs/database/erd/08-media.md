# ERD 08-media: Media dùng chung

1 bảng chính, 0 bảng stub.

## Cách vẽ

- Bảng chính: vẽ đủ cột. Bảng **stub**: chỉ vẽ hộp có tên bảng và cột PK, tô màu xám, đặt hàng trên cùng.
- Dây vào `users`: **không vẽ**, chỉ ghi chú cuối hình (danh sách bên dưới).
- Bảng cha đặt trên, bảng con đặt dưới, để dây đi xuống một chiều và không cắt nhau.

## Bố cục gợi ý (hàng từ trên xuống)

- Hàng 1: `media_assets`

## Bảng chính

### media_assets

| Cột | Kiểu | Khóa | Null |
|---|---|---|---|
| id | UUID | PK |  |
| kind | media_kind |  |  |
| public_id | VARCHAR(255) | UQ |  |
| status | media_status |  |  |
| version | BIGINT |  | có |
| format | VARCHAR(10) |  | có |
| size_bytes | BIGINT |  | có |
| duration_ms | INTEGER |  | có |
| width_px | INTEGER |  | có |
| height_px | INTEGER |  | có |
| uploaded_by_id | VARCHAR(36) | FK |  |
| created_at | TIMESTAMPTZ |  |  |
| verified_at | TIMESTAMPTZ |  | có |
| detached_at | TIMESTAMPTZ |  | có |
| deleted_at | TIMESTAMPTZ |  | có |

## Dây cần vẽ (trong domain)

Không có.

## Dây tới bảng stub

Không có.

## Ghi chú cuối hình: cột trỏ vào `users` (không vẽ dây)

`media_assets.uploaded_by_id`
