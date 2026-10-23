import { useDeferredValue, useEffect, useState } from "react";
import {
  CalendarBlank,
  Bell,
  ChartBar,
  CheckSquareOffset,
  ClockCounterClockwise,
  Gear,
  IdentificationBadge,
  Users,
  MagnifyingGlass,
  Eye,
} from "@phosphor-icons/react";
import { AccountProfile } from "@/features/auth";
import { WorkspaceShell, type WorkspaceNavItem } from "@/shared/components/dashboard/WorkspaceShell";
import { DashboardHeader, DashboardPanel } from "@/shared/components/dashboard/DashboardOverview";
import { AdminReleaseDashboard } from "@/features/admin-release/components/AdminReleaseDashboard";
import { ReleaseWorkspace } from "@/features/admin-release/components/ReleaseWorkspace";
import { AdminReleaseHistory } from "@/features/admin-release/components/ReleaseHistory";
import { useAdminReleaseSchedules, useReleaseModerators } from "@/features/admin-release/hooks/useAdminReleases";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
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
import { AdminUsers } from "@/features/admin-users/components/AdminUsers";
import { AdminNotifications } from "@/features/admin-notifications/components/AdminNotifications";
import { Button } from "@/shared/components/ui/button";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { ReleaseReviewDialog } from "@/features/admin-release/components/ReleaseReviewDialog";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";

export type AdminSection =
  | "overview"
  | "notifications"
  | "schedules"
  | "reviews"
  | "users"
  | "roles"
  | "settings"
  | "history";

export function adminNavigation(active: AdminSection, select: (section: AdminSection) => void): WorkspaceNavItem[] {
  const item = (id: AdminSection, label: string, icon: WorkspaceNavItem["icon"]): WorkspaceNavItem => ({
    id: `admin-${id}`,
    label,
    icon,
    active: active === id,
    onSelect: () => select(id),
  });
  return [
    { id: "operations-heading", label: "TRUNG TÂM ĐIỀU HÀNH", active: false, groupStart: true },
    item("overview", "Tổng quan", ChartBar),
    item("notifications", "Thông báo", Bell),
    { id: "release-heading", label: "PHÁT HÀNH PODCAST", active: false, groupStart: true },
    item("schedules", "Lịch phát hành", CalendarBlank),
    item("reviews", "Hàng chờ kiểm duyệt", CheckSquareOffset),
    item("history", "Lịch sử phát hành", ClockCounterClockwise),
    { id: "system-heading", label: "QUẢN TRỊ HỆ THỐNG", active: false, groupStart: true },
    item("users", "Người dùng", Users),
    item("roles", "Vai trò và quyền", IdentificationBadge),
    item("settings", "Cấu hình hệ thống", Gear),
  ];
}

function ReleaseObservation() {
  const [selected, setSelected] = useState<ReleaseScheduleRecord | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [moderatorId, setModeratorId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const query = useAdminReleaseSchedules({
    scope: "REVIEW_QUEUE",
    q: deferredSearch.trim() || undefined,
    moderatorId: moderatorId || undefined,
    page,
    limit,
  });
  const moderators = useReleaseModerators();
  useEffect(() => {
    if (query.error || moderators.error) notify.error({ title: "Không tải được hàng chờ kiểm duyệt", description: errorMessage(query.error ?? moderators.error) }, "admin-review-queue-load");
  }, [query.error, moderators.error]);
  if (query.isPending || moderators.isPending) return <div className="ui-skeleton min-h-[420px] rounded-[16px]" aria-label="Đang tải hàng chờ kiểm duyệt" />;
  return <><ReleaseObservationView schedules={query.data?.items ?? []} page={query.data?.page ?? page} limit={query.data?.limit ?? limit} total={query.data?.total ?? 0} search={search} moderatorId={moderatorId} moderators={moderators.data?.items ?? []} onSearchChange={(value) => { setSearch(value); setPage(1); }} onModeratorChange={(value) => { setModeratorId(value); setPage(1); }} onPageChange={setPage} onView={setSelected} loadFailed={query.isError} onRetry={() => { void query.refetch(); void moderators.refetch(); }} />
    {selected ? <ReleaseReviewDialog key={selected.id} schedule={selected} onClose={() => setSelected(null)} /> : null}</>;
}

export function ReleaseObservationView({
  schedules,
  page,
  limit,
  total,
  search,
  moderatorId,
  moderators,
  onSearchChange,
  onModeratorChange,
  onPageChange,
  onView,
  loadFailed = false,
  onRetry,
}: {
  schedules: ReleaseScheduleRecord[];
  page: number;
  limit: number;
  total: number;
  search: string;
  moderatorId: string;
  moderators: Array<{ id: string; name: string; email: string }>;
  onSearchChange: (value: string) => void;
  onModeratorChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onView: (schedule: ReleaseScheduleRecord) => void;
  loadFailed?: boolean;
  onRetry?: () => void;
}) {
  const formatDateTime = (value?: Date | null) => value ? new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value) : "Chưa ghi nhận";
  const toolbar = (
    <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_280px]">
      <label className="relative self-end">
        <span className="sr-only">Tìm podcast chờ duyệt</span>
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" size={16} />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm podcast chờ duyệt" className="h-10 border-mod-border bg-mod-canvas pl-9" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-mod-text-secondary">
        Người sản xuất
        <Select value={moderatorId || "all"} onValueChange={(value) => onModeratorChange(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="Người sản xuất" className="border-mod-border bg-mod-canvas"><SelectValue placeholder="Tất cả Moderator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Moderator</SelectItem>
            {moderators.map((moderator) => <SelectItem key={moderator.id} value={moderator.id}>{moderator.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="KIỂM DUYỆT" title="Hàng chờ kiểm duyệt" description="Xem nội dung podcast, nghe bản thu và phê duyệt phiên bản được gửi." />
      <DashboardTableCard title="Podcast đang chờ duyệt" description="Mở chi tiết để kiểm tra kịch bản, bản thu và gửi quyết định kiểm duyệt." summary={`${total} podcast`} toolbar={toolbar} footer={<DashboardPagination page={page} limit={limit} total={total} itemLabel="podcast" onPageChange={onPageChange} />}>
        <DashboardDataTable embedded caption="Hàng chờ kiểm duyệt" columns={["Podcast", "Phiên bản", "Người sản xuất", "Ngày gửi duyệt", "Thời gian phát hành", "Trạng thái", "Thao tác"]} columnWidths={["23%", "7%", "14%", "14%", "14%", "14%", "14%"]} minWidth={1120}>
          {loadFailed ? <DashboardEmptyTableRow columns={7}><Button variant="outline" onClick={onRetry}>Tải lại hàng chờ</Button></DashboardEmptyTableRow> : schedules.length ? schedules.map((schedule) => {
            const review = schedule.reviews.find(({ status }) => status === "IN_REVIEW") ?? schedule.reviews[0];
            return (
              <TableRow key={schedule.id} className="border-mod-border">
                <TableCell className={cn(dashboardTableCell, "font-semibold")}><div>{schedule.title}</div>{schedule.episode ? <div className="mt-1 text-xs font-normal text-mod-text-secondary">{schedule.episode.title}</div> : null}</TableCell>
                <TableCell className={cn(dashboardTableCell, "tabular-nums")}>{review ? `v${review.revision}` : "—"}</TableCell>
                <TableCell className={dashboardTableCell}><div className="flex flex-wrap gap-1.5">{schedule.assignments.length ? schedule.assignments.map(({ moderatorId: id, moderator }) => <CardBadge key={id} type="name">{moderator.name}</CardBadge>) : <CardBadge type="name">Chưa phân công</CardBadge>}</div></TableCell>
                <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>{formatDateTime(review?.submittedAt)}</TableCell>
                <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>{formatDateTime(schedule.scheduledAt)}</TableCell>
                <TableCell className={dashboardTableCell}><CardBadge type="status" tone="info">Chờ kiểm duyệt</CardBadge></TableCell>
                <TableCell className={dashboardTableCell}><DashboardRowActions label={schedule.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => onView(schedule) }]} /></TableCell>
              </TableRow>
            );
          }) : <DashboardEmptyTableRow columns={7}>Không có podcast đang chờ duyệt.</DashboardEmptyTableRow>}
        </DashboardDataTable>
      </DashboardTableCard>
    </div>
  );
}

function SystemPlaceholder({ section }: { section: Extract<AdminSection, "roles" | "settings"> }) {
  const content = {
    roles: ["Vai trò và quyền", "Cấu hình quyền truy cập chức năng theo từng vai trò."],
    settings: ["Cấu hình hệ thống", "Quản lý các thiết lập chung và chính sách vận hành."],
  }[section];
  return <div className="flex flex-col gap-6"><DashboardHeader eyebrow="QUẢN TRỊ HỆ THỐNG" title={content[0]} description={content[1]} /><DashboardPanel title="Phạm vi quản trị"><p className="py-10 text-center text-sm text-mod-text-secondary">Khu vực này đã được giữ vị trí trong kiến trúc Admin và sẽ kết nối API quản trị chuyên biệt.</p></DashboardPanel></div>;
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [createOnOpen, setCreateOnOpen] = useState(false);
  let content: React.ReactNode;
  if (section === "overview") content = <AdminReleaseDashboard onCreateSchedule={() => { setCreateOnOpen(true); setSection("schedules"); }} />;
  else if (section === "notifications") content = <AdminNotifications />;
  else if (section === "schedules") content = <ReleaseWorkspace key={createOnOpen ? "create" : "browse"} initiallyCreating={createOnOpen} />;
  else if (section === "reviews") content = <ReleaseObservation />;
  else if (section === "history") content = <AdminReleaseHistory />;
  else if (section === "users") content = <AdminUsers />;
  else content = <SystemPlaceholder section={section} />;
  return (
    <WorkspaceShell navigationLabel="Điều hướng admin" mobileNavigationTitle="Menu điều hướng admin" brandCaption="KHÔNG GIAN QUẢN TRỊ" nav={adminNavigation(section, (next) => { setCreateOnOpen(false); setSection(next); })} profile={<AccountProfile variant="admin" />} externalHomeLabel="Mở trang Sử Ký">
      <div key={section} className="mod-content-view">{content}</div>
    </WorkspaceShell>
  );
}
