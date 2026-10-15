import {
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  DashboardHeader,
  DashboardMetricGrid,
  DashboardPanel,
} from "@/shared/components/dashboard/DashboardOverview";
import { useAdminReleaseDashboard, useAdminReleaseSchedules } from "../hooks/useAdminReleases";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";

export interface AdminReleaseMetrics {
  upcoming: number;
  ready: number;
  atRisk: number;
  needsAttention: number;
}

export interface AdminReleaseScheduleSummary {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | Date;
  productionDeadline: string | Date;
  assignments: Array<{ moderatorId?: string; moderator?: { name: string } }>;
}

const statusLabels: Record<string, string> = {
  SCHEDULED: "Đang sản xuất",
  READY_TO_PUBLISH: "Sẵn sàng phát hành",
  PUBLISHING: "Đang phát hành",
  RELEASED: "Đã phát hành",
  BLOCKED: "Cần xử lý",
  FAILED: "Phát hành thất bại",
  CANCELLED: "Đã hủy",
};

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function AdminReleaseDashboard({ onCreateSchedule }: { onCreateSchedule: () => void }) {
  const metrics = useAdminReleaseDashboard();
  const schedules = useAdminReleaseSchedules({ page: 1, limit: 12 });
  if (metrics.isPending || schedules.isPending)
    return (
      <div className="workspace-content-skeleton" data-skeleton-layout>
        <div className="workspace-skeleton-intro">
          <span className="ui-skeleton workspace-skeleton-block workspace-skeleton-line workspace-skeleton-line-short" />
          <span className="ui-skeleton workspace-skeleton-block workspace-skeleton-line-title" />
          <span className="ui-skeleton workspace-skeleton-block workspace-skeleton-line workspace-skeleton-line-wide" />
        </div>
        <div className="workspace-skeleton-metric-grid">
          {Array.from({ length: 4 }, (_, index) => <span key={index} className="ui-skeleton workspace-skeleton-panel workspace-skeleton-metric" />)}
        </div>
      </div>
    );
  if (metrics.isError || schedules.isError)
    return (
      <div role="alert" className="rounded-[16px] border border-vermilion/25 bg-mod-surface p-6">
        <h1 className="text-lg font-bold text-mod-text">Chưa tải được dữ liệu phát hành</h1>
        <p className="mt-2 text-sm text-mod-text-secondary">Kiểm tra kết nối API rồi thử tải lại trang.</p>
      </div>
    );
  return (
    <AdminReleaseDashboardView
      metrics={metrics.data}
      schedules={schedules.data.items}
      actions={
        <Button type="button" onClick={onCreateSchedule} className="gap-2 bg-mod-primary text-white hover:bg-mod-primary/90">
          <Plus size={17} /> Tạo lịch phát hành
        </Button>
      }
    />
  );
}

export function AdminReleaseDashboardView({
  metrics,
  schedules,
  actions,
}: {
  metrics: AdminReleaseMetrics;
  schedules: AdminReleaseScheduleSummary[];
  actions?: React.ReactNode;
}) {
  const cards = [
    {
      id: "upcoming",
      label: "Sắp phát hành",
      value: metrics.upcoming,
      detail: "Lịch đang được chuẩn bị",
      icon: CalendarBlank,
    },
    {
      id: "ready",
      label: "Sẵn sàng phát hành",
      value: metrics.ready,
      detail: "Đã duyệt và đạt checklist",
      icon: CheckCircle,
    },
    {
      id: "risk",
      label: "Có nguy cơ trễ",
      value: metrics.atRisk,
      detail: "Còn dưới 2 giờ nhưng chưa sẵn sàng",
      icon: ClockCountdown,
      urgent: metrics.atRisk > 0,
    },
    {
      id: "attention",
      label: "Cần xử lý",
      value: metrics.needsAttention,
      detail: "Bị chặn hoặc phát hành thất bại",
      icon: WarningCircle,
      urgent: metrics.needsAttention > 0,
    },
  ];
  const urgent = schedules.filter((item) =>
    ["BLOCKED", "FAILED"].includes(item.status),
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="ĐIỀU PHỐI PODCAST"
        title="Theo dõi phát hành"
        description="Theo dõi lịch sản xuất, kiểm duyệt và tiến trình tự động phát hành trong một màn hình."
        actions={actions}
      />
      <DashboardMetricGrid metrics={cards} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
        <DashboardPanel
          title="Sắp phát hành"
          description="Các podcast gần thời điểm lên sóng nhất"
        >
          {schedules.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-mod-border text-xs text-mod-text-secondary">
                    <th className="pb-3 pr-4 font-semibold">Podcast</th>
                    <th className="pb-3 pr-4 font-semibold">Phụ trách</th>
                    <th className="pb-3 pr-4 font-semibold">Phát hành</th>
                    <th className="pb-3 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.slice(0, 6).map((item) => (
                    <tr key={item.id} className="border-b border-mod-border/70 last:border-0">
                      <td className="py-3.5 pr-4 font-semibold text-mod-text">{item.title}</td>
                      <td className="py-3.5 pr-4 text-mod-text-secondary">
                        <div className="flex flex-wrap gap-1.5">
                          {item.assignments.length ? item.assignments.map((assignment) => assignment.moderator?.name ? (
                            <CardBadge key={assignment.moderatorId ?? assignment.moderator.name} type="name">
                              {assignment.moderator.name}
                            </CardBadge>
                          ) : null) : <CardBadge type="name">Chưa phân công</CardBadge>}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 tabular-nums text-mod-text-secondary">
                        {formatDateTime(item.scheduledAt)}
                      </td>
                      <td className="py-3.5">
                        <CardBadge type="status" tone={cardBadgeToneForStatus(item.status)}>
                          {statusLabels[item.status] ?? item.status}
                        </CardBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center rounded-[12px] bg-mod-canvas px-6 text-center">
              <div>
                <CalendarBlank size={28} className="mx-auto mb-2 text-mod-text-low" />
                <p className="text-sm font-semibold text-mod-text">Chưa có lịch phát hành</p>
                <p className="mt-1 text-xs text-mod-text-secondary">Tạo lịch đầu tiên để bắt đầu điều phối.</p>
              </div>
            </div>
          )}
        </DashboardPanel>
        <DashboardPanel
          title="Cần xử lý ngay"
          description="Các trường hợp cần Admin quyết định"
        >
          {urgent.length ? (
            <div className="flex flex-col gap-2.5">
              {urgent.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-[12px] border border-vermilion/20 bg-vermilion/5 p-3.5">
                  <p className="text-sm font-bold text-mod-text">{item.title}</p>
                  <CardBadge type="status" tone={cardBadgeToneForStatus(item.status)} className="mt-2">
                    {statusLabels[item.status] ?? item.status}
                  </CardBadge>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center rounded-[12px] bg-mod-canvas px-6 text-center">
              <div>
                <CheckCircle size={28} className="mx-auto mb-2 text-mod-primary" />
                <p className="text-sm font-semibold text-mod-text">Không có sự cố cần xử lý</p>
                <p className="mt-1 text-xs text-mod-text-secondary">Hệ thống đang theo đúng kế hoạch.</p>
              </div>
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
