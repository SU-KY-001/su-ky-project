# Deploy Log

Mỗi lần chạy `docker build && docker push` (theo `docs/docker-build-push-guide.md`), ghi lại 1 dòng vào bảng dưới.
Dùng để biết image `lgdlong/suky-api:latest` trên Docker Hub đang ở commit nào.

## Format

| Thời gian          | Commit   | Branch        | Message        | Image  |
| ------------------ | -------- | ------------- | -------------- | ------ |
| `YYYY-MM-DD HH:MM` | `abcdef` | `branch-name` | commit message | 🔵 api |

---

## Lệnh ghi log nhanh (chạy sau `docker push`)

```bash
echo "| $(date '+%Y-%m-%d %H:%M') | $(git rev-parse --short HEAD) | $(git branch --show-current) | $(git log --oneline -1 --format='%s') | 🔵 api |" >> docs/deploy-log.md
```

Build từ working tree chưa commit: thêm `+dirty` sau hash và liệt kê file thay đổi trong cột Message.
Dấu `|` trong message làm vỡ bảng — thay bằng `/`.

Xác minh image đang chạy trên VPS:

```bash
docker inspect lgdlong/suky-api:latest --format '{{.Id}}'
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
```

---

## Lịch sử deploy

> Bảng luôn nằm ở đáy file — thêm dòng mới bằng lệnh ở mục trên.

| Thời gian | Commit | Branch | Message | Image |
| --------- | ------ | ------ | ------- | ----- |
| 2026-10-28 16:13 | d1d7699+dirty | staging | deploy prep: Dockerfile, compose.prod, Makefile.prod, docs, cookie SameSite=None | 🔵 api |
| 2026-10-28 17:09 | ee12409+dirty | staging | staging + dev merge (quiz authoring, 3 migrations); Makefile.prod uncommitted | 🔵 api |
