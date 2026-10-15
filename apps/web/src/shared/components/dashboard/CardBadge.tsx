import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

export type CardBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<CardBadgeTone, string> = {
  neutral: "border-mod-border bg-mod-canvas-accent text-mod-text-secondary",
  info: "border-mod-primary/20 bg-mod-primary/5 text-mod-primary-hover",
  success: "border-mod-success/20 bg-mod-success/5 text-mod-success",
  warning: "border-mod-attention/25 bg-mod-attention/5 text-mod-attention",
  danger: "border-mod-danger/25 bg-mod-danger/5 text-mod-danger",
};

const statusTones: Partial<Record<string, CardBadgeTone>> = {
  APPROVED: "success",
  PUBLISHED: "success",
  READY_TO_PUBLISH: "success",
  RELEASED: "success",
  VERIFIED: "success",
  IN_REVIEW: "info",
  PUBLISHING: "info",
  SCHEDULED: "info",
  BLOCKED: "warning",
  CHANGES_REQUESTED: "warning",
  PENDING: "warning",
  FAILED: "danger",
  REJECTED: "danger",
  CANCELLED: "neutral",
  DRAFT: "neutral",
  HIDDEN: "neutral",
};

export function cardBadgeToneForStatus(status: string): CardBadgeTone {
  return statusTones[status] ?? "neutral";
}

export function CardBadge({
  type,
  tone = "neutral",
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & {
  type: "status" | "name";
  tone?: CardBadgeTone;
}) {
  return (
    <Badge
      variant="outline"
      data-slot="card-badge"
      data-card-badge-type={type}
      data-tone={tone}
      className={cn(
        "min-h-6 max-w-full rounded-md px-2 py-1 text-xs font-semibold leading-none",
        type === "name" && "normal-case",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
