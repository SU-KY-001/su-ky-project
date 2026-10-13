import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/shared/components/ui/table";

export const tableCell = "px-4 py-3.5 align-middle text-mod-text";
export const tableAction = "mod-table-row-action h-auto min-h-8 w-full justify-start whitespace-normal rounded px-1 py-1 text-left font-semibold text-mod-primary hover:text-mod-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";
export const branchAction = "mod-table-row-action flex h-auto min-h-8 w-full items-start justify-start gap-2 whitespace-normal rounded px-1 py-1 text-left font-semibold text-mod-text hover:text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary";
export const primaryAction = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";
export const secondaryAction = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-mod-border px-4 text-sm font-semibold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary";

export function ModeratorTable({ caption, columns, children, columnWidths, minWidth = 720, embedded = false }: { caption: string; columns: string[]; children: ReactNode; columnWidths?: string[]; minWidth?: number; embedded?: boolean }) {
  return <div className={cn("mod-data-table font-moderator", embedded ? "w-full overflow-visible rounded-none border-0 bg-transparent shadow-none" : "overflow-hidden rounded-lg border border-mod-text-low/40 bg-mod-surface shadow-sm")}>
    <Table className={cn("border-collapse text-left", columnWidths && "table-fixed")} style={{ minWidth }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      {columnWidths ? <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup> : null}
      <TableHeader className="bg-mod-canvas-accent text-sm text-mod-text">
        <TableRow className="border-mod-text-low/40">{columns.map((column) => <TableHead key={column} scope="col" className="whitespace-nowrap px-4 py-4 font-bold text-mod-text">{column}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-mod-text-low/25">{children}</TableBody>
    </Table>
  </div>;
}

export function InteractiveTableRow({ onActivate, expanded, className, ...props }: Omit<ComponentProps<typeof TableRow>, "onClick"> & { onActivate: () => void; expanded?: boolean }) {
  return <TableRow {...props} data-interactive="true" data-expanded={expanded} className={cn("cursor-pointer hover:bg-mod-primary/5", expanded && "bg-mod-primary/5", className)} onClick={(event) => {
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"], [role="combobox"], [contenteditable="true"]')) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    onActivate();
  }} />;
}

export function EmptyTableRow({ columns, children, compact = false }: { columns: number; children: ReactNode; compact?: boolean }) {
  return <TableRow><TableCell colSpan={columns} className={cn("px-4 text-center text-sm text-mod-text-secondary", compact ? "py-3" : "py-12")}>{children}</TableCell></TableRow>;
}
