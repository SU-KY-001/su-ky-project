import { useState } from "react";
import type { AdminMembershipPlan } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { useAdminPlans } from "../hooks/useAdminPlans";
import { PlanEditor } from "./PlanEditor";

const columns = ["Gói thành viên", "Giá bán", "Thời hạn", "Trạng thái", "Thao tác"];
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function AdminPlans() {
  const plans = useAdminPlans();
  const [editor, setEditor] = useState<AdminMembershipPlan | null>(null);

  return (
    <DashboardTableCard
      title="Danh sách gói"
      description="Xem giá bán, thời hạn và trạng thái mở bán của gói tháng."
      summary={plans.isFetching && !plans.isPending ? "Đang làm mới" : undefined}
    >
      {plans.isError && plans.data ? (
        <Button variant="outline" onClick={() => void plans.refetch()}>Tải lại danh sách</Button>
      ) : null}
      <DashboardDataTable embedded caption="Danh sách gói thành viên" columns={columns} minWidth={860}>
        {plans.isPending ? (
          <DashboardEmptyTableRow columns={columns.length}>Đang tải danh sách gói…</DashboardEmptyTableRow>
        ) : !plans.data ? (
          <DashboardEmptyTableRow columns={columns.length}>
            <p>Không tải được danh sách gói.</p>
            <Button variant="outline" onClick={() => void plans.refetch()}>Thử lại</Button>
          </DashboardEmptyTableRow>
        ) : !plans.data.length ? (
          <DashboardEmptyTableRow columns={columns.length}>Chưa có gói thành viên.</DashboardEmptyTableRow>
        ) : plans.data.map((plan) => (
          <TableRow key={plan.code}>
            <TableCell className={dashboardTableCell}>
              <div className="font-semibold">{plan.name}</div>
              <div className="text-xs text-mod-text-secondary">{plan.code}</div>
            </TableCell>
            <TableCell className={dashboardTableCell}>{currency.format(plan.priceVnd)}</TableCell>
            <TableCell className={dashboardTableCell}>{plan.durationDays ? `${plan.durationDays} ngày` : "—"}</TableCell>
            <TableCell className={dashboardTableCell}>
              <CardBadge type="status" tone={plan.isActive && plan.isPurchasable ? "success" : "neutral"}>
                {plan.isActive && plan.isPurchasable ? "Đang mở bán" : "Ngừng bán"}
              </CardBadge>
            </TableCell>
            <TableCell className={dashboardTableCell}>
              <DashboardRowActions label={plan.name} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setEditor(plan) }]} />
            </TableCell>
          </TableRow>
        ))}
      </DashboardDataTable>
      {editor ? <PlanEditor plan={editor} onClose={() => setEditor(null)} /> : null}
    </DashboardTableCard>
  );
}
