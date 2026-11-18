import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { isApiError } from "@/lib/apiError";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { useBuyMembership, useMembershipCheckout } from "../hooks/useMembershipCheckout";
import { RenewalReminder } from "./RenewalReminder";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const orderStatus = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  needs_review: "Cần đối soát",
  rejected: "Bị từ chối",
};
const purchasePanel = "grid content-start gap-4 rounded-xl border border-line bg-paper-soft p-5 sm:p-6";
const quotaLabels = { podcast: "Nghe podcast", quiz: "Làm quiz", exhibition: "Tham quan triển lãm 3D" };

export function MembershipScreen() {
  const [search, setSearch] = useSearchParams();
  const [page, setPage] = useState(1);
  const candidate = z.string().uuid().safeParse(search.get("don"));
  const orderId = candidate.success ? candidate.data : "";
  const { plans, status, orders, order } = useMembershipCheckout(orderId, page);
  const buy = useBuyMembership();
  const plan = plans.data?.find(({ code, isPurchasable }) => code === "monthly" && isPurchasable);
  const entitlement = status.data;
  const selected = order.data;
  const open = (id: string) => setSearch(id ? { don: id } : {});

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 text-ink sm:px-6">
      <header className="grid gap-3">
        <Button asChild variant="outline" size="sm" className="w-fit"><Link to={APP_PATHS.home}>Quay lại</Link></Button>
        <h1 className="text-3xl font-bold">Thành viên Sử Ký</h1>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <section className={purchasePanel} aria-label="Trạng thái thành viên">
          <h2 className="text-xl font-semibold">Thành viên hiện tại</h2>
          {status.isPending ? <p>Đang tải trạng thái…</p> : !entitlement ? (
            <Button variant="outline" onClick={() => void status.refetch()}>Tải lại trạng thái</Button>
          ) : entitlement.tier === "free" ? <p>Free</p> : (
            <p>Premium · Còn {entitlement.daysLeft} ngày · Hết hạn {entitlement.expiresAt ? dateTime.format(entitlement.expiresAt) : "—"}</p>
          )}
          {entitlement?.experienceQuotas.length ? <ul className="grid gap-2 text-sm text-ink-soft">
            {entitlement.experienceQuotas.filter(({ mode }) => mode !== "free_unlimited").map((quota) => (
              <li key={quota.feature}>{quotaLabels[quota.feature]} · {quota.mode === "premium_only" ? "Chỉ Premium"
                : `Đã dùng ${quota.usedToday}, còn ${quota.remaining} lượt. Đặt lại ${dateTime.format(quota.resetsAt)}.`}</li>
            ))}
          </ul> : null}
          {entitlement?.pendingOrderId && entitlement.pendingOrderId !== orderId ? (
            <Button variant="outline" onClick={() => open(entitlement.pendingOrderId!)}>Xem đơn đang xử lý</Button>
          ) : null}
        </section>
        <section id="mua-goi" className={purchasePanel} aria-label="Gói Premium">
          <h2 className="text-xl font-semibold">Gói Premium</h2>
          {plans.isPending ? <p>Đang tải gói…</p> : plans.isError && !plans.data ? (
            <Button variant="outline" onClick={() => void plans.refetch()}>Tải lại gói</Button>
          ) : !plan ? <p>Hiện chưa có gói Premium mở bán.</p> : (
            <>
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="font-semibold">{money.format(plan.priceVnd)} · {plan.durationDays} ngày</p>
              <Button disabled={buy.isPending} onClick={() => buy.mutate(plan.code, {
                onSuccess: (created) => open(created.id),
                onError: (error) => {
                  if (isApiError(error) && (error.is("PLAN_NOT_PURCHASABLE") || error.is("CONFLICT"))) void plans.refetch();
                },
              })}>
                {buy.isPending ? "Đang tạo đơn…" : entitlement?.tier === "premium" ? "Gia hạn Premium" : "Mua Premium"}
              </Button>
              {buy.isError ? <p role="alert" className="text-sm text-vermilion">
                {isApiError(buy.error) && buy.error.is("STACK_LIMIT_REACHED") ? "Kỳ hạn mới sẽ vượt giới hạn cộng dồn." : "Không tạo được đơn. Vui lòng thử lại."}
              </p> : null}
            </>
          )}
        </section>
      </div>
      <RenewalReminder premium={entitlement?.tier === "premium"} />
      {orderId ? (
        <section className={purchasePanel} aria-label="Chi tiết đơn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Chi tiết đơn</h2>
            <Button variant="outline" onClick={() => open("")}>Đóng chi tiết</Button>
          </div>
          {order.isPending ? <p>Đang tải đơn…</p> : !selected ? (
            <Button variant="outline" onClick={() => void order.refetch()}>Tải lại đơn</Button>
          ) : (
            <>
              <p className="font-semibold" role="status">{orderStatus[selected.status]} · {selected.planName}</p>
              <p>{money.format(selected.priceVnd)} · {selected.durationDays} ngày</p>
              {selected.status === "pending" ? (
                <div className="flex flex-wrap items-center gap-5">
                  <img src={selected.bank.qrUrl} alt={`Mã VietQR thanh toán ${money.format(selected.priceVnd)}`} width={248} height={248} className="rounded-lg bg-white" />
                  <div className="grid gap-2 text-sm">
                    <p>Quét QR bằng app ngân hàng, kiểm tra thông tin và xác nhận chuyển khoản.</p>
                    <p>{selected.bank.bankName} · {selected.bank.accountNumber} · {selected.bank.accountName}</p>
                    <p>Nội dung chuyển khoản <strong>{selected.transferContent}</strong></p>
                    <p className="text-ink-soft">Trạng thái tự cập nhật khi nhận được tiền.</p>
                  </div>
                </div>
              ) : selected.status === "needs_review" ? (
                <p>Đơn đang được kiểm tra. Premium có hiệu lực sau khi thanh toán được xác nhận.</p>
              ) : selected.status === "rejected" ? (
                <p>{selected.rejectionReason || "Đơn đã bị từ chối."}</p>
              ) : null}
              {order.isError ? <Button variant="outline" onClick={() => void order.refetch()}>Kiểm tra lại thanh toán</Button> : null}
            </>
          )}
        </section>
      ) : null}
      <section className={purchasePanel} aria-label="Lịch sử đơn hàng">
        <h2 className="text-xl font-semibold">Lịch sử đơn hàng</h2>
        {orders.isPending ? <p>Đang tải đơn hàng…</p> : !orders.data ? (
          <Button variant="outline" onClick={() => void orders.refetch()}>Tải lại lịch sử</Button>
        ) : orders.data.items.length ? (
          <ul className="divide-y divide-line">
            {orders.data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">{item.planName} · {money.format(item.priceVnd)}</p><p className="text-sm text-ink-soft">{dateTime.format(item.createdAt)} · {orderStatus[item.status]}</p></div>
                <Button variant="outline" aria-current={item.id === orderId ? "true" : undefined} onClick={() => open(item.id)}>Xem đơn {item.transferContent}</Button>
              </li>
            ))}
          </ul>
        ) : <p>Chưa có đơn hàng.</p>}
        {orders.data && orders.data.total > orders.data.limit ? (
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button>
            <span>Trang {page}</span>
            <Button variant="outline" disabled={page * orders.data.limit >= orders.data.total} onClick={() => setPage(page + 1)}>Trang sau</Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
