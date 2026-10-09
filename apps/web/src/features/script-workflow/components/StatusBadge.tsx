import { BellRinging, CheckCircle, CircleNotch, Clock, XCircle, type Icon } from "@phosphor-icons/react";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { cn } from "@/lib/utils";
import type { StatusDescriptor, StatusTone } from "../labels";

const BADGE_ICON_SIZE = 14;

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-mod-border bg-mod-canvas text-mod-text-muted",
  info: "border-mod-primary/30 bg-mod-primary/10 text-mod-primary-hover",
  attention: "border-mod-attention/40 bg-mod-attention/10 text-mod-attention",
  success: "border-mod-success/30 bg-mod-success/10 text-mod-success",
  danger: "border-mod-danger/30 bg-mod-danger/10 text-mod-danger",
};

const TONE_ICON: Record<StatusTone, Icon> = {
  neutral: Clock,
  info: CircleNotch,
  attention: BellRinging,
  success: CheckCircle,
  danger: XCircle,
};

type StatusBadgeProps = {
  status: StatusDescriptor;
  /** Overrides the icon implied by the tone. */
  icon?: Icon;
  className?: string;
};

/** Status is always icon + text + color, never color alone. */
export function StatusBadge({ status, icon, className }: StatusBadgeProps) {
  const StatusIcon = icon ?? TONE_ICON[status.tone];
  return (
    <ModeratorText
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold",
        TONE_CLASS[status.tone],
        className,
      )}
    >
      <StatusIcon
        size={BADGE_ICON_SIZE}
        weight="bold"
        aria-hidden={true}
        className={status.tone === "info" && !icon ? "motion-safe:animate-spin" : undefined}
      />
      {status.label}
    </ModeratorText>
  );
}
