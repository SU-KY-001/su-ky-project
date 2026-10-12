import { useCallback, type ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { secondaryAction } from "./ModeratorTable";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";

export const formField = "mod-field min-h-11 w-full rounded-lg border border-mod-text-low/50 bg-transparent px-3 py-2 text-sm font-medium text-mod-text shadow-xs outline-none transition-[border-color,box-shadow,background-color] placeholder:text-mod-text-secondary/80 hover:border-mod-text-secondary data-[placeholder]:text-mod-text-secondary/80 disabled:bg-transparent disabled:text-mod-text-secondary";

export function CreationPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const focusTitle = useCallback((node: HTMLHeadingElement | null) => { node?.focus(); }, []);
  return <section className="flex flex-col gap-5 font-moderator">
    <header className="border-b border-mod-border pb-4">
      <Button type="button" variant="outline" onClick={onBack} className={`${secondaryAction} mb-4`}><ArrowLeft size={16} aria-hidden="true" />Quay lại danh sách</Button>
      <h1 ref={focusTitle} tabIndex={-1} className="text-2xl font-bold tracking-tight text-mod-text outline-none">{title}</h1>
      <p className="mt-1 text-sm text-mod-text-secondary">Điền thông tin để lưu bản nháp trong phiên làm việc hiện tại.</p>
    </header>
    {children}
  </section>;
}

export function FormField({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor: string }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={htmlFor} className="text-sm font-semibold text-mod-text">{label}</Label>{children}{hint ? <p className="text-xs leading-5 text-mod-text-secondary">{hint}</p> : null}</div>;
}
