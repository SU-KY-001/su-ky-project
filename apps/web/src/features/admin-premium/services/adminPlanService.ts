import { AdminMembershipPlanSchema, type AdminPlanPatch } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";

const plansPath = "/api/admin/membership/plans";
const plansSchema = AdminMembershipPlanSchema.array();

export const adminPlanService = {
  list: (signal: AbortSignal) => apiRequest(plansPath, plansSchema, { signal }),
  update: (code: string, body: AdminPlanPatch) =>
    apiRequest(`${plansPath}/${encodeURIComponent(code)}`, AdminMembershipPlanSchema, { method: "PATCH", body }),
};
