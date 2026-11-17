import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow } from "@/shared/components/dashboard/DashboardDataTable";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { premiumDestinations } from "./PremiumOverview";
import type { PremiumSection } from "../types";
import "../adminOverview.css";

const views: Record<PremiumSection, { title: string; description: string; columns: string[]; action: string; note: string }> = {
  "premium-plans": { title: "Gói thành viên", description: "Quản lý giá, thời hạn và khả năng mở bán của từng gói Premium.", columns: ["Tên gói", "Thời hạn", "Giá bán", "Trạng thái", "Thao tác"], action: "Cấu hình gói", note: "Thay đổi gói cần giữ nguyên thông tin của những đơn đã tạo trước đó." },
  "premium-orders": { title: "Danh sách và duyệt đơn", description: "Theo dõi đơn hàng, kiểm tra chứng từ và duyệt thanh toán.", columns: ["Mã đơn", "Người mua", "Gói thành viên", "Số tiền", "Trạng thái", "Thao tác"], action: "Duyệt đơn", note: "Chỉ đơn đã xác nhận thanh toán mới được tính vào doanh thu. Bước duyệt và cấp quyền chưa được kết nối." },
  "premium-transactions": { title: "Sổ giao dịch", description: "Đối chiếu giao dịch ngân hàng với đơn hàng Premium.", columns: ["Thời gian", "Mã giao dịch", "Nội dung", "Số tiền", "Đơn liên kết", "Thao tác"], action: "Đối soát giao dịch", note: "Gán giao dịch vào đúng đơn hoặc bỏ qua giao dịch không liên quan. Giao dịch chưa khớp không phải doanh thu." },
  "premium-members": { title: "Thành viên Premium", description: "Quản lý quyền truy cập và thời hạn thành viên.", columns: ["Thành viên", "Nguồn cấp quyền", "Bắt đầu", "Hết hạn", "Trạng thái", "Thao tác"], action: "Cấp quyền thành viên", note: "Cấp hoặc thu hồi quyền cần ghi nhận lý do và xác nhận tác động trước khi lưu." },
};

export function PremiumWorkspace({ section, onNavigate }: { section: PremiumSection; onNavigate: (section: PremiumSection) => void }): ReactNode {
  const view = views[section];
  return <div className="admin-overview grid gap-6" data-admin-premium={section}>
    <header className="admin-overview-header"><div><p className="admin-overview-eyebrow">Quản trị Premium</p><h1>{view.title}</h1><p>{view.description}</p></div><CardBadge type="status" tone="neutral">Chưa kết nối dữ liệu</CardBadge></header>
    <nav aria-label="Quản trị Premium" className="admin-overview-tabs">{premiumDestinations.map((item) => <button type="button" key={item.id} aria-current={item.id === section ? "page" : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}</nav>
    <DashboardTableCard title={view.title} description="Giao diện đang được chuẩn bị; dữ liệu và thao tác chờ hoàn thiện nghiệp vụ." className="admin-overview-table" toolbar={<div className="flex flex-wrap items-center justify-between gap-3"><label className="min-w-52 flex-1"><span className="sr-only">Tìm kiếm {view.title.toLowerCase()}</span><Input disabled placeholder="Tìm kiếm sẽ khả dụng sau khi kết nối" className="border-mod-border bg-mod-canvas-accent" /></label><Button disabled className="bg-mod-primary text-white">{view.action}</Button></div>}>
      <DashboardDataTable embedded caption={view.title} columns={view.columns} minWidth={800}>
        <DashboardEmptyTableRow columns={view.columns.length}><p className="font-semibold text-mod-text">Chưa kết nối dữ liệu Premium</p><p className="mx-auto mt-2 max-w-lg text-xs leading-5">Các thao tác đang tạm khóa trong lúc điều chỉnh nghiệp vụ. Không có thay đổi nào được gửi lên hệ thống.</p></DashboardEmptyTableRow>
      </DashboardDataTable>
    </DashboardTableCard>
    <p className="admin-overview-footnote">{view.note}</p>
  </div>;
}
