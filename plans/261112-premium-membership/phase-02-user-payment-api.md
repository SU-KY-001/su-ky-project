# Phase 2 — API mua gói cho người dùng

## Context Links

- Phase 1: schema, contract, config
- Mẫu route/service/repo: `apps/api/src/modules/listening/*`, `apps/api/src/modules/catalog/presentation/catalog.routes.ts`
- Idempotency: `apps/api/src/core/middleware/idempotency.ts`
- Rate limit: `apps/api/src/core/middleware/rate-limit.ts`
- Media reuse: `apps/api/src/modules/media/index.ts` (`mediaService` đã export sẵn)
- Audit: `apps/api/src/core/audit.ts`

## Overview

Priority: P1. Dựng module `membership` gồm domain + repository + service + routes, cộng hàm entitlement dùng chung. Sau phase này user tạo đơn, thấy QR, upload minh chứng, polling trạng thái. Webhook phase 3 sẽ gọi lại đúng service này để kích hoạt.

## Key Insights

- Repo tách `domain` (interface + entity), `infrastructure` (Prisma impl), `application` (service), `presentation` (routes factory). Bám đúng cấu trúc, không viết controller kiểu Nest.
- `idempotency()` đọc raw body và bắt buộc `Idempotency-Key` UUIDv4 → route tạo đơn lấy middleware này, client retry an toàn.
- `mediaService.create()` trả ticket upload Cloudinary; `verify()` kiểm tra asset thuộc user. Reuse nguyên, không viết upload riêng.
- `DomainError` là cách duy nhất để trả lỗi nghiệp vụ; status/code đã chốt ở phase 1.
- Hạn membership luôn suy ra từ bảng `memberships` (không lưu cờ trên `users`) → revoke/hết hạn tự đúng, không cần cron.

## Requirements

### Functional

1. `GET /api/membership/plans` — public, trả gói `is_active` (kèm `is_purchasable`; free vẫn trả để UI hiển thị so sánh).
2. `GET /api/me/membership` — auth; `{ tier, expiresAt, daysLeft, planCode }`.
3. `POST /api/me/membership/orders` — auth + idempotency + rate limit `membership_order`; body `{ planCode: string }`; trả đơn + bank info + QR + `expiresAt` dự kiến.
4. `GET /api/me/membership/orders` — auth; lịch sử đơn của chính mình (phân trang, mới nhất trước).
5. `GET /api/me/membership/orders/:id` — auth, chỉ chủ đơn; dùng cho polling.
6. `POST /api/me/membership/orders/:id/proof-ticket` — chỉ đơn `pending|needs_review`; body `CreateMediaAssetSchema`; force `kind: "IMAGE"`; trả ticket upload ảnh.
7. `POST /api/me/membership/orders/:id/proof` — body `{ assetId, publicId }`; verify ảnh rồi gắn vào đơn.

### Business rules

- Chỉ bán `monthly`, `yearly`; plan phải `is_active && is_purchasable && price_vnd > 0`, nếu không → 422 `PLAN_NOT_PURCHASABLE`; code lạ → 404 `PLAN_NOT_FOUND`.
- **Một đơn mở / user / plan**: trong transaction, khoá `pg_advisory_xact_lock(hashtext(userId))`, tìm đơn mới nhất ở `pending` **hoặc `needs_review`**:
  - cùng giá và `pending` → trả lại đơn cũ (test: gọi 3 lần ra cùng `orderId`/`transferContent`);
  - `needs_review` → trả lại đơn đó kèm status (user thấy "đang đối soát", không tạo QR thứ hai để tránh chuyển khoản lần 2);
  - khác giá → đánh dấu đơn pending cũ `rejected` lý do `PLAN_PRICE_CHANGED`, tạo đơn mới.
- **Mã CK**: `SK` + 8 hex in hoa (`randomBytes(4).toString("hex").toUpperCase()`), unique; sinh lại tối đa 5 lần khi Prisma báo `P2002`.
- **Cộng dồn**: `maxExpiry = MAX(expires_at)` của các kỳ hạn `revoked_at IS NULL` (kể cả kỳ hạn tương lai); `startAt = max(now, maxExpiry)`; `expiresAt = startAt + durationDays`. Nếu `expiresAt - now > premium.max_stack_days * 86400000` → 422 `STACK_LIMIT_REACHED`, message nêu ngày tối đa mua được.
- Đơn trả `bank` lấy từ env; QR dùng `vietqr.app` như spec. Thiếu `BANK_ACCOUNT_NUMBER` ở dev → dùng giá trị mặc định `0909090909` / `SU KY` (production refine đã bắt buộc).
- Lịch sử đơn không trả `rejectionReason`? Có trả (user cần biết lý do bị từ chối).
- Proof: mỗi lần upload thay ảnh cũ (gắn asset mới; asset cũ để job dọn xử lý vì không còn tham chiếu).

## Architecture

```
membership/
├── index.ts                     # export service đã wire + 2 route factory
├── domain/
│   ├── membership.entity.ts     # Plan, Order, Membership, SepayTx, Entitlement types
│   └── membership.repository.ts # interface MembershipRepository
├── infrastructure/
│   └── prisma-membership.repository.ts
├── application/
│   ├── membership.service.ts    # plans/entitlement/orders/proof/stacking
│   ├── bank-info.ts             # env → bank block + QR URL
│   └── membership.mappers.ts    # entity → DTO (không lộ field nội bộ)
└── presentation/
    └── membership.routes.ts     # createPublicMembershipRoute, createMeMembershipRoute
```

`membership.service.ts` public API (phase 3 dùng lại):

```ts
listPlans(): Promise<PlanDto[]>
getEntitlement(userId: string): Promise<EntitlementDto>
createOrder(userId: string, planCode: "monthly" | "yearly"): Promise<OrderDto>
listOrders(userId: string, query): Promise<{ items: OrderDto[]; total }>
getOrder(userId: string, orderId: string): Promise<OrderDto>
createProofTicket(userId: string, orderId: string, input: CreateMediaAssetInput): Promise<ProofTicket>
attachProof(userId: string, orderId: string, assetId: string, publicId: string): Promise<OrderDto>
```

`activateOrder(tx, order, actorId, bankTransactionId?)` đặt ở repository (domain method) để webhook, admin approve, resolve dùng chung một đoạn SQL. Chữ ký dự kiến:

```ts
activateOrder(input: {
  orderId: string;
  now: Date;
  actorId: string | null;
  bankTransactionId?: string | null;
  maxStackDays: number;
}): Promise<{ status: "activated" | "already_paid" | "stack_limit"; membershipId?: string }>
```

Bên trong, theo thứ tự:
1. `SELECT id FROM users WHERE id = $1 FOR UPDATE` — khoá **user**, không chỉ đơn. Hai kích hoạt đồng thời (webhook đơn A + admin duyệt đơn B) phải xếp hàng, nếu không cả hai đọc cùng `max(expires_at)` và tạo 2 kỳ hạn chồng nhau, đồng thời lách trần 365 ngày.
2. `SELECT ... FROM membership_orders WHERE id = $1 FOR UPDATE`; `paid` → `already_paid` (không ghi gì); không thuộc `pending|needs_review` → 409 `ORDER_NOT_PENDING`.
3. `maxExpiry = MAX(expires_at)` trên `memberships WHERE user_id=$1 AND revoked_at IS NULL` (**không** lọc `starts_at`, **không** lọc `expires_at > now`: kỳ hạn tương lai đã trả tiền vẫn phải được cộng dồn; kỳ hạn bị revoke thì không).
4. Vượt `maxStackDays` → update đơn `needs_review` + `review_reason='STACK_LIMIT_REACHED'`, trả `stack_limit` (không tạo kỳ hạn).
5. Update đơn **đủ field**: `status='paid', paid_at=now(), verified_by=actorId, bank_transaction_id=..., review_reason=null` + insert `memberships` (`order_id` unique) trong cùng tx. Trả `membershipId`.

## Endpoint contract

| Method + path | Auth | Body/Query | 200 | Lỗi chính |
|---|---|---|---|---|
| `GET /api/membership/plans` | public | – | `PlanDto[]` | – |
| `GET /api/me/membership` | user | – | `EntitlementDto` | 401 |
| `POST /api/me/membership/orders` | user | `{planCode}` | `OrderDto` (201) | 404 `PLAN_NOT_FOUND`, 422 `PLAN_NOT_PURCHASABLE`, 422 `STACK_LIMIT_REACHED`, 429 |
| `GET /api/me/membership/orders` | user | `page`, `limit` | `{items,total,page,limit}` | 401 |
| `GET /api/me/membership/orders/:id` | user | – | `OrderDto` | 404 `MEMBERSHIP_ORDER_NOT_FOUND` |
| `POST /api/me/membership/orders/:id/proof-ticket` | user, rate `media_upload` | `CreateMediaAssetSchema` (server **bỏ qua `kind`**, luôn `IMAGE`) | `ProofTicketSchema` | 404, 409 `ORDER_NOT_PENDING`, 422 media |
| `POST /api/me/membership/orders/:id/proof` | user | `{assetId,publicId}` | `OrderDto` | 404, 409, 422 `MEDIA_INVALID` |

`OrderDto`:

```ts
{
  id, planCode, planName, priceVnd, durationDays, transferContent,
  status, createdAt, paidAt, expiresAt, rejectionReason, proofUploaded,
  bank: { bankName, accountNumber, accountName, qrUrl, amount, transferContent }
}
```

`expiresAt` trong đơn là **hạn dự kiến** (`startAt + durationDays` tính tại thời điểm gọi) khi chưa `paid`; là hạn thực của kỳ hạn khi đã `paid`.

## Entitlement & gating hook

`getEntitlement` và một hàm `hasActiveMembership(userId)` (chỉ query khi cần) nằm trong `application/entitlement.ts` để `ListeningService` import **không** kéo theo routes/media (tránh vòng import).

## Files

Tạo:
- `apps/api/src/modules/membership/index.ts`
- `apps/api/src/modules/membership/domain/membership.entity.ts`
- `apps/api/src/modules/membership/domain/membership.repository.ts`
- `apps/api/src/modules/membership/infrastructure/prisma-membership.repository.ts`
- `apps/api/src/modules/membership/application/membership.service.ts`
- `apps/api/src/modules/membership/application/bank-info.ts`
- `apps/api/src/modules/membership/application/membership.mappers.ts`
- `apps/api/src/modules/membership/application/entitlement.ts`
- `apps/api/src/modules/membership/presentation/membership.routes.ts`
- `apps/api/src/routes/docs/paths/membership.ts` — bắt đầu file này với 7 operation user/public (docs phải có cùng phase, `openapi.test.ts` fail nếu thiếu)

Sửa:
- `apps/api/src/app.ts` — mount `.route("/api", publicMembershipRoute)` và `.route("/api/me/membership", meMembershipRoute)` (đặt cạnh các route `/api/me` khác)
- `apps/api/src/routes/docs/index.ts` — import/spread `membershipPaths` + tag `Membership` (làm ngay phase này để test docs xanh)
- `apps/api/src/modules/media/index.ts` — không đổi; service import trực tiếp `mediaService`
- `apps/api/src/core/middleware/rate-limit.ts` — `RateLimitPolicy` thêm `"membership_order"` (nếu chưa làm ở phase 1)

## Implementation Steps

1. Viết entities + repository interface (thuần type, chưa Prisma).
2. Viết `bank-info.ts`: đọc env, dựng `{ bankName, bankShortCode, accountNumber, accountName }` + `qrUrl(transferContent, amount)`.
3. Viết Prisma repository:
   - `listActivePlans`
   - `findPlanByCode`
   - `findLatestActiveMembership(userId)`
   - `createOrder` (advisory lock + reuse/reject pending + sinh mã CK có retry)
   - `listOrders`, `findOrderById`, `findOrderByTransferContent`
   - `attachProof`, `setProof`
   - `activateOrder` (mô tả ở trên)
4. Viết service: map plan/order, tính entitlement (`daysLeft = max(1, ceil((expiresAt-now)/day))` khi `startsAt <= now < expiresAt` và chưa `revokedAt`), stacking preview, gọi repository.
5. Viết routes: bọc `requireAuth` cho nhóm `/api/me/membership`; POST tạo đơn dùng `idempotency()` **trước** `rateLimit("membership_order")` (replay không tính vào hạn mức), rồi `zValidator` + `throwOnInvalid`; proof-ticket thêm `rateLimit("media_upload")` sau `idempotency()` (nếu dùng).
6. Wire `app.ts`, chạy typecheck.
7. Smoke tay: đăng nhập → `GET plans` → tạo đơn 2 lần với 2 `Idempotency-Key` khác nhau nhưng cùng plan → phải trả cùng `id`; kiểm QR mở được.

## Todo List

- [ ] Domain + interface
- [ ] Bank info + QR
- [ ] Prisma repository (order reuse + mã CK + activateOrder)
- [ ] Service + mappers
- [ ] Routes + mount app
- [ ] Smoke tạo đơn / polling

## Success Criteria

- `GET /api/membership/plans` trả 3 gói; free có `isPurchasable=false`.
- POST đơn `free` → 422 (schema chặn trước khi vào service); POST `monthly` 3 lần → 1 đơn duy nhất, 1 `transferContent`, 1 QR.
- Tạo đơn khi membership còn 300 ngày với gói năm → 422 `STACK_LIMIT_REACHED` (trần 365 ngày tính từ hiện tại; **hệ quả đã biết**: gói năm chỉ mua lại được khi còn < 1 ngày — ghi rõ cho leader, muốn nới thì đổi `premium.max_stack_days`).
- User A không đọc được đơn của user B (404, không phải 403).
- Upload ảnh qua ticket → `POST proof` → `GET order` thấy `proofUploaded=true`.
- Typecheck pass; `bun test` hiện có không hồi quy.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Đua tạo đơn (2 tab) sinh 2 đơn pending | Advisory lock theo `userId` + query lại trong tx |
| `transfer_content` trùng giữa user | Unique DB + retry 5 lần rồi trả 500 có log |
| Reuse nhầm đơn giá cũ sau khi admin đổi giá | Chỉ reuse khi `priceVnd` khớp; khác thì reject lý do `PLAN_PRICE_CHANGED` |
| User trả tiền 2 lần vì đơn trước đang `needs_review` | Lookup reuse gồm cả `needs_review`; trả nguyên đơn, không tạo QR mới |
| QR provider ngoài chết | Trả đủ bank info để UI hiển thị chuyển khoản thủ công |
| Ảnh minh chứng không upload xong | Ticket TTL có sẵn; đơn vẫn `pending`, user tạo ticket mới |
| Ảnh minh chứng là URL Cloudinary public (UUID không đoán được) | Không trả URL cho user; admin xem qua route admin; ghi nhận rủi ro PII, nếu cần thì chuyển sang delivery có hạn ở plan sau |

## Security Considerations

- Mọi query đơn của user đều lọc `userId`; không tin `userId` từ body.
- `Idempotency-Key` bắt buộc trên POST tạo đơn → chống double-click tạo 2 đơn.
- Rate limit 10 đơn/giờ/user (config `rate_limit.membership_order`).
- Ảnh minh chứng: verify qua Cloudinary (size/format) trước khi gắn; user chỉ gắn được asset do chính mình upload.
- Không trả `adminNote`, `verifiedBy`, `bankTransactionId` cho user.

## Next Steps

Phase 3: webhook gọi `activateOrder`, admin routes gọi cùng service/repository; không duplicate logic kích hoạt.
