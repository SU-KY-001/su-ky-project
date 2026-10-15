import { useState, type DragEvent } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import {
  getReleaseDropCommand,
  type ReleaseBoardStatus,
  type ReleaseDropCommand,
} from "../releaseWorkspaceModel";
import { ReleaseKanbanCard } from "./ReleaseKanbanCard";

export interface ReleaseKanbanColumnData {
  items: readonly ReleaseScheduleRecord[];
  total: number;
  page: number;
  isPending?: boolean;
  error?: Error | null;
}

export function ReleaseKanbanColumn({
  status,
  label,
  column,
  dragging,
  pendingIds,
  onOpenEdit,
  onDragStart,
  onDragEnd,
  onDropSchedule,
  onTransition,
  onPageChange,
}: {
  status: ReleaseBoardStatus;
  label: string;
  column: ReleaseKanbanColumnData;
  dragging: ReleaseScheduleRecord | null;
  pendingIds: ReadonlySet<string>;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onDragStart: (event: DragEvent<HTMLElement>, schedule: ReleaseScheduleRecord) => void;
  onDragEnd: () => void;
  onDropSchedule: (scheduleId: string, targetStatus: ReleaseBoardStatus) => void;
  onTransition: (
    schedule: ReleaseScheduleRecord,
    command: ReleaseDropCommand,
    targetStatus: ReleaseBoardStatus,
  ) => void | Promise<unknown>;
  onPageChange: (status: ReleaseBoardStatus, page: number) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const acceptsDragging = Boolean(
    dragging && getReleaseDropCommand(dragging.status, status),
  );
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!acceptsDragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(false);
    const scheduleId = event.dataTransfer.getData("text/plain");
    if (scheduleId) onDropSchedule(scheduleId, status);
  };

  return (
    <section
      aria-label={label}
      data-release-column={status}
      className={`flex min-h-[430px] min-w-[272px] flex-1 basis-[272px] flex-col rounded-2xl border p-3 transition-colors xl:min-w-0 ${
        dragOver
          ? "border-mod-primary/35 bg-mod-primary/5 ring-2 ring-inset ring-mod-primary/15"
          : "border-mod-border/70 bg-mod-canvas-accent/55"
      }`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <header className="flex items-center gap-2 px-1 pb-3 pt-1">
        <span className="size-2 rounded-full bg-mod-primary" aria-hidden="true" />
        <h2 className="flex-1 text-sm font-bold text-mod-text">{label}</h2>
        <span className="grid min-w-6 place-items-center rounded-full bg-mod-surface px-1.5 py-1 text-[11px] font-bold text-mod-text-secondary">
          {column.total}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2.5">
        {dragOver ? (
          <div className="h-1 rounded-full bg-mod-primary/60" data-drop-indicator />
        ) : null}
        {column.isPending ? (
          <div className="ui-skeleton h-32 rounded-xl" aria-label={`Đang tải ${label}`} />
        ) : column.error ? (
          <p role="alert" className="rounded-xl border border-vermilion/20 bg-mod-surface p-3 text-xs text-vermilion">
            Không tải được cột này.
          </p>
        ) : column.items.length === 0 ? (
          <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-mod-border bg-mod-surface/50 px-4 text-center text-xs text-mod-text-muted">
            Chưa có lịch
          </div>
        ) : (
          column.items.map((schedule, index) => (
            <ReleaseKanbanCard
              key={schedule.id}
              schedule={schedule}
              index={index}
              pending={pendingIds.has(schedule.id)}
              onOpenEdit={onOpenEdit}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onTransition={onTransition}
            />
          ))
        )}
      </div>

      {column.total > column.items.length ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Tải thêm ${label}`}
          className="mt-3 w-full text-xs text-mod-text-secondary"
          onClick={() => onPageChange(status, column.page + 1)}
        >
          Tải thêm
        </Button>
      ) : null}
    </section>
  );
}
