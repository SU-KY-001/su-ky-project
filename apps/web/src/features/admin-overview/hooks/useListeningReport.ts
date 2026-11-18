import { useQuery } from "@tanstack/react-query";
import type { AdminListeningReportQuery } from "@repo/shared";
import { getListeningReport } from "../services/listeningReportService";

export function useListeningReport(period: AdminListeningReportQuery) {
  return useQuery({
    queryKey: ["admin-listening-report", period],
    queryFn: () => getListeningReport(period),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
