import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { workflowKeys } from "../api/queryKeys";
import { listWorkflows } from "../api/workflowApi";

/** The list is not realtime: it refetches when the window regains focus. */
export function useScriptWorkflows(page: number, limit: number) {
  return useQuery({
    queryKey: workflowKeys.list(page, limit),
    queryFn: () => listWorkflows(page, limit),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
