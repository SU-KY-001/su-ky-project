import type { DragEvent, KeyboardEvent } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { CalendarBlank, Clock, DotsThree, WarningCircle } from "@phosphor-icons/react";
import { DropdownMenu } from "radix-ui";
import {
  CardBadge,
  cardBadgeToneForStatus,
} from "@/shared/components/dashboard/CardBadge";
import {
  getReleaseDropCommand,
  RELEASE_BOARD_COLUMNS,
  type ReleaseBoardStatus,
  type ReleaseDropCommand,
} from "../releaseWorkspaceModel";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});
const statusLabels = Object.fromEntries(
  RELEASE_BOARD_COLUMNS.map(({ status, label }) => [status, label]),
) as Record<ReleaseBoardStatus, string>;

function fallbackAction(schedule: ReleaseScheduleRecord): {
  command: ReleaseDropCommand;
  target: ReleaseBoardStatus;
  label: string;
} | null {
  for (const { status } of RELEASE_BOARD_COLUMNS) {
    const command = getReleaseDropCommand(schedule.status, status);
    if (command)
      return {
        command,
        target: status,
        label: command === "check-readiness" ? "Xác nhận sẵn sàng" : "Phát hành ngay",
      };
  }
  return null;
}

export function ReleaseKanbanCard({
  schedule,
  index,
  pending,
  onOpenEdit,
  onDragStart,
  onDragEnd,
  onTransition,
}: {
  schedule: ReleaseScheduleRecord;
  index: number;
  pending: boolean;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onDragStart: (event: DragEvent<HTMLElement>, schedule: ReleaseScheduleRecord) => void;
  onDragEnd: () => void;
  onTransition: (
    schedule: ReleaseScheduleRecord,
    command: ReleaseDropCommand,
    targetStatus: ReleaseBoardStatus,
  ) => void | Promise<unknown>;
}) {
  const action = fallbackAction(schedule);
  const overdue =
    !["RELEASED", "CANCELLED"].includes(schedule.status) &&
    schedule.productionDeadline.getTime() < Date.now();
  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenEdit(schedule);
    }
  };
  const runTransition = () => {
    if (!action || pending) return;
    void Promise.resolve(
      onTransition(schedule, action.command, action.target),
    ).catch(() => undefined);
  };

  return (
    <article
      data-release-id={schedule.id}
      draggable={!pending}
      tabIndex={0}
      aria-busy={pending}
      className="group relative cursor-pointer rounded-xl border border-mod-border bg-mod-surface p-4 shadow-[0_1px_2px_rgba(22,18,15,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-mod-primary/25 hover:shadow-[0_8px_22px_rgba(22,18,15,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mod-primary/30 data-[pending=true]:opacity-60"
      data-pending={pending}
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
        {action ? (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Thao tác cho ${schedule.title}`}
                  className="grid size-8 place-items-center rounded-lg text-mod-text-muted transition hover:bg-mod-canvas-accent hover:text-mod-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mod-primary/30 disabled:opacity-50"
                >
                  <DotsThree size={20} weight="bold" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-[70] min-w-48 rounded-lg border border-mod-border bg-mod-surface p-1.5 shadow-lg"
                >
                  <DropdownMenu.Item
                    onSelect={runTransition}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-mod-text outline-none data-[highlighted]:bg-mod-canvas-accent"
                  >
                    {action.label}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : null}
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
