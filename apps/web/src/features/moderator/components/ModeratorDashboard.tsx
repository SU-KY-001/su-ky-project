import { useState } from "react";
import { moderatorOverviewMock } from "../data";
import { AreaChartPanel } from "./AreaChartPanel";
import { MetricCard } from "./MetricCard";
import { ModeratorText } from "./ModeratorText";
import { QuickActions } from "./QuickActions";
import type { ModeratorQuickAction } from "../types";

export function ModeratorDashboard({ greetingLabel, onAction }: { greetingLabel: string; onAction?: (id: ModeratorQuickAction["id"]) => void }) {
  const [today] = useState(() => new Date());

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(today);
  const currentDate = `${formattedDate.slice(0, 1).toLocaleUpperCase("vi-VN")}${formattedDate.slice(1)}`;
  const dateTime = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6">
      <section id="overview" className="flex flex-col gap-5">
        <header className="flex flex-col items-start gap-1.5 border-b border-mod-border pb-4">
          <time dateTime={dateTime} className="font-moderator text-sm font-bold text-mod-primary">
            {currentDate}
          </time>
          <ModeratorText as="h1" className="text-3xl font-extrabold leading-tight tracking-tight text-mod-text max-[620px]:text-2xl">Tổng quan nội dung</ModeratorText>
          <ModeratorText className="text-sm text-mod-text-secondary">Chào mừng trở lại, {greetingLabel}.</ModeratorText>
        </header>

        <div className="mod-metric-grid">
          {moderatorOverviewMock.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
        </div>
      </section>

      {onAction ? <QuickActions items={moderatorOverviewMock.quickActions} onAction={onAction} disabledIds={["add-reference"]} /> : null}
      <section id="analytics" className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-1">
          <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Phân tích hoạt động</ModeratorText>
          <ModeratorText className="text-xs text-mod-text-secondary">Tổng hợp minh họa trong sáu tháng gần nhất.</ModeratorText>
        </div>
        <div className="mod-chart-grid">
          {moderatorOverviewMock.charts.map((chart) => <AreaChartPanel key={chart.id} chart={chart} />)}
        </div>
      </section>
    </div>
  );
}
