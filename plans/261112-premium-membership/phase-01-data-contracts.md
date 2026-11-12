# Phase 1 — Nền dữ liệu và contract

## Context Links

- Spec: `plans/reports/research-261112-premium-membership.md`
- Schema: `packages/db/prisma/schema.prisma`
- Config: `apps/api/src/core/config/system-config.ts`, `apps/api/src/core/env.ts`
- Error codes: `packages/shared/src/schemas/problem.ts`
- Shared schemas: `packages/shared/src/schemas/`, `packages/shared/src/index.ts`
- Docs: `apps/api/src/routes/docs/registry.ts`, `apps/api/src/routes/docs/paths/`

## Overview

Priority: P1, blocking mọi phase khác. Thêm 4 bảng, 3 enum, 2 cột cờ premium, config/env, Zod contract và mã lỗi. Chưa có endpoint nào chạy được sau phase này.

## Key Insights

- `ContentStatus`/`AuditLog`… cho thấy repo dùng Prisma enum tiếng Anh viết hoa; bảng map `snake_case` qua `@@map`.
- `media_assets` có job dọn media định kỳ (`apps/api/src/core/jobs/maintenance-jobs.ts`) chỉ giữ asset được tham chiếu. Ảnh minh chứng thanh toán **phải** được thêm vào `detachedMediaWhere`, nếu không sẽ bị xoá sau 24h.
- `error-code-status.test.ts` quét toàn bộ `new DomainError(status, "CODE")` và fail nếu một code mang 2 status → chọn status một lần, dùng nhất quán.
- `SYSTEM_CONFIGS` là nguồn duy nhất cho config runtime; admin UI tự liệt kê qua `GET /api/admin/configs`.
- Prisma migration hiện được commit tay vào `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql`; chạy `bun run db:migrate`.

## Requirements

### Functional

1. Lưu gói, đơn, kỳ hạn, giao dịch ngân hàng; append-only.
2. Snapshot tên/giá/số ngày trên đơn + kỳ hạn (đổi giá sau này không viết lại lịch sử).
3. Đơn có `transfer_content` unique để webhook khớp.
4. `sepay_id` unique để chống replay; lưu tối đa trường từ payload.
5. Cờ `is_premium` trên `series` và `episodes`, mặc định `false`.
6. Ảnh minh chứng gắn được vào đơn và không bị job dọn media xoá.

### Non-functional

- Không xoá dữ liệu; sửa sai bằng status + lý do.
- Index cho các truy vấn: đơn theo user/status/thời gian, kỳ hạn theo user/hết hạn, giao dịch theo status/thời gian.
- Tiền là `int` VND; `sepay.accumulated` là `bigint`.

## Prisma schema (dán vào `schema.prisma`)

```prisma
enum MembershipOrderStatus {
  pending
  paid
  needs_review
  rejected

  @@map("membership_order_status")
}

enum SepayTransactionStatus {
  unmatched
  needs_review
  matched
  ignored

  @@map("sepay_transaction_status")
}

model MembershipPlan {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code           String    @unique @db.VarChar(32) // free | monthly | yearly
  name           String    @db.VarChar(100)
  priceVnd       Int       @map("price_vnd")
  durationDays   Int       @map("duration_days")
  isPurchasable  Boolean   @default(true) @map("is_purchasable")
  isActive       Boolean   @default(true) @map("is_active")
  sortOrder      Int       @default(0) @map("sort_order")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)
  orders         MembershipOrder[]
  memberships    Membership[]

  @@map("membership_plans")
}

model MembershipOrder {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String               @map("user_id") @db.VarChar(36)
  planId             String               @map("plan_id") @db.Uuid
  planCodeSnapshot   String               @map("plan_code_snapshot") @db.VarChar(32)
  planNameSnapshot   String               @map("plan_name_snapshot") @db.VarChar(100)
  priceVnd           Int                  @map("price_vnd")
  durationDays       Int                  @map("duration_days")
  currency           String               @default("VND") @db.VarChar(3)
  transferContent    String               @unique @map("transfer_content") @db.VarChar(32)
  status             MembershipOrderStatus @default(pending)
  proofAssetId       String?              @unique @map("proof_asset_id") @db.Uuid
  rejectionReason    String?              @map("rejection_reason") @db.Text
  bankTransactionId  String?              @map("bank_transaction_id") @db.VarChar(64)
  paidAt             DateTime?            @map("paid_at") @db.Timestamptz(3)
  verifiedBy         String?              @map("verified_by") @db.VarChar(36)
  reviewReason       String?              @map("review_reason") @db.VarChar(100)
  adminNote          String?              @map("admin_note") @db.Text
  createdAt          DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt          DateTime             @updatedAt @map("updated_at") @db.Timestamptz(3)
  user               User                 @relation("MembershipOrders", fields: [userId], references: [id], onDelete: Restrict)
  plan               MembershipPlan       @relation(fields: [planId], references: [id], onDelete: Restrict)
  proofAsset         MediaAsset?          @relation("OrderProof", fields: [proofAssetId], references: [id], onDelete: SetNull)
  membership         Membership?
  transactions       SepayTransaction[]

  @@index([userId, createdAt(sort: Desc)], map: "membership_orders_user_created_idx")
  @@index([status, createdAt], map: "membership_orders_status_created_idx")
  @@index([paidAt], map: "membership_orders_paid_at_idx")
  @@map("membership_orders")
}

model Membership {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String    @map("user_id") @db.VarChar(36)
  planId       String    @map("plan_id") @db.Uuid
  orderId      String    @unique @map("order_id") @db.Uuid
  priceVnd     Int       @map("price_vnd")
  durationDays Int       @map("duration_days")
  startsAt     DateTime  @map("starts_at") @db.Timestamptz(3)
  expiresAt    DateTime  @map("expires_at") @db.Timestamptz(3)
  revokedAt    DateTime? @map("revoked_at") @db.Timestamptz(3)
  revokeReason String?   @map("revoke_reason") @db.VarChar(500)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  user         User      @relation("Memberships", fields: [userId], references: [id], onDelete: Restrict)
  plan         MembershipPlan @relation(fields: [planId], references: [id], onDelete: Restrict)
  order        MembershipOrder @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@index([userId, expiresAt(sort: Desc)], map: "memberships_user_expires_idx")
  @@map("memberships")
}

model SepayTransaction {
  id              String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sepayId         BigInt                @unique @map("sepay_id")
  referenceCode   String?               @map("reference_code") @db.VarChar(64)
  amount          Int
  accumulated     BigInt?
  content         String                @db.Text
  code            String?               @db.VarChar(32)
  gateway         String?               @db.VarChar(32)
  accountNumber   String?               @map("account_number") @db.VarChar(32)
  subAccount      String?               @map("sub_account") @db.VarChar(32)
  transactionAt   DateTime              @map("transaction_at") @db.Timestamptz(3)
  status          SepayTransactionStatus @default(unmatched)
  orderId         String?               @map("order_id") @db.Uuid
  reason          String?               @db.VarChar(100)
  rawPayload      Json                  @map("raw_payload")
  createdAt       DateTime              @default(now()) @map("created_at") @db.Timestamptz(3)
  order           MembershipOrder?      @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@index([status, createdAt(sort: Desc)], map: "sepay_transactions_status_created_idx")
  @@map("sepay_transactions")
}
```

Thêm vào model có sẵn:

```prisma
model Series {
  // ...
  isPremium Boolean @default(false) @map("is_premium")
}

model Episode {
  // ...
  isPremium Boolean @default(false) @map("is_premium")
}

model User {
  // ...
  membershipOrders MembershipOrder[] @relation("MembershipOrders")
  memberships      Membership[]      @relation("Memberships")
}

model MediaAsset {
  // ...
  orderProof MembershipOrder? @relation("OrderProof")
}
```

Seed 3 gói trong chính migration (idempotent):

```sql
INSERT INTO membership_plans
  (code, name, price_vnd, duration_days, is_purchasable, sort_order, created_at, updated_at)
VALUES
  ('free',    'Miễn phí', 0,      0,   false, 0, now(), now()),
  ('monthly', 'Gói tháng', 20000, 30,  true,  1, now(), now()),
  ('yearly',  'Gói năm',  220000, 365, true,  2, now(), now())
ON CONFLICT (code) DO NOTHING;

ALTER TABLE membership_orders ADD CONSTRAINT membership_orders_review_reason_check
  CHECK (status <> 'needs_review' OR review_reason IS NOT NULL);
ALTER TABLE memberships ADD CONSTRAINT memberships_period_check
  CHECK (expires_at > starts_at);
ALTER TABLE membership_orders ADD CONSTRAINT membership_orders_amount_check
  CHECK (price_vnd >= 0 AND duration_days >= 0);
```

## Config & env

`apps/api/src/core/config/system-config.ts` thêm:

```ts
"premium.reminder_days": { schema: z.number().int().nonnegative(), defaultValue: 3 },
"premium.max_stack_days": { schema: z.number().int().positive(), defaultValue: 365 },
"media.audio_delivery_ttl_seconds": { schema: z.number().int().positive(), defaultValue: 3600 },
"rate_limit.membership_order": { schema: rateLimitSchema, defaultValue: { limit: 10, windowSeconds: 3600 } },
```

`apps/api/src/core/env.ts` thêm (đều optional để dev chạy không cần):

```ts
BANK_SHORT_CODE: z.string().min(1).default("MB"),
BANK_NAME: z.string().min(1).default("MB Bank"),
BANK_ACCOUNT_NUMBER: z.string().min(1).optional(),
BANK_ACCOUNT_NAME: z.string().min(1).optional(),
SEPAY_WEBHOOK_API_KEY: z.preprocess(emptyAsUndefined, z.string().min(1).optional()),
```

Production `superRefine` hiện có: bổ sung yêu cầu `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`, `SEPAY_WEBHOOK_API_KEY` — thiếu thì fail fast lúc start, không để webhook 503 âm thầm.

## Zod contracts (`packages/shared/src/schemas/membership.ts`)

```ts
export const MembershipPlanSchema = z.object({
  code: z.enum(["free", "monthly", "yearly"]),
  name: z.string(),
  priceVnd: z.number().int().nonnegative(),
  durationDays: z.number().int().nonnegative(),
  isPurchasable: z.boolean(),
  sortOrder: z.number().int(),
});

export const MembershipEntitlementSchema = z.object({
  tier: z.enum(["free", "premium"]),
  expiresAt: z.coerce.date().nullable(),
  daysLeft: z.number().int().nullable(),
  planCode: z.string().nullable(),
  pendingOrderId: z.string().uuid().nullable(),
});

export const CreateMembershipOrderSchema = z.object({
  // Nhận chuỗi, để code lạ trả 404 PLAN_NOT_FOUND và `free` trả 422 PLAN_NOT_PURCHASABLE
  // (enum ở đây sẽ biến cả hai thành 400 VALIDATION_ERROR, trái với spec).
  planCode: z.string().trim().min(1).max(32),
});

export const MembershipOrderSchema = z.object({
  id: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  priceVnd: z.number().int(),
  durationDays: z.number().int(),
  transferContent: z.string(),
  status: z.enum(["pending", "paid", "needs_review", "rejected"]),
  reviewReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  rejectionReason: z.string().nullable(),
  proofUploaded: z.boolean(),
  bank: z.object({
    bankName: z.string(), accountNumber: z.string(), accountName: z.string(),
    qrUrl: z.string(), amount: z.number().int(), transferContent: z.string(),
  }),
});

export const ProofTicketSchema = z.object({ assetId: z.string().uuid(), upload: z.object({ url: z.string(), fields: z.record(z.string()) }), expiresAt: z.coerce.date() });
export const AttachProofSchema = z.object({ assetId: z.string().uuid(), publicId: z.string().min(1) });
```

Webhook payload: schema **lenient** (SePay thêm field không được làm fail), parse ở API:

```ts
export const SepayWebhookSchema = z.object({
  // SePay gửi số; chuỗi cũng phải nhận và KHÔNG được ép qua Number (mất chính xác > 2^53).
  id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String),
  gateway: z.string().optional(),
  transactionDate: z.string().min(19),
  accountNumber: z.string().optional(),
  subAccount: z.string().nullish(),
  code: z.string().nullish(),
  content: z.string().default(""),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.coerce.number().int().nonnegative(),
  accumulated: z.coerce.number().int().nonnegative().optional(),
  referenceCode: z.string().nullish(),
}).passthrough();
```

Admin schemas (đặt cùng file): list query (page/limit/status/q), verify body `{ action: "approve" | "reject", reason?, note? }` (reject bắt buộc `reason` ≥ 10 ký tự qua `superRefine`), resolve giao dịch `{ action: "assign" | "ignore", orderId?, note? }` (note chỉ vào audit), grant `{ planCode: "monthly" | "yearly", reason min 3 }`, revoke `{ reason min 10 }`, report query `{ from: date, to: date, groupBy: "day" | "month" }`, plan patch `{ priceVnd?, isPurchasable?, isActive?, name?, sortOrder? }`.

Export trong `packages/shared/src/index.ts`: `export * from "./schemas/membership";`

## Error codes (thêm vào `ERROR_CODES`)

| Code | Status | Dùng ở |
|---|---|---|
| `PLAN_NOT_FOUND` | 404 | tạo đơn với code lạ |
| `PLAN_NOT_PURCHASABLE` | 422 | plan free/inactive/giá 0 |
| `MEMBERSHIP_ORDER_NOT_FOUND` | 404 | đơn không tồn tại hoặc không thuộc user |
| `ORDER_NOT_PENDING` | 409 | thao tác trên đơn đã kết thúc |
| `STACK_LIMIT_REACHED` | 422 | vượt trần 365 ngày |
| `PREMIUM_REQUIRED` | 403 | phát audio khi chưa có quyền |
| `SEPAY_UNAUTHORIZED` | 401 | sai/thiếu API key webhook |
| `SEPAY_NOT_CONFIGURED` | 503 | chưa cấu hình key (chỉ dev) |

Không tạo code mới cho "lệch tiền"/"trùng giao dịch": đó là `reason` dạng chuỗi trong `sepay_transactions`.

## Files

Tạo:
- `packages/shared/src/schemas/membership.ts`
- `packages/db/prisma/migrations/<timestamp>_membership/migration.sql` (Prisma generate từ schema, sửa tay phần seed + check constraint)

Sửa:
- `packages/db/prisma/schema.prisma`
- `packages/shared/src/index.ts`, `packages/shared/src/schemas/problem.ts`
- `apps/api/src/core/config/system-config.ts`, `apps/api/src/core/env.ts`
- `apps/api/src/core/jobs/maintenance-jobs.ts` — `detachedMediaWhere` thêm `orderProof: null`
- `.env.example`, `README.md` (mục env mới, ngắn)

## Implementation Steps

1. Sửa `schema.prisma` đúng block trên; thêm quan hệ ngược ở `User`, `MediaAsset`, `Series`, `Episode`.
2. `bun run db:migrate -- --name membership` (hoặc `bunx prisma migrate dev --name membership` trong `packages/db`), mở file SQL sinh ra:
   - thêm seed 3 gói;
   - thêm `CHECK (price_vnd >= 0 AND duration_days >= 0)` cho `membership_plans`, `CHECK (amount >= 0)` cho `sepay_transactions`.
3. `bun run db:generate`.
4. Thêm config keys + env (kèm `superRefine` production).
5. Viết `membership.ts` schemas + export; thêm error codes.
6. Sửa `detachedMediaWhere` (một dòng) + chạy `bun test` để chắc test media cleanup hiện có vẫn qua.
7. Cập nhật `.env.example`/README: `BANK_*`, `SEPAY_WEBHOOK_API_KEY`.
8. Ghi chú: **mã lỗi của plan này là chuẩn** (`PREMIUM_REQUIRED`, `STACK_LIMIT_REACHED`, `SEPAY_*`); spec cũ dùng tên khác (`CONTENT_LOCKED`, `MEMBERSHIP_STACK_LIMIT`...) — FE/tests theo plan, không theo spec.

## Todo List

- [ ] Schema + quan hệ ngược
- [ ] Migration SQL + seed + check constraint
- [ ] `db:generate` pass
- [ ] Config keys + env + production refine
- [ ] Shared schemas + export + error codes
- [ ] Media cleanup loại trừ ảnh minh chứng
- [ ] `.env.example`/README

## Success Criteria

- `bun run --cwd packages/db check-types` và `bun run --cwd apps/api check-types` pass (route chưa nối thì chưa cần).
- `SELECT * FROM membership_plans` có đúng 3 dòng sau migrate; chạy migrate lần 2 không nhân đôi (idempotent seed).
- `bun test apps/api/tests/error-code-status.test.ts` pass với code mới.
- Xoá 1 series bất kỳ không ảnh hưởng bảng mới (FK `Restrict`/`Cascade` đúng như khai báo).

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Migration trên DB có dữ liệu thật | Chỉ thêm bảng/cột nullable hoặc default; không sửa cột cũ; backup trước khi deploy |
| Job dọn media xoá ảnh minh chứng | Đã thêm `orderProof: null`; kiểm bằng test cleanup hiện có |
| `profile.service.ts` xoá user → cascade xoá đơn/kỳ hạn (mất sổ tiền) | Chấp nhận ở phạm vi đồ án (user tự xoá tài khoản); ghi chú: nếu cần giữ sổ, đổi sang `onDelete: SetNull` + `userId` nullable ở plan sau |
| Đổi `User`/`MediaAsset` gây lỗi type ở module khác | Chỉ thêm relation, không đổi field; `db:generate` rồi `check-types` toàn repo |
| Enum Prisma mới không map được với Postgres cũ | Migration tạo type enum mới, không đụng enum cũ |

## Security Considerations

- `SEPAY_WEBHOOK_API_KEY` không log, không trả về client.
- `raw_payload` chứa PII người chuyển; chỉ admin đọc (route admin).
- Không expose `membership_orders` của user khác: mọi query user-scope có `where: { id, userId }`.

## Next Steps

Phase 2 dùng schema + contract này; không sửa schema nữa trừ khi phát hiện thiếu field.
