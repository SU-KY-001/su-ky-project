import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/icons/ClockCounterClockwise";
import { FileDashed } from "@phosphor-icons/react/dist/icons/FileDashed";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import type { LibraryStatus } from "../types";

const statusMeta = {
  draft: {
    label: "Bản nháp",
    icon: ClockCounterClockwise,
    className: "border-mod-border bg-mod-canvas-accent text-mod-text-secondary",
  },
  missing_source: {
    label: "Thiếu nguồn",
    icon: FileDashed,
    className: "border-mod-attention/20 bg-mod-attention/5 text-mod-attention",
  },
  needs_review: {
    label: "Cần kiểm tra",
    icon: WarningCircle,
    className: "border-mod-primary/20 bg-mod-primary/5 text-mod-primary-hover",
  },
  complete: {
    label: "Đã hoàn thiện",
    icon: CheckCircle,
    className: "border-mod-success/20 bg-mod-success/5 text-mod-success",
  },
} as const satisfies Record<
  LibraryStatus,
  { label: string; icon: typeof CheckCircle; className: string }
>;

export function LibraryStatusBadge({
  status,
  compact = false,
}: {
  status: LibraryStatus;
  compact?: boolean;
}) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 border font-semibold",
        compact
          ? "rounded-md px-2 py-1 text-xs"
          : "rounded-lg px-2 py-1.5 text-xs",
        meta.className,
      )}
    >
      <Icon size={compact ? 12 : 14} weight="fill" aria-hidden={true} />
      {meta.label}
    </Badge>
  );
}

export const libraryStatusOptions: Array<{
  value: LibraryStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "complete", label: "Đã hoàn thiện" },
  { value: "missing_source", label: "Thiếu nguồn" },
  { value: "needs_review", label: "Cần kiểm tra" },
  { value: "draft", label: "Bản nháp" },
];
