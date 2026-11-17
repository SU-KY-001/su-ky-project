import { useState, type ReactNode } from "react";
import { AdminListeningReportQuerySchema, type AdminListeningReportQuery } from "@repo/shared";
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Check } from "@phosphor-icons/react/dist/icons/Check";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export function listeningPeriod(days: number, now = new Date()): AdminListeningReportQuery {
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  return { from: new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10), to: today };
}

export function monthReportPeriod(month: string, now = new Date()): AdminListeningReportQuery {
  const today = listeningPeriod(1, now).to;
  const [year, number] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year ?? 0, number ?? 1, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to: month === today.slice(0, 7) ? today : end };
}

export function calendarReportPeriod(preset: "month" | "previous-month", now = new Date()): AdminListeningReportQuery {
  const today = listeningPeriod(1, now).to;
  const day = new Date(`${today}T00:00:00Z`);
  const iso = (date: Date): string => date.toISOString().slice(0, 10);
  const month = preset === "month" ? today.slice(0, 7) : iso(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1))).slice(0, 7);
  return monthReportPeriod(month, now);
}

const samePeriod = (a: AdminListeningReportQuery, b: AdminListeningReportQuery): boolean => a.from === b.from && a.to === b.to;

export function ReportPeriodPicker({ value, onChange }: { value: AdminListeningReportQuery; onChange: (value: AdminListeningReportQuery) => void }): ReactNode {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [appliedMode, setAppliedMode] = useState<"day" | "month">(() => samePeriod(monthReportPeriod(value.from.slice(0, 7)), value) ? "month" : "day");
  const [mode, setMode] = useState(appliedMode);
  const [month, setMonth] = useState(value.from.slice(0, 7));
  const today = listeningPeriod(1).to;
  const label = (date: string): string => date.split("-").reverse().join("/");
  const years = [...new Set([value.from.slice(0, 4), ...Array.from({ length: 10 }, (_, index) => String(Number(today.slice(0, 4)) - index))])].sort().reverse();
  const selectMonth = (next: string): void => { setMonth(next); setDraft(monthReportPeriod(next)); setError(""); };
  const days = Math.round((Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000) + 1;
  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) { setDraft(value); setMonth(value.from.slice(0, 7)); setMode(appliedMode); setError(""); } }}>
    <PopoverTrigger asChild><Button variant="outline" className="admin-overview-outline h-14 gap-3 py-2 text-left"><CalendarBlank size={17} /><span className="grid gap-0.5"><span className="text-xs font-semibold text-mod-text">{appliedMode === "month" ? `Tháng ${Number(value.from.slice(5, 7))}/${value.from.slice(0, 4)}` : "Theo ngày"}</span><span className="text-[11px] font-normal">{label(value.from)} – {label(value.to)}</span></span></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(400px,calc(100vw-32px))] border-mod-border bg-mod-surface p-5 text-mod-text">
      <form onSubmit={(event) => {
        event.preventDefault();
        const parsed = AdminListeningReportQuerySchema.safeParse(draft);
        if (!parsed.success || draft.to > today) { setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày và không vượt quá hôm nay."); return; }
        onChange(parsed.data); setAppliedMode(mode); setOpen(false);
      }}>
        <p className="text-sm font-semibold">Lọc thống kê người nghe</p>
        <p className="mt-1 text-[11px] leading-5 text-mod-text-secondary">Chọn khoảng ngày hoặc một tháng cụ thể. Tháng hiện tại tính đến hôm nay.</p>
        <div className="my-4 grid grid-cols-2 gap-2">{(["day", "month"] as const).map((option) => {
          const selected = mode === option;
          return <button key={option} type="button" aria-pressed={selected} className={`relative rounded-lg border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-mod-primary ${selected ? "border-mod-primary/40 bg-mod-primary/5 text-mod-primary" : "border-mod-border bg-mod-surface text-mod-text hover:bg-mod-canvas-accent"}`} onClick={() => { setMode(option); if (option === "month") setDraft(monthReportPeriod(month)); setError(""); }}><span className="text-xs font-semibold">{option === "day" ? "Theo ngày" : "Theo tháng"}</span>{selected ? <Check size={14} className="absolute right-3 top-3" aria-hidden="true" /> : null}<span className="mt-1 block text-[10px] text-mod-text-secondary">{option === "day" ? "Chọn ngày bắt đầu và kết thúc" : "Chọn tháng và năm"}</span></button>;
        })}</div>
        {mode === "day" ? <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5 text-xs"><span>Từ ngày</span><DatePicker ariaLabel="Báo cáo từ ngày" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} /></div>
          <div className="grid gap-1.5 text-xs"><span>Đến ngày</span><DatePicker ariaLabel="Báo cáo đến ngày" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} /></div>
        </div> : <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5 text-xs"><span>Tháng</span><Select value={month.slice(5, 7)} onValueChange={(number) => selectMonth(`${month.slice(0, 4)}-${number}`)}><SelectTrigger aria-label="Tháng báo cáo" className="w-full border-mod-border bg-mod-surface"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((number) => <SelectItem key={number} value={number} disabled={`${month.slice(0, 4)}-${number}` > today.slice(0, 7)}>Tháng {Number(number)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5 text-xs"><span>Năm</span><Select value={month.slice(0, 4)} onValueChange={(year) => { const next = `${year}-${month.slice(5, 7)}`; selectMonth(next > today.slice(0, 7) ? today.slice(0, 7) : next); }}><SelectTrigger aria-label="Năm báo cáo" className="w-full border-mod-border bg-mod-surface"><SelectValue /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div>
        </div>}
        {error ? <p role="alert" className="mt-2 text-xs text-mod-danger">{error}</p> : null}
        <div className="mt-4 rounded-lg bg-mod-canvas-accent px-3 py-2 text-[11px] leading-5 text-mod-text-secondary">{Number.isFinite(days) && days > 0 ? `${label(draft.from)} – ${label(draft.to)} · ${days} ngày` : "Chọn ngày bắt đầu và kết thúc"}</div>
        <div className="mt-4 flex gap-2"><Button type="button" variant="outline" className="admin-overview-outline flex-1" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" className="flex-1 bg-mod-primary text-white hover:bg-mod-primary-hover">Áp dụng bộ lọc</Button></div>
      </form>
    </PopoverContent>
  </Popover>;
}
