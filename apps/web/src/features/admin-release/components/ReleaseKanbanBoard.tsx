import { useMemo, useState, type DragEvent } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import {
  getReleaseDropCommand,
  RELEASE_BOARD_COLUMNS,
  type ReleaseBoardStatus,
  type ReleaseDropCommand,
} from "../releaseWorkspaceModel";
import {
  ReleaseKanbanColumn,
  type ReleaseKanbanColumnData,
} from "./ReleaseKanbanColumn";

export type ReleaseKanbanColumns = Record<
  ReleaseBoardStatus,
  ReleaseKanbanColumnData
>;

export function ReleaseKanbanBoard({
  columns,
  pendingIds,
  onOpenEdit,
  onTransition,
  onPageChange,
}: {
  columns: ReleaseKanbanColumns;
  pendingIds: ReadonlySet<string>;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onTransition: (
    schedule: ReleaseScheduleRecord,
    command: ReleaseDropCommand,
    targetStatus: ReleaseBoardStatus,
  ) => void | Promise<unknown>;
  onPageChange: (status: ReleaseBoardStatus, page: number) => void;
}) {
  const [dragging, setDragging] = useState<ReleaseScheduleRecord | null>(null);
  const schedulesById = useMemo(
    () =>
      new Map(
        RELEASE_BOARD_COLUMNS.flatMap(({ status }) =>
          columns[status].items.map((schedule) => [schedule.id, schedule] as const),
        ),
      ),
    [columns],
  );
  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    schedule: ReleaseScheduleRecord,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", schedule.id);
    setDragging(schedule);
  };
  const runTransition = (
    schedule: ReleaseScheduleRecord,
    command: ReleaseDropCommand,
    targetStatus: ReleaseBoardStatus,
  ) => {
    void Promise.resolve(onTransition(schedule, command, targetStatus)).catch(
      () => undefined,
    );
  };
  const handleDropSchedule = (
    scheduleId: string,
    targetStatus: ReleaseBoardStatus,
  ) => {
    const schedule = schedulesById.get(scheduleId);
    if (!schedule || pendingIds.has(schedule.id)) return;
    const command = getReleaseDropCommand(schedule.status, targetStatus);
    if (!command) return;
    runTransition(schedule, command, targetStatus);
    setDragging(null);
  };

  return (
    <div
      className="flex items-stretch gap-3 overflow-x-auto pb-3 [scrollbar-color:var(--modBorder)_transparent]"
      aria-label="Bảng lịch phát hành"
    >
      {RELEASE_BOARD_COLUMNS.map(({ status, label }) => (
        <ReleaseKanbanColumn
          key={status}
          status={status}
          label={label}
          column={columns[status]}
          dragging={dragging}
          pendingIds={pendingIds}
          onOpenEdit={onOpenEdit}
          onDragStart={handleDragStart}
          onDragEnd={() => setDragging(null)}
          onDropSchedule={handleDropSchedule}
          onTransition={runTransition}
          onPageChange={onPageChange}
        />
      ))}
    </div>
  );
}
