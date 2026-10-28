# Build and Push Docker Image — Su-Ky API

Guide build và push image API của Su-Ky lên Docker Hub, rồi deploy lên VPS (Traefik). Chỉ host **DB + API (+ worker)**, không host web. Kết quả: một URL `https://suky-api.the1struleoffightclub.top`.

## Prerequisites

- Docker installed and running
- Docker Hub account: `lgdlong`
- VPS đã có Traefik chạy riêng, network `proxy-net`, certresolver `letsencrypt` (giống `nexus-platform-prod-vps`)
- DNS: A record `suky-api.the1struleoffightclub.top` → IP VPS

## Image Naming Convention

| Service | Image Name | Dockerfile |
|---------|------------|------------|
| API | `lgdlong/suky-api:latest` | `apps/api/Dockerfile` |
| Worker | dùng chung `lgdlong/suky-api:latest` | `apps/api/Dockerfile` (`command: bun src/worker.ts`) |

Một image duy nhất. Prisma CLI nằm trong image để chạy migration bằng `make -f Makefile.prod migrate`.

## Architecture

```
turbo prune @repo/api → bun install (--filter @repo/api) → prisma generate → runner (oven/bun slim + ffmpeg)
```

- Build context là **repo root**, Dockerfile nằm ở `apps/api/`.
- `turbo prune` chỉ giữ `@repo/api`, `@repo/db`, `@repo/shared`, `@repo/tsconfig` nên deps của web/mobile không vào image.
- API chạy thẳng từ source TypeScript (`bun src/index.ts`), không bundle: `structured-agent-runner.ts` dùng `import.meta.resolve("pi-web-access/package.json")` lúc runtime, bundle sẽ làm hỏng đường dẫn này.
- `ffmpeg` bắt buộc cho TTS (`voice.service.ts` ghép WAV → mp3).
- Container chạy user `bun` (không root). `HEALTHCHECK` gọi `GET /health` (kiểm tra DB và heartbeat worker).

## ⚠️ Deploy Log — BẮT BUỘC

**Trước khi build:** đọc [`docs/deploy-log.md`](./deploy-log.md) để biết image hiện tại đang ở commit nào.

**Sau khi push thành công:** ghi log:

```bash
echo "| $(date '+%Y-%m-%d %H:%M') | $(git rev-parse --short HEAD) | $(git branch --show-current) | $(git log --oneline -1 --format='%s') | 🔵 api |" >> docs/deploy-log.md
```

Nếu build từ working tree chưa commit, thêm `+dirty` sau commit hash và nêu file thay đổi trong cột Message.

## Build and Push Commands

Chạy từ **repo root**.

```bash
docker login

docker build --no-cache -f apps/api/Dockerfile -t lgdlong/suky-api:latest .
docker push lgdlong/suky-api:latest
```

> **Why `--no-cache`?** Prisma Client được generate từ `schema.prisma`. Cache layer không invalidate khi chỉ schema đổi → image chạy Prisma Client cũ → lỗi `Unknown argument` hoặc thiếu field. Luôn `--no-cache`.

### Manual One-Liner

```bash
docker build --no-cache -f apps/api/Dockerfile -t lgdlong/suky-api:latest . && docker push lgdlong/suky-api:latest
echo "| $(date '+%Y-%m-%d %H:%M') | $(git rev-parse --short HEAD) | $(git branch --show-current) | $(git log --oneline -1 --format='%s') | 🔵 api |" >> docs/deploy-log.md
```

### Kiểm tra image sau build

```bash
docker images lgdlong/suky-api:latest                       # kích thước
docker run --rm --entrypoint sh lgdlong/suky-api:latest -c 'ffmpeg -version | head -1 && ls packages/db/node_modules/.bin/prisma'
```

## Files deploy (copy sang thư mục VPS)

| File trong repo | Trên VPS |
|---|---|
| `docker-compose.prod.yml` | cùng tên |
| `Makefile.prod` | `Makefile` (để khỏi gõ `-f`) |
| `.env.prod.example` | `.env.prod` (điền giá trị thật, **không commit**) |

`.env.prod` đặt cùng thư mục với compose. Compose tự ghi đè `DATABASE_URL` (ghép từ `POSTGRES_*`), `BETTER_AUTH_URL` (`https://${DOMAIN}`), `PORT`, `NODE_ENV`.

Env bắt buộc ở production (thiếu là API không khởi động — `apps/api/src/core/env.ts`): `DATABASE_URL`, `BETTER_AUTH_SECRET` (khác giá trị dev), và đủ 3 biến `CLOUDINARY_*`. Thêm `CORS_ORIGIN` = origin của web gọi API.

## On VPS — Deploy

Lần đầu:

```bash
make setup                 # tạo network proxy-net nếu chưa có
cp .env.prod.example .env.prod && nano .env.prod
make deploy                # pull image, up -d, chạy migration
make seed                  # chỉ lần đầu, DB trống
```

Các lần sau:

```bash
make deploy                # hoặc deploy-api / deploy-worker
make logs                  # api-logs, worker-logs, db-logs
make ps
```

`pull_policy: always` trong compose đảm bảo luôn pull image mới nhất.

### Migration

`make migrate` chạy `prisma migrate deploy` bên trong container `api` (cwd `/app/packages/db`, `DATABASE_URL` lấy từ env container). `make migrate-status` để xem trạng thái. Chạy sau mỗi lần deploy có migration mới (`make deploy` đã gọi sẵn).

### Seed và tài khoản admin

`make seed` (chạy một lần sau `migrate`, DB trống) nạp `SYSTEM_CONFIGS` (giới hạn upload, nghe, rate limit — API cần các dòng này), chủ đề và các thời kỳ lịch sử, và tạo user admin theo `ADMIN_EMAIL` (mặc định `admin@suky.vn`).

⚠️ Seed **không tạo mật khẩu/credential** cho admin (chỉ có dòng `users`, không có `accounts`), nên không đăng nhập được bằng tài khoản này. Cách lấy admin đăng nhập được: đăng ký một tài khoản bình thường qua web/API bằng email **khác**, rồi nâng quyền:

```bash
docker exec suky-db sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"UPDATE users SET role='admin' WHERE email='<email-vừa-đăng-ký>';\""
```

`POSTGRES_PASSWORD` phải URL-safe vì được ghép vào `DATABASE_URL`; dùng `openssl rand -hex 24`, tránh `@ : / # %`.


### Verify

```bash
curl -s https://suky-api.the1struleoffightclub.top/health
# kỳ vọng: JSON có database "connected"; releaseWorker "running" sau ~30 giây
```

## Troubleshooting

### "file not found" khi build
- Chạy từ **repo root**, không từ `apps/api/`.
- `.dockerignore` không được loại file cần thiết (`bun.lock`, `packages/`, `apps/api/`).

### API container restart liên tục
`docker logs suky-api --tail 100`. Nguyên nhân thường gặp: thiếu `BETTER_AUTH_SECRET` hoặc `CLOUDINARY_*` (log "Invalid environment configuration in production"), hoặc DB chưa healthy.

### Đăng nhập thành công nhưng web không giữ được phiên
Web và API khác site nên cookie phải là `SameSite=None; Secure`. `apps/api/src/modules/auth/auth.ts` đặt sẵn khi `NODE_ENV=production`. Cần: web gọi API bằng `credentials: "include"` (đã có), và origin của web nằm trong `CORS_ORIGIN`. Cookie `Secure` chỉ hoạt động qua HTTPS (hoặc `localhost`).

### Job TTS mất khi restart
Job giọng đọc (Gemini TTS) lưu trong memory và file tạm trong container; restart/deploy sẽ làm mất job đang chạy. Không deploy khi đang có job.

### Prisma schema/migration không khớp
Build lại với `--no-cache`, push, rồi `make deploy`.

### BuildKit
Docker Desktop mặc định bật. Docker engine cũ: `export DOCKER_BUILDKIT=1` (PowerShell: `$env:DOCKER_BUILDKIT=1`).
