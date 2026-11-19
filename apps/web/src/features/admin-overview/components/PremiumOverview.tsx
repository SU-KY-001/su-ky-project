import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import { DashboardMetricStrip } from "@/shared/components/dashboard/DashboardOverview";
import type { PremiumSection } from "../types";
import { useAdminMembershipReport } from "@/features/admin-premium/hooks/useAdminReport";
import type { MembershipReport } from "@/features/admin-premium/services/adminReportService";
import { calendarReportPeriod } from "./ReportPeriodPicker";
import { RevenueByPlanChart, type PlanRevenue } from "./RevenueByPlanChart";

export const premiumDestinations: Array<{ id: PremiumSection; label: string; description: string }> = [
  { id: "premium-plans", label: "Gói thành viên", description: "Cấu hình giá, thời hạn và trạng thái gói." },
  { id: "premium-orders", label: "Đơn hàng", description: "Kiểm tra đơn thanh toán và bằng chứng chuyển khoản." },
  { id: "premium-transactions", label: "Sổ giao dịch", description: "Đối soát, gán giao dịch vào đơn hoặc bỏ qua." },
  { id: "premium-members", label: "Thành viên Premium", description: "Theo dõi thời hạn, cấp hoặc thu hồi quyền." },
  { id: "premium-policies", label: "Quyền truy cập", description: "Chọn tính năng mở cho Free, giới hạn lượt mỗi ngày hoặc chỉ dành cho Premium." },
  { id: "premium-audit", label: "Nhật ký Premium", description: "Tra cứu hoạt động quản trị và đối soát." },
];

export function PremiumQuickLinks({ onNavigate }: { onNavigate: (section: PremiumSection) => void }): ReactNode {
  return <section className="admin-overview-panel p-5">
    <div className="admin-overview-panel-heading"><h2>Quản trị Premium</h2></div>
    <div className="grid gap-1">{premiumDestinations.map((item) => <button type="button" key={item.id} className="admin-premium-link" onClick={() => onNavigate(item.id)}><span>{item.label}</span><ArrowRight size={14} aria-hidden="true" /></button>)}</div>
  </section>;
}

const planLabels: Record<string, string> = { monthly: "Gói tháng", yearly: "Gói năm" };

export function planRevenue(report: MembershipReport): PlanRevenue[] {
  const totals = new Map<string, number>();
  for (const bucket of report.series)
    for (const row of bucket.byPlan) totals.set(row.planCode, (totals.get(row.planCode) ?? 0) + row.revenueVnd);
  return [...totals].filter(([, value]) => value > 0).map(([planCode, value]) => ({ label: planLabels[planCode] ?? planCode, value }));
}

export function PremiumOverview({ onNavigate }: { onNavigate: (section: PremiumSection) => void }): ReactNode {
  const period = calendarReportPeriod("month");
  const report = useAdminMembershipReport({ from: period.from, to: period.to, groupBy: "month" });
  return <PremiumOverviewView report={report.data} failed={report.isError} onNavigate={onNavigate} />;
}

export function PremiumOverviewView({ report, failed = false, onNavigate }: { report?: MembershipReport; failed?: boolean; onNavigate: (section: PremiumSection) => void }): ReactNode {
  const summary = report?.summary;
  return <div className="grid gap-5">
    {failed ? <p role="alert" className="text-xs font-medium text-mod-danger">Không tải được số liệu báo cáo Premium. Thử tải lại trang.</p> : null}
    <DashboardMetricStrip metrics={[
      { id: "revenue", label: "Doanh thu đã thanh toán", value: summary ? `${summary.revenueVnd.toLocaleString("vi-VN")} ₫` : "—", detail: "Chỉ ghi nhận từ đơn đã thanh toán" },
      { id: "orders", label: "Đơn đã thanh toán", value: summary ? summary.paidOrders.toLocaleString("vi-VN") : "—", detail: "Theo khoảng thời gian báo cáo" },
      { id: "members", label: "Thành viên Premium", value: summary ? summary.activeMembers.toLocaleString("vi-VN") : "—", detail: "Quyền thành viên còn hiệu lực hiện tại" },
      { id: "review", label: "Cần duyệt / đối soát", value: summary ? (summary.needsReviewOrders + summary.unmatchedTransactions).toLocaleString("vi-VN") : "—", detail: "Đơn cần xử lý và giao dịch chưa khớp" },
    ]} />
    <div className="admin-overview-columns">
      <section className="admin-overview-panel p-5"><div className="admin-overview-panel-heading"><div><h2>Doanh thu theo gói</h2><p>Doanh thu từ đơn đã thanh toán, phân tách theo gói thành viên.</p></div></div>
        <RevenueByPlanChart plans={report ? planRevenue(report) : undefined} />
      </section>
      <PremiumQuickLinks onNavigate={onNavigate} />
    </div>
  </div>;
}
