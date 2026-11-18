import { useQuery } from "@tanstack/react-query";
import { isApiError } from "@/lib/apiError";
import { adminReportService, type ReportRange } from "../services/adminReportService";

const meta = { requiresAuth: true };
const retry = (count: number, error: unknown) => count < 1 && (!isApiError(error) || error.isRetryable);

export function useAdminMembershipReport(range: ReportRange) {
  return useQuery({
    queryKey: ["admin-premium", "report", range],
    meta,
    retry,
    queryFn: ({ signal }) => adminReportService.get(range, signal),
  });
}
