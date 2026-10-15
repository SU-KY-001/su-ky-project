import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import {
  adminReleaseService,
  type ReleaseScheduleDraft,
  type ReleaseScheduleFilter,
} from "../services/adminReleaseService";
import {
  RELEASE_BOARD_COLUMNS,
  type ReleaseBoardStatus,
  type ReleaseDropCommand,
  type ReleaseWorkspaceViewMode,
} from "../releaseWorkspaceModel";
import {
  adminReleaseKeys,
  useAdminReleaseActions,
  useAdminReleaseAttention,
  useAdminReleaseBoard,
  useAdminReleaseSchedules,
  useAdminReleaseWorkload,
  useReleaseModerators,
  useReleaseProgress,
} from "./useAdminReleases";

const VIEW_STORAGE_KEY = "admin-release-workspace-view";

function initialView(): ReleaseWorkspaceViewMode {
  const saved = localStorage.getItem(VIEW_STORAGE_KEY);
  return saved === "kanban" || saved === "table" ? saved : "kanban";
}

export function useReleaseWorkspace({
  initiallyCreating = false,
  service = adminReleaseService,
}: {
  initiallyCreating?: boolean;
  service?: typeof adminReleaseService;
} = {}) {
  const queryClient = useQueryClient();
  const [view, setViewState] = useState<ReleaseWorkspaceViewMode>(initialView);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [moderatorId, setModeratorId] = useState("");
  const [status, setStatus] = useState<ReleaseScheduleStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [boardPages, setBoardPages] = useState<Record<ReleaseBoardStatus, number>>({
    SCHEDULED: 1,
    READY_TO_PUBLISH: 1,
    PUBLISHING: 1,
    RELEASED: 1,
  });
  const [selectedSchedule, setSelectedSchedule] = useState<ReleaseScheduleRecord | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(
    initiallyCreating ? "create" : null,
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<unknown>(null);

  const baseFilter = useMemo<Omit<ReleaseScheduleFilter, "status" | "page">>(() => ({
    q: deferredSearch.trim() || undefined,
    moderatorId: moderatorId || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: 20,
  }), [deferredSearch, moderatorId, from, to]);
  const tableFilter = useMemo<ReleaseScheduleFilter>(() => ({
    ...baseFilter,
    status: status || undefined,
    page: tablePage,
  }), [baseFilter, status, tablePage]);

  useEffect(() => {
    setTablePage(1);
    setBoardPages({
      SCHEDULED: 1,
      READY_TO_PUBLISH: 1,
      PUBLISHING: 1,
      RELEASED: 1,
    });
  }, [deferredSearch, moderatorId, status, from, to]);

  const board = useAdminReleaseBoard(baseFilter, boardPages, service);
  const table = useAdminReleaseSchedules(tableFilter, service);
  const attention = useAdminReleaseAttention(baseFilter, service);
  const workload = useAdminReleaseWorkload(service);
  const moderators = useReleaseModerators(service);
  const progress = useReleaseProgress(selectedSchedule?.id ?? null, service);
  const actions = useAdminReleaseActions(service);

  const setView = (next: ReleaseWorkspaceViewMode) => {
    localStorage.setItem(VIEW_STORAGE_KEY, next);
    setViewState(next);
  };
  const markPending = (id: string, pending: boolean) =>
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminReleaseKeys.root });
    await queryClient.refetchQueries({ queryKey: adminReleaseKeys.root, type: "active" });
  };
  const runScheduleAction = async (
    schedule: ReleaseScheduleRecord,
    action: () => Promise<unknown>,
  ) => {
    setError(null);
    markPending(schedule.id, true);
    try {
      const result = await action();
      await refresh();
      return result;
    } catch (caught) {
      setError(caught);
      await refresh();
      throw caught;
    } finally {
      markPending(schedule.id, false);
    }
  };
  const transition = async (
    schedule: ReleaseScheduleRecord,
    command: ReleaseDropCommand,
    _targetStatus: ReleaseBoardStatus,
  ) => {
    if (
      command === "publish-now" &&
      !window.confirm(`Phát hành ngay “${schedule.title}”?`)
    ) return;
    return runScheduleAction(schedule, () =>
      command === "check-readiness"
        ? actions.checkReadiness.mutateAsync(schedule.id)
        : actions.publishNow.mutateAsync(schedule.id),
    );
  };
  const create = async (draft: ReleaseScheduleDraft) => {
    setError(null);
    try {
      return await actions.create.mutateAsync(draft);
    } catch (caught) {
      setError(caught);
      throw caught;
    }
  };
  const update = async (
    schedule: ReleaseScheduleRecord,
    draft: ReleaseScheduleDraft,
  ) => runScheduleAction(schedule, async () => {
    const updated = await actions.update.mutateAsync({
      id: schedule.id,
      patch: {
        title: draft.title,
        episodeId: draft.episodeId,
        productionDeadline: draft.productionDeadline,
        scheduledAt: draft.scheduledAt,
        baseUpdatedAt: schedule.updatedAt,
      },
    });
    await actions.replaceAssignees.mutateAsync({
      id: schedule.id,
      moderatorIds: draft.moderatorIds,
    });
    return updated;
  });
  const publishNow = async (schedule: ReleaseScheduleRecord) => {
    if (!window.confirm(`Phát hành ngay “${schedule.title}”?`)) return;
    return runScheduleAction(schedule, () => actions.publishNow.mutateAsync(schedule.id));
  };
  const retry = (schedule: ReleaseScheduleRecord) =>
    runScheduleAction(schedule, () => actions.retry.mutateAsync(schedule.id));
  const cancel = async (schedule: ReleaseScheduleRecord) => {
    if (!window.confirm(`Hủy lịch “${schedule.title}”?`)) return;
    return runScheduleAction(schedule, () => actions.cancel.mutateAsync(schedule.id));
  };
  const openEdit = (schedule: ReleaseScheduleRecord) => {
    setError(null);
    setSelectedSchedule(schedule);
    setDialogMode("edit");
  };
  const openCreate = () => {
    setError(null);
    setSelectedSchedule(null);
    setDialogMode("create");
  };
  const closeDialog = () => {
    setDialogMode(null);
    setSelectedSchedule(null);
    setError(null);
  };
  const setBoardPage = (boardStatus: ReleaseBoardStatus, page: number) =>
    setBoardPages((current) => ({ ...current, [boardStatus]: page }));

  return {
    view,
    setView,
    search,
    setSearch,
    moderatorId,
    setModeratorId,
    status,
    setStatus,
    from,
    setFrom,
    to,
    setTo,
    tablePage,
    setTablePage,
    boardPages,
    setBoardPage,
    board,
    table,
    attention,
    workload,
    moderators,
    progress,
    selectedSchedule,
    dialogMode,
    pendingIds,
    error,
    openEdit,
    openCreate,
    closeDialog,
    transition,
    create,
    update,
    retry,
    publishNow,
    cancel,
    boardStatuses: RELEASE_BOARD_COLUMNS.map(({ status: boardStatus }) => boardStatus),
    busy:
      pendingIds.size > 0 ||
      actions.create.isPending ||
      actions.update.isPending ||
      actions.replaceAssignees.isPending,
  };
}
