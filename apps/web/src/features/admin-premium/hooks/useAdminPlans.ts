import type { AdminPlanPatch } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/apiError";
import { adminPlanService } from "../services/adminPlanService";

const planListKey = ["admin-premium", "plans"] as const;

export function useAdminPlans(enabled = true) {
  return useQuery({
    queryKey: planListKey,
    queryFn: ({ signal }) => adminPlanService.list(signal),
    enabled,
    meta: { requiresAuth: true },
    retry: (count, error) => count < 1 && (!isApiError(error) || error.isRetryable),
  });
}

export function useSaveAdminPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, patch }: { code: string; patch: AdminPlanPatch }) => adminPlanService.update(code, patch),
    meta: { requiresAuth: true },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: planListKey }),
      queryClient.invalidateQueries({ queryKey: ["admin-premium", "audit"] }),
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] }),
    ]),
  });
}
