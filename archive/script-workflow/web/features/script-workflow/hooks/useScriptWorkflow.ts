import { useQuery } from "@tanstack/react-query";
import { workflowKeys } from "../api/queryKeys";
import { getWorkflow } from "../api/workflowApi";
import { POLL_INTERVAL_MS } from "../constants";
import { useWorkflowUiStore } from "../store";

/** GET /:id is the source of truth. It polls only while the SSE stream is degraded. */
export function useScriptWorkflow(id: number) {
  const streamConnection = useWorkflowUiStore((state) => state.streamConnection);

  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => getWorkflow(id),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isFinished = status === "COMPLETED" || status === "FAILED";
      return streamConnection === "degraded" && !isFinished ? POLL_INTERVAL_MS : false;
    },
  });
}
