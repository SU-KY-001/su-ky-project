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
  status: MembershipOrderStatusSchema.optional(),
  q: z.string().trim().max(255).optional(),
});

export const AdminVerifyOrderSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
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
});

export const AdminResolveTransactionSchema = z
  .object({
    action: z.enum(["assign", "ignore"]),
    orderId: z.string().uuid().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "assign" && !value.orderId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orderId"],
        message: "Cần chọn đơn để gán giao dịch",
      });
  });

export const AdminMemberQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["active", "expired", "all"]).default("all"),
  q: z.string().trim().max(255).optional(),
});

export const AdminGrantMembershipSchema = z.object({
  planCode: z.enum(["monthly", "yearly"]),
  reason: z.string().trim().min(3).max(500),
});

export const AdminRevokeMembershipSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

export const AdminPlanPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    priceVnd: z.number().int().nonnegative().optional(),
    durationDays: z.number().int().nonnegative().optional(),
    isPurchasable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật",
  });

export const AdminMembershipReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  groupBy: z.enum(["day", "month"]).default("day"),
});
