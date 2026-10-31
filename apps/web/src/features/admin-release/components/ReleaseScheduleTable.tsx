import type { ReactNode } from "react";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import {
  CardBadge,
  cardBadgeToneForStatus,
} from "@/shared/components/dashboard/CardBadge";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import {
  DashboardDataTable,
  DashboardEmptyTableRow,
  dashboardTableCell,
} from "@/shared/components/dashboard/DashboardDataTable";
import { cn } from "@/lib/utils";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";

const statusLabels: Record<ReleaseScheduleStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  READY_TO_PUBLISH: "Sẵn sàng phát hành",
  PUBLISHING: "Đang phát hành",
  RELEASED: "Đã phát hành",
  BLOCKED: "Bị chặn",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function ReleaseScheduleTable({
  items,
  page,
  limit,
  total,
  isPending = false,
  error = null,
  toolbar,
  onOpenEdit,
  onPageChange,
}: {
  items: ReleaseScheduleRecord[];
  page: number;
  limit: number;
  total: number;
  isPending?: boolean;
  error?: Error | null;
  toolbar?: ReactNode;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onPageChange: (page: number) => void;
}) {
  if (isPending) return <div className="ui-skeleton min-h-72 rounded-2xl" aria-label="Đang tải bảng lịch" />;
  if (error) return <p role="alert" className="rounded-2xl border border-vermilion/20 bg-mod-surface p-5 text-sm text-vermilion">Không tải được bảng lịch phát hành.</p>;

  const pagination = <DashboardPagination page={page} limit={limit} total={total} itemLabel="lịch" onPageChange={onPageChange} />;

  return (
    <DashboardTableCard
      title="Danh sách lịch phát hành"
      description="Theo dõi người phụ trách, thời hạn và trạng thái của từng lịch."
      summary={`${total} lịch`}
      toolbar={toolbar}
      footer={pagination}
    >
      <DashboardDataTable
        embedded
        caption="Danh sách lịch phát hành"
        columns={["Lịch phát hành", "Người phụ trách", "Hạn sản xuất", "Thời gian phát hành", "Trạng thái", "Thao tác"]}
        columnWidths={["28%", "15%", "15%", "17%", "11%", "14%"]}
        minWidth={1000}
      >
        {items.length === 0 ? (
          <DashboardEmptyTableRow columns={6}>Không có lịch phù hợp.</DashboardEmptyTableRow>
        ) : items.map((schedule) => (
            <TableRow
              key={schedule.id}
              className="border-mod-border"
            >
              <TableCell className={cn(dashboardTableCell, "font-semibold")}>{schedule.title}</TableCell>
              <TableCell className={dashboardTableCell}><div className="flex flex-wrap gap-1.5">{schedule.assignments.map(({ moderatorId, moderator }) => <CardBadge key={moderatorId} type="name">{moderator.name}</CardBadge>)}</div></TableCell>
              <TableCell className={cn(dashboardTableCell, "whitespace-nowrap text-mod-text-secondary")}>{dateTime.format(schedule.productionDeadline)}</TableCell>
              <TableCell className={cn(dashboardTableCell, "whitespace-nowrap text-mod-text-secondary")}>{dateTime.format(schedule.scheduledAt)}</TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="status" tone={cardBadgeToneForStatus(schedule.status)}>{statusLabels[schedule.status]}</CardBadge></TableCell>
              <TableCell className={dashboardTableCell}>
                <DashboardRowActions label={schedule.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => onOpenEdit(schedule) }]} />
              </TableCell>
            </TableRow>
          ))}
      </DashboardDataTable>
    </DashboardTableCard>
  );
}
