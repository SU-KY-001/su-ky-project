import type { ComponentProps, ReactNode } from "react";
import {
  DashboardDataTable,
  DashboardEmptyTableRow,
  DashboardInteractiveTableRow,
  dashboardTableCell,
} from "@/shared/components/dashboard/DashboardDataTable";
import { TableRow } from "@/shared/components/ui/table";

export const tableCell = dashboardTableCell;
export const tableAction = "mod-table-row-action h-auto min-h-8 w-full justify-start whitespace-normal rounded px-1 py-1 text-left font-semibold text-mod-primary hover:text-mod-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";
export const branchAction = "mod-table-row-action flex h-auto min-h-8 w-full items-start justify-start gap-2 whitespace-normal rounded px-1 py-1 text-left font-semibold text-mod-text hover:text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary";
export const primaryAction = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";
export const secondaryAction = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-mod-border px-4 text-sm font-semibold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";

export function ModeratorTable({ caption, columns, children, columnWidths, minWidth = 720, embedded = false }: { caption: string; columns: string[]; children: ReactNode; columnWidths?: string[]; minWidth?: number; embedded?: boolean }) {
  return <DashboardDataTable caption={caption} columns={columns} columnWidths={columnWidths} minWidth={minWidth} embedded={embedded}>{children}</DashboardDataTable>;
}

export function InteractiveTableRow({ onActivate, expanded, className, ...props }: Omit<ComponentProps<typeof TableRow>, "onClick"> & { onActivate: () => void; expanded?: boolean }) {
  return <DashboardInteractiveTableRow {...props} onActivate={onActivate} expanded={expanded} className={className} />;
}

export function EmptyTableRow({ columns, children, compact = false }: { columns: number; children: ReactNode; compact?: boolean }) {
  return <DashboardEmptyTableRow columns={columns} compact={compact}>{children}</DashboardEmptyTableRow>;
}
