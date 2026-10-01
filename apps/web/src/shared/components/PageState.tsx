import type { ReactNode } from "react";

interface PageStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
}

export function PageState({ eyebrow, title, description, icon }: PageStateProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#101722] p-6 sm:p-10">
      {eyebrow ? <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p> : null}
      <div className="mb-3 flex items-center gap-3">
        {icon ? <span className="text-amber-400">{icon}</span> : null}
        <h1 className="font-serif text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      </div>
      <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
    </section>
  );
}
