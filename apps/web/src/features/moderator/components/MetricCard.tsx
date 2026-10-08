import { BookOpenText, Headphones, MapTrifold, SquaresFour } from "@phosphor-icons/react";
import type { ModeratorMetric, ModeratorMetricIcon } from "../types";
import { ModeratorText } from "./ModeratorText";

const metricIcons: Record<ModeratorMetricIcon, React.ReactNode> = {
  series: <SquaresFour size={19} weight="regular" color="var(--modPrimary)" aria-hidden={true} />,
  episode: <Headphones size={19} weight="regular" color="var(--modPrimary)" aria-hidden={true} />,
  milestone: <MapTrifold size={19} weight="regular" color="var(--modPrimary)" aria-hidden={true} />,
  reference: <BookOpenText size={19} weight="regular" color="var(--modPrimary)" aria-hidden={true} />,
};

export function MetricCard({ metric }: { metric: ModeratorMetric }) {
  return (
    <article className="group flex min-h-[148px] min-w-[220px] flex-1 flex-col gap-[18px] rounded-[17px] border border-mod-border bg-mod-surface p-[18px] shadow-[0_8px_22px_rgba(15,23,42,.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(15,23,42,.07)]" role="group" aria-label={`${metric.label}: ${new Intl.NumberFormat("vi-VN").format(metric.value)}`}>
      <div className="flex items-center justify-between gap-3">
        <ModeratorText className="truncate text-sm font-semibold text-mod-text-muted">{metric.label}</ModeratorText>
        <span className="grid size-[38px] shrink-0 place-items-center rounded-[11px] border border-mod-border bg-mod-surface-glass">{metricIcons[metric.icon]}</span>
      </div>
      <ModeratorText as="strong" className="text-3xl font-bold leading-none tracking-tight text-mod-text">
        {new Intl.NumberFormat("vi-VN").format(metric.value)}
      </ModeratorText>
      <ModeratorText className="text-xs text-mod-text-secondary">{metric.detail}</ModeratorText>
    </article>
  );
}
