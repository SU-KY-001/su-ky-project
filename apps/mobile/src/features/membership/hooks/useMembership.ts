import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createUuid } from "@/features/heritage-app/podcastApi";
import { membershipService } from "../services/membershipService";

export const membershipKeys = {
  plans: ["membership", "plans"] as const,
  status: ["membership", "status"] as const,
  orders: ["membership", "orders"] as const,
};

const DAY_MS = 86_400_000;
const VIETNAM_OFFSET_MS = 7 * 3_600_000;

// daysLeft changes at Vietnam midnight; the cap also keeps setTimeout inside 32-bit range.
function nextVietnamMidnight(now: number): number {
  const vietnam = new Date(now + VIETNAM_OFFSET_MS);
  vietnam.setUTCHours(0, 0, 0, 0);
  return vietnam.getTime() + DAY_MS - VIETNAM_OFFSET_MS;
}

export function useMembership() {
  return useQuery({
    queryKey: membershipKeys.status,
    queryFn: ({ signal }) => membershipService.status(signal),
    staleTime: 60_000,
    refetchInterval: ({ state }) => {
      const data = state.data;
      if (!data) return false;
      if (data.pendingOrderId) return 4_000;
      const now = Date.now();
      const quotaReset = data.experienceQuotas.find((quota) => quota.enforced)?.resetsAt.getTime();
      const expiry = data.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const boundary = data.tier === "premium" ? Math.min(expiry, nextVietnamMidnight(now)) : quotaReset;
      if (!boundary) return false;
      return Math.min(Math.max(1_000, boundary - now + 1_000), DAY_MS);
    },
  });
}

export function useMembershipPlans() {
  return useQuery({ queryKey: membershipKeys.plans, queryFn: ({ signal }) => membershipService.plans(signal), staleTime: 5 * 60_000 });
}

export function useMembershipOrders(page = 1) {
  return useQuery({ queryKey: [...membershipKeys.orders, page], queryFn: ({ signal }) => membershipService.orders(page, signal) });
}

/** Polls one open order until an admin approves or rejects it. */
export function useOrderPolling(id: string | null) {
  return useQuery({
    queryKey: [...membershipKeys.orders, "detail", id],
    queryFn: ({ signal }) => membershipService.order(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "pending" || query.state.data?.status === "needs_review" ? 4_000 : false),
  });
}

export function useCreateOrder(onCreated: (orderId: string) => void) {
  const cache = useQueryClient();
  const attempt = useRef<{ planCode: string; key: string } | undefined>(undefined);
  return useMutation({
    mutationFn(planCode: string) {
      if (attempt.current?.planCode !== planCode) attempt.current = { planCode, key: createUuid() };
      return membershipService.buy(planCode, attempt.current.key);
    },
    onError(error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status && status >= 400 && status < 500) attempt.current = undefined;
    },
    onSuccess(order) {
      attempt.current = undefined;
      void cache.invalidateQueries({ queryKey: membershipKeys.orders });
      void cache.invalidateQueries({ queryKey: membershipKeys.status });
      onCreated(order.id);
    },
  });
}
