import { z } from "zod";
import {
  AdminGrantMembershipSchema,
  AdminMemberQuerySchema,
  AdminMembershipOrderQuerySchema,
  AdminMembershipReportQuerySchema,
  AdminPlanPatchSchema,
  AdminResolveTransactionSchema,
  AdminRevokeMembershipSchema,
  AdminTransactionQuerySchema,
  AdminVerifyOrderSchema,
  AttachProofSchema,
  CreateMediaAssetSchema,
  CreateMembershipOrderSchema,
  MembershipEntitlementSchema,
  MembershipOrderSchema,
  MembershipOrderStatusSchema,
  MembershipPlanSchema,
  paginatedSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";

const TAG = "Membership";
const idParam = z.object({ id: z.string().uuid() });
const codeParam = z.object({ code: z.string().min(1) });
const userIdParam = z.object({ userId: z.string().min(1) });
const idParams = { pathParams: idParam, pathParamDocs: { id: "ID đơn mua gói" } } as const;

export const MembershipOrderDocSchema = MembershipOrderSchema;
export const MembershipPlanDocSchema = MembershipPlanSchema;
const AdminMembershipPlanDocSchema = MembershipPlanSchema.extend({ isActive: z.boolean() });

export const AdminMembershipOrderDocSchema = z.object({
  id: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  priceVnd: z.number().int(),
  durationDays: z.number().int(),
  transferContent: z.string(),
  status: MembershipOrderStatusSchema,
  reviewReason: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  bankTransactionId: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  proofUrl: z.string().nullable(),
  proofUploaded: z.boolean(),
  canApprove: z.boolean(),
});

export const AdminTransactionDocSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  externalId: z.string(),
  referenceCode: z.string().nullable(),
  amount: z.number().int(),
  accumulated: z.string().nullable(),
  content: z.string(),
  code: z.string().nullable(),
  gateway: z.string().nullable(),
  accountNumber: z.string().nullable(),
  subAccount: z.string().nullable(),
  transactionAt: z.coerce.date(),
  status: z.enum(["unmatched", "needs_review", "matched", "ignored"]),
  orderId: z.string().uuid().nullable(),
  reason: z.string().nullable(),
  createdAt: z.coerce.date(),
  order: z
    .object({ id: z.string().uuid(), transferContent: z.string(), userId: z.string(), status: MembershipOrderStatusSchema })
    .nullable(),
});

export const AdminMemberDocSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  planCode: z.string(),
  planName: z.string(),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  revokedAt: z.coerce.date().nullable(),
});

export const MembershipReportDocSchema = z.object({
  range: z.object({ from: z.string(), to: z.string(), groupBy: z.enum(["day", "month"]) }),
  summary: z.object({
    revenueVnd: z.number().int(),
    paidOrders: z.number().int(),
    compGrants: z.number().int(),
    activeMembers: z.number().int(),
    expiringIn7Days: z.number().int(),
    pendingOver24h: z.number().int(),
    needsReviewOrders: z.number().int(),
    unmatchedTransactions: z.number().int(),
    unmatchedAmountVnd: z.number().int(),
  }),
  series: z.array(
    z.object({
      bucket: z.string(),
      revenueVnd: z.number().int(),
      paidOrders: z.number().int(),
      byPlan: z.array(z.object({ planCode: z.string(), revenueVnd: z.number().int(), paidOrders: z.number().int() })),
    }),
  ),
});

export const AdminMembershipOrderDetailDocSchema = AdminMembershipOrderDocSchema.extend({
  transactions: z.array(AdminTransactionDocSchema),
});

const planListSchema = z.array(MembershipPlanSchema);
const adminPlanListSchema = z.array(AdminMembershipPlanDocSchema);
const plan = (description: string) => ({ status: 200 as const, description, schema: { name: "MembershipPlan", schema: MembershipPlanSchema } });
const adminPlan = (description: string) => ({ status: 200 as const, description, schema: { name: "AdminMembershipPlan", schema: AdminMembershipPlanDocSchema } });
const order = (description: string) => ({ status: 200 as const, description, schema: { name: "MembershipOrder", schema: MembershipOrderSchema } });

export const membershipPaths: Paths = {
  "/api/membership/plans": {
    get: operation({
      id: "listMembershipPlans",
      tag: TAG,
      summary: "Danh sách gói thành viên",
      description: "Trả mọi gói đang bật, kể cả gói miễn phí (`isPurchasable=false`) để client hiển thị bảng so sánh.",
      access: "public",
      ok: { status: 200, description: "Các gói đang bật", schema: { name: "MembershipPlanList", schema: planListSchema } },
    }),
  },
  "/api/me/membership": {
    get: operation({
      id: "getMyMembership",
      tag: TAG,
      summary: "Trạng thái thành viên của tôi",
      description: "`tier=premium` khi còn kỳ hạn hiệu lực. `daysLeft` chỉ có khi còn hạn; `pendingOrderId` là đơn đang chờ/đối soát gần nhất.",
      access: "user",
      ok: { status: 200, description: "Quyền lợi hiện tại", schema: { name: "MembershipEntitlement", schema: MembershipEntitlementSchema } },
    }),
  },
  "/api/me/membership/orders": {
    post: operation({
      id: "createMembershipOrder",
      tag: TAG,
      summary: "Tạo đơn mua gói",
      description: "Một đơn mở cho mỗi user: gọi lại cùng gói trả lại đúng đơn cũ (cùng mã chuyển khoản). Đơn `needs_review` cũng được trả lại, không tạo QR thứ hai. Vượt trần cộng dồn trả 422 `STACK_LIMIT_REACHED`.",
      access: "user",
      body: { name: "CreateMembershipOrderRequest", schema: CreateMembershipOrderSchema },
      idempotent: true,
      rate: "membership_order",
      ok: { status: 201, description: "Đơn và thông tin chuyển khoản", schema: { name: "MembershipOrder", schema: MembershipOrderSchema }, location: "/api/me/membership/orders/{id}" },
      errors: {
        404: "`PLAN_NOT_FOUND`: mã gói không tồn tại",
        422: "`PLAN_NOT_PURCHASABLE`: gói free/không bán/giá 0; `STACK_LIMIT_REACHED`: vượt trần cộng dồn",
      },
    }),
    get: operation({
      id: "listMyMembershipOrders",
      tag: TAG,
      summary: "Lịch sử đơn của tôi",
      access: "user",
      query: z.object({ page: z.coerce.number().int(), limit: z.coerce.number().int() }),
      ok: { status: 200, description: "Đơn mới nhất trước", schema: { name: "MembershipOrderPage", schema: paginatedSchema(MembershipOrderSchema) } },
    }),
  },
  "/api/me/membership/orders/{id}": {
    get: operation({
      id: "getMyMembershipOrder",
      tag: TAG,
      summary: "Chi tiết đơn (dùng để polling)",
      description: "Client gọi lại mỗi 3–5 giây cho tới khi `status` là `paid`, `needs_review` hoặc `rejected`. Đơn của user khác trả 404.",
      access: "user",
      ...idParams,
      ok: order("Đơn của chính mình"),
      errors: { 404: "`MEMBERSHIP_ORDER_NOT_FOUND`: không tồn tại hoặc không thuộc user" },
    }),
  },
  "/api/me/membership/orders/{id}/proof-ticket": {
    post: operation({
      id: "createMembershipProofTicket",
      tag: TAG,
      summary: "Xin ticket upload ảnh chuyển khoản",
      description: "Luôn tạo asset `IMAGE` (bỏ qua `kind` client gửi). Chỉ đơn `pending`/`needs_review` mới nhận ảnh.",
      access: "user",
      ...idParams,
      body: { name: "CreateMediaAsset", schema: CreateMediaAssetSchema },
      rate: "media_upload",
      ok: { status: 200, description: "Ticket upload Cloudinary", schema: { name: "MembershipProofTicket", schema: z.object({ assetId: z.string().uuid(), upload: z.object({ url: z.string(), fields: z.record(z.string()) }), expiresAt: z.coerce.date() }) } },
      errors: { 404: "`MEMBERSHIP_ORDER_NOT_FOUND`", 409: "`ORDER_NOT_PENDING`: đơn đã kết thúc" },
    }),
  },
  "/api/me/membership/orders/{id}/proof": {
    post: operation({
      id: "attachMembershipProof",
      tag: TAG,
      summary: "Gắn ảnh chuyển khoản vào đơn",
      description: "Xác minh asset thuộc user và đã upload xong; ảnh cũ (nếu có) bị thay và được job dọn media xử lý.",
      access: "user",
      ...idParams,
      body: { name: "AttachMembershipProofRequest", schema: AttachProofSchema },
      ok: order("Đơn sau khi gắn ảnh"),
      errors: { 404: "`MEMBERSHIP_ORDER_NOT_FOUND` hoặc asset không thuộc user", 409: "`ORDER_NOT_PENDING`", 422: "`MEDIA_INVALID`" },
    }),
  },
  "/api/payments/{provider}/webhook": {
    post: operation({
      id: "paymentWebhook",
      tag: TAG,
      summary: "Webhook thanh toán theo provider",
      description: "`provider` chọn adapter (`sepay` hiện được hỗ trợ). Adapter xác thực request, chuẩn hoá payload về cùng một giao dịch rồi đối soát/kích hoạt. Idempotent theo `(provider, external id)`. Luôn trả `{success:true}` cho kết quả nghiệp vụ; chỉ 5xx khi lỗi hạ tầng để provider retry.",
      access: "public",
      pathParams: z.object({ provider: z.string().min(1).max(32) }),
      pathParamDocs: { provider: "Mã provider: sepay" },
      body: { name: "PaymentWebhookPayload", schema: z.record(z.unknown()) },
      ok: { status: 200, description: "Đã xử lý (kể cả khi cần đối soát)", schema: { name: "PaymentWebhookAck", schema: z.object({ success: z.literal(true) }) } },
      errors: {
        400: "`VALIDATION_ERROR`: payload không đúng định dạng của provider",
        401: "`PAYMENT_UNAUTHORIZED`: sai hoặc thiếu thông tin xác thực",
        404: "`PAYMENT_PROVIDER_UNSUPPORTED`: chưa có adapter cho provider",
        503: "`PAYMENT_PROVIDER_NOT_CONFIGURED`: server chưa cấu hình provider",
      },
    }),
  },
  "/api/admin/membership/plans": {
    get: operation({
      id: "adminListMembershipPlans",
      tag: TAG,
      summary: "Admin: danh sách gói",
      access: "admin",
      ok: { status: 200, description: "Mọi gói, kể cả đã tắt", schema: { name: "AdminMembershipPlanList", schema: adminPlanListSchema } },
    }),
  },
  "/api/admin/membership/plans/{code}": {
    patch: operation({
      id: "adminUpdateMembershipPlan",
      tag: TAG,
      summary: "Admin: sửa gói",
      description: "Đổi giá/trạng thái bán. Đơn cũ giữ giá snapshot; đơn pending giá cũ bị từ chối `PLAN_PRICE_CHANGED` khi user tạo đơn mới. Audit before/after.",
      access: "admin",
      pathParams: codeParam,
      pathParamDocs: { code: "Mã gói: free, monthly, yearly" },
      body: { name: "AdminPlanPatchRequest", schema: AdminPlanPatchSchema },
      rate: "write",
      ok: adminPlan("Gói sau khi sửa"),
      errors: { 404: "`PLAN_NOT_FOUND`", 422: "`PLAN_NOT_PURCHASABLE`: bật bán nhưng giá hoặc số ngày không dương" },
    }),
  },
  "/api/admin/membership/orders": {
    get: operation({
      id: "adminListMembershipOrders",
      tag: TAG,
      summary: "Admin: danh sách đơn",
      description: "Lọc `status`, tìm theo email/tên user hoặc mã chuyển khoản.",
      access: "admin",
      query: AdminMembershipOrderQuerySchema,
      ok: { status: 200, description: "Đơn kèm user, ảnh minh chứng và cờ `canApprove`", schema: { name: "AdminMembershipOrderPage", schema: paginatedSchema(AdminMembershipOrderDocSchema) } },
    }),
  },
  "/api/admin/membership/orders/{id}": {
    get: operation({
      id: "adminGetMembershipOrder",
      tag: TAG,
      summary: "Admin: chi tiết đơn",
      description: "Kèm giao dịch ngân hàng đã gắn và URL ảnh minh chứng (chỉ admin thấy).",
      access: "admin",
      ...idParams,
      ok: { status: 200, description: "Đơn, user, giao dịch", schema: { name: "AdminMembershipOrderDetail", schema: AdminMembershipOrderDetailDocSchema } },
      errors: { 404: "`MEMBERSHIP_ORDER_NOT_FOUND`" },
    }),
  },
  "/api/admin/membership/orders/{id}/verify": {
    post: operation({
      id: "adminVerifyMembershipOrder",
      tag: TAG,
      summary: "Admin: duyệt hoặc từ chối đơn",
      description: "Duyệt chạy cùng đường kích hoạt với webhook (khoá user, cộng dồn, trần 365 ngày). Duyệt lại đơn đã trả tiền không tạo kỳ hạn thứ hai. Từ chối bắt buộc lý do ≥ 10 ký tự.",
      access: "admin",
      ...idParams,
      body: { name: "AdminVerifyOrderRequest", schema: AdminVerifyOrderSchema },
      rate: "write",
      ok: { status: 200, description: "Đơn sau xử lý", schema: { name: "AdminMembershipOrderDetail", schema: AdminMembershipOrderDetailDocSchema } },
      errors: { 404: "`MEMBERSHIP_ORDER_NOT_FOUND`", 409: "`ORDER_NOT_PENDING`", 422: "`STACK_LIMIT_REACHED`" },
    }),
  },
  "/api/admin/membership/transactions": {
    get: operation({
      id: "adminListPaymentTransactions",
      tag: TAG,
      summary: "Admin: sổ giao dịch thanh toán",
      access: "admin",
      query: AdminTransactionQuerySchema,
      ok: { status: 200, description: "Giao dịch kèm đơn khớp (nếu có)", schema: { name: "AdminPaymentTransactionPage", schema: paginatedSchema(AdminTransactionDocSchema) } },
    }),
  },
  "/api/admin/membership/transactions/{id}/resolve": {
    post: operation({
      id: "adminResolvePaymentTransaction",
      tag: TAG,
      summary: "Admin: gán hoặc bỏ qua giao dịch",
      description: "`assign` kiểm tra số tiền khớp giá đơn rồi chạy đúng nhánh webhook. `ignore` đánh dấu bỏ qua. `note` chỉ vào audit, không hiện cho user.",
      access: "admin",
      ...idParams,
      body: { name: "AdminResolveTransactionRequest", schema: AdminResolveTransactionSchema },
      rate: "write",
      ok: { status: 200, description: "Giao dịch sau xử lý và kết quả áp dụng", schema: { name: "AdminResolveTransactionResult", schema: z.object({ transaction: AdminTransactionDocSchema.nullable(), result: z.object({ status: z.enum(["matched", "needs_review"]), reason: z.string().nullable() }) }) } },
      errors: { 404: "`NOT_FOUND` hoặc `MEMBERSHIP_ORDER_NOT_FOUND`", 409: "`ORDER_NOT_PENDING`: giao dịch đã khớp hoặc đã bỏ qua", 422: "`VALIDATION_ERROR`: thiếu đơn hoặc lệch số tiền" },
    }),
  },
  "/api/admin/membership/members": {
    get: operation({
      id: "adminListMembers",
      tag: TAG,
      summary: "Admin: danh sách thành viên",
      description: "Mỗi user một dòng, lấy kỳ hạn xa nhất. `status=active|expired|all`.",
      access: "admin",
      query: AdminMemberQuerySchema,
      ok: { status: 200, description: "Thành viên và hạn dùng", schema: { name: "AdminMemberPage", schema: paginatedSchema(AdminMemberDocSchema) } },
    }),
  },
  "/api/admin/membership/members/{userId}/grant": {
    post: operation({
      id: "adminGrantMembership",
      tag: TAG,
      summary: "Admin: tặng gói",
      description: "Tạo đơn comp giá 0 (không vào doanh thu) rồi kích hoạt qua cùng hàm. Áp trần cộng dồn.",
      access: "admin",
      pathParams: userIdParam,
      pathParamDocs: { userId: "ID user nhận gói" },
      body: { name: "AdminGrantMembershipRequest", schema: AdminGrantMembershipSchema },
      idempotent: true,
      rate: "write",
      ok: { status: 200, description: "Kỳ hạn vừa tạo", schema: { name: "AdminGrantResult", schema: z.object({ orderId: z.string(), membershipId: z.string().optional(), userId: z.string(), expiresAt: z.coerce.date().optional() }) } },
      errors: { 404: "`NOT_FOUND`: user không tồn tại", 422: "`PLAN_NOT_PURCHASABLE` hoặc `STACK_LIMIT_REACHED`" },
    }),
  },
  "/api/admin/membership/members/{userId}/revoke": {
    post: operation({
      id: "adminRevokeMembership",
      tag: TAG,
      summary: "Admin: thu hồi gói",
      description: "Đặt `revokedAt` cho mọi kỳ hạn còn hiệu lực; lịch sử giữ nguyên. Hiệu lực ngay.",
      access: "admin",
      pathParams: userIdParam,
      pathParamDocs: { userId: "ID user bị thu hồi" },
      body: { name: "AdminRevokeMembershipRequest", schema: AdminRevokeMembershipSchema },
      rate: "write",
      ok: { status: 200, description: "Số kỳ hạn đã thu hồi", schema: { name: "AdminRevokeResult", schema: z.object({ userId: z.string(), revoked: z.number().int() }) } },
      errors: { 404: "`NOT_FOUND`: user không tồn tại hoặc không có gói hiệu lực" },
    }),
  },
  "/api/admin/membership/report": {
    get: operation({
      id: "adminMembershipReport",
      tag: TAG,
      summary: "Admin: báo cáo doanh thu",
      description: "Doanh thu theo ngày/tháng tại `Asia/Ho_Chi_Minh`, chỉ đơn `paid` có giá > 0; đơn comp đếm riêng. Khoảng tối đa 366 ngày.",
      access: "admin",
      query: AdminMembershipReportQuerySchema,
      queryDocs: { from: "Ngày bắt đầu (YYYY-MM-DD, giờ VN, tính cả ngày)", to: "Ngày kết thúc (YYYY-MM-DD, giờ VN, tính cả ngày)", groupBy: "`day` hoặc `month`" },
      ok: { status: 200, description: "Tổng hợp và chuỗi doanh thu", schema: { name: "MembershipReport", schema: MembershipReportDocSchema } },
      errors: { 422: "`VALIDATION_ERROR`: khoảng ngày sai hoặc quá 366 ngày" },
    }),
  },
};
