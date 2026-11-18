import type { z } from "zod";
import type { AdminMembershipOrderDetailSchema } from "@repo/shared";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { paymentDate, paymentMoney, paymentReasons } from "./paymentPresentation";

type Order = z.infer<typeof AdminMembershipOrderDetailSchema>;

export function OrderReceipt({ order, onTransaction }: { order: Order; onTransaction: (id: string) => void }) {
  const shortCode = order.transferContent.length > 16
    ? `${order.transferContent.slice(0, 8)}…${order.transferContent.slice(-4)}`
    : order.transferContent;
  const imported = order.adminNote?.startsWith("Imported legacy");
  return (
    <div className="grid gap-5 text-sm">
      <section className="flex flex-wrap justify-between gap-x-6 gap-y-4" aria-label="Thông tin biên nhận">
        <div className="min-w-0">
          <h3 className="mb-1 text-xs font-medium text-mod-text-secondary">Người mua</h3>
          <p className="font-semibold">{order.user.name}</p>
          <p className="mt-1 break-all text-mod-text-secondary">{order.user.email}</p>
        </div>
        <div className="min-w-0 sm:text-right">
          <p className="text-xs text-mod-text-secondary">Mã đơn</p>
          <p className="mt-1 font-medium">{shortCode}</p>
          <p className="mt-1 text-xs text-mod-text-secondary">{paymentDate.format(order.createdAt)}</p>
        </div>
      </section>
      <section aria-label="Nội dung thanh toán" className="border-y border-mod-border py-2">
        <Table>
          <TableHeader>
            <TableRow className="border-mod-border">
              <TableHead className="pl-0 text-xs text-mod-text-secondary">Gói thành viên</TableHead>
              <TableHead className="text-xs text-mod-text-secondary">Thời hạn</TableHead>
              <TableHead className="pr-0 text-right text-xs text-mod-text-secondary">Thành tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="py-4 pl-0"><CardBadge type="name" tone="info">{order.planName}</CardBadge></TableCell>
              <TableCell className="whitespace-nowrap py-4">{order.durationDays} ngày</TableCell>
              <TableCell className="whitespace-nowrap py-4 pr-0 text-right font-semibold tabular-nums">{paymentMoney.format(order.priceVnd)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold">Tổng thanh toán</span>
        <strong className="text-2xl tabular-nums">{paymentMoney.format(order.priceVnd)}</strong>
      </div>
      <dl className="grid gap-2 border-t border-mod-border pt-4 [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-x-4 [&>div]:gap-y-1 [&_dt]:text-mod-text-secondary [&_dd]:font-medium">
        <div><dt>Xác nhận thanh toán</dt><dd>{order.paidAt ? paymentDate.format(order.paidAt) : "Chưa xác nhận"}</dd></div>
        <div><dt>Thành viên có hiệu lực đến</dt><dd>{order.expiresAt ? paymentDate.format(order.expiresAt) : "—"}</dd></div>
      </dl>
      {order.reviewReason || order.rejectionReason || order.adminNote ? (
        <section className="border-l-2 border-mod-border pl-3" aria-label="Ghi chú đơn hàng">
          <h3 className="mb-1 text-xs font-semibold text-mod-text-secondary">Ghi chú</h3>
          {order.reviewReason ? <p>{paymentReasons[order.reviewReason] ?? order.reviewReason}</p> : null}
          {order.rejectionReason ? <p>{order.rejectionReason}</p> : null}
          {order.adminNote ? <p className="whitespace-pre-wrap wrap-anywhere">{imported ? "Dữ liệu được chuyển từ hệ thống thành viên cũ." : order.adminNote}</p> : null}
        </section>
      ) : null}
      <details className="border-t border-mod-border pt-3">
        <summary className="cursor-pointer py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary">Thông tin đối soát</summary>
        <dl className="mt-3 grid gap-3 text-xs [&_dt]:mb-1 [&_dt]:font-semibold [&_dt]:text-mod-text-secondary [&_dd]:break-all">
          <div><dt>Mã đầy đủ / nội dung chuyển khoản</dt><dd>{order.transferContent}</dd></div>
          <div><dt>Mã giao dịch liên kết</dt><dd>{order.bankTransactionId ?? "Chưa có giao dịch liên kết"}</dd></div>
        </dl>
        <div className="mt-3 grid gap-2">
          {order.proofUrl ? <a className="text-sm underline" href={order.proofUrl} target="_blank" rel="noreferrer">Xem chứng từ chuyển khoản</a> : null}
          {order.transactions.map((tx) => (
            <Button key={tx.id} variant="outline" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={() => onTransaction(tx.id)}>
              {tx.referenceCode ?? tx.externalId} · {paymentMoney.format(tx.amount)}
            </Button>
          ))}
        </div>
      </details>
    </div>
  );
}
