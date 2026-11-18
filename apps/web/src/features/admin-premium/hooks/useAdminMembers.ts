import type { AdminMemberQuery, AdminGrantMembership, AdminRevokeMembership } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/apiError";
import { adminMemberService } from "../services/adminMemberService";

const membersKey = ["admin-premium", "members"] as const;
type Change = { userId: string } & (
  | { action: "grant"; body: AdminGrantMembership; idempotencyKey: string }
  | { action: "revoke"; body: AdminRevokeMembership }
);

export function useAdminMembers(filter: AdminMemberQuery, enabled: boolean) {
  return useQuery({
    queryKey: [...membersKey, filter],
    queryFn: ({ signal }) => adminMemberService.list(filter, signal),
    enabled,
    meta: { requiresAuth: true },
    retry: (count, error) => count < 1 && (!isApiError(error) || error.isRetryable),
  });
}

export function useChangeAdminMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: Change) => {
      if (change.action === "grant") await adminMemberService.grant(change.userId, change.body, change.idempotencyKey);
      else await adminMemberService.revoke(change.userId, change.body);
    },
    meta: { requiresAuth: true },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: membersKey }),
      queryClient.invalidateQueries({ queryKey: ["admin-premium", "audit"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-premium", "payments"] }),
    ]),
  });
}
