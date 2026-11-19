import type { ReactNode } from "react";

export function State({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-mod-border bg-mod-surface p-5 text-sm text-mod-text-secondary">
      {children}
    </p>
  );
}
export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-bold text-mod-text">{title}</h1>
      <p className="mt-1 text-sm text-mod-text-secondary">{description}</p>
    </header>
  );
}
export function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-mod-border bg-mod-surface p-5">
      <p className="text-sm text-mod-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-mod-text">
        {new Intl.NumberFormat("vi-VN").format(value)}
      </p>
    </article>
  );
}
