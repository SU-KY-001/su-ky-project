import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { useReleaseWorkspace } from "../hooks/useReleaseWorkspace";
import { RELEASE_BOARD_COLUMNS } from "../releaseWorkspaceModel";
import { ModeratorWorkloadFilter } from "./ModeratorWorkloadFilter";
import { ReleaseAttentionPanel } from "./ReleaseAttentionPanel";
import { ReleaseKanbanBoard, type ReleaseKanbanColumns } from "./ReleaseKanbanBoard";
import { ReleaseScheduleDialog } from "./ReleaseScheduleDialog";
import { ReleaseScheduleTable } from "./ReleaseScheduleTable";
import { ReleaseWorkspaceToolbar } from "./ReleaseWorkspaceToolbar";

export function ReleaseWorkspaceView({
  workspace,
}: {
  workspace: ReturnType<typeof useReleaseWorkspace>;
}) {
  const columns = Object.fromEntries(
    RELEASE_BOARD_COLUMNS.map(({ status }) => [
      status,
      {
        ...workspace.board.columns[status],
        page: workspace.boardPages[status],
      },
    ]),
  ) as unknown as ReleaseKanbanColumns;
  const attentionItems = [...workspace.attention.items].sort(
    (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
  );
  const handleDialogOpen = (open: boolean) => {
    if (!open) workspace.closeDialog();
  };

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        eyebrow="PHÁT HÀNH PODCAST"
        title="Lịch phát hành"
        description="Lập lịch, phân công Moderator và theo dõi toàn bộ luồng sản xuất đến khi podcast được phát hành."
      />

      <ReleaseWorkspaceToolbar
        view={workspace.view}
        search={workspace.search}
        moderatorId={workspace.moderatorId}
        status={workspace.status}
        from={workspace.from}
        to={workspace.to}
        moderators={workspace.moderators.data?.items ?? []}
        onViewChange={workspace.setView}
        onSearchChange={workspace.setSearch}
        onModeratorChange={workspace.setModeratorId}
        onStatusChange={workspace.setStatus}
        onFromChange={workspace.setFrom}
        onToChange={workspace.setTo}
        onCreate={workspace.openCreate}
      />

      {workspace.workload.isPending ? (
        <div className="ui-skeleton h-28 rounded-2xl" aria-label="Đang tải khối lượng Moderator" />
      ) : workspace.workload.isError ? (
        <p role="alert" className="rounded-2xl border border-vermilion/20 bg-mod-surface p-4 text-sm text-vermilion">Không tải được khối lượng Moderator.</p>
      ) : (
        <ModeratorWorkloadFilter
          items={workspace.workload.data.items}
          selectedId={workspace.moderatorId}
          onChange={workspace.setModeratorId}
        />
      )}

      {workspace.error ? (
        <p role="alert" className="rounded-xl border border-vermilion/20 bg-vermilion/5 px-4 py-3 text-sm font-medium text-vermilion">
          Thao tác chưa hoàn tất. Dữ liệu lịch đã được đồng bộ lại từ hệ thống.
        </p>
      ) : null}

      {workspace.attention.isPending ? (
        <div className="ui-skeleton h-32 rounded-2xl" aria-label="Đang tải lịch cần xử lý" />
      ) : workspace.attention.isError ? (
        <p role="alert" className="rounded-2xl border border-vermilion/20 bg-mod-surface p-4 text-sm text-vermilion">Không tải được lịch cần xử lý.</p>
      ) : (
        <ReleaseAttentionPanel
          items={attentionItems}
          pendingIds={workspace.pendingIds}
          onEdit={workspace.openEdit}
          onCheckReadiness={(schedule) => { void workspace.transition(schedule, "check-readiness", "READY_TO_PUBLISH").catch(() => undefined); }}
          onPublishNow={(schedule) => { void workspace.publishNow(schedule)?.catch(() => undefined); }}
          onRetry={(schedule) => { void workspace.retry(schedule).catch(() => undefined); }}
          onCancel={(schedule) => { void workspace.cancel(schedule)?.catch(() => undefined); }}
        />
      )}

      {workspace.view === "kanban" ? (
        <ReleaseKanbanBoard
          columns={columns}
          pendingIds={workspace.pendingIds}
          onOpenEdit={workspace.openEdit}
          onTransition={workspace.transition}
          onPageChange={workspace.setBoardPage}
        />
      ) : (
        <ReleaseScheduleTable
          items={workspace.table.data?.items ?? []}
          page={workspace.tablePage}
          limit={workspace.table.data?.limit ?? 20}
          total={workspace.table.data?.total ?? 0}
          isPending={workspace.table.isPending}
          error={workspace.table.error}
          onOpenEdit={workspace.openEdit}
          onPageChange={workspace.setTablePage}
        />
      )}

      <ReleaseScheduleDialog
        mode={workspace.dialogMode ?? "create"}
        schedule={workspace.selectedSchedule}
        moderators={workspace.moderators.data?.items ?? []}
        progress={workspace.progress.data?.items ?? []}
        open={workspace.dialogMode !== null}
        busy={workspace.busy}
        error={workspace.error}
        onOpenChange={handleDialogOpen}
        onCreate={workspace.create}
        onUpdate={workspace.update}
        onRetry={(schedule) => { void workspace.retry(schedule).catch(() => undefined); }}
        onPublishNow={(schedule) => { void workspace.publishNow(schedule)?.catch(() => undefined); }}
        onCancel={(schedule) => { void workspace.cancel(schedule)?.catch(() => undefined); }}
      />
    </div>
  );
}

export function ReleaseWorkspace({
  initiallyCreating = false,
}: {
  initiallyCreating?: boolean;
}) {
  const workspace = useReleaseWorkspace({ initiallyCreating });
  return <ReleaseWorkspaceView workspace={workspace} />;
}
