import { Check, Crown, Headphones, CircleHelp, Landmark } from "lucide-react";
import { useNavigate } from "react-router";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { APP_PATHS } from "@/shared/constants/routes";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { MagicCard } from "@/shared/components/ui/magic-card";
import { ShimmerButton } from "@/shared/components/ui/shimmer-button";
import { useMembership, useMembershipPlans } from "../hooks/useMembership";

const benefits = [
  { feature: "podcast", icon: Headphones, label: "Nghe podcast lịch sử" },
  { feature: "quiz", icon: CircleHelp, label: "Thử tài với quiz lịch sử" },
  { feature: "exhibition", icon: Landmark, label: "Khám phá triển lãm 3D" },
] as const;
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function MembershipOffer() {
  const navigate = useNavigate();
  const session = useCurrentUser();
  const plans = useMembershipPlans();
  const membership = useMembership(Boolean(session.data));
  const premium = membership.data?.tier === "premium";
  const pendingOrder = membership.data?.pendingOrderId;

  function freeAllowance(feature: string) {
    const quota = membership.data?.experienceQuotas.find(item => item.feature === feature);
    if (!quota) return "Theo hạn mức hiện hành";
    if (quota.mode === "premium_only") return "Chỉ dành cho Premium";
    if (quota.mode === "free_unlimited" || quota.limit === null) return "Không giới hạn";
    return `${quota.limit} lượt / ngày`;
  }

  function openMembership(free: boolean) {
    const target = free ? "/#library-history" : pendingOrder ? `${APP_PATHS.membership}/payment/${pendingOrder}` : `${APP_PATHS.membership}#goi`;
    if (session.data) navigate(target);
    else navigate("/login", { state: { from: { pathname: free ? "/" : APP_PATHS.membership, hash: free ? "#library-history" : "#goi" } } });
  }

  return <section id="premium" aria-labelledby="premium-title" className="scroll-mt-28 bg-paper px-5 py-16 text-ink sm:px-8 md:py-20">
    <div className="mx-auto max-w-5xl">
      <header className="mx-auto max-w-3xl text-center">
        <h2 id="premium-title" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Trải nghiệm sự khác biệt</h2>
        <p className="mt-5 text-base leading-8 text-ink-soft">Đi sâu vào lịch sử Việt Nam cùng Premium. Nghe, khám phá và thử tài theo cách của bạn.</p>
      </header>

      <div className="mx-auto mt-12 max-w-3xl">
        <div className="overflow-hidden rounded-3xl bg-paper-soft p-3 shadow-[0_12px_40px_-24px_color-mix(in_srgb,var(--color-bronze)_45%,transparent)] sm:p-6">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm sm:text-base">
          <caption className="sr-only">So sánh quyền lợi thành viên và Premium</caption>
          <thead><tr className="border-b border-line">
            <th scope="col" className="w-[42%] border-b border-line px-2 py-6 font-medium sm:px-4">Quyền lợi của bạn</th>
            <th scope="col" className="border-b border-line px-2 py-6 text-center font-medium">Thành viên</th>
            <th scope="col" className="rounded-t-2xl border-b border-bronze/25 bg-paper-deep/70 px-2 py-6 text-center font-semibold text-bronze-dark"><Crown className="mx-auto mb-3 size-10 rounded-full bg-bronze p-2 text-paper-soft" aria-hidden="true" />Premium</th>
          </tr></thead>
          <tbody>{benefits.map(item => <tr key={item.feature} className="group">
            <th scope="row" className="border-b border-line/70 px-2 py-7 font-medium leading-7 transition-colors group-hover:bg-paper/70 sm:px-4"><span className="flex items-center gap-3"><item.icon className="hidden size-5 shrink-0 text-bronze-dark sm:block" aria-hidden="true" /><span>{item.label}</span></span></th>
            <td className="border-b border-line/70 px-2 py-7 text-center text-sm leading-6 text-ink-soft transition-colors group-hover:bg-paper/70">{freeAllowance(item.feature)}</td>
            <td className="border-b border-bronze/20 bg-paper-deep/70 px-2 py-7 text-center transition-colors group-hover:bg-paper-deep group-last:rounded-b-2xl group-last:border-b-0"><Check className="mx-auto mb-2 size-8 rounded-full bg-bronze-dark p-1.5 text-paper-soft" aria-hidden="true" /><span className="text-sm">Không giới hạn</span></td>
          </tr>)}</tbody>
        </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-soft">{session.data ? "Hạn mức thành viên theo chính sách hiện hành của từng trải nghiệm." : "Đăng nhập để xem hạn mức miễn phí hiện tại của từng trải nghiệm."}</p>
        {session.isError || (session.data && membership.isError) ? <p role="status" className="mt-3 text-sm">Chưa tải được trạng thái thành viên. <Button variant="link" className="text-ink underline" onClick={() => { void session.refetch(); if (session.data) void membership.refetch(); }}>Thử lại</Button></p> : null}
      </div>

      <div className="mt-16 grid items-start gap-6 md:grid-cols-2 md:gap-12">
        <h3 className="text-2xl font-semibold leading-snug sm:text-3xl">Lịch sử mở rộng.<br />Trải nghiệm không giới hạn.</h3>
        <ul className="space-y-3">{benefits.map(item => <li key={item.feature} className="flex gap-3 leading-7"><Check className="mt-1 size-5 shrink-0 text-ink-soft" aria-hidden="true" />{item.label} không giới hạn</li>)}</ul>
      </div>

      {plans.isPending ? <p role="status" className="mt-12 text-center">Đang tải các gói thành viên…</p> : plans.isError ? <div role="status" className="mt-12 text-center"><p>Chưa tải được các gói thành viên.</p><Button className="mt-4" onClick={() => void plans.refetch()}>Thử lại</Button></div> : plans.data.length === 0 ? <p className="mt-12 text-center">Chưa có gói thành viên được công bố.</p> : <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
        {plans.data.map(plan => {
          const free = plan.priceVnd === 0;
          const current = membership.data && (premium ? membership.data.planCode === plan.code : free);
          return <article key={plan.code} aria-label={free ? "Gói Thành viên" : "Gói Premium"} className={`h-full rounded-2xl shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--color-ink)_22%,transparent)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:shadow-[0_18px_36px_-16px_color-mix(in_srgb,var(--color-ink)_30%,transparent)] motion-reduce:transform-none motion-reduce:transition-none [--border:var(--color-line)] ${free ? "text-ink [--background:var(--color-paper-soft)]" : "text-ink [--background:var(--color-paper-deep)]"}`}>
            <MagicCard className="h-full rounded-2xl [&>div.relative]:h-full" gradientFrom="var(--color-bronze)" gradientTo="var(--color-vermilion)" gradientColor="var(--color-bronze)" gradientOpacity={0.12}>
              <div className="relative flex h-full min-h-[540px] flex-col p-6 pt-16 [--offer-muted:var(--color-ink-soft)] sm:p-8 sm:pt-16">
                <span className={`absolute -right-10 top-7 w-44 rotate-45 py-1.5 text-center text-xs font-bold tracking-wide ${free ? "bg-paper-deep text-ink" : "bg-vermilion text-paper-soft"}`}>{free ? "FREE" : "PREMIUM"}</span>
                <div className="flex min-h-14 flex-wrap content-start items-center gap-x-4 gap-y-2 pr-8"><span className="text-sm text-[var(--offer-muted)]">Sử Ký Việt Nam</span>{current ? <CardBadge type="status" tone="success"><Check className="size-3" aria-hidden="true" />Đang sử dụng</CardBadge> : null}</div>
                <h3 className="mt-5 text-3xl font-bold">{free ? "Thành viên" : "Premium"}</h3>
                <p className="mt-2 text-sm font-medium text-[var(--offer-muted)]">{free ? "Gói miễn phí" : plan.name}</p>
                <p className="mt-4 text-2xl font-semibold tabular-nums">{free ? "Miễn phí" : currency.format(plan.priceVnd)}</p>
                <p className="mt-2 text-sm text-[var(--offer-muted)]">{plan.durationDays > 0 ? `Cho ${plan.durationDays} ngày trải nghiệm` : "Khám phá lịch sử mỗi ngày"}</p>
                <ul className="mb-8 mt-8 space-y-3 text-sm leading-6">{benefits.map(item => <li key={item.feature} className="flex items-start gap-2"><Check className="mt-1 size-4 shrink-0 text-[var(--offer-muted)]" aria-hidden="true" /><span>{item.label}: {free ? freeAllowance(item.feature) : "không giới hạn"}</span></li>)}</ul>
                {plan.benefits && <p className="mb-6 whitespace-pre-line text-sm leading-6 text-[var(--offer-muted)]">{plan.benefits}</p>}
                <div className="mt-auto">
                  <ShimmerButton type="button" background={free ? "var(--color-paper-deep)" : "var(--color-vermilion)"} shimmerColor="var(--color-paper-soft)" borderRadius="999px" className={`min-h-12 w-full whitespace-normal border-transparent px-4 text-sm font-semibold transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] enabled:hover:-translate-y-1 enabled:hover:shadow-lg enabled:active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-50 ${free ? "text-ink" : "text-paper-soft"}`} disabled={session.isPending || Boolean(session.data && membership.isPending) || (!free && !plan.isPurchasable)} onClick={() => openMembership(free)}>
                    {free ? session.data ? "Tiếp tục khám phá" : "Đăng nhập để khám phá" : !plan.isPurchasable ? "Chưa mở bán" : "Mua gói Premium"}
                  </ShimmerButton>
                  <p className="mt-4 min-h-12 text-center text-xs leading-6 text-[var(--offer-muted)]">{free ? "Bắt đầu với các trải nghiệm theo hạn mức miễn phí hiện hành." : "Quyền lợi được kích hoạt sau khi thanh toán được xác nhận."}</p>
                </div>
              </div>
            </MagicCard>
          </article>;
        })}
      </div>}
    </div>
  </section>;
}
