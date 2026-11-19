import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart";

const config = { value: { label: "Doanh thu đã thanh toán", color: "var(--modPrimary)" } } satisfies ChartConfig;
export interface PlanRevenue {
  label: string;
  value: number;
}

export function RevenueByPlanChart({ plans }: { plans?: PlanRevenue[] }): ReactNode {
  if (!plans?.length) return <div className="admin-premium-chart-placeholder"><span>Chưa có dữ liệu báo cáo</span><p>Chưa có doanh thu trong kỳ đã chọn.</p></div>;
  const total = plans.reduce((sum, plan) => sum + plan.value, 0);
  return <div className="admin-listening-chart">
    <p className="mb-2 text-[11px] text-mod-text-secondary">Đơn vị: triệu đồng</p>
    <ChartContainer config={config} className="admin-listening-chart-canvas">
      <BarChart accessibilityLayer data={plans} margin={{ top: 28, right: 12, left: 0, bottom: 8 }} aria-label="Biểu đồ cột doanh thu đã thanh toán theo gói. Dùng phím mũi tên để chọn gói." onTouchStart={(_, event) => {
        const touch = event.touches[0];
        if (touch) event.currentTarget.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: touch.clientX, clientY: touch.clientY }));
      }}>
        <CartesianGrid vertical={false} stroke="var(--modBorder)" strokeOpacity={0.65} />
        <XAxis dataKey="label" axisLine={{ stroke: "var(--modBorder)" }} tickLine={false} tickMargin={12} />
        <YAxis axisLine={false} tickLine={false} tickMargin={10} width={44} domain={[0, "auto"]} tickCount={4} tickFormatter={(value: number) => (value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} />
        <ChartTooltip cursor={false} isAnimationActive animationDuration={120} offset={12} content={<ChartTooltipContent className="admin-listening-tooltip" labelClassName="mb-1 border-b border-mod-border pb-2 text-[11px] font-semibold text-mod-text" formatter={(value) => <div className="grid w-full gap-1 rounded-md bg-mod-primary/5 px-2 py-2">
          <span className="text-[11px] text-mod-text-secondary">Doanh thu đã thanh toán</span>
          <strong className="text-lg tabular-nums text-mod-primary">{Number(value).toLocaleString("vi-VN")} <span className="text-xs font-normal">₫</span></strong>
          <span className="text-[11px] text-mod-text-secondary">{(total ? Number(value) / total * 100 : 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% tổng doanh thu</span>
        </div>} />} />
        <Bar dataKey="value" fill="var(--admin-chart-bar-fill)" radius={[6, 6, 0, 0]} maxBarSize={48} activeBar={false} isAnimationActive={false}>
          {plans.length <= 8 ? <LabelList dataKey="value" position="top" offset={10} fontSize={11} fontWeight={500} fill="var(--modTextSecondary)" formatter={(value: unknown) => `${(Number(value) / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr`} /> : null}
        </Bar>
      </BarChart>
    </ChartContainer>
    <p className="admin-chart-hint">Rê chuột hoặc chạm vào cột để xem số tiền và tỷ trọng của từng gói.</p>
  </div>;
}
