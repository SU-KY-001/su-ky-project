import type { ReactNode } from "react";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { DashboardMetricStrip } from "@/shared/components/dashboard/DashboardOverview";
import { useAdminReleaseDashboard, useAdminReleaseSchedules } from "@/features/admin-release/hooks/useAdminReleases";
import type { OverviewDestination } from "../types";

const labels: Record<string, string> = { SCHEDULED: "Đang sản xuất", READY_TO_PUBLISH: "Sẵn sàng", PUBLISHING: "Đang phát hành", BLOCKED: "Bị chặn", FAILED: "Thất bại" };
const dateTime = (date: Date): string => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(date);

function ScheduleList({ schedules, empty }: { schedules: ReleaseScheduleRecord[]; empty: string }): ReactNode {
  if (!schedules.length) return <p className="admin-overview-empty">{empty}</p>;
  return <ul className="admin-release-list">{schedules.map((schedule) => <li key={schedule.id}>
    <div className="min-w-0"><p className="break-words text-[13px] font-semibold leading-5 text-mod-text">{schedule.title}</p><p className="mt-1 text-xs text-mod-text-secondary">{dateTime(schedule.scheduledAt)}</p></div>
    <CardBadge type="status" tone={cardBadgeToneForStatus(schedule.status)}>{labels[schedule.status] ?? schedule.status}</CardBadge>
  </li>)}</ul>;
}

export function ReleaseSnapshot({ onNavigate }: { onNavigate: (section: OverviewDestination) => void }): ReactNode {
  const schedules = useAdminReleaseSchedules({ page: 1, limit: 3, statusGroup: "IN_PROGRESS", sort: "scheduledAt" });
  return <section className="admin-overview-panel p-5">
    <div className="admin-overview-panel-heading"><div><h2>Nhịp phát hành</h2><p>Các nội dung sắp lên sóng.</p></div></div>
    {schedules.isPending ? <div role="status" className="ui-skeleton h-28 rounded-lg" aria-label="Đang tải lịch phát hành" /> : schedules.isError ? <div><p className="admin-overview-empty">Chưa tải được lịch phát hành.</p><Button variant="ghost" onClick={() => void schedules.refetch()}>Thử lại</Button></div> : <ScheduleList schedules={schedules.data.items} empty="Chưa có lịch đang chuẩn bị phát hành." />}
    <Button variant="ghost" className="admin-overview-text-link mt-2" onClick={() => onNavigate("schedules")}>Mở lịch phát hành <ArrowRight size={14} /></Button>
  </section>;
}

export function ReleaseOverview({ onNavigate }: { onNavigate: (section: OverviewDestination) => void }): ReactNode {
  const metrics = useAdminReleaseDashboard();
  const upcoming = useAdminReleaseSchedules({ page: 1, limit: 6, statusGroup: "IN_PROGRESS", sort: "scheduledAt" });
  const attention = useAdminReleaseSchedules({ page: 1, limit: 4, statusGroup: "NEEDS_ATTENTION" });
  const ready = useAdminReleaseSchedules({ page: 1, limit: 4, status: "READY_TO_PUBLISH", sort: "scheduledAt" });
  return <div className="grid gap-5">
    {metrics.isPending ? <div role="status" aria-label="Đang tải thống kê phát hành" className="ui-skeleton h-32 rounded-xl" /> : metrics.isError ? <div className="admin-overview-panel p-5"><p>Chưa tải được thống kê phát hành.</p><Button variant="ghost" onClick={() => void metrics.refetch()}>Thử lại</Button></div> : <DashboardMetricStrip metrics={[
      { id: "upcoming", label: "Sắp phát hành", value: metrics.data.upcoming, detail: "Lịch đang được chuẩn bị" },
      { id: "ready", label: "Nội dung sẵn sàng", value: metrics.data.ready, detail: "Đã đạt điều kiện phát hành" },
      { id: "risk", label: "Có nguy cơ trễ", value: metrics.data.atRisk, detail: "Sắp đến giờ nhưng chưa sẵn sàng" },
      { id: "attention", label: "Việc cần xử lý", value: metrics.data.needsAttention, detail: "Lịch bị chặn hoặc phát hành thất bại" },
    ]} />}
    <div className="admin-overview-columns">
      <section className="admin-overview-panel self-start p-5">
        <div className="admin-overview-panel-heading"><div><h2>Lịch sắp phát hành</h2><p>Ưu tiên các nội dung gần thời điểm phát hành.</p></div><Button variant="ghost" className="admin-overview-text-link" onClick={() => onNavigate("schedules")}>Mở lịch <ArrowRight size={14} /></Button></div>
        {upcoming.isPending ? <div role="status" className="ui-skeleton h-64 rounded-lg" aria-label="Đang tải lịch sắp phát hành" /> : upcoming.isError ? <Button variant="outline" className="admin-overview-outline" onClick={() => void upcoming.refetch()}>Tải lại lịch phát hành</Button> : <ScheduleList schedules={upcoming.data.items} empty="Chưa có lịch sắp phát hành." />}
      </section>
      <div className="grid content-start gap-5">
        <section className="admin-overview-panel p-5"><div className="admin-overview-panel-heading"><div><h2>Việc cần xử lý</h2><p>Kiểm tra nguyên nhân trước lần phát hành tiếp theo.</p></div></div>
          {attention.isPending ? <div role="status" className="ui-skeleton h-28 rounded-lg" aria-label="Đang tải việc cần xử lý" /> : attention.isError ? <Button variant="ghost" onClick={() => void attention.refetch()}>Tải lại việc cần xử lý</Button> : <ScheduleList schedules={attention.data.items} empty="Không có lịch bị chặn hoặc phát hành thất bại." />}
          <Button variant="ghost" className="admin-overview-text-link mt-2" onClick={() => onNavigate("reviews")}>Mở hàng chờ kiểm duyệt <ArrowRight size={14} /></Button>
        </section>
        <section className="admin-overview-panel p-5"><div className="admin-overview-panel-heading"><div><h2>Sẵn sàng lên sóng</h2><p>Nội dung đã đạt điều kiện phát hành.</p></div></div>
          {ready.isPending ? <div role="status" className="ui-skeleton h-20 rounded-lg" aria-label="Đang tải nội dung sẵn sàng" /> : ready.isError ? <Button variant="ghost" onClick={() => void ready.refetch()}>Tải lại nội dung sẵn sàng</Button> : <ScheduleList schedules={ready.data.items} empty="Chưa có nội dung ở trạng thái sẵn sàng." />}
        </section>
      </div>
    </div>
  </div>;
}
