import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function DashboardTableCard({
  eyebrow,
  title,
  description,
  summary,
  toolbar,
  children,
  footer,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      data-dashboard-table-card="true"
      className={cn(
        "w-full min-w-0 gap-0 overflow-hidden rounded-xl border-mod-border bg-mod-surface py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="flex min-h-[84px] flex-row flex-wrap items-end justify-between gap-3 border-b border-mod-border px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow ? (
            <span className="text-[11px] font-bold tracking-[0.12em] text-mod-text-secondary">
              {eyebrow}
            </span>
          ) : null}
          <CardTitle className="text-lg font-bold tracking-tight text-mod-text">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="text-xs leading-5 text-mod-text-secondary">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {summary ? (
          <div className="text-xs font-medium text-mod-text-secondary">{summary}</div>
        ) : null}
      </CardHeader>
      {toolbar ? (
        <div className="border-b border-mod-border px-4 py-3 sm:px-5">{toolbar}</div>
      ) : null}
      <CardContent className="min-w-0 px-0">{children}</CardContent>
      {footer ? (
        <CardFooter className="border-t border-mod-border px-4 py-3 sm:px-5">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
