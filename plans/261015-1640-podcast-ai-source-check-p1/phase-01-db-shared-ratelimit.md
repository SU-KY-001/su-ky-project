# Phase 1: DB, schema dùng chung, rate limit

Mục tiêu: nền dữ liệu và hợp đồng, chưa có logic AI. Không phụ thuộc phase khác.

## Files

- Sửa `packages/db/prisma/schema.prisma`
- Tạo `packages/db/prisma/migrations/20261015170000_ai_checks/migration.sql`
- Tạo schema zod trong `packages/shared/src/schemas/` (theo thư mục/pattern của `content`; xác nhận cấu trúc + cách export qua `@repo/shared` trước khi tạo)
- Sửa `apps/api/src/core/middleware/rate-limit.ts` (thêm `"ai_check"` vào `RateLimitPolicy`)
- Sửa `apps/api/src/core/config/system-config.ts` (thêm `"rate_limit.ai_check"`)
- Sửa `apps/api/src/modules/admin/admin.service.ts` (nhãn `"rate_limit.ai_check"` ở map dòng ~67-69)
- Sửa `apps/api/src/routes/docs/operation.ts` (`RatePolicy` và `RATE_DOC`)

## Prisma

Enum (giá trị cố ý tối thiểu):
- `AiCheckKind`: `SCRIPT_REVIEW`
- `AiCheckStatus`: `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`
- `AiIssueKind`: `FACT_DOUBT` (nghi sai), `READABILITY` (đọc thành tiếng / mạch)
- `AiIssueSeverity`: `LOW`, `MEDIUM`, `HIGH`
- `AiItemStatus`: `OPEN`, `REVIEWED`
- `AiItemBasis`: `CONTRADICTED` (một trang nguồn đã mở nói khác, có câu trích đã kiểm), `NOT_FOUND` (không thấy nguồn nói về chỗ này; không có nghĩa là sai)

`AiCheck` (`@@map("ai_checks")`): `id` uuid, `userId` varchar(36) (theo `Series.ownerId`), `episodeId` uuid FK `Episode` onDelete Cascade, `kind`, `status`, `config` jsonb (`scope`, `note`), `totalBlocks` (số block đưa vào rà), `processedBlocks`, `failedBlocks` int default 0, `toolCalls` int default 0 (tổng lần gọi công cụ), `sourcesUsed` jsonb default `[]` (mảng `sourceId` đã đưa vào allowlist; số nguồn bỏ vì không đọc được ghi riêng ở log, không lưu), `inputTokens`, `outputTokens` int default 0, `model` varchar?, `promptVersion` varchar? (truy vết khi đổi prompt), `heartbeatAt` timestamptz? (runner cập nhật; reaper dùng), `errorCode` varchar?, `startedAt`, `finishedAt?`, `createdAt`.
Index: `(userId, createdAt)`, `(episodeId, createdAt)`, `(userId, status)`, `(status, heartbeatAt)` (reaper).

`AiCheckItem` (`@@map("ai_check_items")`): `id` uuid, `checkId` FK Cascade, `seq` int, `blockRef` varchar (`b{docIndex}` tuyệt đối), `blockHash` varchar (hash block lúc chụp), `blockPrevHash` varchar (hash block liền trước lúc chụp, rỗng nếu là block đầu), `blockDup` smallint (số block cùng hash trong toàn tài liệu lúc chụp); ba cột này cùng dùng định vị khi Áp dụng (`spec-prompts-review.md` B1), `kind: AiIssueKind`, `severity`, `basis: AiItemBasis` (`CONTRADICTED`|`NOT_FOUND`), `evidence` jsonb default `[]` (mảng `{ sourceId, page, quote }`, tối đa 3, mọi `quote` đã được server kiểm nguyên văn trên trang đã mở), `message` text, `suggestion` text? (**toàn bộ văn bản mới của block**, chỉ có khi `basis = CONTRADICTED` đã xác nhận; diff từng từ do web tính, không lưu), `status: AiItemStatus` default `OPEN`, `appliedAt` timestamptz? (chỉ đặt khi mod bấm Áp dụng đề xuất), `createdAt`, `updatedAt`.
Unique `(checkId, seq)`. Index `(checkId, status)`.

Không có: `span`, `skippedBlocks` (bỏ cùng chunk), `claimsChecked`, `modNote`, `suggestionAttempts`, `suggestionRationale`, `KEPT/DISMISSED/APPLIED/INFO/SUPERSEDED`, `SUPPORTED_CLAIM`, cột độ phủ. `evidence` **có** (câu trích đã kiểm, xem `spec-source-agent.md` mục 5-6); `quote`/`sourceId` nằm trong `evidence` JSON, không có cột riêng.

Ownership: `userId` là chủ phiên; quyền truy cập thực tế kiểm qua episode (owner series hoặc admin), giống `ContentService`.

## Migration

Tay-viết hoặc `prisma migrate dev --create-only`, kiểm SQL đúng schema. Chỉ thêm (không drop gì); rollback bằng drop 2 bảng + 6 enum (ghi vào đầu file migration dưới dạng comment). Tên file theo mẫu hiện có (`20261015100000_series_cover_landscape`).

### Migration `20261022120000_source_pages` (kho trang nguồn, tách riêng khỏi `ai_checks`)

- Model `SourcePage` (`@@map("source_pages")`): `id` uuid, `sourceId` FK `Source` `onDelete: Cascade`, `version` int (= `Source.version` lúc trích chữ), `page` int, `text` text, `createdAt` timestamptz(3). Unique `(sourceId, version, page)`.
- Chỉ mục toàn văn: `CREATE INDEX "source_pages_tsv_idx" ON "source_pages" USING gin (to_tsvector('simple', immutable_unaccent(lower("text"))));` Chỉ mục **biểu thức** viết tay trong migration (Prisma không biểu diễn được; cùng kiểu `sources_title_trgm_idx` ở migration init). `unaccent`, `pg_trgm`, `immutable_unaccent` đã có từ migration init, không cần `CREATE EXTENSION` lại. Truy vấn phase 2 phải dùng đúng biểu thức này để chỉ mục được dùng.
- Chỉ thêm, không đụng bảng cũ. Rollback: `DROP TABLE "source_pages";` (ghi ở đầu file migration dưới dạng comment); dữ liệu trang nạp tay mất và nạp lại bằng script.
- Việc kiểm: `EXPLAIN` một truy vấn `@@ to_tsquery` mẫu trên bảng có dữ liệu thật để xác nhận dùng `source_pages_tsv_idx` (bảng nhỏ có thể chọn seq scan; kiểm trên dữ liệu Toàn thư 1334 trang).

## Schema zod dùng chung

- `CreateAiCheckSchema`: `{ kind: z.literal("SCRIPT_REVIEW"), scope: z.enum(["ALL","SELECTION"]), blocks: array({ ref: `b{docIndex}` tuyệt đối, text: string, hash: string, prev: string, dup: int ≥ 1 }) min 1 max `MAX_BLOCKS` (200), note?: string max `MAX_NOTE_CHARS` (1000) }`. Hằng số tên rõ ràng; tổng ký tự blocks kiểm ở service bằng `getSystemConfig("script.max_chars")`; mỗi `hash` phải bằng `hashBlockText(text)` (hàm thêm vào `@repo/shared`, dùng cả web) nếu không 422; `ref` trong một request không trùng nhau. `note` là ô tự do, không có mức nghiêm khắc. (Không còn `contextBefore/After`: bỏ cùng chunk.)
- `AiCheckSchema` (trạng thái, tiến độ, token, `errorCode`, số item `OPEN`/`REVIEWED` đếm bằng `groupBy (checkId, status)`, không lưu cột trùng), `AiCheckItemSchema` (response).
- `PatchAiCheckItemSchema`: `{ status?: "REVIEWED", applied?: true }`, ít nhất một trường (refine). `status` chỉ nhận `REVIEWED` (không có đường quay về `OPEN`). `applied: true` làm server đặt `appliedAt = now()` nếu chưa có (idempotent). Không còn `modNote`, không có `SuggestAiCheckItemSchema`.
- `AiCheckEventSchema` (union `progress | item | done | failed`) cho web và API. `progress` = `{ processedBlocks, totalBlocks, failedBlocks }`.

## Rate limit

- `RateLimitPolicy` thêm `"ai_check"` (dùng cho POST tạo check; không còn endpoint suggest).
- `SYSTEM_CONFIGS["rate_limit.ai_check"] = { schema: rateLimitSchema, defaultValue: { limit: 10, windowSeconds: 3600 } }`. Mặc định khởi điểm; chốt sau đo token ở phase 5, ghi README.
- Nhãn admin: "Giới hạn AI rà kịch bản". `RATE_DOC.ai_check = "AI rà kịch bản"`.

## Việc kiểm

- `bunx prisma validate` / generate cho `@repo/db`; `migrate` chạy sạch trên DB dev.
- `check-types` của api và shared không lỗi (`RatePolicy` và `RateLimitPolicy` cùng cập nhật).
- Truy vấn quản trị `admin.service` liệt kê config không lỗi với key mới.

## Done khi

Migration áp dụng được, client Prisma có `aiCheck`/`aiCheckItem`, kiểu `@repo/shared` export đủ, policy `ai_check` được `rateLimit(...)` chấp nhận.
