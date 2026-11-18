import { useEffect, useRef, useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router";
import { Check } from "@phosphor-icons/react/dist/icons/Check";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS } from "@/shared/constants/routes";
import { LibraryState } from "@/features/landing/components/library/LibraryPrimitives";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { useCreateOrder, useMembership, useMembershipOrders, useMembershipPlans } from "@/features/membership/hooks/useMembership";
import type { MembershipOrder } from "@/features/membership/services/membershipService";

const STATUS_LABEL: Record<MembershipOrder["status"], string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  needs_review: "Cần đối soát",
  rejected: "Bị từ chối",
};
const FEATURE_LABEL: Record<string, string> = { podcast: "Podcast", quiz: "Quiz", exhibition: "Triển lãm" };
const BENEFITS = [
  { feature: "podcast", label: "Nghe podcast" },
  { feature: "quiz", label: "Làm quiz" },
  { feature: "exhibition", label: "Tham quan triển lãm 3D" },
] as const;

type Quota = {
  feature: string;
  mode: "free_limited" | "free_unlimited" | "premium_only";
  limit: number | null;
  usedToday: number;
};

/** Free-tier allowance per feature, taken from the live policy instead of a hardcoded table. */
function freeAllowance(quotas: Quota[], feature: string): string {
  const quota = quotas.find((item) => item.feature === feature);
  if (!quota) return "Theo hạn mức miễn phí";
  if (quota.mode === "premium_only") return "Chỉ Premium";
  if (quota.mode === "free_unlimited" || quota.limit === null) return "Không giới hạn";
  return `${quota.limit} lượt/ngày`;
}
const CURRENCY = new Intl.NumberFormat("vi-VN");

function formatDay(value: Date | string | null): string {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "—";
}

function QuotaResetCountdown({ resetsAt, onReset }: { resetsAt: Date; onReset: () => void }): ReactElement {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);
  const target = resetsAt.getTime();
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (now < target || firedFor.current === target) return;
    firedFor.current = target;
    onReset();
  }, [now, target, onReset]);
  const remaining = target - now;
  if (remaining <= 0) return <p className="text-sm text-ink-soft">Đang cập nhật hạn mức…</p>;
  const minutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const label = hours ? (rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`) : `${rest} phút`;
  return <p className="text-sm text-ink-soft">Đặt lại sau {label}</p>;
}

export function MembershipPage(): ReactElement {
  const entitlement = useMembership();
  const plans = useMembershipPlans();
  const orders = useMembershipOrders();
  const create = useCreateOrder();
  const navigate = useNavigate();

  if (entitlement.isPending) return <main className="mx-auto min-h-[70vh] max-w-3xl px-5 pt-36"><LibraryState loading /></main>;
  if (entitlement.isError) return <main className="mx-auto min-h-[70vh] max-w-3xl px-5 pt-36"><LibraryState error title="Chưa tải được thông tin thành viên" retry={() => { void entitlement.refetch(); }} /></main>;
  const data = entitlement.data;
  const premium = data.tier === "premium";

  return <main className="mx-auto min-h-[80vh] max-w-6xl px-5 pb-24 pt-32 text-ink sm:px-8">
    <header className="grid gap-3">
      <Button asChild variant="outline" size="sm" className="w-fit"><Link to={APP_PATHS.home}>Quay lại</Link></Button>
      <h1 className="font-serif text-3xl font-bold tracking-tight md:text-5xl">Thành viên</h1>
    </header>

    {data.renewSoon && data.expiresAt ? <div role="status" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-paper-deep px-5 py-4 text-sm">
      <WarningCircle size={22} className="shrink-0 text-bronze-dark" aria-hidden="true" />
      <p className="min-w-[14rem] flex-1 leading-6">Còn <strong>{data.daysLeft ?? 0} ngày</strong> (hết hạn {formatDay(data.expiresAt)}).</p>
      <Button size="sm" className="w-full sm:w-auto" onClick={() => document.getElementById("goi")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Gia hạn</Button>
    </div> : null}

    <section aria-labelledby="status-title" className="mt-6 overflow-hidden rounded-2xl border border-bronze bg-paper-soft text-ink ring-1 ring-bronze/25">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="status-title" className="text-sm font-medium text-ink-soft">Gói hiện tại</h2>
            <p className="mt-2 font-serif text-3xl font-bold leading-none md:text-4xl">{premium ? "Premium" : "Miễn phí"}</p>
          </div>
          {premium ? <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-soft">Bắt đầu</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{formatDay(data.startsAt)}</dd></div>
            <div><dt className="text-ink-soft">Hết hạn</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{formatDay(data.expiresAt)}</dd></div>
            <div><dt className="text-ink-soft">Còn lại</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{data.daysLeft ?? 0} ngày</dd></div>
          </dl> : null}
        </div>
      </div>
    </section>

    {!premium && data.experienceQuotas.length ? <section aria-labelledby="quota-title" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quota-title" className="font-serif text-2xl font-bold">Hạn mức hôm nay</h2>
        <QuotaResetCountdown resetsAt={data.experienceQuotas[0]!.resetsAt} onReset={() => { void entitlement.refetch(); }} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {data.experienceQuotas.map((quota) => <div key={quota.feature} className="rounded-xl border border-line bg-paper-soft p-4">
          <p className="text-sm font-semibold">{FEATURE_LABEL[quota.feature] ?? quota.feature}</p>
          {quota.limit === null ? <p className="mt-2 text-base font-semibold text-ink-soft">{quota.mode === "premium_only" ? "Chỉ Premium" : "Không giới hạn"}</p>
            : <p className="mt-2 font-serif text-3xl font-bold leading-none tabular-nums">{quota.usedToday}<span className="text-lg font-semibold text-ink-soft">/{quota.limit}</span></p>}
        </div>)}
      </div>
    </section> : null}

    <section id="goi" aria-labelledby="plans-title" className="mt-10 scroll-mt-28">
      <h2 id="plans-title" className="font-serif text-2xl font-bold">Các gói</h2>
      {plans.isPending ? <div className="mt-4"><LibraryState loading /></div> : plans.isError ? <div className="mt-4"><LibraryState error retry={() => { void plans.refetch(); }} /></div> : <div className="mt-3 grid gap-3 md:grid-cols-2">
        {plans.data.map((plan) => {
          const highlighted = plan.isPurchasable;
          const isCurrent = premium ? plan.code === data.planCode : plan.priceVnd === 0;
          return <div key={plan.code} className={cn("flex flex-col rounded-2xl border p-6", highlighted ? "border-bronze bg-paper-soft text-ink ring-1 ring-bronze/25" : "border-line bg-paper-soft")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-serif text-xl font-bold">{plan.name}</p>
                <p className="mt-1 text-sm text-ink-soft">{plan.durationDays > 0 ? "Mở khoá toàn bộ tính năng" : "Dùng miễn phí hằng ngày"}</p>
              </div>
              {premium && isCurrent ? <span className="shrink-0 rounded-full border border-bronze/50 px-2 py-0.5 text-xs font-semibold">Đang dùng</span> : null}
            </div>
            <p className="mt-5 font-serif text-3xl font-bold tabular-nums">{CURRENCY.format(plan.priceVnd)}<span className="ml-0.5 text-lg">đ</span>
              <span className="ml-1 text-sm font-semibold text-ink-soft">{plan.durationDays > 0 ? `/ ${plan.durationDays} ngày` : "/ ngày"}</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-soft">
              {BENEFITS.map((benefit) => <li key={benefit.label} className="flex items-start gap-2">
                <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-bronze-dark" />
                <span>{benefit.label}: <span className="font-semibold text-ink">{plan.durationDays > 0 ? "Không giới hạn" : freeAllowance(data.experienceQuotas, benefit.feature)}</span></span>
              </li>)}
            </ul>
            <div className="mt-auto pt-6">
              {plan.isPurchasable ? <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate(plan.code, {
                onSuccess: (order) => navigate(`${APP_PATHS.membership}/payment/${order.id}`),
                onError: (error) => notify.error({ title: "Chưa tạo được đơn", description: error instanceof Error ? error.message : undefined }),
              })}>{premium ? "Gia hạn" : "Mua gói"}</Button> : plan.priceVnd === 0 ? <Button variant="outline" className="w-full" disabled>{premium ? "Gói cơ bản" : "Đang kích hoạt"}</Button> : <p className="text-sm text-ink-soft">Không mở bán</p>}
            </div>
          </div>;
        })}
      </div>}
    </section>

    <section aria-labelledby="orders-title" className="mt-12">
      <h2 id="orders-title" className="font-serif text-2xl font-bold">Lịch sử đơn</h2>
      {orders.isPending ? <div className="mt-4"><LibraryState loading /></div> : orders.isError ? <div className="mt-4"><LibraryState error retry={() => { void orders.refetch(); }} /></div> : !orders.data.items.length ? <div className="mt-4 rounded-2xl border border-line bg-paper-soft p-6 text-base text-ink-soft">Bạn chưa có đơn nào.</div> : <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper-soft">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-paper-deep text-left text-ink-soft"><tr><th className="p-4 font-semibold">Mã</th><th className="p-4 font-semibold">Gói</th><th className="p-4 font-semibold">Số tiền</th><th className="p-4 font-semibold">Nội dung chuyển khoản</th><th className="p-4 font-semibold">Trạng thái</th><th className="p-4 font-semibold">Tạo</th><th className="p-4 font-semibold">Thao tác</th></tr></thead>
          <tbody>{orders.data.items.map((order) => <tr key={order.id} className="border-t border-line align-top transition-colors hover:bg-paper-deep/40">
            <td className="p-4 text-ink-soft tabular-nums">{order.id.slice(0, 8)}</td>
            <td className="p-4 font-semibold">{order.planName}</td>
            <td className="p-4 tabular-nums">{CURRENCY.format(order.priceVnd)}đ</td>
            <td className="p-4 select-all">{order.transferContent}</td>
            <td className="p-4">{STATUS_LABEL[order.status]}{order.rejectionReason ? <span className="mt-1 block text-ink-soft">{order.rejectionReason}</span> : null}</td>
            <td className="p-4 tabular-nums">{formatDay(order.createdAt)}</td>
            <td className="p-4">{order.status === "pending" || order.status === "needs_review" ? <Link className="font-semibold text-vermilion hover:underline" to={`${APP_PATHS.membership}/payment/${order.id}`}>{order.status === "pending" ? "Thanh toán" : "Xem đơn"}</Link> : <span className="text-ink-soft">—</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </main>;
}
