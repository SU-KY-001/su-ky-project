import { useQuery } from "@tanstack/react-query";
import { workflowKeys } from "../api/queryKeys";
import { getHealth, getWorkflowEvents, getWorkflowTree, listPublications } from "../api/workflowApi";
import { EVENTS_LIMIT } from "../constants";

export function useWorkflowTree(id: number, enabled = true) {
  return useQuery({ queryKey: workflowKeys.tree(id), queryFn: () => getWorkflowTree(id), enabled, staleTime: 0 });
}

export function useWorkflowEvents(id: number, enabled = true) {
  return useQuery({
    queryKey: workflowKeys.events(id),
    queryFn: () => getWorkflowEvents(id, EVENTS_LIMIT),
    enabled,
    staleTime: 0,
  });
}

export function usePublications(id: number, enabled = true) {
  return useQuery({
    queryKey: workflowKeys.publications(id),
    queryFn: () => listPublications(id),
    enabled,
  });
}

export function useSystemHealth() {
  return useQuery({ queryKey: workflowKeys.health(), queryFn: getHealth, staleTime: 0, retry: false });
}
