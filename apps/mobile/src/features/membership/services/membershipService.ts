import {
  MembershipEntitlementSchema,
  MembershipOrderSchema,
  MembershipPlanSchema,
  paginatedSchema,
} from "@repo/shared";
import type { z } from "zod";
import { apiClient } from "@/lib/client";

const membershipPath = "/api/me/membership";
const orderPageSchema = paginatedSchema(MembershipOrderSchema);

export type MembershipEntitlement = z.infer<typeof MembershipEntitlementSchema>;
export type MembershipOrder = z.infer<typeof MembershipOrderSchema>;
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>;

export const membershipService = {
  async plans(signal?: AbortSignal) {
    return MembershipPlanSchema.array().parse((await apiClient.get("/api/membership/plans", { signal })).data);
  },
  async status(signal?: AbortSignal) {
    return MembershipEntitlementSchema.parse((await apiClient.get(membershipPath, { signal })).data);
  },
  async orders(page: number, signal?: AbortSignal) {
    return orderPageSchema.parse((await apiClient.get(`${membershipPath}/orders`, { params: { page, limit: 10 }, signal })).data);
  },
  async order(id: string, signal?: AbortSignal) {
    return MembershipOrderSchema.parse((await apiClient.get(`${membershipPath}/orders/${encodeURIComponent(id)}`, { signal })).data);
  },
  async buy(planCode: string, idempotencyKey: string) {
    return MembershipOrderSchema.parse(
      (await apiClient.post(`${membershipPath}/orders`, { planCode }, { headers: { "Idempotency-Key": idempotencyKey } })).data,
    );
  },
};
