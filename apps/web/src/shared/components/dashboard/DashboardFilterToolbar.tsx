import { useId, type ComponentProps, type ReactNode } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass";
import { Input } from "@/shared/components/ui/input";

export function DashboardFilterToolbar({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,220px)_minmax(170px,200px)_minmax(170px,200px)] [&>label]:min-w-0 [&>label]:text-xs [&>label]:font-semibold [&>label]:text-mod-text-secondary [&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:border-mod-border [&_[data-slot=select-trigger]]:bg-mod-surface">{children}</div>;
}

export function DashboardSearchInput({ label, ...props }: ComponentProps<typeof Input> & { label: string }) {
  const id = useId();
  return <div className="grid min-w-0 gap-1">
    <label htmlFor={id} className="text-xs font-semibold text-mod-text-secondary">{label}</label>
    <div className="relative">
      <MagnifyingGlass size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" />
      <Input {...props} id={id} className="h-10 border-mod-border bg-mod-surface pl-9" />
    </div>
  </div>;
}
