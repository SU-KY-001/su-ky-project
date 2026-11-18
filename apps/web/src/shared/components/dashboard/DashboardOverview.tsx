import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DashboardStripMetric {
  id: string;
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: Icon;
  tone?: "primary" | "info" | "warning" | "success";
}

const metricIconToneClasses = {
  primary: "border-mod-primary/25 bg-mod-primary/5 text-mod-primary",
  info: "border-mod-kind-stage/25 bg-mod-kind-stage/5 text-mod-kind-stage",
  warning: "border-mod-attention/25 bg-mod-attention/5 text-mod-attention",
  success: "border-mod-success/25 bg-mod-success/5 text-mod-success",
};

export function DashboardMetricStrip({ metrics, compact = false, variant = "default" }: { metrics: DashboardStripMetric[]; compact?: boolean; variant?: "default" | "icon" }): ReactNode {
  return <dl data-metric-variant={variant} className={cn("grid grid-cols-2 overflow-hidden border border-mod-border bg-mod-surface lg:grid-cols-4", variant === "icon" ? "rounded-lg shadow-xs" : "rounded-xl")}>
    {metrics.map((metric, index) => <div key={metric.id} className={cn("relative min-w-0 border-mod-border px-5 max-lg:nth-[-n+2]:border-b", variant === "default" && "odd:max-lg:border-r lg:border-r lg:last:border-r-0", compact || variant === "icon" ? "py-4" : "py-5")}>
      {variant === "icon" && index < metrics.length - 1 ? <span aria-hidden="true" className={cn("pointer-events-none absolute inset-y-4 right-0 w-px bg-mod-border/70 lg:block", index % 2 === 0 ? "block" : "hidden")} /> : null}
      <dt className="text-xs leading-5 text-mod-text-secondary">
        {variant === "icon" && metric.icon ? <span aria-hidden="true" className={cn("mb-2 grid size-7 place-items-center rounded-md border", metricIconToneClasses[metric.tone ?? "primary"])}><metric.icon size={16} weight="duotone" /></span> : null}
        {metric.label}
      </dt>
      <dd className={cn("font-semibold tracking-tight tabular-nums text-mod-text", variant === "icon" ? "mt-1 text-2xl leading-8" : compact ? "mt-1.5 text-[26px] leading-8" : "mt-2 text-[28px] leading-9")}>{typeof metric.value === "number" ? metric.value.toLocaleString("vi-VN") : metric.value}</dd>
      {metric.detail ? <p className="mt-1 text-[11px] leading-5 text-mod-text-secondary">{metric.detail}</p> : null}
    </div>)}
  </dl>;
}

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
