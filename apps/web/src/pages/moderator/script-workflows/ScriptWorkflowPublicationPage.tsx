import { Navigate, useParams } from "react-router";
import { ScriptWorkflowIdParamSchema } from "@repo/shared";
import { isApiError } from "@/lib/apiError";
import { ModeratorShell } from "@/features/moderator/components/ModeratorShell";
import { scriptWorkflowPageNav } from "@/features/moderator/navItems";
import { PublicationView } from "@/features/script-workflow/components/publication/PublicationView";
import {
  WorkspaceError,
  WorkspaceNotFound,
  WorkspaceSkeleton,
} from "@/features/script-workflow/components/workspace/WorkspaceStates";
import { workflowDetailPath } from "@/features/script-workflow/constants";
import { useScriptWorkflow } from "@/features/script-workflow/hooks/useScriptWorkflow";
import { useWorkflowImportStatus } from "@/features/script-workflow/hooks/useWorkflowImport";
import { usePublications } from "@/features/script-workflow/hooks/useWorkflowReads";

const HTTP_NOT_FOUND = 404;

function PublicationContent({ id }: { id: number }) {
  const workflowQuery = useScriptWorkflow(id);
  const publicationsQuery = usePublications(id);

  const isCompletedWithPublications =
    workflowQuery.data?.status === "COMPLETED" &&
    (publicationsQuery.data?.items.length ?? 0) > 0;

  const importStatusQuery = useWorkflowImportStatus(id, isCompletedWithPublications);

  if (
    isApiError(workflowQuery.error, HTTP_NOT_FOUND) ||
    isApiError(publicationsQuery.error, HTTP_NOT_FOUND)
  ) {
    return <WorkspaceNotFound />;
  }

  if (workflowQuery.isError && !workflowQuery.data) {
    return (
      <WorkspaceError
        error={workflowQuery.error}
        retrying={workflowQuery.isFetching}
        onRetry={() => void workflowQuery.refetch()}
      />
    );
  }

  if (publicationsQuery.isError && !publicationsQuery.data) {
    return (
      <WorkspaceError
        error={publicationsQuery.error}
        retrying={publicationsQuery.isFetching}
        onRetry={() => void publicationsQuery.refetch()}
      />
    );
  }

  if (!workflowQuery.data || !publicationsQuery.data) {
    return <WorkspaceSkeleton />;
  }

  if (
    workflowQuery.data.status !== "COMPLETED" ||
    publicationsQuery.data.items.length === 0
  ) {
    return <Navigate to={workflowDetailPath(id)} replace />;
  }

  return (
    <PublicationView
      workflow={workflowQuery.data}
      publications={publicationsQuery.data.items}
      importedResult={importStatusQuery.data}
    />
  );
}

/** S4: `/moderator/script-workflows/:id/publication`. */
export function ScriptWorkflowPublicationPage() {
  const params = useParams();
  const parsedId = ScriptWorkflowIdParamSchema.safeParse({ id: params.id });

  return (
    <ModeratorShell
      nav={scriptWorkflowPageNav()}
      breadcrumb="Kịch bản podcast"
      subtitle="Kết quả xuất bản kịch bản"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
        {parsedId.success ? <PublicationContent id={parsedId.data.id} /> : <WorkspaceNotFound />}
      </div>
    </ModeratorShell>
  );
}
