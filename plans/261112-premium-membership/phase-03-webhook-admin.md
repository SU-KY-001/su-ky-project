# Phase 3 — Webhook SePay và API quản trị

## Context Links

- Phase 2: `MembershipService`, `activateOrder`, `bank-info.ts`
- Audit: `apps/api/src/core/audit.ts` (`writeAudit`, `requestIpAddress`)
- Admin pattern: `apps/api/src/modules/admin/admin.routes.ts` (requireAdmin, audit context, pagination)
- Logger: `apps/api/src/core/logger.ts`

## Overview

Priority: P1. Nối SePay webhook vào `activateOrder`, thêm nhóm API admin để duyệt tay, xử lý sổ giao dịch, grant/revoke và báo cáo doanh thu. Sau phase này luồng tiền chạy end-to-end không cần UI.

## Key Insights

- SePay gửi `Authorization: Apikey <key>`; key lưu env, so sánh timing-safe bằng SHA-256 hai phía rồi `timingSafeEqual` (độ dài luôn 32 byte).
- Webhook phải **idempotent**: `sepay_id` unique là chốt chặn replay. Lần retry sau khi chết giữa chừng phải chạy tiếp pha 2 nếu row chưa `matched|ignored`.
- Không bao giờ trả 500 cho lỗi nghiệp vụ (SePay sẽ retry vô ích); chỉ trả 500 khi lỗi hạ tầng/DB.
- Admin duyệt tay và webhook đến sau phải dùng **cùng một** `activateOrder` + cùng quy tắc "đơn đã paid":
  - đơn `paid` + `bankTransactionId IS NULL` → gán mã giao dịch, đánh dấu `matched`, **không** tạo kỳ hạn mới;
  - đơn `paid` + đã có mã khác → `needs_review` lý do `ORDER_ALREADY_PAID`.
- Grant comp không được làm sai doanh thu: tạo đơn tổng hợp `price_vnd = 0`, `transfer_content` prefix `CMP` (webhook chỉ khớp `SK...` nên không bao giờ dính), `admin_note = reason`, trạng thái **`pending`**, rồi gọi `activateOrder(actorId)` trong cùng request. Một đường kích hoạt duy nhất; response trả `membershipId` để chứng minh đã tạo. Đơn comp bị loại khỏi doanh thu bằng `price_vnd > 0`.

## Requirements

### Webhook

`POST /api/payments/sepay/webhook` (public, không session).

1. Header thiếu/sai → 401 `SEPAY_UNAUTHORIZED`. Key chưa cấu hình → 503 `SEPAY_NOT_CONFIGURED` + log error.
2. Body sai schema → 400 `VALIDATION_ERROR`. `sepayId` lưu dạng `BigInt`; `transactionDate` của SePay là giờ VN không kèm offset (`YYYY-MM-DD HH:mm:ss`) → parse bằng `new Date(value.replace(" ", "T") + "+07:00")`, không để `new Date()` hiểu theo timezone server.
3. Pha A (ngoài tx kích hoạt): `INSERT sepay_transactions` với `raw_payload = body`, `status = unmatched`; `P2002` → đọc row cũ.
4. Row đã `matched|ignored` → 200 `{success:true}` ngay.
5. `transferType !== "in"` → `ignored` lý do `OUTBOUND`; 200.
6. Tách mã: `body.code` nếu có, ngược lại regex `/\bSK[A-Z0-9]{8}\b/` trên `content` (uppercase, trim).
7. Không có mã hoặc không có đơn → `unmatched` lý do `NO_MATCHING_ORDER`; 200.
8. Có đơn → xử lý trong tx (`SELECT ... FOR UPDATE` row giao dịch):
   - lệch `amount` so với `order.priceVnd` → `needs_review` lý do `AMOUNT_MISMATCH`, gắn `order_id`; 200.
   - đơn `paid` + chưa có `bankTransactionId` → gán, `matched`; 200.
   - đơn `paid` + cùng `bankTransactionId` (webhook trùng đang bay song song) → `matched`; 200.
   - đơn `paid` + mã khác → `needs_review` lý do `ORDER_ALREADY_PAID`; 200.
   - đơn `rejected` → `needs_review` lý do `ORDER_REJECTED`; 200.
   - đơn `needs_review` → giữ `needs_review`, gắn `order_id`, lý do `ORDER_NEEDS_REVIEW` (admin quyết); 200.
   - đơn `pending` → `activateOrder({actorId:null, bankTransactionId:String(sepayId)})`:
     - `activated` → tx `matched`; audit `membership.activated` (actorType `SYSTEM`);
     - `already_paid` (đua với webhook/admin khác) → tx `matched` nếu `order.bankTransactionId` trùng, ngược lại `needs_review` `ORDER_ALREADY_PAID`;
     - `stack_limit` → tx `needs_review` lý do `STACK_LIMIT_REACHED` (đơn đã được `activateOrder` set `needs_review` + `review_reason`); 200.
9. Response chuẩn SePay: `200 {"success": true}`. Lỗi DB → 500 (để SePay retry).

### Admin endpoints (tất cả `requireAdmin`)

| Method + path | Body/Query | Kết quả |
|---|---|---|
| `GET /api/admin/membership/plans` | – | danh sách gói |
| `PATCH /api/admin/membership/plans/:code` | `{priceVnd?, isPurchasable?, isActive?, name?, sortOrder?}` | gói sau sửa; audit before/after; nếu `isPurchasable` thì giá/số ngày phải > 0 (422) |
| `GET /api/admin/membership/orders` | `status?`, `q?` (email/tên/mã CK), `page`, `limit` | đơn + user + proof URL + cờ `canApprove` |
| `GET /api/admin/membership/orders/:id` | – | chi tiết đơn + user + proof + giao dịch gắn + audit gần nhất |
| `POST /api/admin/membership/orders/:id/verify` | `{action:"approve"\|"reject", reason?, note?}` | approve → `activateOrder(manual, actorId)`; reject → `rejected` + lý do ≥ 10 ký tự; audit |
| `GET /api/admin/membership/transactions` | `status?`, `from?`, `to?`, `page`, `limit` | sổ giao dịch + đơn khớp (nếu có) |
| `POST /api/admin/membership/transactions/:id/resolve` | `{action:"assign"\|"ignore", orderId?, note?}` (note chỉ ghi audit) | assign: kiểm tra amount khớp đơn rồi chạy cùng nhánh webhook (đơn `pending` → activate, `paid` → gán mã); ignore: `ignored` + lý do; audit |
| `GET /api/admin/membership/members` | `status:"active"\|"expired"\|"all"`, `q?`, `page`, `limit` | user + hạn + gói gần nhất |
| `POST /api/admin/membership/members/:userId/grant` | `{planCode, reason}` | tạo đơn comp `pending` giá 0 rồi `activateOrder`; áp cùng trần `premium.max_stack_days` (vượt → 422 `STACK_LIMIT_REACHED`); audit |
| `POST /api/admin/membership/members/:userId/revoke` | `{reason}` (≥10) | set `revoked_at` cho mọi kỳ hạn còn hiệu lực; audit |
| `GET /api/admin/membership/report` | `from`, `to`, `groupBy:"day"\|"month"` (range ≤ 366 ngày) | summary + chuỗi doanh thu |

`report` trả:

```ts
{
  range: { from, to, groupBy },
  summary: {
    revenueVnd, paidOrders, compGrants,
    activeMembers, expiringIn7Days,
    pendingOver24h, needsReviewOrders, unmatchedTransactions, unmatchedAmountVnd,
  },
  series: [{ bucket: "2026-11-12", revenueVnd, paidOrders, byPlan: [{ planCode, revenueVnd, paidOrders }] }],
}
```

Doanh thu: `SUM(price_vnd)` của đơn `paid`, `paid_at` trong `[from, to)`, timezone `Asia/Ho_Chi_Minh`. `paidOrders` và chuỗi doanh thu chỉ tính `price_vnd > 0`; đơn comp (`price_vnd = 0`) đếm riêng `compGrants`.

## Files

Tạo:
- `apps/api/src/modules/membership/presentation/sepay-webhook.routes.ts`
- `apps/api/src/modules/membership/application/sepay-webhook.service.ts`
- `apps/api/src/modules/membership/application/admin-membership.service.ts`
- `apps/api/src/modules/membership/presentation/admin-membership.routes.ts`
- `apps/api/src/routes/docs/paths/membership.ts` — thêm 1 webhook + 11 admin operation (tổng 19)

Sửa:
- `apps/api/src/modules/membership/index.ts` — wire thêm 2 route factory
- `apps/api/src/app.ts` — `.route("/api/payments/sepay", sepayWebhookRoute)` và `.route("/api/admin/membership", adminMembershipRoute)`
- `apps/api/src/modules/membership/infrastructure/prisma-membership.repository.ts` — thêm query admin/report
- `packages/shared/src/schemas/membership.ts` — admin schemas + report schemas (đã khai báo ở phase 1, chỉ bổ sung schema response)

## Implementation Steps

1. `sepay-webhook.service.ts`:
   - `verifyKey(header)` — hash + timingSafeEqual;
   - `handle(payload)` — đúng 9 bước ở trên; tách hàm `applyToOrder` để admin resolve dùng lại.
2. `sepay-webhook.routes.ts`: đọc header, `SepayWebhookSchema.parse`, gọi service, luôn trả `{success:true}` khi đã xử lý; bọc `try/catch` chỉ log + 500 cho lỗi hạ tầng.
3. Repository thêm:
   - `lockTransaction(id)`; `markTransaction(...)`;
   - `findOrderForAdmin({status,q,page,limit})`, `findTransactionsForAdmin(...)`, `listMembersForAdmin(...)`;
   - `report(input)` bằng `$queryRaw` (2–3 query, không N+1);
   - `revokeActiveMemberships(userId, reason)`;
   - `createCompOrder(userId, plan, reason)`.
4. `admin-membership.service.ts`: validate transition, gọi `activateOrder`, viết audit (`membership.order.verify`, `membership.order.reject`, `membership.transaction.resolve`, `membership.grant`, `membership.revoke`, `membership.plan.update`), map response.
5. `admin-membership.routes.ts`: `requireAdmin` + `zValidator` + `throwOnInvalid` + rateLimit `write` cho mutation.
6. Wire `app.ts`; đặt `/api/admin/membership` **trước** `/api/admin` cho rõ thứ tự; điền docs 12 operation của phase này ngay (nếu để phase 4, `openapi.test.ts` đỏ suốt phase 3).
7. Smoke:
   - webhook sai key → 401; đúng key + đơn pending → 200, đơn `paid`, `memberships` có 1 dòng;
   - gửi lại cùng `sepay_id` → 200, không nhân đôi;
   - gửi `sepay_id` mới cùng mã → `needs_review` `ORDER_ALREADY_PAID`;
   - admin approve đơn có ảnh minh chứng → kích hoạt; webhook đến sau → `matched`, không tạo kỳ hạn 2.

## Todo List

- [ ] Webhook verify key + schema
- [ ] Pha A/B, retry semantics, outbound ignore
- [ ] `applyToOrder` dùng chung với admin resolve
- [ ] Admin: orders verify/reject
- [ ] Admin: transactions list/resolve
- [ ] Admin: members list/grant/revoke
- [ ] Admin: plans list/patch
- [ ] Report SQL + summary
- [ ] Audit đầy đủ
- [ ] Smoke 5 kịch bản ở trên

## Success Criteria

- Replay webhook 5 lần: 1 giao dịch, 1 kỳ hạn, 1 audit activate.
- Webhook tới khi đơn đã duyệt tay: đơn giữ 1 kỳ hạn, giao dịch `matched`.
- Lệch tiền (trả 10.000 cho gói 20.000): giao dịch `needs_review` `AMOUNT_MISMATCH`, đơn vẫn `pending`, không kích hoạt.
- `GET report` khớp số liệu tính tay từ DB (doanh thu, số đơn, active members).
- Grant comp: user lên premium, doanh thu không đổi, audit có lý do.
- Revoke: `GET /api/me/membership` trả `tier=free` ngay sau revoke.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Chết giữa pha A và pha B | Row `unmatched` còn đó; retry cùng `sepay_id` chạy tiếp pha 2 |
| Hai webhook cùng đơn (2 mã khác nhau) | Cả hai đi qua `activateOrder` khoá `FOR UPDATE`; đơn thứ hai thành `needs_review` |
| Stack vượt trần do thời gian trôi | `activateOrder` set `needs_review` `STACK_LIMIT_REACHED`; admin quyết |
| Admin resolve gán nhầm đơn | Bắt buộc amount khớp `price_vnd`; audit before/after |
| Report sai timezone | `paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'` + test biên ngày |
| Lộ key webhook trong log | Không log header; chỉ log `sepayId`, `status`, `reason` |

## Security Considerations

- Webhook không dùng session; chỉ key. So sánh timing-safe.
- `raw_payload` và tên người chuyển chỉ admin đọc; route user không join bảng giao dịch.
- Admin mutation đều audit (actor, IP, before/after).
- Grant/revoke không xoá kỳ hạn cũ; revoke set `revoked_at`, giữ lịch sử.
- Validate `from/to` để tránh query full bảng.

## Next Steps

Phase 4 nối entitlement vào playback + docs + test; không sửa logic tiền nữa.
