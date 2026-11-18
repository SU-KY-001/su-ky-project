import { AdminMembershipOrderDetailSchema, AdminMembershipOrderSchema, AdminResolveTransactionResultSchema, AdminResolveTransactionSchema, AdminTransactionDetailSchema, AdminTransactionSchema, AdminVerifyOrderSchema, paginatedSchema } from "@repo/shared";
import type { z } from "zod";
import { apiRequest } from "@/lib/apiRequest";

const base = "/api/admin/membership";
const orderPage = paginatedSchema(AdminMembershipOrderSchema);
const transactionPage = paginatedSchema(AdminTransactionSchema);

export type PaymentFilter = { q: string; status: string; from: string; to: string; page: number; limit: number; assignableAmount?: number };
export type PaymentAction =
  | { kind: "orders"; input: z.infer<typeof AdminVerifyOrderSchema> }
  | { kind: "transactions"; input: z.infer<typeof AdminResolveTransactionSchema> };

function searchParams(filter: PaymentFilter) {
  return new URLSearchParams(Object.entries(filter).filter(([, value]) => value !== "" && value !== undefined).map(([key, value]) => [key, String(value)]));
}

export const adminPaymentService = {
  orders: (filter: PaymentFilter, signal: AbortSignal) => apiRequest(`${base}/orders?${searchParams(filter)}`, orderPage, { signal }),
  transactions: (filter: PaymentFilter, signal: AbortSignal) => apiRequest(`${base}/transactions?${searchParams(filter)}`, transactionPage, { signal }),
  order: (id: string, signal: AbortSignal) => apiRequest(`${base}/orders/${encodeURIComponent(id)}`, AdminMembershipOrderDetailSchema, { signal }),
  transaction: (id: string, signal: AbortSignal) => apiRequest(`${base}/transactions/${encodeURIComponent(id)}`, AdminTransactionDetailSchema, { signal }),
  async process(id: string, { kind, input }: PaymentAction) {
    const path = `${base}/${kind}/${encodeURIComponent(id)}`;
    if (kind === "orders") {
      await apiRequest(`${path}/verify`, AdminMembershipOrderDetailSchema, { method: "POST", body: input });
      return;
    }
    return apiRequest(`${path}/resolve`, AdminResolveTransactionResultSchema, { method: "POST", body: input });
  },
};
