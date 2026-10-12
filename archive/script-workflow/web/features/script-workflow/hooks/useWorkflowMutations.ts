import { useQueryClient } from "@tanstack/react-query";
import type { CreateScriptWorkflowRequest, StepDecisionRequest } from "@repo/shared";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import { workflowKeys } from "../api/queryKeys";
import { createWorkflow, sendStepDecision } from "../api/workflowApi";

export function useCreateScriptWorkflow() {
  const queryClient = useQueryClient();
  return useIdempotentMutation(
    (request: CreateScriptWorkflowRequest, key) => createWorkflow(request, key),
    () => queryClient.invalidateQueries({ queryKey: workflowKeys.lists() }),
  );
}

/** Refetches the workflow after any decision, including on 409 (see onSettled callers). */
export function useStepDecision(id: number) {
  const queryClient = useQueryClient();
  return useIdempotentMutation(
    (decision: StepDecisionRequest, key) => sendStepDecision(id, decision, key),
    () => queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) }),
  );
}
