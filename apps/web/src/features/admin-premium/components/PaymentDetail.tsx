import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useDeferredValue, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminResolveTransactionSchema, AdminVerifyOrderSchema, type PremiumAuditEntry } from "@repo/shared";
import { isApiError } from "@/lib/apiError";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { OrderReceipt } from "./OrderReceipt";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { notify } from "@/shared/lib/notifications";
import { useAdminPaymentDetail, useAdminPaymentList, useProcessPayment, type PaymentKind } from "../hooks/useAdminPayments";
import { paymentDate, paymentLabels, paymentMoney, paymentReasons } from "./paymentPresentation";

const eventState = z.object({ status: z.string().optional(), reason: z.string().nullable().optional() });
const eventChanges = z.object({ before: eventState.nullish(), after: eventState.nullish(), note: z.string().nullable().optional() });
const formSchema = z.object({ action: z.enum(["approve", "reject", "assign", "ignore"]), note: z.string().trim().max(1000), orderId: z.string() });

export function PaymentDetail({ kind, id, onOpen, onClose }: {
  kind: PaymentKind;
  id: string;
  onOpen: (selection: { kind: PaymentKind; id: string }) => void;
  onClose: () => void;
}) {
  const { order, transaction } = useAdminPaymentDetail(kind, id);
  const detail = kind === "orders" ? order : transaction;
  const data = detail.data;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent variant="dashboard" className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 font-moderator sm:p-0">
        <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6">
          <DialogTitle>{kind === "orders" ? "Biên nhận thanh toán" : "Chi tiết giao dịch"}</DialogTitle>
          <DialogDescription asChild><div className="pt-1">{data ? <CardBadge type="status" tone={data.status === "paid" || data.status === "matched" ? "success" : "neutral"}>{paymentLabels[data.status]}</CardBadge> : "Thông tin thanh toán Premium"}</div></DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
        {detail.isPending ? <p>Đang tải chi tiết…</p> : !data ? (
          <Button variant="outline" onClick={() => void detail.refetch()}>Tải lại chi tiết</Button>
        ) : (
          <>
            {"user" in data ? (
              <OrderReceipt order={data} onTransaction={(id) => onOpen({ kind: "transactions", id })} />
            ) : (
              <div className="grid gap-2 text-sm">
                <p><strong>{data.referenceCode ?? data.externalId}</strong> · {data.provider} · {paymentMoney.format(data.amount)}</p>
                <p>Ngân hàng ghi nhận {paymentDate.format(data.transactionAt)}</p>
                <p className="wrap-anywhere">{data.content || "Giao dịch không có nội dung."}</p>
                {data.reason ? <p>{paymentReasons[data.reason] ?? data.reason}</p> : null}
                {data.order ? (
                  <Button variant="outline" onClick={() => onOpen({ kind: "orders", id: data.order!.id })}>Xem đơn {data.order.transferContent}</Button>
                ) : null}
              </div>
            )}
            <details className="mt-4 border-t border-mod-border pt-3"><summary className="cursor-pointer py-1 text-sm font-medium">Lịch sử xử lý ({data.history.length})</summary><div className="pt-3"><PaymentHistory events={data.history} /></div></details>
            {"canApprove" in data ? (
              data.canApprove ? <PaymentReview kind={kind} id={id} /> : null
            ) : (
              data.status === "unmatched" || data.status === "needs_review" ? <PaymentReview kind={kind} id={id} amount={data.amount} /> : null
            )}
          </>
        )}
        </div>
        <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-3 sm:px-6"><Button type="button" variant="outline" onClick={onClose}>Đóng</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentHistory({ events }: { events: PremiumAuditEntry[] }) {
  return (
    <section aria-label="Lịch sử xử lý">
      {events.length ? (
        <ol className="grid gap-2 text-sm">
          {events.map((event) => {
            const parsed = eventChanges.safeParse(event.changes);
            const changes = parsed.success ? parsed.data : undefined;
            const before = changes?.before?.status;
            const after = changes?.after?.status;
            const reason = changes?.after?.reason;
            const who = event.actor?.name ?? (event.actorType === "ADMIN" ? "Admin" : "Hệ thống");
            return (
              <li key={event.id} className="border-b border-mod-border pb-2">
                <p className="text-xs text-mod-text-secondary">{paymentDate.format(event.createdAt)} · {who}</p>
                <p>{before && after ? `${paymentLabels[before] ?? before} → ${paymentLabels[after] ?? after}` : after ? paymentLabels[after] ?? after : "Cập nhật thanh toán"}</p>
                {reason ? <p>{paymentReasons[reason] ?? reason}</p> : null}
                {changes?.note ? <p className="wrap-anywhere">{changes.note}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : <p className="text-sm text-mod-text-secondary">Chưa có thao tác xử lý.</p>}
    </section>
  );
}

function PaymentReview({ kind, id, amount }: { kind: PaymentKind; id: string; amount?: number }) {
  const isOrder = kind === "orders";
  const [search, setSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const q = useDeferredValue(search);
  const process = useProcessPayment(id);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { action: isOrder ? "approve" : "assign", note: "", orderId: "" },
  });
  const action = form.watch("action");
  const candidates = useAdminPaymentList("orders", {
    page: candidatePage, limit: 20, status: "", from: "", to: "", q,
    assignableAmount: amount,
  }, !isOrder && action === "assign" && amount !== undefined && amount > 0).orders;
  const { errors, isSubmitting } = form.formState;
  const submit = form.handleSubmit(async ({ action: selected, note, orderId }) => {
    const input = isOrder
      ? AdminVerifyOrderSchema.transform((input) => ({ kind: "orders" as const, input }))
          .safeParse({ action: selected, note, reason: selected === "reject" ? note : undefined })
      : AdminResolveTransactionSchema.transform((input) => ({ kind: "transactions" as const, input }))
          .safeParse({ action: selected, note, orderId: selected === "assign" ? orderId || undefined : undefined });
    if (!input.success) {
      for (const issue of input.error.issues) form.setError(issue.path[0] === "orderId" ? "orderId" : "note", { message: issue.message });
      return;
    }
    try {
      const result = await process.mutateAsync(input.data);
      if (result && "result" in result && result.result.status === "needs_review") {
        notify.error({ title: "Giao dịch vẫn cần đối soát", description: paymentReasons[result.result.reason ?? ""] ?? "Kiểm tra điều kiện của đơn hàng." });
      } else {
        notify.success({ title: "Đã cập nhật thanh toán" });
      }
    } catch (error) {
      if (isApiError(error) && (error.is("ORDER_NOT_PENDING") || error.is("MEMBERSHIP_ORDER_NOT_FOUND"))) {
        notify.error({ title: "Đơn hoặc giao dịch đã thay đổi", description: "Tải lại chi tiết để xem trạng thái hiện tại." });
      } else {
        notify.error({ title: "Không xử lý được thanh toán", description: "Kiểm tra thông tin và thử lại." });
      }
    }
  });
  return (
    <form className="grid gap-3 border-t border-mod-border pt-4" onSubmit={submit} noValidate>
      <h3 className="font-semibold">{isOrder ? "Xử lý đơn" : "Đối soát giao dịch"}</h3>
      <fieldset className="grid gap-3" disabled={isSubmitting}>
        <label className="grid gap-1 text-sm font-medium">
          Thao tác
          <Select disabled={isSubmitting} value={action} onValueChange={(value) => {
            const parsed = formSchema.shape.action.safeParse(value);
            if (parsed.success) form.setValue("action", parsed.data, { shouldDirty: true });
          }}>
            <SelectTrigger aria-label="Xử lý thanh toán"><SelectValue /></SelectTrigger>
            <SelectContent>{isOrder ? <><SelectItem value="approve">Xác nhận đã nhận đủ tiền</SelectItem><SelectItem value="reject">Từ chối đơn</SelectItem></>
              : <><SelectItem value="assign">Gán vào đơn</SelectItem><SelectItem value="ignore">Bỏ qua giao dịch</SelectItem></>}</SelectContent>
          </Select>
        </label>
        {action === "assign" ? (
          <>
            <label className="grid gap-1 text-sm font-medium">Tìm đơn để gán
              <Input value={search} maxLength={255} onChange={({ target }) => { setSearch(target.value); setCandidatePage(1); form.setValue("orderId", ""); }} placeholder="Mã đơn, tên hoặc email người mua" />
            </label>
            <label className="grid gap-1 text-sm font-medium">Đơn có cùng số tiền
              <Select disabled={isSubmitting || candidates.isFetching || candidates.isError || !candidates.data?.items.length} value={form.watch("orderId")} onValueChange={(value) => form.setValue("orderId", value, { shouldDirty: true, shouldValidate: true })}>
                <SelectTrigger aria-label="Đơn có cùng số tiền"><SelectValue placeholder={candidates.isFetching ? "Đang tìm đơn…" : "Chọn đơn hàng"} /></SelectTrigger>
                <SelectContent>
                {candidates.data?.items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.transferContent} · {item.user.name} · {item.planName}</SelectItem>
                ))}
                </SelectContent>
              </Select>
              {errors.orderId ? <span role="alert" className="text-mod-danger">{errors.orderId.message}</span> : null}
            </label>
            {candidates.isError ? <Button type="button" variant="outline" onClick={() => void candidates.refetch()}>Tìm lại đơn</Button> : null}
            {candidates.data ? <div className="flex items-center gap-3 text-sm">
              <Button type="button" variant="outline" disabled={candidatePage <= 1 || candidates.isFetching} onClick={() => { form.setValue("orderId", ""); setCandidatePage(candidatePage - 1); }}>Trang trước</Button>
              <span>Trang {candidatePage} · {candidates.data.total} đơn phù hợp</span>
              <Button type="button" variant="outline" disabled={candidatePage * 20 >= candidates.data.total || candidates.isFetching} onClick={() => { form.setValue("orderId", ""); setCandidatePage(candidatePage + 1); }}>Trang sau</Button>
            </div> : null}
          </>
        ) : null}
        <label className="grid gap-1 text-sm font-medium">Lý do xử lý
          <Textarea rows={3} maxLength={action === "reject" ? 500 : 1000} {...form.register("note")} />
          {errors.note ? <span role="alert" className="text-mod-danger">{errors.note.message}</span> : null}
        </label>
      </fieldset>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý…" : "Xác nhận xử lý"}</Button>
    </form>
  );
}
