import { useState } from "react";
import { ArrowsDownUp } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useWorkflowEvents } from "../../../hooks/useWorkflowReads";
import {
  describeWorkflowEventType,
  findOralizerLintStatus,
  formatEventMessage,
  type OralizerLintStatus,
} from "./eventLabels";
import { EventLogError, EventLogSkeleton } from "./EventLogStates";
import { EventTimelineItem } from "./EventTimelineItem";

export { describeWorkflowEventType, findOralizerLintStatus, formatEventMessage, type OralizerLintStatus };

type SortDirection = "newest" | "oldest";

const ICON_SIZE_SORT = 16;

export function WorkflowEventLogTab({ workflowId }: { workflowId: number }) {
  const query = useWorkflowEvents(workflowId, true);
  const [direction, setDirection] = useState<SortDirection>("newest");

  if (query.isError && !query.data) {
    return <EventLogError error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) {
    return <EventLogSkeleton />;
  }

  const orderedEvents = [...query.data.events].sort((left, right) =>
    direction === "newest" ? right.id - left.id : left.id - right.id,
  );
  const directionLabel = direction === "newest" ? "Mới nhất trước" : "Cũ nhất trước";

  return (
    <section
      aria-label="Nhật ký sự kiện"
      className="flex flex-col gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">
            Nhật ký sự kiện
          </ModeratorText>
          <ModeratorText className="rounded-full bg-mod-canvas-accent px-2.5 py-0.5 text-xs font-bold text-mod-text-muted">
            {query.data.events.length} sự kiện
          </ModeratorText>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeratorText className="text-xs font-semibold text-mod-text-secondary">
            Thứ tự thời gian: {directionLabel}
          </ModeratorText>
          <button
            type="button"
            onClick={() => setDirection((prev) => (prev === "newest" ? "oldest" : "newest"))}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-surface px-3 text-xs font-bold text-mod-text-muted hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary"
          >
            <ArrowsDownUp size={ICON_SIZE_SORT} aria-hidden={true} />
            <ModeratorText>
              {direction === "newest" ? "Đổi sang cũ nhất trước" : "Đổi sang mới nhất trước"}
            </ModeratorText>
          </button>
        </div>
      </header>

      {orderedEvents.length === 0 ? (
        <div className="rounded-[12px] border border-mod-border bg-mod-canvas p-6 text-center">
          <ModeratorText as="p" className="text-sm text-mod-text-secondary">
            Chưa có sự kiện nào được ghi nhận cho kịch bản này.
          </ModeratorText>
        </div>
      ) : (
        <ol
          aria-label={`Dòng thời gian sự kiện (${directionLabel.toLowerCase()})`}
          className="relative flex flex-col gap-3 before:absolute before:top-4 before:bottom-4 before:left-3 before:w-px before:bg-mod-border"
        >
          {orderedEvents.map((event) => (
            <EventTimelineItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  );
}
