import { useState } from "react";
import {
  ArrowClockwise,
  ArrowsDownUp,
  CheckCircle,
  Clock,
  Info,
  WarningCircle,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { WorkflowEvent } from "@repo/shared";
import { errorMessage, errorRequestId } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useWorkflowEvents } from "../../../hooks/useWorkflowReads";
import { formatDateTime, type StatusTone } from "../../../labels";
import { TONE_TEXT_CLASS } from "../StatusBadge";
import {
  describeWorkflowEventType,
  findOralizerLintStatus,
  formatEventMessage,
  type OralizerLintStatus,
} from "./eventLabels";

export { describeWorkflowEventType, findOralizerLintStatus, formatEventMessage, type OralizerLintStatus };

type SortDirection = "newest" | "oldest";

const SKELETON_ROW_COUNT = 5;
const ICON_SIZE_BADGE = 14;
const ICON_SIZE_TIMELINE = 16;
const ICON_SIZE_ALERT = 28;

const SKELETON_BLOCK_CLASS = "animate-pulse rounded-md bg-mod-canvas-accent motion-reduce:animate-none";

const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-mod-canvas-accent text-mod-text-muted",
  info: "bg-mod-primary/10 text-mod-primary-hover",
  attention: "bg-mod-attention/10 text-mod-attention",
  success: "bg-mod-success/10 text-mod-success",
  danger: "bg-mod-danger/10 text-mod-danger",
};

const TONE_DOT_CLASS: Record<StatusTone, string> = {
  neutral: "border-mod-border bg-mod-surface text-mod-text-secondary",
  info: "border-mod-primary/40 bg-mod-primary/10 text-mod-primary-hover",
  attention: "border-mod-attention/40 bg-mod-attention/10 text-mod-attention",
  success: "border-mod-success/40 bg-mod-success/10 text-mod-success",
  danger: "border-mod-danger/40 bg-mod-danger/10 text-mod-danger",
};

const TONE_ICONS: Record<StatusTone, Icon> = {
  neutral: Clock,
  info: Info,
  attention: WarningCircle,
  success: CheckCircle,
  danger: XCircle,
};

function EventLogSkeleton() {
  return (
    <div
      role="status"
      aria-busy={true}
      className="flex flex-col gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-4 sm:p-5"
    >
      <span className="sr-only">Đang tải nhật ký sự kiện…</span>
      <div className={`${SKELETON_BLOCK_CLASS} h-6 w-48`} aria-hidden={true} />
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div
          key={index}
          aria-hidden={true}
          className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-canvas p-3.5"
        >
          <div className={`${SKELETON_BLOCK_CLASS} h-5 w-56`} />
          <div className={`${SKELETON_BLOCK_CLASS} h-4 w-4/5`} />
        </div>
      ))}
    </div>
  );
}

function EventLogError({ error, retrying, onRetry }: { error: Error; retrying: boolean; onRetry: () => void }) {
  const requestId = errorRequestId(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-6 text-center"
    >
      <WarningCircle size={ICON_SIZE_ALERT} weight="fill" className="text-mod-danger" aria-hidden={true} />
      <ModeratorText as="h2" className="text-base font-extrabold text-mod-text">
        Không tải được nhật ký sự kiện
      </ModeratorText>
      <ModeratorText as="p" className="text-sm text-mod-text-secondary">
        {errorMessage(error)}
      </ModeratorText>
      {requestId ? (
        <ModeratorText as="p" className="font-mono text-xs text-mod-text-secondary">
          Mã yêu cầu: {requestId}
        </ModeratorText>
      ) : null}
      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60"
      >
        <ArrowClockwise size={ICON_SIZE_TIMELINE} aria-hidden={true} />
        <ModeratorText>Thử lại</ModeratorText>
      </button>
    </div>
  );
}

function EventTimelineItem({ event }: { event: WorkflowEvent }) {
  const descriptor = describeWorkflowEventType(event.type);
  const ToneIcon = TONE_ICONS[descriptor.tone];
  const formattedMessage = formatEventMessage(event.message);

  return (
    <li className="relative pl-8">
      <span
        aria-hidden={true}
        className={cn(
          "absolute top-3 left-0 flex h-6 w-6 items-center justify-center rounded-full border",
          TONE_DOT_CLASS[descriptor.tone],
        )}
      >
        <ToneIcon size={ICON_SIZE_BADGE} weight="fill" />
      </span>

      <div className="flex flex-col gap-1.5 rounded-[12px] border border-mod-border bg-mod-canvas px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ModeratorText
            className={cn(
              "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold",
              TONE_BADGE_CLASS[descriptor.tone],
            )}
          >
            <ToneIcon size={ICON_SIZE_BADGE} weight="fill" className={TONE_TEXT_CLASS[descriptor.tone]} aria-hidden={true} />
            {descriptor.label}
          </ModeratorText>

          <ModeratorText as="time" dateTime={event.createdAt} className="font-mono text-xs text-mod-text-secondary">
            {formatDateTime(event.createdAt)}
          </ModeratorText>
        </div>

        <ModeratorText as="p" className="text-sm leading-relaxed text-mod-text">
          {formattedMessage}
        </ModeratorText>
      </div>
    </li>
  );
}

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
            <ArrowsDownUp size={ICON_SIZE_TIMELINE} aria-hidden={true} />
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
