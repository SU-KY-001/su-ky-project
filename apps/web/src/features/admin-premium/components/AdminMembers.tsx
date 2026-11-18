import { DatePicker } from "@/shared/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useDeferredValue, useState } from "react";
import { AdminMemberQuerySchema, type AdminMember, type AdminMemberQuery } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { DashboardFilterToolbar, DashboardSearchInput } from "@/shared/components/dashboard/DashboardFilterToolbar";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { useAdminMembers } from "../hooks/useAdminMembers";
import { MemberEditor } from "./MemberEditor";

const columns = ["Tài khoản", "Trạng thái", "Gói và nguồn cấp", "Ngày bắt đầu", "Ngày hết hạn", "Thao tác"];
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const statuses = { all: "Tất cả", active: "Premium còn hiệu lực", free: "Free", expired: "Đã hết hạn", revoked: "Đã thu hồi" };

export function AdminMembers() {
  const [filter, setFilter] = useState<AdminMemberQuery>({ status: "all", page: 1, limit: 10 });
  const [editor, setEditor] = useState<AdminMember | null>(null);
  const term = useDeferredValue(filter.q);
  const validFilter = AdminMemberQuerySchema.safeParse({ ...filter, q: term });
  const members = useAdminMembers(validFilter.success ? validFilter.data : filter, validFilter.success);
  const updateFilter = (patch: Partial<AdminMemberQuery>) => setFilter((previous) => ({ ...previous, ...patch, page: 1 }));
  const dateFilterError = "Ngày kết thúc phải từ ngày bắt đầu trở đi.";
  const toolbar = (
    <DashboardFilterToolbar>
      <DashboardSearchInput label="Tìm tài khoản" value={filter.q ?? ""} maxLength={255} placeholder="Tên hoặc email" onChange={({ target }) => updateFilter({ q: target.value })} />
      <label className="grid gap-1 text-sm font-medium">
        Trạng thái
        <Select value={filter.status} onValueChange={(status) => {
          const result = AdminMemberQuerySchema.safeParse({ page: 1, limit: filter.limit, status });
          if (result.success) updateFilter({ status: result.data.status });
        }}>
          <SelectTrigger aria-label="Trạng thái thành viên"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Hết hạn từ
        <DatePicker value={filter.expiresFrom ?? ""} onChange={(value) => updateFilter({ expiresFrom: value || undefined })} ariaLabel="Hết hạn từ ngày" clearable />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Hết hạn đến
        <DatePicker value={filter.expiresTo ?? ""} onChange={(value) => updateFilter({ expiresTo: value || undefined })} ariaLabel="Hết hạn đến ngày" clearable />
      </label>
    </DashboardFilterToolbar>
  );
  const page = members.data;

  return (
    <DashboardTableCard
      title="Danh sách thành viên"
      description="Xem trạng thái, thời hạn và nguồn cấp của tài khoản Free và Premium."
      toolbar={toolbar}
      summary={page ? `${page.total} tài khoản` : undefined}
      footer={page && <DashboardPagination
        page={page.page}
        limit={page.limit}
        total={page.total}
        itemLabel="tài khoản"
        onPageChange={(next) => setFilter((previous) => ({ ...previous, page: next }))}
      />}
    >
      {members.isError && page ? <Button variant="outline" onClick={() => void members.refetch()}>Tải lại danh sách</Button> : null}
      <DashboardDataTable embedded caption="Danh sách thành viên" columns={columns} minWidth={940}>
        {!validFilter.success ? (
          <DashboardEmptyTableRow columns={columns.length}>{dateFilterError}</DashboardEmptyTableRow>
        ) : members.isPending ? (
          <DashboardEmptyTableRow columns={columns.length}>Đang tải tài khoản…</DashboardEmptyTableRow>
        ) : !page ? (
          <DashboardEmptyTableRow columns={columns.length}>
            <p>Không tải được danh sách thành viên.</p>
            <Button variant="outline" onClick={() => void members.refetch()}>Thử lại</Button>
          </DashboardEmptyTableRow>
        ) : !page.items.length ? (
          <DashboardEmptyTableRow columns={columns.length}>Không có tài khoản phù hợp.</DashboardEmptyTableRow>
        ) : page.items.map((member) => (
          <TableRow key={member.userId}>
            <TableCell className={dashboardTableCell}><div className="font-semibold">{member.name}</div></TableCell>
            <TableCell className={dashboardTableCell}>
              <CardBadge type="status" tone={member.status === "active" ? "success" : "neutral"}>
                {member.status === "active" ? "Premium" : "Free"}
              </CardBadge>
              {member.status === "expired" || member.status === "revoked" ? (
                <div className="mt-1 max-w-44 whitespace-normal wrap-anywhere text-xs text-mod-text-secondary">
                  {statuses[member.status]}{member.revokeReason ? ` · ${member.revokeReason}` : ""}
                </div>
              ) : null}
            </TableCell>
            <TableCell className={dashboardTableCell}>
              {member.planName ?? "—"}
              {member.source ? <div className="text-xs text-mod-text-secondary">{member.source === "admin" ? "Admin cấp" : "Thanh toán"}</div> : null}
            </TableCell>
            <TableCell className={dashboardTableCell}>{member.startsAt ? dateTime.format(member.startsAt) : "—"}</TableCell>
            <TableCell className={dashboardTableCell}>{member.expiresAt ? dateTime.format(member.expiresAt) : "—"}</TableCell>
            <TableCell className={dashboardTableCell}>
              <DashboardRowActions label={member.name} actions={[
                { id: "detail", label: "Xem chi tiết", onSelect: () => setEditor(member) },
              ]} />
            </TableCell>
          </TableRow>
        ))}
      </DashboardDataTable>
      {editor ? <MemberEditor member={editor} onClose={() => setEditor(null)} /> : null}
    </DashboardTableCard>
  );
}
