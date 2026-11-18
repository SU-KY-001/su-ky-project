import type { ExperienceFeature, ExperiencePolicyInput, PremiumAuditQuery } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/apiError";
import { adminPolicyService } from "../services/adminPolicyService";

const policiesKey = ["admin-premium", "policies"] as const;
const auditKey = ["admin-premium", "audit"] as const;
const meta = { requiresAuth: true };
const retry = (count: number, error: unknown) => count < 1 && (!isApiError(error) || error.isRetryable);

export function useAdminPolicies() {
  return useQuery({ queryKey: policiesKey, queryFn: ({ signal }) => adminPolicyService.list(signal), meta, retry });
}

export function useSaveAdminPolicy(feature: ExperienceFeature) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (patch: ExperiencePolicyInput) => adminPolicyService.save(feature, patch),
    meta,
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: policiesKey }), cache.invalidateQueries({ queryKey: auditKey })]);
    },
  });
}

export function usePremiumAudit(query: PremiumAuditQuery, enabled: boolean) {
  return useQuery({ queryKey: [...auditKey, query], queryFn: ({ signal }) => adminPolicyService.audit(query, signal), meta, retry, enabled });
}
