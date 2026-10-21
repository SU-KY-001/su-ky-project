import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useReleaseWorkspace } from "../hooks/useReleaseWorkspace";
import { RELEASE_BOARD_COLUMNS } from "../releaseWorkspaceModel";
import { ReleaseKanbanBoard, type ReleaseKanbanColumns } from "./ReleaseKanbanBoard";
import { ReleaseScheduleDialog } from "./ReleaseScheduleDialog";
import { ReleaseScheduleTable } from "./ReleaseScheduleTable";
import { ReleaseWorkspaceToolbar } from "./ReleaseWorkspaceToolbar";
import { ReleaseWorkerStatus } from "./ReleaseWorkerStatus";

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
  const handleDialogOpen = (open: boolean) => {
    if (!open) workspace.closeDialog();
  };
  const toolbar = (
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
      embedded={workspace.view === "table"}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        eyebrow="PHÁT HÀNH PODCAST"
        title="Lịch phát hành"
        description="Lập lịch, phân công Moderator và theo dõi toàn bộ luồng sản xuất đến khi podcast được phát hành."
      />

      <ReleaseWorkerStatus
        health={workspace.worker?.data}
        healthError={workspace.worker?.isError ?? false}
        syncError={workspace.view === "kanban" ? workspace.board.isError : Boolean(workspace.table.error)}
        updatedAt={(workspace.view === "kanban" ? workspace.board.dataUpdatedAt : workspace.table.dataUpdatedAt) ?? 0}
      />

      {workspace.view === "kanban" ? (
        <>
          {toolbar}
          <ReleaseKanbanBoard
            columns={columns}
            pendingIds={workspace.pendingIds}
            onOpenEdit={workspace.openEdit}
            onTransition={workspace.transition}
            onPageChange={workspace.setBoardPage}
          />
        </>
      ) : (
        <ReleaseScheduleTable
          items={workspace.table.data?.items ?? []}
          page={workspace.tablePage}
          limit={workspace.table.data?.limit ?? 20}
          total={workspace.table.data?.total ?? 0}
          isPending={workspace.table.isPending}
          error={workspace.table.error}
          toolbar={toolbar}
          onOpenEdit={workspace.openEdit}
          onPageChange={workspace.setTablePage}
        />
      )}

      <ReleaseScheduleDialog
        mode={workspace.dialogMode ?? "create"}
        schedule={workspace.selectedSchedule}
        currentStatus={workspace.liveSchedule?.data?.status}
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
      {workspace.confirmation ? <ConfirmationDialog {...workspace.confirmation} /> : null}
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
