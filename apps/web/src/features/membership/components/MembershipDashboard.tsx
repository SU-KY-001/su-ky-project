import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Crown, ArrowUpRight, Check, Headphones, Landmark, CircleHelp, ReceiptText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ShimmerButton } from "@/shared/components/ui/shimmer-button";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { APP_PATHS } from "@/shared/constants/routes";
import { notify } from "@/shared/lib/notifications";
import { useMembership, useMembershipPlans, useCreateOrder } from "../hooks/useMembership";
import { RenewalReminder } from "./RenewalReminder";
import { MembershipTransactions } from "./MembershipTransactions";

const experiences = [
  { feature: "podcast", label: "Podcast lịch sử", icon: Headphones },
  { feature: "quiz", label: "Quiz lịch sử", icon: CircleHelp },
  { feature: "exhibition", label: "Triển lãm 3D", icon: Landmark },
] as const;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

export function MembershipDashboard() {
  const membership = useMembership();
  const plans = useMembershipPlans();
  const create = useCreateOrder();
  const navigate = useNavigate();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hash, membership.isPending]);

  if (membership.isPending) return <div role="status" className="py-20 text-center">Đang tải thông tin thành viên…</div>;
  if (!membership.data) return <div role="alert" className="py-20 text-center"><p>Chưa tải được thông tin thành viên.</p><Button className="mt-4" onClick={() => void membership.refetch()}>Thử lại</Button></div>;
  const data = membership.data;
  const premium = data.tier === "premium";
  const purchasable = plans.data?.filter(plan => plan.isPurchasable && plan.priceVnd > 0) ?? [];
  const featured = purchasable[0];
  const currentPlan = plans.data?.find(plan => plan.code === data.planCode);

  function purchase(code?: string) {
    if (create.isPending) return;
    if (data.pendingOrderId) { void navigate(`${APP_PATHS.membership}/payment/${data.pendingOrderId}`); return; }
    if (!code) return;
    create.mutate(code, {
      onSuccess: order => navigate(`${APP_PATHS.membership}/payment/${order.id}`),
      onError: () => notify.error({ title: "Chưa tạo được đơn thanh toán", description: "Vui lòng thử lại hoặc kiểm tra lịch sử giao dịch." }),
    });
  }

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Thành viên</h1><p className="mt-3 text-sm leading-6 text-ink-soft">Gói của bạn, trải nghiệm của bạn.</p></div><Button asChild variant="ghost"><a href="#giao-dich"><ReceiptText className="size-4" />Lịch sử giao dịch</a></Button></header>

    {!premium && featured ? <section aria-label="Khám phá Premium" className="relative isolate overflow-hidden rounded-3xl bg-paper-deep p-6 sm:p-8 lg:p-10">
      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_230px]">
        <div>
          <h2 className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">Lịch sử không giới hạn.<br />Trải nghiệm trọn vẹn.</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">Mỗi câu chuyện mở ra một góc nhìn mới. Cùng Sử Ký Premium khám phá nhiều hơn, theo nhịp của riêng bạn.</p>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">{experiences.map(item => <li key={item.feature} className="flex items-center gap-2"><item.icon className="size-4 text-vermilion" aria-hidden="true" />{item.label}</li>)}</ul>
          <div className="mt-7 flex flex-wrap items-center gap-4"><ShimmerButton className="min-h-12 whitespace-normal border-transparent px-6 font-semibold text-paper-soft transition-transform duration-500 enabled:hover:-translate-y-1 motion-reduce:transform-none" background="var(--color-vermilion)" shimmerColor="var(--color-paper-soft)" borderRadius="999px" disabled={create.isPending} onClick={() => purchase(featured.code)}>Mua gói Premium<ArrowUpRight className="ml-2 size-4" /></ShimmerButton><p className="text-sm font-semibold">{money.format(featured.priceVnd)}<span className="font-normal text-ink-soft"> / {featured.durationDays} ngày</span></p></div>
          <p className="mt-4 text-xs leading-6 text-ink-soft">Không giới hạn lượt podcast, quiz và triển lãm 3D.<br />Kích hoạt sau khi thanh toán được xác nhận.</p>
        </div>
        <div aria-hidden="true" className="relative hidden aspect-square items-center justify-center md:flex">
          <div className="absolute inset-0 rounded-full border border-bronze/30" />
          <div className="absolute inset-5 rounded-full border border-bronze/20" />
          <div className="relative grid size-48 -rotate-12 place-items-center rounded-full border-4 border-bronze/70 bg-vermilion shadow-[8px_20px_24px_-12px_color-mix(in_srgb,var(--color-bronze-dark)_45%,transparent)] [background:repeating-radial-gradient(circle_at_center,var(--color-vermilion)_0px,var(--color-vermilion)_4px,var(--color-vermilion-dark)_5px,var(--color-vermilion)_6px)] transition-transform duration-700 ease-out hover:rotate-0 motion-reduce:transform-none">
            <div className="absolute inset-3 rounded-full border border-paper-soft/15" />
            <div className="absolute inset-6 rounded-full border border-paper-soft/15" />
            <div className="grid size-20 place-items-center rounded-full bg-paper-soft shadow-inner ring-4 ring-bronze"><Crown className="size-10 text-bronze-dark" strokeWidth={1.3} /></div>
          </div>
          <span className="absolute -top-1 right-7 grid size-12 rotate-6 place-items-center rounded-2xl bg-paper-soft text-vermilion shadow-sm"><Headphones className="size-6" strokeWidth={1.5} /></span>
          <span className="absolute bottom-2 right-0 grid size-12 -rotate-6 place-items-center rounded-2xl bg-bronze-dark text-paper-soft shadow-sm"><Landmark className="size-6" strokeWidth={1.5} /></span>
          <span className="absolute bottom-5 -left-3 grid size-11 rotate-6 place-items-center rounded-2xl bg-paper-soft text-bronze-dark shadow-sm"><CircleHelp className="size-6" strokeWidth={1.5} /></span>
        </div>
      </div>
    </section> : null}

    {membership.isError ? <p role="status" className="text-sm text-vermilion">Chưa cập nhật được trạng thái mới nhất. <Button variant="link" onClick={() => void membership.refetch()}>Thử lại</Button></p> : null}
    <section id="goi" aria-label="Gói hiện tại" className="scroll-mt-28 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="rounded-3xl bg-paper-soft p-6 sm:p-8"><CardBadge type="status" tone={premium ? "success" : "neutral"}>Gói của bạn</CardBadge><h2 className="mt-5 text-3xl font-semibold sm:text-4xl">{premium ? "Sử Ký Premium" : "Thành viên Free"}</h2><p className="mt-3 text-sm text-ink-soft">{premium ? currentPlan?.name ?? "Trải nghiệm không giới hạn" : "Khám phá lịch sử Việt Nam mỗi ngày."}</p>
        {premium && <dl className="mt-6 grid grid-cols-2 gap-5 text-sm sm:grid-cols-3"><div><dt className="text-ink-soft">Ngày bắt đầu</dt><dd className="mt-2 font-semibold">{data.startsAt ? date.format(data.startsAt) : "—"}</dd></div><div><dt className="text-ink-soft">Ngày hết hạn</dt><dd className="mt-2 font-semibold">{data.expiresAt ? date.format(data.expiresAt) : "—"}</dd></div><div><dt className="text-ink-soft">Thời gian còn lại</dt><dd className="mt-2 font-semibold">{data.daysLeft === null ? "—" : `${data.daysLeft} ngày`}</dd></div></dl>}
      </div>
      <button type="button" disabled={!premium && (create.isPending || (!featured && !data.pendingOrderId))} onClick={() => { if (premium) document.getElementById("membership-benefits")?.closest("section")?.scrollIntoView({ block: "center" }); else purchase(featured?.code); }} className="group flex min-h-40 flex-col items-center justify-center gap-4 rounded-3xl bg-paper-deep p-6 text-center font-semibold transition-transform duration-500 enabled:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"><Crown className="size-9 text-bronze-dark" strokeWidth={1.5} /><span className="flex items-center gap-2">{premium ? "Xem gói Premium của bạn" : "Mua gói Premium"}<ArrowUpRight className="size-4" /></span></button>
    </section>
    {plans.isError && <p role="status" className="text-sm text-ink-soft">Chưa tải được gói Premium. <Button variant="link" onClick={() => void plans.refetch()}>Thử lại</Button></p>}
    {data.pendingOrderId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper-deep/60 px-5 py-4 text-sm"><p>Bạn có một đơn đang chờ xử lý.</p><Button asChild variant="link"><Link to={`${APP_PATHS.membership}/payment/${data.pendingOrderId}`}>Xem đơn đang chờ<ArrowUpRight className="size-4" /></Link></Button></div>}

    <section aria-labelledby="membership-benefits" className="rounded-3xl bg-paper-soft p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="membership-benefits" className="text-xl font-semibold">{premium ? "Đặc quyền Premium của bạn" : "Trải nghiệm hôm nay"}</h2>{!premium && <p className="text-xs text-ink-soft">Hạn mức đặt lại hằng ngày theo giờ Việt Nam</p>}</div>
      <div className="mt-7 grid gap-7 sm:grid-cols-3">{experiences.map(item => {
        const quota = data.experienceQuotas.find(q => q.feature === item.feature);
        const limit = quota?.limit ?? 0;
        const limited = !premium && quota?.mode === "free_limited" && quota.enforced && limit > 0;
        const remaining = limited ? quota.remaining ?? Math.max(0, limit - quota.usedToday) : null;
        return <div key={item.feature}><div className="flex items-center gap-2 text-sm font-medium"><item.icon className="size-5 text-bronze-dark" aria-hidden="true" />{item.label}</div>
          <p className="mt-4 text-2xl font-semibold tabular-nums">{premium ? "Không giới hạn" : limited ? <>{remaining}<span className="ml-2 text-sm font-normal text-ink-soft">lượt còn lại</span></> : quota?.mode === "premium_only" ? "Chỉ Premium" : quota ? "Không giới hạn" : "Chưa có hạn mức"}</p>
          {limited ? <><div role="progressbar" aria-label={`Số lượt đã dùng cho ${item.label}`} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(quota.usedToday, limit)} className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper-deep"><div className="h-full rounded-full bg-bronze" style={{ width: `${Math.min(100, quota.usedToday / limit * 100)}%` }} /></div><p className="mt-3 text-xs text-ink-soft">Đã dùng {quota.usedToday} / {quota.limit} lượt</p></> : premium ? <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft"><Check className="size-4" />Đã bao gồm trong gói</p> : null}
        </div>;
      })}</div>
    </section>

    {premium && <RenewalReminder premium />}
    <MembershipTransactions />
  </div>;
}
