import { useId } from "react";
import { ChartLineUp } from "@phosphor-icons/react";
import { Card } from "@/shared/components/ui/card";
import { moderatorChartColors } from "../theme";
import type { ModeratorChart, ModeratorChartSeries } from "../types";
import { EmptyChartState } from "./DashboardStates";
import { ModeratorText } from "./ModeratorText";

const chartWidth = 720;
const chartHeight = 230;
const plot = { left: 46, top: 12, width: 650, height: 154 };
const gridSteps = 4;

function contiguousSegments(series: ModeratorChartSeries, xAt: (index: number) => number, yAt: (value: number) => number) {
  const segments: Array<Array<{ x: number; y: number; value: number; index: number }>> = [];
  let segment: Array<{ x: number; y: number; value: number; index: number }> = [];
  series.values.forEach((value, index) => {
    if (value === null) {
      if (segment.length) segments.push(segment);
      segment = [];
      return;
    }
    segment.push({ x: xAt(index), y: yAt(value), value, index });
  });
  if (segment.length) segments.push(segment);
  return segments;
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (points.length < 2) return "";
  return `${buildLinePath(points)} L${points.at(-1)?.x},${baseline} L${points[0]?.x},${baseline} Z`;
}

export function AreaChartPanel({ chart }: { chart: ModeratorChart }) {
  const titleId = useId();
  const descriptionId = useId();
  const allValues = chart.series.flatMap((series) => series.values.filter((value): value is number => value !== null));
  const cardClass = "flex min-h-[316px] min-w-0 flex-1 flex-col gap-4 rounded-[17px] border border-mod-border bg-mod-surface p-5 shadow-[0_8px_22px_rgba(15,23,42,.035)]";

  if (allValues.length === 0) {
    return <Card className={cardClass}><ChartHeading chart={chart} /><EmptyChartState title={chart.title} /></Card>;
  }

  const maximum = Math.max(...allValues, 0);
  const ceiling = maximum === 0 ? 1 : maximum * 1.15;
  const xAt = (index: number) => plot.left + (chart.months.length <= 1 ? plot.width / 2 : (index / (chart.months.length - 1)) * plot.width);
  const yAt = (value: number) => plot.top + plot.height - (value / ceiling) * plot.height;
  const formatValue = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

  return (
    <Card className={cardClass}>
      <ChartHeading chart={chart} />
      <div className="flex min-w-0 flex-col gap-2.5">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" role="img" aria-labelledby={`${titleId} ${descriptionId}`} className="block overflow-visible">
          <title id={titleId}>{chart.title}</title>
          <desc id={descriptionId}>{chart.summary} {chart.months[0]} đến {chart.months.at(-1)}.</desc>
          {Array.from({ length: gridSteps + 1 }, (_, index) => {
            const y = plot.top + (index / gridSteps) * plot.height;
            const tick = maximum === 0 ? 0 : Math.round((ceiling * (gridSteps - index)) / gridSteps);
            return (
              <g key={`grid-${index}`}>
                <line x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} stroke="var(--modBorder)" strokeDasharray="2 6" />
                <text x={plot.left - 10} y={y + 4} textAnchor="end" fill="var(--modTextLow)" fontSize="10">{formatValue.format(tick)}</text>
              </g>
            );
          })}
          {chart.series.map((series) => {
            const color = moderatorChartColors[series.tone].svg;
            const segments = contiguousSegments(series, xAt, yAt);
            return (
              <g key={series.id}>
                {segments.map((segment, segmentIndex) => {
                  const points = segment.map(({ x, y }) => ({ x, y }));
                  return (
                    <g key={`${series.id}-${segmentIndex}`}>
                      <path d={buildAreaPath(points, plot.top + plot.height)} fill={color} opacity="0.1" />
                      <path d={buildLinePath(points)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {segment.map((point) => <circle key={`${series.id}-${point.index}`} cx={point.x} cy={point.y} r="4" fill="white" stroke={color} strokeWidth="2"><title>{`${series.label} · ${chart.months[point.index]}: ${formatValue.format(point.value)} ${chart.unit}`}</title></circle>)}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {chart.months.map((month, index) => <text key={month} x={xAt(index)} y={chartHeight - 18} textAnchor="middle" fill="var(--modTextLow)" fontSize="10">{month}</text>)}
        </svg>
        <div className="flex flex-wrap items-center gap-3.5" aria-label="Chú giải biểu đồ">
          {chart.series.map((series) => <div key={series.id} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: moderatorChartColors[series.tone].svg }} /><ModeratorText className="text-xs text-mod-text-secondary">{series.label}</ModeratorText></div>)}
        </div>
      </div>
    </Card>
  );
}

function ChartHeading({ chart }: { chart: ModeratorChart }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <ModeratorText as="h3" className="text-base font-bold text-mod-text">{chart.title}</ModeratorText>
        <ModeratorText className="text-xs text-mod-text-secondary">{chart.summary}</ModeratorText>
      </div>
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] border border-mod-border bg-mod-surface-glass"><ChartLineUp size={17} color="var(--modPrimary)" aria-hidden={true} /></span>
    </div>
  );
}
