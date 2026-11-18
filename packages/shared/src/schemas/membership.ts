import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const MembershipOrderStatusSchema = z.enum([
  "pending",
  "paid",
  "needs_review",
  "rejected",
]);

export const MembershipPlanSchema = z.object({
  code: z.string(),
  name: z.string(),
  benefits: z.string().default(""),
  priceVnd: z.number().int().nonnegative(),
  durationDays: z.number().int().nonnegative(),
  isPurchasable: z.boolean(),
  sortOrder: z.number().int(),
});

export const MembershipDailyQuotaSchema = z.object({
  enforced: z.boolean(),
  /** `null` when the quota is switched off. */
  limit: z.number().int().positive().nullable(),
  usedToday: z.number().int().nonnegative(),
  /** `null` when the quota is switched off. */
  remaining: z.number().int().nonnegative().nullable(),
  resetsAt: z.coerce.date(),
});

export const ExperienceFeatureSchema = z.enum(["podcast", "quiz", "exhibition"]);
const limitedPolicy = z.object({ mode: z.literal("free_limited"), dailyQuota: z.number().int().positive().max(2_147_483_647) });
export const ExperiencePolicyInputSchema = z.discriminatedUnion("mode", [
  limitedPolicy,
  z.object({ mode: z.literal("free_unlimited"), dailyQuota: z.null() }),
  z.object({ mode: z.literal("premium_only"), dailyQuota: z.null() }),
]);
export const ExperiencePolicySchema = ExperiencePolicyInputSchema.and(z.object({ feature: ExperienceFeatureSchema }));
export const ExperienceQuotaSchema = MembershipDailyQuotaSchema.extend({
  feature: ExperienceFeatureSchema,
  mode: z.enum(["free_limited", "free_unlimited", "premium_only"]),
});
export const ExperienceStartQuerySchema = z.object({ start: z.string().uuid().optional() });
export type ExperienceFeature = z.infer<typeof ExperienceFeatureSchema>;
export type ExperiencePolicy = z.infer<typeof ExperiencePolicySchema>;
export type ExperiencePolicyInput = z.infer<typeof ExperiencePolicyInputSchema>;

export const MembershipEntitlementSchema = z.object({
  tier: z.enum(["free", "premium"]),
  expiresAt: z.coerce.date().nullable(),
  daysLeft: z.number().int().nullable(),
  planCode: z.string().nullable(),
  pendingOrderId: z.string().uuid().nullable(),
  /** `true` during the last 5 days of a paid period; drives the renewal reminder. */
  renewSoon: z.boolean(),
  /** Daily listen quota for free users; `null` for premium and staff. */
  quota: MembershipDailyQuotaSchema.nullable(),
  experienceQuotas: ExperienceQuotaSchema.array().default([]),
});

export const PremiumRenewalReminderSchema = z.object({
  membershipId: z.string().uuid(),
  planName: z.string(),
  expiresAt: z.coerce.date(),
  daysLeft: z.number().int().positive(),
  createdAt: z.coerce.date(),
  renewalPath: z.literal("/thanh-vien"),
});

export const PremiumPushConfigSchema = z.object({ publicKey: z.string().nullable() });
export const PremiumPushEndpointSchema = z.object({ endpoint: z.string().url().max(1024) });
export const PremiumPushSubscriptionSchema = PremiumPushEndpointSchema.extend({
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
});
export const PremiumPushResultSchema = z.object({ saved: z.boolean() });
export type PremiumPushSubscription = z.infer<typeof PremiumPushSubscriptionSchema>;

export const CreateMembershipOrderSchema = z.object({
  // Plain string so an unknown code is 404 PLAN_NOT_FOUND and `free` is 422 PLAN_NOT_PURCHASABLE,
  // not a blanket 400 VALIDATION_ERROR from an enum check.
  planCode: z.string().trim().min(1).max(32),
});

export const MembershipBankSchema = z.object({
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  qrUrl: z.string(),
  amount: z.number().int(),
  transferContent: z.string(),
});

export const MembershipOrderSchema = z.object({
  id: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  priceVnd: z.number().int(),
  durationDays: z.number().int(),
  transferContent: z.string(),
  status: MembershipOrderStatusSchema,
  reviewReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  rejectionReason: z.string().nullable(),
  proofUploaded: z.boolean(),
  bank: MembershipBankSchema,
});

export const AttachProofSchema = z.object({
  assetId: z.string().uuid(),
  publicId: z.string().min(1),
});

export const SepayWebhookSchema = z
  .object({
    // SePay sends a number. Strings are accepted and never coerced through Number (precision > 2^53).
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
  })
  .passthrough();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Ngày không hợp lệ");

export const AdminMembershipOrderQuerySchema = PaginationQuerySchema.extend({
  assignableAmount: z.coerce.number().int().positive().optional(),
  status: MembershipOrderStatusSchema.optional(),
  q: z.string().trim().max(255).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const AdminMembershipOrderSchema = MembershipOrderSchema.omit({ bank: true }).extend({
  bankTransactionId: z.string().nullable(),
  adminNote: z.string().nullable(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  proofUrl: z.string().nullable(),
  canApprove: z.boolean(),
});

export const AdminTransactionSchema = z.object({
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
  order: z.object({ id: z.string().uuid(), transferContent: z.string(), userId: z.string(), status: MembershipOrderStatusSchema }).nullable(),
});

export const PremiumAuditEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  actorType: z.string(),
  actor: z.object({ id: z.string(), name: z.string() }).nullable(),
  changes: z.unknown(),
  createdAt: z.coerce.date(),
});

export const PremiumAuditQuerySchema = PaginationQuerySchema.extend({
  action: z.string().trim().min(1).max(64).optional(),
  resourceType: z.string().trim().min(1).max(64).optional(),
  q: z.string().trim().max(255).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
}).refine(({ from, to }) => !from || !to || from <= to, {
  path: ["to"],
  message: "Ngày kết thúc phải từ ngày bắt đầu trở đi",
});

export const AdminMembershipOrderDetailSchema = AdminMembershipOrderSchema.extend({
  transactions: z.array(AdminTransactionSchema),
  history: z.array(PremiumAuditEntrySchema),
});

export const AdminTransactionDetailSchema = AdminTransactionSchema.extend({
  history: z.array(PremiumAuditEntrySchema),
});

export const AdminResolveTransactionResultSchema = z.union([
  AdminTransactionSchema,
  z.object({
    transaction: AdminTransactionSchema.nullable(),
    result: z.object({ status: z.enum(["matched", "needs_review"]), reason: z.string().nullable() }),
  }),
]);

export type AdminMembershipOrder = z.infer<typeof AdminMembershipOrderSchema>;
export type AdminTransaction = z.infer<typeof AdminTransactionSchema>;
export type PremiumAuditEntry = z.infer<typeof PremiumAuditEntrySchema>;
export type PremiumAuditQuery = z.infer<typeof PremiumAuditQuerySchema>;

export const AdminVerifyOrderSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "approve" && !value.note)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: "Nhập ghi chú xác nhận đã nhận đủ tiền" });
    if (value.action === "reject" && (value.reason?.length ?? 0) < 10)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Lý do từ chối phải có ít nhất 10 ký tự",
      });
  });

export const AdminTransactionQuerySchema = PaginationQuerySchema.extend({
  provider: z.string().trim().max(32).optional(),
  status: z.enum(["unmatched", "needs_review", "matched", "ignored"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  q: z.string().trim().max(255).optional(),
});

export const AdminResolveTransactionSchema = z
  .object({
    action: z.enum(["assign", "ignore"]),
    orderId: z.string().uuid().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.note)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: "Nhập lý do xử lý giao dịch" });
    if (value.action === "assign" && !value.orderId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orderId"],
        message: "Cần chọn đơn để gán giao dịch",
      });
  });

export const AdminMemberQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["active", "free", "expired", "revoked", "all"]).default("all"),
  q: z.string().trim().max(255).optional(),
  expiresFrom: isoDate.optional(),
  expiresTo: isoDate.optional(),
}).refine(({ expiresFrom, expiresTo }) => !expiresFrom || !expiresTo || expiresFrom <= expiresTo, {
  path: ["expiresTo"],
  message: "Ngày kết thúc phải từ ngày bắt đầu trở đi",
});

export const AdminMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(["active", "free", "expired", "revoked"]),
  planCode: z.string().nullable(),
  planName: z.string().nullable(),
  startsAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
  revokeReason: z.string().nullable(),
  source: z.enum(["payment", "admin"]).nullable(),
});

export type AdminMember = z.infer<typeof AdminMemberSchema>;
export type AdminMemberQuery = z.infer<typeof AdminMemberQuerySchema>;
export type AdminGrantMembership = z.infer<typeof AdminGrantMembershipSchema>;
export type AdminRevokeMembership = z.infer<typeof AdminRevokeMembershipSchema>;

export const AdminGrantMembershipSchema = z.object({
  planCode: z.string().trim().min(1).max(32),
  reason: z.string().trim().min(3).max(500),
});

export const AdminRevokeMembershipSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

const planFields = z.object({
  name: z.string().trim().min(1, "Nhập tên gói").max(100),
  benefits: z.string().trim().max(2000),
  priceVnd: z.number().int().min(0).max(2_147_483_647),
  durationDays: z.number().int().min(0).max(100_000_000),
  isPurchasable: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647),
});

export const AdminMembershipPlanSchema = MembershipPlanSchema.extend({ isActive: z.boolean() });

export const AdminPlanFormSchema = planFields.pick({
  name: true, priceVnd: true, durationDays: true, isPurchasable: true,
});

export const AdminPlanPatchSchema = planFields.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type AdminMembershipPlan = z.infer<typeof AdminMembershipPlanSchema>;
export type AdminPlanForm = z.infer<typeof AdminPlanFormSchema>;
export type AdminPlanPatch = z.infer<typeof AdminPlanPatchSchema>;

export const AdminMembershipReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  groupBy: z.enum(["day", "month"]).default("day"),
});
