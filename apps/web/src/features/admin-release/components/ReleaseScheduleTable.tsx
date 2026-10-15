import type { KeyboardEvent } from "react";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import {
  CardBadge,
  cardBadgeToneForStatus,
} from "@/shared/components/dashboard/CardBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

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
  onOpenEdit,
  onPageChange,
}: {
  items: ReleaseScheduleRecord[];
  page: number;
  limit: number;
  total: number;
  isPending?: boolean;
  error?: Error | null;
  onOpenEdit: (schedule: ReleaseScheduleRecord) => void;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const openFromKeyboard = (event: KeyboardEvent, schedule: ReleaseScheduleRecord) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenEdit(schedule);
    }
  };
  if (isPending) return <div className="ui-skeleton min-h-72 rounded-2xl" aria-label="Đang tải bảng lịch" />;
  if (error) return <p role="alert" className="rounded-2xl border border-vermilion/20 bg-mod-surface p-5 text-sm text-vermilion">Không tải được bảng lịch phát hành.</p>;

  return (
    <div className="overflow-hidden rounded-2xl border border-mod-border bg-mod-surface">
      <Table>
        <TableHeader className="bg-mod-canvas-accent/70">
          <TableRow>
            <TableHead>Lịch phát hành</TableHead>
            <TableHead>Người phụ trách</TableHead>
            <TableHead>Hạn sản xuất</TableHead>
            <TableHead>Thời gian phát hành</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="h-32 text-center text-mod-text-muted">Không có lịch phù hợp.</TableCell></TableRow>
          ) : items.map((schedule) => (
            <TableRow
              key={schedule.id}
              tabIndex={0}
              className="cursor-pointer border-mod-border hover:bg-mod-canvas-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mod-primary/25"
              onClick={() => onOpenEdit(schedule)}
              onKeyDown={(event) => openFromKeyboard(event, schedule)}
            >
              <TableCell className="font-semibold text-mod-text">{schedule.title}</TableCell>
              <TableCell><div className="flex flex-wrap gap-1.5">{schedule.assignments.map(({ moderatorId, moderator }) => <CardBadge key={moderatorId} type="name">{moderator.name}</CardBadge>)}</div></TableCell>
              <TableCell className="whitespace-nowrap text-mod-text-secondary">{dateTime.format(schedule.productionDeadline)}</TableCell>
              <TableCell className="whitespace-nowrap text-mod-text-secondary">{dateTime.format(schedule.scheduledAt)}</TableCell>
              <TableCell><CardBadge type="status" tone={cardBadgeToneForStatus(schedule.status)}>{statusLabels[schedule.status]}</CardBadge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-mod-border px-4 py-3">
        <span className="text-xs text-mod-text-muted">Trang {page}/{totalPages} · {total} lịch</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</Button>
          <Button type="button" size="sm" variant="outline" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</Button>
        </div>
      </div>
    </div>
  );
}
