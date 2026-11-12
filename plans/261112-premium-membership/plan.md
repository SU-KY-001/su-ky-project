---
title: "Premium membership: 3 gói, SePay QR, kích hoạt tự động, khoá nội dung"
description: "Thêm DB + API cho gói tháng/năm bán qua SePay (QR + webhook), membership tự kích hoạt, admin duyệt tay và khoá audio theo cờ premium của series/tập"
status: completed
priority: P1
effort: "3–4 ngày (1 dev backend)"
mode: hard
tags: [backend, api, database, payments, feature]
blockedBy: []
blocks: []
created: 2026-11-12
---

# Premium membership (API + DB)

Nguồn nghiệp vụ đã chốt: `plans/reports/research-261112-premium-membership.md`.
Cross-plan scan: `261027-two-person-podcast`, `261029-error-semantics-audit`, `261104-multi-speaker-podcast` đều `completed`; không chặn nhau. Plan này chỉ thêm module mới + 2 cột cờ trên `series`/`episodes`; không sửa logic publish/release hiện có.

## Mục tiêu

1. 3 gói: Free (0đ, không mua), Tháng 20.000đ/30 ngày, Năm 220.000đ/365 ngày. Cộng dồn, trần 365 ngày.
2. User tạo đơn → nhận QR + mã chuyển khoản riêng → SePay webhook tự kích hoạt; admin duyệt tay khi webhook không tới (kèm ảnh minh chứng).
3. Admin: duyệt/từ chối đơn, xử lý sổ giao dịch (`needs_review`), grant/revoke membership, báo cáo doanh thu.
4. Khoá phát audio theo `series.isPremium` / `episodes.isPremium`; user premium nghe được, user free nhận 403 `PREMIUM_REQUIRED`.

Không làm: ví/auto-renew/hoàn tiền tự động, hoá đơn điện tử, email/push, UI web/mobile, cron xoá dữ liệu, sửa dashboard admin hiện có.

## Scope challenge

- **Đã có, dùng lại:** `mediaService` (upload/verify ảnh minh chứng), `idempotency()` + `rateLimit()`, `writeAudit`, `getSystemConfig`, khung docs OpenAPI, pagination/DomainError, test integration rollback.
- **Tối thiểu cần thêm:** 4 bảng + 2 cột cờ + 1 module + gate playback + docs/test. Không thêm thư viện nào.
- **Defer (không làm):** UI web/mobile, block finance trên dashboard, email/push, hoá đơn, hoàn tiền, cron xoá, cron nhắc hạn.
- **Chọn:** HOLD — ~24 file, 4 phase vì mỗi phase là một lớp có thể merge/review riêng; gộp nữa sẽ khó kiểm tra đường tiền.

## Quyết định kỹ thuật (chốt)

| Chủ đề | Quyết định |
|---|---|
| Render | Giữ nguyên style repo: Hono route factory + service + Prisma repository, Zod schema trong `@repo/shared`, `zValidator` + `throwOnInvalid` |
| Endpoint user | Đặt dưới `/api/me/membership/*` (đúng quy ước repo, không dùng `/api/membership/orders`) |
| Endpoint public | `GET /api/membership/plans` |
| Webhook | `POST /api/payments/:provider/webhook` (SePay: `sepay`, auth `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`, timing-safe); adapter chuẩn hoá payload, sổ chung `payment_transactions` |
| Tiền | `int` VND, không float; mọi chuyển khoản lưu `bigint` cho `accumulated` |
| Idempotency | Dùng middleware `idempotency()` sẵn có cho `POST` tạo đơn (bắt buộc `Idempotency-Key` UUIDv4) |
| Mã CK | `SK` + 8 ký tự A-Z0-9 (bỏ I/O/0/1), unique, sinh trong transaction khoá theo user |
| Trần cộng dồn | 365 ngày tính từ `now`; vượt → 422 `STACK_LIMIT_REACHED` lúc tạo đơn, và `needs_review` lúc webhook/manual activate nếu thời gian đã trôi. Hệ quả: gói năm chỉ mua lại khi còn < 1 ngày — nới bằng `premium.max_stack_days` nếu leader muốn |
| Activation | Một hàm dùng chung: khoá `FOR UPDATE` đơn, kiểm tra trạng thái, tính hạn, tạo `memberships`, cập nhật đơn + giao dịch |
| Webhook retry | Nếu `sepay_id` đã có nhưng `status` chưa `matched|ignored` → chạy lại pha 2 |
| Quyền premium nội dung | Đặt cờ qua `PATCH` series/tập (admin + moderator, đã có `assertWritable` + audit); không thêm field vào body publish |
| Ảnh minh chứng | Reuse `MediaService` (ticket + verify) qua 2 endpoint `proof-ticket` / `proof`; thêm loại trừ trong job dọn media để không xoá ảnh đã gắn đơn |
| Báo cáo | Endpoint riêng `/api/admin/membership/report` (SQL `date_trunc` theo `Asia/Ho_Chi_Minh`, cast `::int`); không sửa dashboard |
| Audio premium | Thêm `audioDeliveryUrl()` dùng Cloudinary auth token cho `type:"authenticated"` (config `media.audio_delivery_ttl_seconds`), chỉ nhánh premium; **phải verify bằng asset thật trong `<audio>`**, không thì fallback URL cũ + ghi residual risk |
| Xoá user | FK `Restrict` trên đơn/kỳ hạn — không xoá mất sổ tiền; `profile.service` đã map lỗi FK thành 409 |
| Đường dẫn | Plan này là chuẩn: `/api/me/membership/*`, `/api/admin/membership/*`, `/api/payments/:provider/webhook`; spec cũ dùng tên khác |
| Lưu trữ | Append-only, không xoá; sai thì đổi trạng thái + lý do |

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Nền dữ liệu và contract](./phase-01-data-contracts.md) | Done |
| 2 | [API mua gói cho người dùng](./phase-02-user-payment-api.md) | Done |
| 3 | [Webhook SePay và API quản trị](./phase-03-webhook-admin.md) | Done |
| 4 | [Khoá nội dung, docs, kiểm thử](./phase-04-entitlement-docs-tests.md) | Done |

## Phụ thuộc giữa phase

- Phase 2, 3, 4 đều cần schema/migration + shared schema của phase 1.
- Phase 3 cần hàm tạo đơn + tính hạn của phase 2 (dùng lại service, không copy logic).
- Phase 4 cần bảng `memberships` (phase 1) và endpoint `GET /api/me/membership` (phase 2) để UI biết trạng thái.

## Lệnh kiểm tra cuối

```bash
cd apps/api && bun run check-types
cd apps/api && bun test
# integration (cần DB test): RUN_INTEGRATION=1 bun test
```

Smoke webhook (local):

```bash
curl -X POST http://localhost:3005/api/payments/sepay/webhook \
  -H "Authorization: Apikey $SEPAY_WEBHOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":990001,"gateway":"MB","transactionDate":"2026-11-12 10:00:00","accountNumber":"0909090909","code":"SKAB12CD34","content":"CK SKAB12CD34","transferType":"in","transferAmount":20000,"accumulated":20000,"subAccount":null,"referenceCode":"FT1"}'
```
