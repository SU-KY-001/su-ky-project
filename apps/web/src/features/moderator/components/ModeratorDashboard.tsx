import { useEffect, useState, type ReactNode } from "react";
import { ArrowClockwise, CheckCircle, Plus } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { moderatorMockDataLabel, moderatorOverviewMock } from "../data";
import type { ModeratorQuickActionIcon } from "../types";
import { AreaChartPanel } from "./AreaChartPanel";
import { IntegrationStatusCard } from "./IntegrationStatusCard";
import { MetricCard } from "./MetricCard";
import { ModeratorText } from "./ModeratorText";
import { QuickActions } from "./QuickActions";

const quickActionCopy: Record<ModeratorQuickActionIcon, string> = {
  series: "Mở bản xem trước tạo series. Dữ liệu chưa được lưu.",
  episode: "Mở bản xem trước thêm tập podcast. Dữ liệu chưa được lưu.",
  milestone: "Mở bản xem trước thêm mốc lịch sử. Dữ liệu chưa được lưu.",
  reference: "Mở bản xem trước thêm nguồn tư liệu. Dữ liệu chưa được lưu.",
};

function DashboardActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <Button variant={primary ? "default" : "outline"} className={primary ? "min-h-11 rounded-[10px] bg-mod-primary px-[15px] text-white hover:bg-mod-primary-hover" : "min-h-11 rounded-[10px] border-mod-border bg-mod-surface px-[15px] text-mod-text-muted hover:border-mod-primary hover:bg-mod-surface-glass"} onClick={onClick}>
      {icon}{label}
    </Button>
  );
}

interface ModeratorDashboardProps {
  greetingLabel: string;
  onToast: (message: string) => void;
  onReady: () => void;
}

export function ModeratorDashboard({ greetingLabel, onToast, onReady }: ModeratorDashboardProps) {
  const [today] = useState(() => new Date());

  useEffect(() => onReady(), [onReady]);

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(today);
  const currentDate = `${formattedDate.slice(0, 1).toLocaleUpperCase("vi-VN")}${formattedDate.slice(1)}`;

  return (
    <>
      <section id="overview" className="flex flex-col gap-[21px]">
        <div className="flex flex-wrap items-end justify-between gap-[18px]">
          <div className="flex min-w-[245px] flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ModeratorText className="text-xs font-bold text-mod-text-secondary">{currentDate}</ModeratorText>
              <span className="flex items-center gap-1.5 rounded-full border border-mod-border bg-mod-surface px-2 py-1">
                <span className="size-1.5 rounded-full bg-mod-primary" />
                <ModeratorText className="text-xs font-semibold text-mod-text-secondary">{moderatorMockDataLabel}</ModeratorText>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <ModeratorText className="text-sm font-semibold text-mod-text-muted">{moderatorOverviewMock.greeting}, {greetingLabel}</ModeratorText>
              <ModeratorText as="h1" className="text-3xl font-extrabold leading-tight tracking-tight text-mod-text max-[620px]:text-2xl">Tổng quan nội dung</ModeratorText>
            </div>
            <ModeratorText className="text-sm text-mod-text-secondary">Theo dõi thư viện lịch sử, lượt nghe và hoạt động của Sử Ký.</ModeratorText>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardActionButton label="Làm mới" icon={<ArrowClockwise size={16} color="var(--modTextMuted)" aria-hidden={true} />} onClick={() => onToast("Đã cập nhật dữ liệu minh họa.")} />
            <DashboardActionButton label="Tạo nội dung" icon={<Plus size={17} color="white" weight="bold" aria-hidden={true} />} onClick={() => onToast("Mở bản xem trước tạo nội dung. Dữ liệu chưa được lưu.")} primary />
          </div>
        </div>

        <div className="mod-metric-grid">
          {moderatorOverviewMock.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
        </div>
      </section>

      <section id="analytics" className="flex flex-col gap-[15px]">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Phân tích hoạt động</ModeratorText>
            <ModeratorText className="text-xs text-mod-text-secondary">Tổng hợp minh họa trong sáu tháng gần nhất.</ModeratorText>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-mod-border bg-mod-surface px-2.5 py-2">
            <CheckCircle size={14} color="var(--modSuccess)" weight="fill" aria-hidden={true} />
            <ModeratorText className="text-xs font-semibold text-mod-text-secondary">6 tháng</ModeratorText>
          </span>
        </div>
        <div className="mod-chart-grid">
          {moderatorOverviewMock.charts.map((chart) => <AreaChartPanel key={chart.id} chart={chart} />)}
        </div>
      </section>

      <section id="integrations" className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-1">
          <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Kết nối dữ liệu</ModeratorText>
          <ModeratorText className="text-xs text-mod-text-secondary">Trạng thái các dịch vụ phân tích bên ngoài.</ModeratorText>
        </div>
        <div className="mod-integration-grid">
          {moderatorOverviewMock.integrations.map((integration) => <IntegrationStatusCard key={integration.id} integration={integration} />)}
        </div>
      </section>

      <section id="quick-actions" className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-1">
          <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Thao tác nhanh</ModeratorText>
          <ModeratorText className="text-xs text-mod-text-secondary">Lối tắt cho các loại nội dung chính trong thư viện.</ModeratorText>
        </div>
        <QuickActions items={moderatorOverviewMock.quickActions} onAction={(id) => {
          const action = moderatorOverviewMock.quickActions.find((item) => item.id === id);
          if (action) onToast(quickActionCopy[action.icon]);
        }} />
      </section>
    </>
  );
}
