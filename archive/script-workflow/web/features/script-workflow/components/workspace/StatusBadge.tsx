import {
  ArrowsClockwise,
  CheckCircle,
  Circle,
  CircleNotch,
  Clock,
  Hourglass,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { StepStatus } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import type { StatusTone } from "../../labels";

/** Text colour per tone; every tone is >= 4.5:1 on `mod-surface`. */
export const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  neutral: "text-mod-text-secondary",
  info: "text-mod-primary-hover",
  attention: "text-mod-attention",
  success: "text-mod-success",
  danger: "text-mod-danger",
};

const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-mod-canvas-accent text-mod-text-muted",
  info: "bg-mod-primary/10 text-mod-primary-hover",
  attention: "bg-mod-attention/10 text-mod-attention",
  success: "bg-mod-success/10 text-mod-success",
  danger: "bg-mod-danger/10 text-mod-danger",
};

export const STATUS_ICONS: Record<StepStatus, Icon> = {
  PENDING: Circle,
  QUEUED: Clock,
  RUNNING: CircleNotch,
  WAITING_FOR_HUMAN: Hourglass,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  STALE: ArrowsClockwise,
};

type StatusIconProps = { status: StepStatus; size?: number; className?: string };

/** Decorative icon; the status is always spelled out in text next to it. */
export function StatusIcon({ status, size = 16, className }: StatusIconProps) {
  const IconComponent = STATUS_ICONS[status];
  const spins = status === "RUNNING";
  return (
    <IconComponent
      size={size}
      weight={status === "PENDING" ? "regular" : "fill"}
      className={cn(spins && "animate-spin motion-reduce:animate-none", className)}
      aria-hidden={true}
    />
  );
}

type StatusBadgeProps = { status: StepStatus; label: string; tone: StatusTone; className?: string };

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  return (
    <ModeratorText
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold",
        TONE_BADGE_CLASS[tone],
        className,
      )}
    >
      <StatusIcon status={status} size={14} />
      {label}
    </ModeratorText>
  );
}
