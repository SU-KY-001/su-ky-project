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

    const source = event.currentTarget;
    const bounds = source.getBoundingClientRect();
    const width = bounds.width || source.offsetWidth || 288;
    const height = bounds.height || source.offsetHeight || 180;
    const preview = source.cloneNode(true) as HTMLElement;
    preview.setAttribute("data-drag-preview", "true");
    preview.removeAttribute("data-release-id");
    Object.assign(preview.style, {
      position: "fixed",
      top: "-1000px",
      left: "-1000px",
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
      opacity: "0.96",
      transform: "rotate(1.5deg) scale(1.02)",
      boxShadow: "0 18px 42px rgba(22, 18, 15, 0.18)",
    });
    document.body.append(preview);

    const pointerX = Number.isFinite(event.clientX)
      ? Math.min(Math.max(event.clientX - bounds.left, 0), width)
      : width / 2;
    const pointerY = Number.isFinite(event.clientY)
      ? Math.min(Math.max(event.clientY - bounds.top, 0), height)
      : 24;
    event.dataTransfer.setDragImage?.(preview, pointerX, pointerY);
    window.setTimeout(() => preview.remove(), 0);
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
      aria-label="Lịch phát hành theo tiến độ"
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
          onPageChange={onPageChange}
        />
      ))}
    </div>
  );
}
