import { useState } from "react";
import {
  CalendarBlank,
  ChartBar,
  CheckSquareOffset,
  ClockCounterClockwise,
  Gear,
  IdentificationBadge,
  ListChecks,
  Users,
} from "@phosphor-icons/react";
import { AccountProfile } from "@/features/auth";
import { WorkspaceShell, type WorkspaceNavItem } from "@/shared/components/dashboard/WorkspaceShell";
import { DashboardHeader, DashboardPanel } from "@/shared/components/dashboard/DashboardOverview";
import { AdminReleaseDashboard } from "@/features/admin-release/components/AdminReleaseDashboard";
import { ReleaseWorkspace } from "@/features/admin-release/components/ReleaseWorkspace";
import { ReleaseHistory } from "@/features/admin-release/components/ReleaseHistory";
import { useAdminReleaseSchedules } from "@/features/admin-release/hooks/useAdminReleases";

type AdminSection =
  | "overview"
  | "schedules"
  | "coordination"
  | "reviews"
  | "users"
  | "roles"
  | "settings"
  | "history";

function adminNavigation(active: AdminSection, select: (section: AdminSection) => void): WorkspaceNavItem[] {
  const item = (id: AdminSection, label: string, icon: WorkspaceNavItem["icon"]): WorkspaceNavItem => ({
    id: `admin-${id}`,
    label,
    icon,
    active: active === id,
    onSelect: () => select(id),
  });
  return [
    item("overview", "Tổng quan", ChartBar),
    { id: "release-heading", label: "PHÁT HÀNH PODCAST", active: false, groupStart: true },
    item("schedules", "Lịch phát hành", CalendarBlank),
    item("coordination", "Điều phối sản xuất", ListChecks),
    item("reviews", "Hàng chờ kiểm duyệt", CheckSquareOffset),
    item("history", "Lịch sử phát hành", ClockCounterClockwise),
    { id: "system-heading", label: "QUẢN TRỊ HỆ THỐNG", active: false, groupStart: true },
    item("users", "Người dùng", Users),
    item("roles", "Vai trò và quyền", IdentificationBadge),
    item("settings", "Cấu hình hệ thống", Gear),
  ];
}

function ReleaseObservation({ mode }: { mode: "coordination" | "reviews" }) {
  const schedules = useAdminReleaseSchedules({ page: 1, limit: 50 });
  if (schedules.isPending) return <div className="ui-skeleton min-h-[360px] rounded-[16px]" />;
  if (schedules.isError) return <p role="alert" className="text-sm text-vermilion">Không tải được dữ liệu điều phối.</p>;
  if (mode === "reviews") {
    const queue = schedules.data.items.filter((schedule) => schedule.reviews[0]?.status === "IN_REVIEW");
    return (
      <div className="flex flex-col gap-6">
        <DashboardHeader eyebrow="KIỂM DUYỆT" title="Hàng chờ kiểm duyệt" description="Admin theo dõi tiến độ; Moderator độc lập thực hiện quyết định kiểm duyệt." />
        <DashboardPanel title="Đang chờ duyệt" description={`${queue.length} podcast đang chờ Moderator kiểm duyệt`}>
          {queue.length ? <div className="flex flex-col gap-2">{queue.map((schedule) => <article key={schedule.id} className="grid gap-2 rounded-[12px] bg-mod-canvas p-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div><h2 className="text-sm font-bold text-mod-text">{schedule.title}</h2><p className="mt-1 text-xs text-mod-text-secondary">Phiên bản {schedule.reviews[0]?.revision}</p></div><span className="text-xs font-semibold text-mod-primary">Chờ kiểm duyệt</span></article>)}</div> : <p className="py-10 text-center text-sm text-mod-text-secondary">Không có podcast đang chờ duyệt.</p>}
        </DashboardPanel>
      </div>
    );
  }
  const loads = new Map<string, { name: string; open: number; nearDeadline: number }>();
  const nextDay = Date.now() + 24 * 60 * 60 * 1000;
  for (const schedule of schedules.data.items.filter((item) => !["RELEASED", "CANCELLED"].includes(item.status))) {
    for (const assignment of schedule.assignments) {
      const current = loads.get(assignment.moderatorId) ?? { name: assignment.moderator.name, open: 0, nearDeadline: 0 };
      current.open += 1;
      if (schedule.productionDeadline.getTime() <= nextDay) current.nearDeadline += 1;
      loads.set(assignment.moderatorId, current);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader eyebrow="PHÂN CÔNG" title="Điều phối sản xuất" description="Theo dõi tải công việc của Moderator theo toàn bộ podcast được giao." />
      <DashboardPanel title="Tải công việc Moderator" description="Nhiệm vụ đang mở và gần hạn trong 24 giờ">
        {loads.size ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[...loads.entries()].map(([id, load]) => <article key={id} className="rounded-[14px] border border-mod-border bg-mod-canvas p-4"><h2 className="text-sm font-bold text-mod-text">{load.name}</h2><dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs text-mod-text-secondary">Đang mở</dt><dd className="mt-1 text-2xl font-bold text-mod-text">{load.open}</dd></div><div><dt className="text-xs text-mod-text-secondary">Gần hạn</dt><dd className="mt-1 text-2xl font-bold text-vermilion">{load.nearDeadline}</dd></div></dl></article>)}</div> : <p className="py-10 text-center text-sm text-mod-text-secondary">Chưa có nhiệm vụ đang mở.</p>}
      </DashboardPanel>
    </div>
  );
}

function SystemPlaceholder({ section }: { section: Extract<AdminSection, "users" | "roles" | "settings"> }) {
  const content = {
    users: ["Quản lý người dùng", "Danh sách và trạng thái tài khoản sẽ dùng endpoint quản trị người dùng."],
    roles: ["Vai trò và quyền", "Cấu hình quyền truy cập chức năng theo từng vai trò."],
    settings: ["Cấu hình hệ thống", "Quản lý các thiết lập chung và chính sách vận hành."],
  }[section];
  return <div className="flex flex-col gap-6"><DashboardHeader eyebrow="QUẢN TRỊ HỆ THỐNG" title={content[0]} description={content[1]} /><DashboardPanel title="Phạm vi quản trị"><p className="py-10 text-center text-sm text-mod-text-secondary">Khu vực này đã được giữ vị trí trong kiến trúc Admin và sẽ kết nối API quản trị chuyên biệt.</p></DashboardPanel></div>;
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [createOnOpen, setCreateOnOpen] = useState(false);
  const schedules = useAdminReleaseSchedules({ page: 1, limit: 50 });
  let content: React.ReactNode;
  if (section === "overview") content = <AdminReleaseDashboard onCreateSchedule={() => { setCreateOnOpen(true); setSection("schedules"); }} />;
  else if (section === "schedules") content = <ReleaseWorkspace key={createOnOpen ? "create" : "browse"} initiallyCreating={createOnOpen} />;
  else if (section === "coordination" || section === "reviews") content = <ReleaseObservation mode={section} />;
  else if (section === "history") content = schedules.isPending ? <div className="ui-skeleton min-h-[360px] rounded-[16px]" /> : schedules.isError ? <p role="alert" className="text-sm text-vermilion">Không tải được lịch sử phát hành.</p> : <ReleaseHistory schedules={schedules.data.items} />;
  else content = <SystemPlaceholder section={section} />;
  return (
    <WorkspaceShell navigationLabel="Điều hướng admin" mobileNavigationTitle="Menu điều hướng admin" brandCaption="KHÔNG GIAN QUẢN TRỊ" nav={adminNavigation(section, (next) => { setCreateOnOpen(false); setSection(next); })} profile={<AccountProfile variant="admin" />} externalHomeLabel="Mở trang Sử Ký">
      <div key={section} className="mod-content-view">{content}</div>
    </WorkspaceShell>
  );
}
