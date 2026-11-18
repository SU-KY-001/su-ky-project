import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { newIdempotencyKey } from "@/lib/idempotency";
import { membershipService } from "../services/membershipService";

export const membershipKeys = {
  plans: ["membership", "plans"] as const,
  entitlement: ["membership", "entitlement"] as const,
  orders: ["membership", "orders"] as const,
};

/** Plans change rarely; they are public and cacheable. */
export function useMembershipPlans() {
  return useQuery({ queryKey: membershipKeys.plans, queryFn: ({ signal }) => membershipService.plans(signal), staleTime: 5 * 60_000 });
}

/** Per-user entitlement; drives quotas, the renewal reminder and the member page header. */
export function useMembership(enabled = true) {
  return useQuery({ queryKey: membershipKeys.entitlement, queryFn: ({ signal }) => membershipService.status(signal), enabled, staleTime: 60_000 });
}

export function useMembershipOrders(page = 1, enabled = true) {
  return useQuery({ queryKey: [...membershipKeys.orders, page], queryFn: ({ signal }) => membershipService.orders(page, signal), enabled });
}

/** Polls one open order until an admin approves or rejects it. */
export function useOrderPolling(id: string | null) {
  return useQuery({
    queryKey: [...membershipKeys.orders, "detail", id],
    queryFn: ({ signal }) => membershipService.order(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "pending" || query.state.data?.status === "needs_review" ? 4000 : false),
  });
}

export function useCreateOrder() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) => membershipService.buy(planCode, newIdempotencyKey()),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: membershipKeys.orders });
      void cache.invalidateQueries({ queryKey: membershipKeys.entitlement });
    },
  });
}
