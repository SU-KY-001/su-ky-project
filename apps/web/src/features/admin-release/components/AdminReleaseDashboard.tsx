import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { ClockCountdown } from "@phosphor-icons/react/dist/icons/ClockCountdown";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import {
  DashboardHeader,
  DashboardMetricGrid,
  DashboardPanel,
} from "@/shared/components/dashboard/DashboardOverview";
import { useAdminReleaseDashboard, useAdminReleaseSchedules } from "../hooks/useAdminReleases";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { cn } from "@/lib/utils";

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
    <div data-admin-overview="true" className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="ĐIỀU PHỐI PODCAST"
        title="Theo dõi phát hành"
        description="Theo dõi lịch sản xuất, kiểm duyệt và tiến trình tự động phát hành trong một màn hình."
        actions={actions}
      />
      <section className="grid gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-5 shadow-[0_8px_22px_rgba(15,23,42,.03)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-mod-primary">NHỊP VẬN HÀNH</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-mod-text">Nhịp vận hành đang được kiểm soát</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-mod-text-secondary">Ưu tiên xử lý lịch bị chặn, sau đó kiểm tra các nội dung sắp đến thời điểm phát hành.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <span className="rounded-md border border-mod-border bg-mod-canvas px-2.5 py-1.5 text-xs font-semibold text-mod-text-secondary">{metrics.needsAttention > 0 ? `${metrics.needsAttention} lịch cần xử lý` : "Không có sự cố"}</span>
          <span className="rounded-md border border-mod-primary/20 bg-mod-primary/5 px-2.5 py-1.5 text-xs font-semibold text-mod-primary-hover">{metrics.upcoming} lịch sắp phát hành</span>
        </div>
      </section>
      <DashboardMetricGrid metrics={cards} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <DashboardTableCard
          title="Sắp phát hành"
          description="Các podcast gần thời điểm lên sóng nhất"
          summary={`${schedules.length} lịch`}
        >
          <DashboardDataTable embedded caption="Các lịch sắp phát hành" columns={["Podcast", "Phụ trách", "Phát hành", "Trạng thái"]} columnWidths={["34%", "26%", "22%", "18%"]} minWidth={760}>
              {schedules.length ? schedules.slice(0, 6).map((item) => (
                    <TableRow key={item.id} className="border-mod-border/70 hover:bg-mod-canvas-accent/45">
                      <TableCell className={cn(dashboardTableCell, "font-semibold")}>{item.title}</TableCell>
                      <TableCell className={cn(dashboardTableCell, "text-mod-text-secondary")}>
                        <div className="flex flex-wrap gap-1.5">
                          {item.assignments.length ? item.assignments.map((assignment) => assignment.moderator?.name ? (
                            <CardBadge key={assignment.moderatorId ?? assignment.moderator.name} type="name">
                              {assignment.moderator.name}
                            </CardBadge>
                          ) : null) : <CardBadge type="name">Chưa phân công</CardBadge>}
                        </div>
                      </TableCell>
                      <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>
                        {formatDateTime(item.scheduledAt)}
                      </TableCell>
                      <TableCell className={dashboardTableCell}>
                        <CardBadge type="status" tone={cardBadgeToneForStatus(item.status)}>
                          {statusLabels[item.status] ?? item.status}
                        </CardBadge>
                      </TableCell>
                    </TableRow>
                  )) : <DashboardEmptyTableRow columns={4}>Chưa có lịch phát hành. Tạo lịch đầu tiên để bắt đầu điều phối.</DashboardEmptyTableRow>}
          </DashboardDataTable>
        </DashboardTableCard>
        <div className="flex flex-col gap-5">
          <DashboardPanel title="Cần xử lý ngay" description="Các trường hợp cần Admin quyết định">
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
          <DashboardPanel title="Lối tắt điều hành" description="Những điểm kiểm soát chính của quy trình phát hành.">
            <div className="grid gap-2">
              <div className="rounded-xl border border-mod-border bg-mod-canvas p-3"><p className="text-sm font-bold text-mod-text">Lập lịch và phân công</p><p className="mt-1 text-xs leading-5 text-mod-text-secondary">Tạo thời điểm phát hành và giao Moderator phụ trách.</p></div>
              <div className="rounded-xl border border-mod-border bg-mod-canvas p-3"><p className="text-sm font-bold text-mod-text">Theo dõi kiểm duyệt</p><p className="mt-1 text-xs leading-5 text-mod-text-secondary">Kiểm tra nội dung đang chờ quyết định trước giờ lên sóng.</p></div>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
