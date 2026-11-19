import { MembershipEntitlementSchema, MembershipOrderSchema, MembershipPlanSchema, paginatedSchema, type AdminMembershipPlan } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";
import { z } from "zod";

const membershipPath = "/api/me/membership";
const orderPage = paginatedSchema(MembershipOrderSchema);
export type MembershipOrder = z.infer<typeof MembershipOrderSchema>;

export const membershipService = {
  plans: (signal: AbortSignal) => apiRequest("/api/membership/plans", MembershipPlanSchema.array(), { signal }),
  status: (signal: AbortSignal) => apiRequest(membershipPath, MembershipEntitlementSchema, { signal }),
  orders: (page: number, signal: AbortSignal) => apiRequest(`${membershipPath}/orders?page=${page}&limit=10`, orderPage, { signal }),
  order: (id: string, signal: AbortSignal) => apiRequest(`${membershipPath}/orders/${encodeURIComponent(id)}`, MembershipOrderSchema, { signal }),
  buy(planCode: AdminMembershipPlan["code"], idempotencyKey: string) {
    return apiRequest(`${membershipPath}/orders`, MembershipOrderSchema, {
      method: "POST", body: { planCode }, idempotencyKey,
    });
  },
};
