import { MagnifyingGlass, PencilSimple, Plus, Trash, Lock, LockOpen } from "@phosphor-icons/react";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import type { AdminUserRecord } from "../services/adminUserService";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/lib/utils";

const roleLabels: Record<AdminUserRecord["role"], string> = {
  user: "Người dùng",
  moderator: "Moderator",
  admin: "Admin",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export function AdminUsersView({
  users,
  page,
  limit,
  total,
  search,
  searchField,
  role,
  busy,
  onSearchChange,
  onSearchFieldChange,
  onRoleChange,
  onPageChange,
  onCreate,
  onEdit,
  onToggleBan,
  onDelete,
}: {
  users: AdminUserRecord[];
  page: number;
  limit: number;
  total: number;
  search: string;
  searchField: "name" | "email";
  role: "" | AdminUserRecord["role"];
  busy: boolean;
  onSearchChange: (value: string) => void;
  onSearchFieldChange: (value: "name" | "email") => void;
  onRoleChange: (value: "" | AdminUserRecord["role"]) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (user: AdminUserRecord) => void;
  onToggleBan: (user: AdminUserRecord) => void;
  onDelete: (user: AdminUserRecord) => void;
}) {
  const toolbar = (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_200px]">
      <label className="relative">
        <span className="sr-only">Tìm người dùng</span>
        <MagnifyingGlass size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" aria-hidden="true" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tìm người dùng" className="h-10 border-mod-border bg-mod-canvas pl-9" />
      </label>
      <Select value={searchField} onValueChange={(value) => onSearchFieldChange(value as "name" | "email")}>
        <SelectTrigger aria-label="Tìm theo" className="h-10 border-mod-border bg-mod-canvas"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="name">Tìm theo tên</SelectItem><SelectItem value="email">Tìm theo email</SelectItem></SelectContent>
      </Select>
      <Select value={role || "all"} onValueChange={(value) => onRoleChange(value === "all" ? "" : value as AdminUserRecord["role"])}>
        <SelectTrigger aria-label="Lọc theo vai trò" className="h-10 border-mod-border bg-mod-canvas"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tất cả vai trò</SelectItem><SelectItem value="user">Người dùng</SelectItem><SelectItem value="moderator">Moderator</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Quản lý người dùng"
        description="Quản lý tài khoản, vai trò và trạng thái truy cập hệ thống."
        actions={<Button type="button" onClick={onCreate} disabled={busy} className="bg-mod-primary text-white hover:bg-mod-primary/90"><Plus size={17} />Tạo người dùng</Button>}
      />
      <DashboardTableCard title="Danh sách người dùng" description="Dữ liệu tài khoản được đồng bộ trực tiếp từ hệ thống xác thực." summary={`${total} người dùng`} toolbar={toolbar} footer={<DashboardPagination page={page} limit={limit} total={total} itemLabel="người dùng" onPageChange={onPageChange} />}>
        <DashboardDataTable embedded caption="Danh sách người dùng" columns={["Người dùng", "Vai trò", "Trạng thái", "Xác minh email", "Ngày tạo", "Thao tác"]} columnWidths={["31%", "13%", "15%", "15%", "13%", "13%"]} minWidth={960}>
          {users.length ? users.map((user) => (
            <TableRow key={user.id} className="border-mod-border hover:bg-mod-canvas-accent/45">
              <TableCell className={cn(dashboardTableCell, "min-w-0")}><p className="truncate font-semibold">{user.name}</p><p className="mt-1 truncate text-xs text-mod-text-secondary">{user.email}</p></TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="name">{roleLabels[user.role]}</CardBadge></TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="status" tone={user.banned ? "danger" : "success"}>{user.banned ? "Đã khóa" : "Đang hoạt động"}</CardBadge></TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="status" tone={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</CardBadge></TableCell>
              <TableCell className={cn(dashboardTableCell, "whitespace-nowrap tabular-nums text-mod-text-secondary")}>{formatDate(user.createdAt)}</TableCell>
              <TableCell className={dashboardTableCell}>
                <DashboardRowActions label={user.name} disabled={busy} actions={[
                  { id: "edit", label: "Chỉnh sửa", icon: PencilSimple, onSelect: () => onEdit(user) },
                  { id: "ban", label: user.banned ? "Mở khóa" : "Khóa tài khoản", icon: user.banned ? LockOpen : Lock, onSelect: () => onToggleBan(user) },
                  { id: "delete", label: "Xóa tài khoản", icon: Trash, destructive: true, onSelect: () => onDelete(user) },
                ]} />
              </TableCell>
            </TableRow>
          )) : <DashboardEmptyTableRow columns={6}>Không tìm thấy người dùng phù hợp.</DashboardEmptyTableRow>}
        </DashboardDataTable>
      </DashboardTableCard>
    </div>
  );
}
