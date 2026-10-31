import { useDeferredValue, useState } from "react";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import {
  DashboardDataTable,
  DashboardEmptyTableRow,
  dashboardTableCell,
} from "@/shared/components/dashboard/DashboardDataTable";
import { cn } from "@/lib/utils";
import { useAdminReleaseSchedules } from "../hooks/useAdminReleases";

type HistoryStatus = Extract<ReleaseScheduleStatus, "RELEASED" | "CANCELLED"> | "";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function ReleaseHistory({
  schedules,
  page,
  limit,
  total,
  search,
  status,
  from,
  to,
  onSearchChange,
  onStatusChange,
  onFromChange,
  onToChange,
  onPageChange,
}: {
  schedules: ReleaseScheduleRecord[];
  page: number;
  limit: number;
  total: number;
  search: string;
  status: HistoryStatus;
  from: string;
  to: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: HistoryStatus) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPageChange: (page: number) => void;
}) {
  const toolbar = (
    <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px_220px]">
      <label className="relative self-end">
        <span className="sr-only">Tìm trong lịch sử phát hành</span>
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" size={16} />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm trong lịch sử phát hành" className="h-10 border-mod-border bg-mod-canvas pl-9" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
        Kết quả
        <Select value={status || "all"} onValueChange={(value) => onStatusChange(value === "all" ? "" : value as HistoryStatus)}>
          <SelectTrigger aria-label="Kết quả phát hành" className="border-mod-border bg-mod-canvas"><SelectValue placeholder="Tất cả kết quả" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kết quả</SelectItem>
            <SelectItem value="RELEASED">Đã phát hành</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
        Từ ngày
        <DatePicker value={from} onChange={onFromChange} ariaLabel="Lịch sử từ ngày" placeholder="Chọn từ ngày" clearable />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
        Đến ngày
        <DatePicker value={to} onChange={onToChange} ariaLabel="Lịch sử đến ngày" placeholder="Chọn đến ngày" clearable />
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="VẬN HÀNH NỘI DUNG" title="Lịch sử phát hành" description="Tra cứu các lịch đã phát hành hoặc đã hủy, cùng nhân sự phụ trách và thời điểm kết thúc." />
      <DashboardTableCard
        title="Lịch đã kết thúc"
        description="Các lịch đã phát hành thành công hoặc đã hủy."
        summary={`${total} lịch`}
        toolbar={toolbar}
        footer={<DashboardPagination page={page} limit={limit} total={total} itemLabel="lịch" onPageChange={onPageChange} />}
      >
        <DashboardDataTable embedded caption="Lịch sử phát hành" columns={["Podcast", "Người phụ trách", "Thời gian dự kiến", "Thời điểm kết thúc", "Kết quả"]} columnWidths={["30%", "22%", "18%", "18%", "12%"]} minWidth={980}>
          {schedules.length ? schedules.map((item) => (
            <TableRow key={item.id} className="border-mod-border">
              <TableCell className={cn(dashboardTableCell, "font-semibold")}>{item.title}</TableCell>
              <TableCell className={dashboardTableCell}>
                <div className="flex flex-wrap gap-1.5">
                  {item.assignments.length ? item.assignments.map((entry) => <CardBadge key={entry.moderatorId} type="name">{entry.moderator.name}</CardBadge>) : <CardBadge type="name">Chưa phân công</CardBadge>}
                </div>
              </TableCell>
              <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>{dateTime.format(item.scheduledAt)}</TableCell>
              <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>{dateTime.format(item.publishedAt ?? item.cancelledAt ?? item.updatedAt)}</TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="status" tone={cardBadgeToneForStatus(item.status)}>{item.status === "RELEASED" ? "Đã phát hành" : "Đã hủy"}</CardBadge></TableCell>
            </TableRow>
          )) : <DashboardEmptyTableRow columns={5}>Chưa có lịch sử phát hành phù hợp.</DashboardEmptyTableRow>}
        </DashboardDataTable>
      </DashboardTableCard>
    </div>
  );
}

export function AdminReleaseHistory() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<HistoryStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const query = useAdminReleaseSchedules({
    scope: "HISTORY",
    q: deferredSearch.trim() || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit,
  });
  const changeFilter = <Value,>(setter: (value: Value) => void) => (value: Value) => {
    setter(value);
    setPage(1);
  };

  if (query.isPending) return <div className="ui-skeleton min-h-[420px] rounded-2xl" aria-label="Đang tải lịch sử phát hành" />;
  if (query.isError) return <p role="alert" className="rounded-2xl border border-vermilion/25 bg-mod-surface p-6 text-sm text-vermilion">Không tải được lịch sử phát hành.</p>;
  return <ReleaseHistory schedules={query.data.items} page={query.data.page} limit={query.data.limit} total={query.data.total} search={search} status={status} from={from} to={to} onSearchChange={changeFilter(setSearch)} onStatusChange={changeFilter(setStatus)} onFromChange={changeFilter(setFrom)} onToChange={changeFilter(setTo)} onPageChange={setPage} />;
}
