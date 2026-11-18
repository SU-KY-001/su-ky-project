import { z } from "zod";
import { AdminMemberSchema, paginatedSchema, type AdminMemberQuery, type AdminGrantMembership, type AdminRevokeMembership } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";

const membersPath = "/api/admin/membership/members";
const memberPageSchema = paginatedSchema(AdminMemberSchema);
const grantResult = z.object({ orderId: z.string(), userId: z.string() });
const revokeResult = z.object({ userId: z.string(), revoked: z.number().int() });

export const adminMemberService = {
  list(filter: AdminMemberQuery, signal: AbortSignal) {
    const params = new URLSearchParams({ page: String(filter.page), limit: String(filter.limit), status: filter.status });
    if (filter.q) params.set("q", filter.q);
    if (filter.expiresFrom) params.set("expiresFrom", filter.expiresFrom);
    if (filter.expiresTo) params.set("expiresTo", filter.expiresTo);
    return apiRequest(`${membersPath}?${params}`, memberPageSchema, { signal });
  },
  grant(userId: string, body: AdminGrantMembership, idempotencyKey: string) {
    return apiRequest(`${membersPath}/${encodeURIComponent(userId)}/grant`, grantResult, { method: "POST", body, idempotencyKey });
  },
  revoke(userId: string, body: AdminRevokeMembership) {
    return apiRequest(`${membersPath}/${encodeURIComponent(userId)}/revoke`, revokeResult, { method: "POST", body });
  },
};
