import type { ReactNode } from "react";

export function ModeratorSectionPanel({ eyebrow, title, summary, toolbar, children, footer }: { eyebrow?: string; title: string; summary?: ReactNode; toolbar: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return <section className="w-full min-w-0 overflow-hidden rounded-xl border border-mod-border bg-mod-surface shadow-sm">
    <header className="flex min-h-[84px] flex-wrap items-end justify-between gap-3 border-b border-mod-border px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-1">
        {eyebrow ? <span className="text-[11px] font-bold tracking-[0.12em] text-mod-text-secondary">{eyebrow}</span> : null}
        <h2 className="text-lg font-bold tracking-tight text-mod-text">{title}</h2>
      </div>
      {summary ? <div className="text-xs font-medium text-mod-text-secondary">{summary}</div> : null}
    </header>
    <div className="border-b border-mod-border px-4 py-3 sm:px-5">{toolbar}</div>
    <div className="min-w-0">{children}</div>
    {footer ? <div className="border-t border-mod-border px-4 py-3 sm:px-5">{footer}</div> : null}
  </section>;
}
