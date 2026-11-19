import { useSearchParams, Link } from "react-router";
import { Check, Clock3, ReceiptText, ShieldCheck, X } from "lucide-react";
import { CardBadge, type CardBadgeTone } from "@/shared/components/dashboard/CardBadge";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { useMembershipOrders } from "../hooks/useMembership";
import type { MembershipOrder } from "../services/membershipService";

const statuses: Record<MembershipOrder["status"], { label: string; tone: CardBadgeTone }> = {
  pending: { label: "Chờ thanh toán", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  needs_review: { label: "Cần đối soát", tone: "info" },
  rejected: { label: "Bị từ chối", tone: "danger" },
};
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function TransactionTrack({ order }: { order: MembershipOrder }) {
  const paid = order.status === "paid";
  const rejected = order.status === "rejected";
  const review = order.status === "needs_review";
  const steps = [
    { label: "Đã tạo đơn", detail: date.format(new Date(order.createdAt)), icon: ReceiptText, complete: true, current: false, failed: false },
    { label: paid ? "Đã xác nhận thanh toán" : rejected ? "Thanh toán bị từ chối" : review ? "Đang đối soát" : "Chờ thanh toán", detail: paid ? order.paidAt ? date.format(new Date(order.paidAt)) : "Thanh toán đã được xác nhận" : review ? "Hệ thống đang kiểm tra giao dịch" : rejected ? "Xem lý do bên dưới" : "Chuyển khoản theo thông tin đơn", icon: rejected ? X : Clock3, complete: paid, current: !paid && !rejected, failed: rejected },
    { label: paid ? "Premium đã kích hoạt" : "Kích hoạt Premium", detail: paid ? "Quyền lợi đã được cập nhật" : rejected ? "Chưa được kích hoạt" : "Sau khi thanh toán được xác nhận", icon: ShieldCheck, complete: paid, current: false, failed: false },
  ];
  return <li className="rounded-3xl bg-paper-soft p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold">{order.planName}</h3><CardBadge type="status" tone={statuses[order.status].tone}>{statuses[order.status].label}</CardBadge></div><p className="mt-2 select-all break-all text-xs text-ink-soft">Mã giao dịch: {order.id}</p></div>
      <p className="text-xl font-semibold tabular-nums">{money.format(order.priceVnd)}</p>
    </div>
    <ol aria-label="Tiến trình giao dịch" className="my-7 grid gap-5 sm:grid-cols-3 sm:gap-0">{steps.map((step, index) => <li key={step.label} aria-current={step.current ? "step" : undefined} className="relative flex gap-3 sm:flex-col sm:gap-3 sm:pr-5">
      {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-4 top-8 h-[calc(100%+4px)] w-px sm:left-8 sm:top-4 sm:h-px sm:w-[calc(100%-2rem)] ${paid ? "bg-bronze/60" : "bg-line"}`} />}
      <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${step.failed ? "bg-vermilion/10 text-vermilion" : step.complete ? "bg-bronze-dark text-paper-soft" : step.current ? "bg-paper-deep text-bronze-dark ring-2 ring-bronze/30" : "bg-paper text-ink-soft"}`}>{step.complete ? <Check className="size-4" aria-hidden="true" /> : <step.icon className="size-4" aria-hidden="true" />}</span>
      <div><p className="text-sm font-medium">{step.label}</p><p className="mt-1 text-xs leading-6 text-ink-soft">{step.detail}</p></div>
    </li>)}</ol>
    {order.rejectionReason && <p className="mb-5 rounded-xl bg-vermilion/5 px-4 py-3 text-sm leading-6 text-vermilion">Lý do: {order.rejectionReason}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4"><p className="text-xs text-ink-soft">Nội dung chuyển khoản: <span className="select-all font-medium text-ink">{order.transferContent}</span></p><Button asChild variant="outline" size="sm"><Link data-transaction-link to={`${APP_PATHS.membership}/payment/${order.id}`}>{order.status === "pending" ? "Thanh toán" : "Chi tiết giao dịch"}</Link></Button></div>
  </li>;
}

export function MembershipTransactions() {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("transactionsPage") ?? 1);
  const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  const orders = useMembershipOrders(page);
  return <section id="giao-dich" aria-labelledby="transactions-title" className="min-w-0 scroll-mt-28">
    <h2 id="transactions-title" className="text-2xl font-semibold">Lịch sử giao dịch</h2>
    <p className="mt-3 text-sm leading-6 text-ink-soft">Từ lúc tạo đơn đến khi Premium được kích hoạt. Mọi giao dịch đều có dấu mốc rõ ràng.</p>
    {orders.isError && <div role="alert" className="mt-5 text-sm"><p>Chưa cập nhật được lịch sử giao dịch.</p><Button variant="link" onClick={() => void orders.refetch()}>Thử lại</Button></div>}
    {orders.isPending ? <p role="status" className="mt-6 rounded-3xl bg-paper-soft p-7 text-sm">Đang tải giao dịch…</p> : orders.data && !orders.data.items.length ? <div className="mt-6 rounded-3xl bg-paper-soft p-7"><ReceiptText className="mb-4 size-7 text-bronze-dark" aria-hidden="true" /><p className="font-medium">Bạn chưa có giao dịch nào.</p><p className="mt-2 text-sm text-ink-soft">Các đơn đăng ký Premium sẽ được theo dõi tại đây.</p>{page > 1 && <Button variant="link" onClick={() => setParams(previous => { const result = new URLSearchParams(previous); result.delete("transactionsPage"); return result; })}>Về trang đầu</Button>}</div> : <ul aria-label="Các giao dịch thành viên" className="mt-6 space-y-5">{orders.data?.items.map(order => <TransactionTrack key={order.id} order={order} />)}</ul>}
    {orders.data && <div className={`mt-6 ${orders.isPlaceholderData ? "pointer-events-none opacity-60" : ""}`} aria-disabled={orders.isPlaceholderData || undefined}><DashboardPagination page={page} limit={orders.data.limit} total={orders.data.total} itemLabel="giao dịch" onPageChange={next => {
      if (orders.isPlaceholderData) return;
      setParams(previous => { const result = new URLSearchParams(previous); result.set("transactionsPage", String(next)); return result; }, { preventScrollReset: true });
    }} /></div>}
  </section>;
}
