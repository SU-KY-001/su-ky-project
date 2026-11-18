import { useEffect, useRef, type ReactElement } from "react";
import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Copy } from "@phosphor-icons/react/dist/icons/Copy";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { LibraryState } from "@/features/landing/components/library/LibraryPrimitives";
import { notify } from "@/shared/lib/notifications";
import { membershipKeys, useMembership, useOrderPolling } from "@/features/membership/hooks/useMembership";
import type { MembershipOrder } from "@/features/membership/services/membershipService";

const STATUS_LABEL: Record<MembershipOrder["status"], string> = {
  pending: "Đang chờ thanh toán",
  paid: "Đã thanh toán",
  needs_review: "Cần đối soát",
  rejected: "Bị từ chối",
};
const CURRENCY = new Intl.NumberFormat("vi-VN");

function formatDay(value: Date | string | null): string {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "—";
}

function CopyValue({ value, label }: { value: string; label: string }): ReactElement {
  return <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={`Sao chép ${label}`}
    onClick={() => {
      navigator.clipboard.writeText(value).then(
        () => notify.success({ title: "Đã sao chép", description: label }),
        () => notify.error({ title: "Không sao chép được", description: "Chọn nội dung và sao chép thủ công." }),
      );
    }}
  ><Copy size={16} aria-hidden="true" /></Button>;
}

export function PaymentPage(): ReactElement {
  const { orderId = "" } = useParams();
  const cache = useQueryClient();
  const order = useOrderPolling(orderId || null);
  const entitlement = useMembership();
  const lastStatus = useRef<string | null>(null);
  const refreshed = useRef(false);
  const status = order.data?.status;

  useEffect(() => {
    if (!status) return;
    if (lastStatus.current === null) {
      lastStatus.current = status;
      return;
    }
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    if (status === "paid") notify.success({ title: "Thanh toán thành công", description: "Premium đã được kích hoạt trên tài khoản của bạn." });
    else if (status === "rejected") notify.error({ title: "Đơn bị từ chối", description: order.data?.rejectionReason ?? "Tạo đơn mới để thử lại." });
  }, [status, order.data?.rejectionReason]);

  useEffect(() => {
    if (status !== "paid" || refreshed.current) return;
    refreshed.current = true;
    void cache.invalidateQueries({ queryKey: membershipKeys.entitlement });
    void cache.invalidateQueries({ queryKey: membershipKeys.orders });
  }, [status, cache]);

  if (order.isPending) return <main className="mx-auto min-h-[70vh] max-w-3xl px-5 pt-36"><LibraryState loading /></main>;
  if (order.isError) return <main className="mx-auto min-h-[70vh] max-w-3xl px-5 pt-36"><LibraryState error title="Chưa tải được đơn thanh toán" retry={() => { void order.refetch(); }} /></main>;
  const data = order.data;
  const accountPremium = entitlement.data?.tier === "premium";

  return <main className="mx-auto min-h-[80vh] max-w-5xl px-5 pb-24 pt-32 text-ink sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button asChild variant="outline" size="sm"><Link to={APP_PATHS.member}>Quay lại</Link></Button>
      <p className="text-sm text-ink-soft">Đơn {data.id.slice(0, 8)}</p>
    </div>
    <h1 className="sr-only">Thanh toán {data.planName}</h1>

    {data.status === "pending" ? <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section aria-labelledby="order-title" className="flex flex-col rounded-2xl border border-line bg-paper-soft">
        <div className="p-6 sm:p-7">
          <h2 id="order-title" className="font-serif text-xl font-bold">Thông tin đơn hàng</h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-semibold">{data.planName}</span>
            <span className="rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold text-ink-soft">Đang chờ thanh toán</span>
          </div>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-soft">Giá trị đơn hàng</dt><dd className="font-semibold tabular-nums">{CURRENCY.format(data.priceVnd)}đ</dd></div>
            <div className="flex items-baseline justify-between gap-4"><dt className="text-ink-soft">Số tiền thanh toán</dt><dd className="flex items-center gap-1"><span className="font-serif text-2xl font-bold tabular-nums">{CURRENCY.format(data.bank.amount)}đ</span><CopyValue value={String(data.bank.amount)} label="số tiền" /></dd></div>
          </dl>
          <dl className="mt-6 space-y-4 text-sm">
            <div><dt className="text-ink-soft">Ngân hàng</dt><dd className="mt-1 font-semibold">{data.bank.bankName}</dd></div>
            <div><dt className="text-ink-soft">Chủ tài khoản</dt><dd className="mt-1 font-semibold">{data.bank.accountName}</dd></div>
            <div><dt className="text-ink-soft">Số tài khoản</dt><dd className="mt-1 flex items-center gap-1"><span className="select-all font-semibold tabular-nums">{data.bank.accountNumber}</span><CopyValue value={data.bank.accountNumber} label="số tài khoản" /></dd></div>
            <div><dt className="text-ink-soft">Nội dung chuyển khoản</dt><dd className="mt-1 flex items-center gap-1"><span className="select-all text-base font-bold tracking-wide">{data.bank.transferContent}</span><CopyValue value={data.bank.transferContent} label="nội dung chuyển khoản" /></dd></div>
            <div><dt className="text-ink-soft">Mã giao dịch</dt><dd className="mt-1 select-all break-all font-semibold tabular-nums">{data.id}</dd></div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="qr-title" className="flex flex-col rounded-2xl border border-line bg-paper-soft p-6 sm:p-8">
        <h2 id="qr-title" className="text-center font-serif text-2xl font-bold">Quét QR để thanh toán</h2>
        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <div className="relative w-full max-w-[380px] p-4">
            <span className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-bronze" aria-hidden="true" />
            <span className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-bronze" aria-hidden="true" />
            <span className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-bronze" aria-hidden="true" />
            <span className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-bronze" aria-hidden="true" />
            <img src={data.bank.qrUrl} alt={`Mã QR chuyển khoản ${CURRENCY.format(data.bank.amount)}đ`} className="h-auto w-full rounded-lg bg-paper p-2" />
          </div>
          <p className="mt-6 max-w-[320px] text-center text-sm leading-6 text-ink-soft">Mở ứng dụng ngân hàng có VietQR và quét mã. Số tiền cùng nội dung đã được điền sẵn.</p>
        </div>
      </section>
    </div> : null}

    {data.status === "needs_review" ? <section className="mt-6 max-w-3xl rounded-2xl border border-bronze bg-paper-soft p-6 ring-1 ring-bronze/25 sm:p-8">
      <WarningCircle size={28} className="text-bronze-dark" aria-hidden="true" />
      <h2 className="mt-3 font-serif text-2xl font-bold">Đang kiểm tra thanh toán</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">Hệ thống đã ghi nhận thanh toán của đơn này và đang đối soát. Không cần chuyển khoản thêm; trạng thái tự cập nhật khi quản trị viên xử lý xong.</p>
      {data.reviewReason ? <p className="mt-2 text-sm leading-6 text-ink-soft">Lý do: {data.reviewReason === "STACK_LIMIT_REACHED" ? "Đã vượt trần thời hạn cộng dồn tối đa." : data.reviewReason}</p> : null}
      <span className="mt-4 inline-block rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold text-ink-soft">{STATUS_LABEL[data.status]}</span>
    </section> : null}

    {data.status === "paid" ? <section className="mt-6 max-w-3xl rounded-2xl border border-bronze bg-paper-soft p-6 ring-1 ring-bronze/25 sm:p-8">
      <CheckCircle size={30} className="text-mod-success" aria-hidden="true" />
      <h2 className="mt-3 font-serif text-2xl font-bold">Thanh toán thành công</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">Hệ thống đã xác nhận thanh toán cho đơn này.</p>
      <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-soft">Gói</dt><dd className="mt-0.5 font-semibold">{data.planName}</dd></div>
        <div><dt className="text-ink-soft">Số tiền</dt><dd className="mt-0.5 font-semibold tabular-nums">{CURRENCY.format(data.priceVnd)}đ</dd></div>
        <div><dt className="text-ink-soft">Thanh toán lúc</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDay(data.paidAt)}</dd></div>
        <div><dt className="text-ink-soft">Hạn Premium</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatDay(entitlement.data?.expiresAt ?? data.expiresAt)}</dd></div>
      </dl>
      <p role="status" className="mt-5 text-sm leading-6">{accountPremium ? "Tài khoản của bạn đã được cập nhật Premium." : "Đang cập nhật trạng thái tài khoản…"}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link to={APP_PATHS.member}>Xem tài khoản</Link></Button>
        <Button asChild variant="outline"><Link to={APP_PATHS.home}>Về trang chủ</Link></Button>
      </div>
    </section> : null}

    {data.status === "rejected" ? <section className="mt-6 max-w-3xl rounded-2xl border border-line bg-paper-soft p-6 sm:p-8">
      <XCircle size={30} className="text-vermilion" aria-hidden="true" />
      <h2 className="mt-3 font-serif text-2xl font-bold">Thanh toán không thành công</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{data.rejectionReason ?? "Đơn không được chấp nhận. Tạo đơn mới để thử lại."}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link to={`${APP_PATHS.member}#goi`}>Tạo đơn mới</Link></Button>
        <Button asChild variant="outline"><Link to={APP_PATHS.member}>Trang thành viên</Link></Button>
      </div>
    </section> : null}
  </main>;
}
