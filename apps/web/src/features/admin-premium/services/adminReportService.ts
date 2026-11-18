import { z } from "zod";
import { apiRequest } from "@/lib/apiRequest";

const reportSchema = z.object({
  range: z.object({ from: z.string(), to: z.string(), groupBy: z.enum(["day", "month"]) }),
  summary: z.object({
    revenueVnd: z.number(),
    paidOrders: z.number(),
    compGrants: z.number(),
    activeMembers: z.number(),
    expiringIn7Days: z.number(),
    pendingOver24h: z.number(),
    needsReviewOrders: z.number(),
    unmatchedTransactions: z.number(),
    unmatchedAmountVnd: z.number(),
  }),
  series: z.array(z.object({
    bucket: z.string(),
    revenueVnd: z.number(),
    paidOrders: z.number(),
    byPlan: z.array(z.object({ planCode: z.string(), revenueVnd: z.number(), paidOrders: z.number() })),
  })),
});

export type MembershipReport = z.infer<typeof reportSchema>;
export type ReportRange = { from: string; to: string; groupBy: "day" | "month" };

export const adminReportService = {
  get: (range: ReportRange, signal: AbortSignal) =>
    apiRequest(`/api/admin/membership/report?${new URLSearchParams(range)}`, reportSchema, { signal }),
};
