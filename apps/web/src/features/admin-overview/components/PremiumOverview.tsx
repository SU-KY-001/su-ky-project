import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import { DashboardMetricStrip } from "@/shared/components/dashboard/DashboardOverview";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import type { PremiumSection } from "../types";
import { RevenueByPlanChart } from "./RevenueByPlanChart";

export const premiumDestinations: Array<{ id: PremiumSection; label: string; description: string }> = [
  { id: "premium-plans", label: "Gói thành viên", description: "Cấu hình giá, thời hạn và trạng thái gói." },
  { id: "premium-orders", label: "Danh sách và duyệt đơn", description: "Kiểm tra đơn thanh toán và bằng chứng chuyển khoản." },
  { id: "premium-transactions", label: "Sổ giao dịch", description: "Đối soát, gán giao dịch vào đơn hoặc bỏ qua." },
  { id: "premium-members", label: "Thành viên Premium", description: "Theo dõi thời hạn, cấp hoặc thu hồi quyền." },
];

export function PremiumQuickLinks({ onNavigate }: { onNavigate: (section: PremiumSection) => void }): ReactNode {
  return <section className="admin-overview-panel p-5">
    <div className="admin-overview-panel-heading"><div><h2>Premium & doanh thu</h2><p>Khu quản trị thanh toán và thành viên.</p></div><CardBadge type="status" tone="neutral">Chưa kết nối</CardBadge></div>
    <p className="mb-3 text-xs leading-5 text-mod-text-secondary">Số liệu Premium sẽ được bổ sung sau khi hoàn thiện quy trình đối soát.</p>
    <div className="grid gap-1">{premiumDestinations.map((item) => <button type="button" key={item.id} className="admin-premium-link" onClick={() => onNavigate(item.id)}><span>{item.label}</span><ArrowRight size={14} aria-hidden="true" /></button>)}</div>
  </section>;
}

export function PremiumOverview({ onNavigate }: { onNavigate: (section: PremiumSection) => void }): ReactNode {
  return <div className="grid gap-5">
    <DashboardMetricStrip metrics={[
      { id: "revenue", label: "Doanh thu đã thanh toán", value: "—", detail: "Chỉ ghi nhận từ đơn đã thanh toán" },
      { id: "orders", label: "Đơn đã thanh toán", value: "—", detail: "Theo khoảng thời gian báo cáo" },
      { id: "members", label: "Thành viên Premium", value: "—", detail: "Quyền thành viên còn hiệu lực hiện tại" },
      { id: "review", label: "Cần duyệt / đối soát", value: "—", detail: "Đơn cần xử lý và giao dịch chưa khớp" },
    ]} />
    <div className="admin-overview-columns">
      <section className="admin-overview-panel p-5"><div className="admin-overview-panel-heading"><div><h2>Doanh thu theo gói</h2><p>Doanh thu từ đơn đã thanh toán, phân tách theo gói thành viên.</p></div></div>
        <RevenueByPlanChart />
      </section>
      <PremiumQuickLinks onNavigate={onNavigate} />
    </div>
  </div>;
}
