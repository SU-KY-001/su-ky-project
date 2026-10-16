import type { DragEvent, KeyboardEvent } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { CalendarBlank, Clock, WarningCircle } from "@phosphor-icons/react";
import {
  CardBadge,
  cardBadgeToneForStatus,
} from "@/shared/components/dashboard/CardBadge";
import {
  RELEASE_BOARD_COLUMNS,
  type ReleaseBoardStatus,
} from "../releaseWorkspaceModel";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});
const statusLabels = Object.fromEntries(
  RELEASE_BOARD_COLUMNS.map(({ status, label }) => [status, label]),
) as Record<ReleaseBoardStatus, string>;

export function ReleaseKanbanCard({
  schedule,
  index,
  pending,
  dragging,
  onOpenEdit,
  onDragStart,
  onDragEnd,
}: {
  schedule: ReleaseScheduleRecord;
  index: number;
  pending: boolean;
  dragging: boolean;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onDragStart: (event: DragEvent<HTMLElement>, schedule: ReleaseScheduleRecord) => void;
  onDragEnd: () => void;
}) {
  const overdue =
    !["RELEASED", "CANCELLED"].includes(schedule.status) &&
    schedule.productionDeadline.getTime() < Date.now();
  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenEdit(schedule);
    }
  };

  return (
    <article
      data-release-id={schedule.id}
      draggable={!pending}
      tabIndex={0}
      aria-busy={pending}
      aria-grabbed={dragging}
      className="group relative cursor-grab rounded-xl border border-mod-border bg-mod-surface p-4 shadow-[0_1px_2px_rgba(22,18,15,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-mod-primary/25 hover:shadow-[0_8px_22px_rgba(22,18,15,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mod-primary/30 active:cursor-grabbing data-[dragging=true]:scale-[0.98] data-[dragging=true]:cursor-grabbing data-[dragging=true]:border-mod-primary/30 data-[dragging=true]:opacity-35 data-[dragging=true]:shadow-none data-[pending=true]:opacity-60"
      data-pending={pending}
      data-dragging={dragging}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onOpenEdit(schedule)}
      onKeyDown={handleKeyboard}
      onDragStart={(event) => onDragStart(event, schedule)}
      onDragEnd={onDragEnd}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <CardBadge
          type="status"
          tone={cardBadgeToneForStatus(schedule.status)}
        >
          {statusLabels[schedule.status as ReleaseBoardStatus] ?? schedule.status}
        </CardBadge>
      </div>

      <h3 className="text-[15px] font-bold leading-snug text-mod-text">
        {schedule.title}
      </h3>

      <div className="mt-3 grid gap-2 text-xs text-mod-text-secondary">
        <span className="flex items-center gap-2">
          <Clock size={14} />
          Hạn sản xuất: {dateTime.format(schedule.productionDeadline)}
        </span>
        <span className="flex items-center gap-2">
          <CalendarBlank size={14} />
          Phát hành: {dateTime.format(schedule.scheduledAt)}
        </span>
      </div>

      {overdue ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-mod-attention/20 bg-mod-attention/5 px-2.5 py-2 text-xs font-semibold text-mod-attention">
          <WarningCircle size={15} weight="fill" /> Quá hạn sản xuất
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {schedule.assignments.map(({ moderatorId, moderator }) => (
          <CardBadge key={moderatorId} type="name">
            {moderator.name}
          </CardBadge>
        ))}
      </div>
    </article>
  );
}
