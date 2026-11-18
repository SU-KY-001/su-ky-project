import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { canReuseIdempotencyKey, isApiError } from "@/lib/apiError";
import { membershipService } from "../services/membershipService";

const keys = {
  plans: ["membership-plans"] as const,
  status: ["membership", "status"] as const,
  orders: ["membership", "orders"] as const,
  order: (id: string) => ["membership", "order", id] as const,
};
const PAYMENT_POLL_MS = 4_000;
const MEMBERSHIP_POLL_MS = 30_000;
const authenticated = { requiresAuth: true };
const retry = (count: number, error: unknown) => count < 1 && (!isApiError(error) || error.isRetryable);

export function useMembershipCheckout(orderId: string, page: number) {
  const queryClient = useQueryClient();
  const plans = useQuery({
    queryKey: keys.plans,
    queryFn: ({ signal }) => membershipService.plans(signal),
    retry,
  });
  const status = useQuery({
    queryKey: keys.status,
    queryFn: ({ signal }) => membershipService.status(signal),
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    meta: authenticated,
    retry,
    refetchInterval: ({ state }) => {
      if (state.data?.pendingOrderId) return PAYMENT_POLL_MS;
      const boundary = state.data?.tier === "premium" ? state.data.expiresAt
        : state.data?.experienceQuotas.find(({ enforced }) => enforced)?.resetsAt;
      const remaining = boundary ? boundary.getTime() - Date.now() : MEMBERSHIP_POLL_MS;
      return Math.max(1_000, Math.min(MEMBERSHIP_POLL_MS, remaining > 0 ? remaining : MEMBERSHIP_POLL_MS));
    },
  });
  const orders = useQuery({
    queryKey: [...keys.orders, page],
    queryFn: ({ signal }) => membershipService.orders(page, signal),
    meta: authenticated,
    retry,
    refetchInterval: () => status.data?.pendingOrderId ? PAYMENT_POLL_MS : false,
  });
  const order = useQuery({
    queryKey: keys.order(orderId),
    queryFn: ({ signal }) => membershipService.order(orderId, signal),
    enabled: Boolean(orderId),
    meta: authenticated,
    retry,
    refetchInterval: ({ state }) => state.data?.status === "pending" || state.data?.status === "needs_review" ? PAYMENT_POLL_MS : false,
  });
  const orderState = order.data?.status;
  useEffect(() => {
    if (orderState !== "paid" && orderState !== "rejected") return;
    void queryClient.invalidateQueries({ queryKey: keys.status });
    void queryClient.invalidateQueries({ queryKey: keys.orders });
  }, [orderId, orderState, queryClient]);
  return { plans, status, orders, order };
}

export function useBuyMembership() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ planCode: string; key: string } | undefined>(undefined);
  return useMutation({
    mutationFn(planCode: string) {
      if (attempt.current?.planCode !== planCode) attempt.current = { planCode, key: crypto.randomUUID() };
      return membershipService.buy(planCode, attempt.current.key);
    },
    meta: authenticated,
    onError(error) {
      if (!canReuseIdempotencyKey(error)) attempt.current = undefined;
    },
    onSuccess(order) {
      attempt.current = undefined;
      queryClient.setQueryData(keys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: keys.status });
      void queryClient.invalidateQueries({ queryKey: keys.orders });
    },
  });
}
