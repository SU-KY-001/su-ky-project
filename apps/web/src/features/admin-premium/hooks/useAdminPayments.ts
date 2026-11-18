import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/apiError";
import { adminPaymentService, type PaymentAction, type PaymentFilter } from "../services/adminPaymentService";

const payments = ["admin-premium", "payments"] as const;
const meta = { requiresAuth: true };
const retry = (count: number, error: unknown) => count < 1 && (!isApiError(error) || error.isRetryable);
export type PaymentKind = PaymentAction["kind"];

export function useAdminPaymentList(kind: PaymentKind, filter: PaymentFilter, enabled: boolean) {
  const orders = useQuery({
    queryKey: [...payments, "orders", filter], meta, retry,
    queryFn: ({ signal }) => adminPaymentService.orders(filter, signal),
    enabled: enabled && kind === "orders",
  });
  const transactions = useQuery({
    queryKey: [...payments, "transactions", filter], meta, retry,
    queryFn: ({ signal }) => adminPaymentService.transactions(filter, signal),
    enabled: enabled && kind === "transactions",
  });
  return { orders, transactions };
}

export function useAdminPaymentDetail(kind: PaymentKind, id: string) {
  const order = useQuery({
    queryKey: [...payments, "orders", id], meta, retry,
    queryFn: ({ signal }) => adminPaymentService.order(id, signal),
    enabled: kind === "orders",
  });
  const transaction = useQuery({
    queryKey: [...payments, "transactions", id], meta, retry,
    queryFn: ({ signal }) => adminPaymentService.transaction(id, signal),
    enabled: kind === "transactions",
  });
  return { order, transaction };
}

export function useProcessPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: PaymentAction) => adminPaymentService.process(id, change),
    meta,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payments }),
        queryClient.invalidateQueries({ queryKey: ["admin-premium", "members"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-premium", "audit"] }),
      ]);
    },
  });
}
