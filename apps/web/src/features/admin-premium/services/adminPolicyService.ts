import { ExperiencePolicySchema, PremiumAuditEntrySchema, paginatedSchema, type ExperienceFeature, type ExperiencePolicyInput, type PremiumAuditQuery } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";

const base = "/api/admin/membership";
const policiesSchema = ExperiencePolicySchema.array();
const auditPageSchema = paginatedSchema(PremiumAuditEntrySchema);

export const adminPolicyService = {
  list: (signal: AbortSignal) => apiRequest(`${base}/experience-policies`, policiesSchema, { signal }),
  save: (feature: ExperienceFeature, body: ExperiencePolicyInput) =>
    apiRequest(`${base}/experience-policies/${feature}`, ExperiencePolicySchema, { method: "PATCH", body }),
  audit(query: PremiumAuditQuery, signal: AbortSignal) {
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
    if (query.q) params.set("q", query.q);
    if (query.resourceType) params.set("resourceType", query.resourceType);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    return apiRequest(`${base}/audit?${params}`, auditPageSchema, { signal });
  },
};
