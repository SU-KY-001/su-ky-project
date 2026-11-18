import { DatePicker } from "@/shared/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useDeferredValue, useState } from "react";
import { PremiumAuditQuerySchema, type PremiumAuditEntry, type PremiumAuditQuery } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { DashboardFilterToolbar, DashboardSearchInput } from "@/shared/components/dashboard/DashboardFilterToolbar";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { usePremiumAudit } from "../hooks/useAdminPolicies";
import { paymentDate } from "./paymentPresentation";

const actions: Record<string, string> = {
  "membership.plan.create": "Tạo gói", "membership.plan.update": "Cập nhật gói",
  "membership.grant": "Cấp Premium", "membership.revoke": "Thu hồi Premium",
  "membership.order.paid": "Xác nhận thanh toán", "membership.order.review": "Đưa đơn vào đối soát",
  "membership.order.create": "Tạo đơn hàng", "membership.transaction.receive": "Ghi nhận giao dịch",
  "membership.order.reject": "Từ chối đơn", "membership.order.verify": "Xử lý đơn",
  "membership.activated": "Kích hoạt thành viên", "membership.policy.update": "Cập nhật chính sách",
  "membership.transaction.status": "Cập nhật trạng thái giao dịch", "membership.transaction.resolve": "Đối soát giao dịch",
};
const resourceNames: Record<string, string> = {
  membership_plan: "Gói thành viên", membership: "Thành viên", membership_order: "Đơn hàng",
  payment_transaction: "Giao dịch", experience_feature: "Chính sách tính năng",
};
const columns = ["Thời gian", "Hành động", "Người thực hiện", "Đối tượng", "Thao tác"];

export function AdminPremiumAudit() {
  const [filter, setFilter] = useState<PremiumAuditQuery>({ page: 1, limit: 10 });
  const [selected, setSelected] = useState<PremiumAuditEntry | null>(null);
  const term = useDeferredValue(filter.q);
  const parsed = PremiumAuditQuerySchema.safeParse({ ...filter, q: term });
  const query = usePremiumAudit(parsed.success ? parsed.data : filter, parsed.success);
  const page = query.data;
  const update = (patch: Partial<PremiumAuditQuery>) => setFilter((previous) => ({ ...previous, ...patch, page: 1 }));

  return (
    <DashboardTableCard
      title="Lịch sử thay đổi"
      description="Xem ai thực hiện, thời điểm và dữ liệu trước, sau mỗi thay đổi."
      summary={page ? `${page.total} sự kiện` : undefined}
      toolbar={<DashboardFilterToolbar>
        <DashboardSearchInput label="Tìm sự kiện" maxLength={255} value={filter.q ?? ""} placeholder="Người thực hiện hoặc mã đối tượng" onChange={({ target }) => update({ q: target.value })} />
        <label className="grid gap-1 text-sm font-medium">Đối tượng
          <Select value={filter.resourceType ?? "all"} onValueChange={(value) => update({ resourceType: value === "all" ? undefined : value })}>
            <SelectTrigger aria-label="Đối tượng nhật ký"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(resourceNames).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Từ ngày
          <DatePicker value={filter.from ?? ""} onChange={(value) => update({ from: value || undefined })} ariaLabel="Nhật ký từ ngày" clearable />
        </label>
        <label className="grid gap-1 text-sm font-medium">Đến ngày
          <DatePicker value={filter.to ?? ""} onChange={(value) => update({ to: value || undefined })} ariaLabel="Nhật ký đến ngày" clearable />
        </label>
      </DashboardFilterToolbar>}
      footer={page && <DashboardPagination page={page.page} limit={page.limit} total={page.total} itemLabel="sự kiện" onPageChange={(next) => setFilter((previous) => ({ ...previous, page: next }))} />}
    >
      <DashboardDataTable embedded caption="Nhật ký hoạt động Premium" columns={columns} minWidth={870}>
        {!parsed.success ? <DashboardEmptyTableRow columns={columns.length}>Ngày kết thúc phải từ ngày bắt đầu trở đi.</DashboardEmptyTableRow>
          : query.isPending ? <DashboardEmptyTableRow columns={columns.length}>Đang tải nhật ký…</DashboardEmptyTableRow>
          : !page ? <DashboardEmptyTableRow columns={columns.length}><p>Không tải được nhật ký.</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></DashboardEmptyTableRow>
          : page.items.length ? page.items.map((event) => (
            <TableRow key={event.id}>
              <TableCell className={dashboardTableCell}>{paymentDate.format(event.createdAt)}</TableCell>
              <TableCell className={dashboardTableCell}>{actions[event.action] ?? event.action}</TableCell>
              <TableCell className={dashboardTableCell}>{event.actor?.name ?? (event.actorType === "SYSTEM" ? "Hệ thống" : event.actorType)}</TableCell>
              <TableCell className={dashboardTableCell}>{resourceNames[event.resourceType] ?? event.resourceType}<div className="max-w-52 whitespace-normal wrap-anywhere text-xs text-mod-text-secondary">{event.resourceId}</div></TableCell>
              <TableCell className={dashboardTableCell}><DashboardRowActions label={event.resourceId} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setSelected(event) }]} /></TableCell>
            </TableRow>
          )) : <DashboardEmptyTableRow columns={columns.length}>Không có sự kiện phù hợp.</DashboardEmptyTableRow>}
      </DashboardDataTable>
      {selected ? <Dialog open onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent variant="dashboard" className="max-h-[90dvh] max-w-xl overflow-y-auto font-moderator">
          <DialogHeader>
            <DialogTitle>{actions[selected.action] ?? selected.action}</DialogTitle>
            <DialogDescription>{paymentDate.format(selected.createdAt)} · Sự kiện {selected.id}</DialogDescription>
          </DialogHeader>
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">Dữ liệu thay đổi</h3>
            <pre className="overflow-x-auto rounded-md bg-mod-canvas p-3 text-xs">{JSON.stringify(selected.changes, null, 2)}</pre>
          </section>
        </DialogContent>
      </Dialog> : null}
    </DashboardTableCard>
  );
}
