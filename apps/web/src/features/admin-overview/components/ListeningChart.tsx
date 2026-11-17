import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AdminListeningReport } from "@repo/shared";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/shared/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { defaultListeningGrouping, listeningBuckets, listeningValueAxis, type ListeningBucket, type ListeningGrouping } from "./listeningChartModel";

const config = { validListens: { label: "Lượt nghe được tính", color: "var(--modKindStage)" }, hours: { label: "Thời lượng nghe", color: "var(--modKindStage)" } } satisfies ChartConfig;
const shortDate = (date: string): string => date.slice(5).split("-").reverse().join("/");
const fullDate = (date: string): string => date.split("-").reverse().join("/");
const periodLabel = (row: ListeningBucket): string => row.from === row.to ? fullDate(row.from) : `${fullDate(row.from)} – ${fullDate(row.to)}`;
const subscribeMobile = (callback: () => void): (() => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(max-width: 640px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const getMobile = (): boolean => typeof window.matchMedia === "function" && window.matchMedia("(max-width: 640px)").matches;
export const listeningChartAxis = (values: number[]): { maximum: number; ticks: number[] } => listeningValueAxis(values, false);

function BucketDetails({ row }: { row: ListeningBucket }): ReactNode {
  const number = (value: number | null, unit: string, decimals = 0): ReactNode => <strong className="whitespace-nowrap text-[13px] tabular-nums text-mod-text">{value === null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: decimals })}<small className="ml-1 text-[10px] font-normal text-mod-text-secondary">{unit}</small></strong>;
  return <div className="grid gap-2"><p className="border-b border-mod-border pb-2 text-[11px] font-semibold text-mod-text">{periodLabel(row)}</p>
    <div className="flex items-center justify-between gap-3 rounded-md bg-mod-canvas-accent p-2"><span className="text-[11px] text-mod-text-secondary">Lượt nghe được tính</span>{number(row.validListens, "lượt")}</div>
    <div className="flex justify-between gap-3 px-2"><span className="text-[11px] text-mod-text-secondary">Số người nghe</span>{number(row.uniqueListeners, "người")}</div>
    <div className="flex justify-between gap-3 px-2"><span className="text-[11px] text-mod-text-secondary">Thời lượng nghe</span>{number(row.hours, "giờ", 2)}</div>
    {row.validListens === null ? <p className="text-[10px] text-mod-text-secondary">Chưa có dữ liệu cho khoảng thời gian này.</p> : null}
  </div>;
}

function InteractiveDetails({ row, active, mobile, onSelect }: { row?: ListeningBucket; active?: boolean; mobile: boolean; onSelect: (date: string) => void }): ReactNode {
  const date = row?.date;
  useEffect(() => { if (active && date) onSelect(date); }, [active, date, onSelect]);
  if (!active || !row || mobile) return null;
  return <div className="admin-listening-tooltip"><BucketDetails row={row} /></div>;
}

export function ListeningChart({ daily, weekly, monthly, from = daily[0]?.date ?? "", to = daily.at(-1)?.date ?? "" }: {
  daily: AdminListeningReport["daily"]; weekly?: AdminListeningReport["weekly"]; monthly?: AdminListeningReport["monthly"]; from?: string; to?: string;
}): ReactNode {
  const hintId = useId();
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);
  const [metric, setMetric] = useState<"validListens" | "hours">("validListens");
  const [choice, setChoice] = useState<ListeningGrouping | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const grouping = choice ?? defaultListeningGrouping(daily.length, mobile);
  const rows = from && to ? listeningBuckets(grouping === "day" ? daily : grouping === "week" ? weekly : monthly, grouping, from, to) : [];
  const selected = rows.find((row) => row.date === selectedDate);
  const axis = listeningValueAxis(rows.flatMap((row) => row[metric] === null ? [] : [row[metric]]), metric === "hours");
  const unit = grouping === "day" ? "ngày" : grouping === "week" ? "tuần" : "tháng";
  const interval = grouping === "day" && rows.length > 7 && rows.length <= 31 ? 2 : rows.length > 12 ? Math.ceil(rows.length / 10) - 1 : 0;
  const label = (row: ListeningBucket): string => grouping === "month" ? row.from.slice(0, 7).split("-").reverse().join("/") : shortDate(row.from);
  const toggle = (active: boolean): string => `rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-mod-kind-stage ${active ? "bg-mod-surface text-mod-text shadow-xs" : "text-mod-text-secondary hover:text-mod-text"}`;
  return <div className="admin-listening-chart">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Chỉ số biểu đồ" className="flex rounded-lg bg-mod-canvas-accent p-1">{(["validListens", "hours"] as const).map((value) => <button key={value} type="button" aria-pressed={metric === value} className={toggle(metric === value)} onClick={() => setMetric(value)}>{value === "validListens" ? "Lượt nghe" : "Thời lượng nghe"}</button>)}</div>
      <div role="group" aria-label="Mức gộp thời gian" className="flex rounded-lg bg-mod-canvas-accent p-1">{(["day", "week", "month"] as const).map((value) => <button key={value} type="button" aria-pressed={grouping === value} className={toggle(grouping === value)} onClick={() => { setChoice(value); setSelectedDate(null); }}>{value === "day" ? "Ngày" : value === "week" ? "Tuần" : "Tháng"}</button>)}</div>
    </div>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-mod-text-secondary"><span>Mỗi cột là một {unit} · Đơn vị: {metric === "hours" ? "giờ" : "lượt nghe"}</span>{from && to ? <span className="tabular-nums">{fullDate(from)} – {fullDate(to)}</span> : null}</div>
    <ChartContainer config={config} className="admin-listening-chart-canvas" aria-describedby={hintId}>
      <BarChart accessibilityLayer data={rows} barCategoryGap="25%" margin={{ top: 16, right: 8, left: 0, bottom: 12 }} aria-label={`Biểu đồ ${metric === "hours" ? "thời lượng nghe" : "lượt nghe"} theo ${unit}. Dùng phím mũi tên để chọn cột.`} onMouseMove={(state) => { if (typeof state.activeLabel === "string") setSelectedDate(state.activeLabel); }} onTouchStart={(_, event) => {
        const touch = event.touches[0];
        if (touch) event.currentTarget.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: touch.clientX, clientY: touch.clientY }));
      }}>
        <CartesianGrid vertical={false} stroke="var(--modBorder)" strokeOpacity={.6} />
        <XAxis dataKey="date" axisLine={{ stroke: "var(--modBorder)" }} tickLine={false} tickMargin={10} interval={interval} minTickGap={4} tickFormatter={(date: string) => { const row = rows.find((item) => item.date === date); return row ? label(row) : ""; }} />
        <YAxis axisLine={false} tickLine={false} width={42} tickMargin={8} domain={[0, axis.maximum]} ticks={axis.ticks} allowDecimals={metric === "hours"} tickFormatter={(value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: metric === "hours" ? 2 : 0, notation: value >= 10000 ? "compact" : "standard" })} />
        <ChartTooltip cursor={false} isAnimationActive={false} offset={12} content={({ active, label: date }) => {
          const row = rows.find((item) => item.date === date);
          return <InteractiveDetails active={active} row={row} mobile={mobile} onSelect={setSelectedDate} />;
        }} />
        <Bar dataKey={metric} fill="var(--modKindStage)" maxBarSize={36} radius={[4, 4, 0, 0]} activeBar={false} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
    {mobile && selected ? <div className="mt-3 rounded-lg border border-mod-border bg-mod-surface p-3" aria-live="polite"><BucketDetails row={selected} /></div> : null}
    {rows.some((row) => row[metric] === null) ? <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-mod-text-secondary">{rows.filter((row) => row[metric] === null).map((row) => <span key={row.date}>{label(row)}: —</span>)}</div> : null}
    <div className="admin-chart-reading"><span><span className="admin-chart-legend" />{metric === "hours" ? "Thời lượng nghe (giờ)" : "Lượt nghe được tính"}</span>
      <TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="flex items-center gap-1 text-[11px] text-mod-text-secondary" aria-label="Cách tính lượt nghe"><Info size={14} />Cách tính</button></TooltipTrigger><TooltipContent className="max-w-64 bg-mod-text text-mod-surface">Một lượt được tính sau 30 giây hoặc 80% tập, lấy mốc ngắn hơn. Người nghe được đếm riêng trong từng ngày, tuần hoặc tháng.</TooltipContent></Tooltip></TooltipProvider>
    </div>
    <p id={hintId} className="admin-chart-hint">{mobile ? "Chạm cột để xem chi tiết bên dưới." : "Rê chuột hoặc dùng phím mũi tên để xem chi tiết."} Tuần bắt đầu từ thứ Hai. 0 là không có lượt nghe; — là chưa có dữ liệu.</p>
  </div>;
}
