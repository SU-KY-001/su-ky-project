import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export const dashboardTableCell = "px-4 py-3.5 align-middle text-mod-text";

export interface DashboardDataTableProps {
  caption: string;
  columns: ReactNode[];
  columnAriaSort?: Array<"none" | "ascending" | "descending" | undefined>;
  children: ReactNode;
  columnWidths?: string[];
  minWidth?: number;
  embedded?: boolean;
  responsive?: boolean;
}

export function DashboardDataTable({
  caption,
  columns,
  columnAriaSort,
  children,
  columnWidths,
  minWidth = 720,
  embedded = false,
  responsive = false,
}: DashboardDataTableProps) {
  return (
    <div data-responsive={responsive || undefined} className={cn("mod-data-table font-moderator", embedded ? "w-full overflow-visible rounded-none border-0 bg-transparent shadow-none" : "overflow-hidden rounded-lg border border-mod-text-low/40 bg-mod-surface shadow-sm")}>
      <Table className={cn("border-collapse text-left", columnWidths && "table-fixed")} style={{ minWidth }}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        {columnWidths ? <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup> : null}
        <TableHeader className="bg-mod-canvas-accent text-sm text-mod-text">
          <TableRow className="border-mod-text-low/40">{columns.map((column, index) => <TableHead key={index} scope="col" aria-sort={columnAriaSort?.[index]} className="whitespace-nowrap px-4 py-4 font-bold text-mod-text">{column}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-mod-text-low/25">{children}</TableBody>
      </Table>
    </div>
  );
}

export function DashboardInteractiveTableRow({ onActivate, expanded, className, ...props }: Omit<ComponentProps<typeof TableRow>, "onClick"> & { onActivate: () => void; expanded?: boolean }) {
  return <TableRow {...props} data-interactive="true" data-expanded={expanded} className={cn("cursor-pointer hover:bg-mod-primary/5", expanded && "bg-mod-primary/5", className)} onClick={(event) => {
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"], [role="combobox"], [contenteditable="true"]')) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    onActivate();
  }} />;
}

export function DashboardEmptyTableRow({ columns, children, compact = false }: { columns: number; children: ReactNode; compact?: boolean }) {
  return <TableRow><TableCell colSpan={columns} className={cn("px-4 text-center text-sm text-mod-text-secondary", compact ? "py-3" : "py-12")}>{children}</TableCell></TableRow>;
}
