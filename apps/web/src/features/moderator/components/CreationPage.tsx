import { useCallback, type ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { Label } from "@/shared/components/ui/label";

export const formField = "mod-field min-h-11 w-full rounded-lg border border-mod-text-low/50 bg-transparent px-3 py-2 text-sm font-medium text-mod-text shadow-xs outline-none transition-[border-color,box-shadow,background-color] placeholder:text-mod-text-secondary/80 hover:border-mod-text-secondary data-[placeholder]:text-mod-text-secondary/80 disabled:cursor-not-allowed disabled:border-mod-border disabled:bg-mod-canvas-accent disabled:text-mod-text-low disabled:shadow-none disabled:hover:border-mod-border read-only:cursor-not-allowed read-only:border-mod-border read-only:bg-mod-canvas-accent read-only:text-mod-text-low read-only:shadow-none read-only:hover:border-mod-border";

export function CreationPage({ title, onBack, children, description = "Điền thông tin để lưu bản nháp trong phiên làm việc hiện tại." }: { title: string; onBack: () => void; children: ReactNode; description?: string }) {
  const focusTitle = useCallback((node: HTMLHeadingElement | null) => { node?.focus(); }, []);
  return <section className="flex w-full min-w-0 max-w-full flex-col gap-5 font-moderator">
    <header className="border-b border-mod-border pb-4">
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-mod-text-secondary transition-colors hover:text-mod-primary focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"><ArrowLeft size={16} aria-hidden="true" />Quay lại danh sách</button>
      <h1 ref={focusTitle} tabIndex={-1} className="text-2xl font-bold tracking-tight text-mod-text outline-none">{title}</h1>
      <p className="mt-1 text-sm text-mod-text-secondary">{description}</p>
    </header>
    {children}
  </section>;
}

export function FormField({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor: string }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={htmlFor} className="text-sm font-semibold text-mod-text">{label}</Label>{children}{hint ? <p className="text-xs leading-5 text-mod-text-secondary">{hint}</p> : null}</div>;
}
