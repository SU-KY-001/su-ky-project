import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { workflowKeys } from "../api/queryKeys";
import { workflowStreamUrl } from "../api/workflowApi";
import { EVENT_COALESCE_MS, MAX_SSE_RETRIES } from "../constants";
import { useWorkflowUiStore } from "../store";

const WORKFLOW_EVENT = "workflow-event";
const WORKFLOW_DONE = "workflow-done";

/**
 * Keeps the workflow queries fresh through Server-Sent Events. GET /:id stays the source
 * of truth: events only trigger a (coalesced) refetch. Too many consecutive errors set
 * `streamConnection = "degraded"`, which makes useScriptWorkflow poll instead.
 * A useEffect is correct here: it synchronises React with an external system.
 */
export function useWorkflowStream(id: number, active: boolean): void {
  const queryClient = useQueryClient();
  const setStreamConnection = useWorkflowUiStore((state) => state.setStreamConnection);

  useEffect(() => {
    if (!active) return undefined;

    const source = new EventSource(workflowStreamUrl(id), { withCredentials: true });
    let coalesceTimer: number | undefined;
    let consecutiveErrors = 0;
    setStreamConnection("connecting");

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.events(id) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.tree(id) });
    };

    const scheduleRefresh = () => {
      window.clearTimeout(coalesceTimer);
      coalesceTimer = window.setTimeout(refresh, EVENT_COALESCE_MS);
    };

    source.onopen = () => {
      consecutiveErrors = 0;
      setStreamConnection("open");
    };
    source.addEventListener(WORKFLOW_EVENT, () => {
      consecutiveErrors = 0;
      scheduleRefresh();
    });
    source.addEventListener(WORKFLOW_DONE, () => {
      window.clearTimeout(coalesceTimer);
      refresh();
      void queryClient.invalidateQueries({ queryKey: workflowKeys.publications(id) });
      source.close();
      setStreamConnection("idle");
    });
    source.onerror = () => {
      consecutiveErrors += 1;
      // CLOSED means the browser gave up (e.g. 401), so retries will not come.
      if (consecutiveErrors >= MAX_SSE_RETRIES || source.readyState === EventSource.CLOSED) {
        setStreamConnection("degraded");
      }
    };

    return () => {
      window.clearTimeout(coalesceTimer);
      source.close();
      setStreamConnection("idle");
    };
  }, [id, active, queryClient, setStreamConnection]);
}
