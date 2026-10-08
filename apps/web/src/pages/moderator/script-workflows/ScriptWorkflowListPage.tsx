import { Link, useSearchParams } from "react-router";
import { Plus } from "@phosphor-icons/react";
import { ListScriptWorkflowsQuerySchema } from "@repo/shared";
import { ModeratorShell } from "@/features/moderator/components/ModeratorShell";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { scriptWorkflowPageNav } from "@/features/moderator/navItems";
import { ListPagination } from "@/features/script-workflow/components/list/ListPagination";
import { WorkflowListEmpty } from "@/features/script-workflow/components/list/WorkflowListEmpty";
import { WorkflowListError } from "@/features/script-workflow/components/list/WorkflowListError";
import { WorkflowListRow } from "@/features/script-workflow/components/list/WorkflowListRow";
import { WorkflowListSkeleton } from "@/features/script-workflow/components/list/WorkflowListSkeleton";
import { LIST_PAGE_LIMIT, NEW_WORKFLOW_PATH } from "@/features/script-workflow/constants";
import { useScriptWorkflows } from "@/features/script-workflow/hooks/useScriptWorkflows";

const FIRST_PAGE = 1;

/** `?page` and `?limit` are validated with the API's own query schema; bad values fall back to defaults. */
function useListQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = ListScriptWorkflowsQuerySchema.safeParse(Object.fromEntries(searchParams));
  const page = parsed.success ? parsed.data.page : FIRST_PAGE;
  const limit = parsed.success && searchParams.has("limit") ? parsed.data.limit : LIST_PAGE_LIMIT;

  const goToPage = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0 });
  };

  return { page, limit, goToPage };
}

export function ScriptWorkflowListPage() {
  const { page, limit, goToPage } = useListQuery();
  const query = useScriptWorkflows(page, limit);

  return (
    <ModeratorShell nav={scriptWorkflowPageNav()} breadcrumb="Kịch bản podcast" subtitle="Danh sách kịch bản của bạn">
      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ModeratorText as="h1" className="text-2xl font-extrabold tracking-tight text-mod-text">Kịch bản của tôi</ModeratorText>
          <Link
            to={NEW_WORKFLOW_PATH}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white no-underline hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
          >
            <Plus size={18} weight="bold" aria-hidden={true} />
            Tạo kịch bản mới
          </Link>
        </div>

        {query.isPending ? <WorkflowListSkeleton /> : null}
        {query.isError ? <WorkflowListError error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} /> : null}
        {query.data && query.data.total === 0 ? <WorkflowListEmpty /> : null}
        {query.data && query.data.total > 0 ? (
          <>
            <ul className="flex flex-col gap-3" aria-busy={query.isPlaceholderData}>
              {query.data.items.map((workflow) => (
                <WorkflowListRow key={workflow.id} workflow={workflow} />
              ))}
            </ul>
            <ListPagination page={query.data.page} limit={query.data.limit} total={query.data.total} onPageChange={goToPage} />
          </>
        ) : null}
      </div>
    </ModeratorShell>
  );
}
