import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";
import {
  getWorkflowImport,
  getWorkflowImportPreview,
  importWorkflow,
  type WorkflowImportPreview,
} from "../api/importApi";
import { workflowKeys } from "../api/queryKeys";

export const workflowImportKeys = {
  status: (id: number) => [...workflowKeys.detail(id), "import"] as const,
  preview: (id: number) => [...workflowKeys.detail(id), "import-preview"] as const,
};

export function useWorkflowImportStatus(id: number, enabled = true) {
  return useQuery({
    queryKey: workflowImportKeys.status(id),
    queryFn: () => getWorkflowImport(id),
    enabled,
  });
}

export function useWorkflowImportPreview(id: number, enabled: boolean) {
  return useQuery({
    queryKey: workflowImportKeys.preview(id),
    queryFn: () => getWorkflowImportPreview(id),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useImportWorkflow(id: number) {
  const queryClient = useQueryClient();
  return useIdempotentMutation(
    (preview: WorkflowImportPreview, key) => importWorkflow(id, preview, key),
    (output) => {
      queryClient.setQueryData(workflowImportKeys.status(id), output.result);
      void queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  );
}
