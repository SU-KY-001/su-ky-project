import { CheckCircle, Clock, Info, WarningCircle, XCircle, type Icon } from "@phosphor-icons/react";
import type { WorkflowEvent } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { formatDateTime, type StatusTone } from "../../../labels";
import { TONE_TEXT_CLASS } from "../StatusBadge";
import { describeWorkflowEventType, formatEventMessage } from "./eventLabels";

const ICON_SIZE_BADGE = 14;

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

export function EventTimelineItem({ event }: { event: WorkflowEvent }) {
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
