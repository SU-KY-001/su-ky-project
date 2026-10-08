import { useEffect } from "react";
import { useParams } from "react-router";
import { ScriptWorkflowIdParamSchema } from "@repo/shared";
import { isApiError } from "@/lib/apiError";
import { ModeratorShell } from "@/features/moderator/components/ModeratorShell";
import { scriptWorkflowPageNav } from "@/features/moderator/navItems";
import { WorkflowWorkspace } from "@/features/script-workflow/components/workspace/WorkflowWorkspace";
import {
  WorkspaceError,
  WorkspaceNotFound,
  WorkspaceSkeleton,
} from "@/features/script-workflow/components/workspace/WorkspaceStates";
import { useScriptWorkflow } from "@/features/script-workflow/hooks/useScriptWorkflow";
import { useWorkflowUiStore } from "@/features/script-workflow/store";
import { useWorkflowStream } from "@/features/script-workflow/stream/useWorkflowStream";

const HTTP_NOT_FOUND = 404;

function WorkspaceContent({ id }: { id: number }) {
  const query = useScriptWorkflow(id);
  const enterWorkflow = useWorkflowUiStore((state) => state.enterWorkflow);
  const enteredId = useWorkflowUiStore((state) => state.workflowId);

  // Declared before the stream effect so the store is reset before the stream reports its state.
  useEffect(() => {
    enterWorkflow(id);
  }, [id, enterWorkflow]);

  const status = query.data?.status;
  useWorkflowStream(id, status !== undefined && status !== "COMPLETED" && status !== "FAILED");

  if (isApiError(query.error, HTTP_NOT_FOUND)) return <WorkspaceNotFound />;
  if (query.isError && !query.data) {
    return <WorkspaceError error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />;
  }
  // The store holds per-workflow view state; wait until it belongs to this workflow.
  if (!query.data || enteredId !== id) return <WorkspaceSkeleton />;

  return <WorkflowWorkspace workflow={query.data} />;
}

/** S3: `/moderator/script-workflows/:id`. */
export function ScriptWorkflowWorkspacePage() {
  const params = useParams();
  const parsedId = ScriptWorkflowIdParamSchema.safeParse({ id: params.id });

  return (
    <ModeratorShell nav={scriptWorkflowPageNav()} breadcrumb="Kịch bản podcast" subtitle="Duyệt từng bước của kịch bản">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
        {parsedId.success ? <WorkspaceContent id={parsedId.data.id} /> : <WorkspaceNotFound />}
      </div>
    </ModeratorShell>
  );
}
