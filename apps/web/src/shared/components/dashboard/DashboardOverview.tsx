import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  detail: string;
  icon: Icon;
  urgent?: boolean;
}

export function DashboardHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-mod-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? (
          <p className="text-xs font-bold text-mod-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-mod-text max-[620px]:text-2xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-mod-text-secondary">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function DashboardMetricCard({ metric }: { metric: DashboardMetric }) {
  const MetricIcon = metric.icon;
  return (
    <article
      className={`flex min-h-[142px] min-w-0 flex-col justify-between gap-4 rounded-[16px] border bg-mod-surface p-[18px] shadow-[0_8px_22px_rgba(15,23,42,.035)] ${
        metric.urgent ? "border-vermilion/35" : "border-mod-border"
      }`}
      aria-label={`${metric.label}: ${new Intl.NumberFormat("vi-VN").format(metric.value)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-mod-text-muted">
          {metric.label}
        </p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-[10px] border ${
            metric.urgent
              ? "border-vermilion/20 bg-vermilion/5 text-vermilion"
              : "border-mod-border bg-mod-surface-glass text-mod-primary"
          }`}
        >
          <MetricIcon size={18} weight="regular" aria-hidden="true" />
        </span>
      </div>
      <strong className="text-3xl font-bold leading-none tracking-tight text-mod-text">
        {new Intl.NumberFormat("vi-VN").format(metric.value)}
      </strong>
      <p className="text-xs text-mod-text-secondary">{metric.detail}</p>
    </article>
  );
}

export function DashboardMetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="mod-metric-grid">
      {metrics.map((metric) => (
        <DashboardMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

export function DashboardPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-mod-border bg-mod-surface p-5 shadow-[0_8px_22px_rgba(15,23,42,.03)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-mod-text">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-mod-text-secondary">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
