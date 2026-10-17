import { useState, type ReactElement, type ReactNode } from "react";
import type { HistoricalDateDto, HistoricalTimeDto } from "@repo/shared";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { formField } from "@/features/moderator/components/CreationPage";
import { cn } from "@/lib/utils";

function emptyDate(): HistoricalDateDto {
  return { year: 0, precision: "YEAR", approximate: false };
}
export function emptyHistoricalTime(taxonomy = false): HistoricalTimeDto {
  return taxonomy ? { kind: "RANGE", start: emptyDate(), end: emptyDate(), endState: "KNOWN" } : { kind: "POINT", at: emptyDate() };
}

function TimeChoice({ children, label, selected, disabled = false, onClick }: {
  children: ReactNode; label: string; selected: boolean; disabled?: boolean; onClick: () => void;
}): ReactElement {
  return <button type="button" aria-label={label} aria-pressed={selected} disabled={disabled} onClick={onClick}
    className={cn("min-h-8 rounded-md border px-3 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-40", selected ? "border-mod-primary bg-mod-primary/10 text-mod-primary" : "border-mod-border bg-transparent text-mod-text")}>
    {children}
  </button>;
}

function DateFields({ label, title, value, unknown, ongoing = false, onChange, onUnknown, onOngoing, taxonomy }: {
  label: string; title: string; value: HistoricalDateDto | null; unknown: boolean; ongoing?: boolean;
  onChange: (date: HistoricalDateDto) => void; onUnknown: (date: HistoricalDateDto) => void;
  onOngoing?: (date: HistoricalDateDto) => void; taxonomy: boolean;
}): ReactElement {
  const [remembered, setRemembered] = useState<HistoricalDateDto>(value ?? emptyDate());
  const [emptyEra, setEmptyEra] = useState(value && value.year < 0 ? "BCE" : "CE");
  const date = value ?? remembered;
  const era = date.year === 0 ? emptyEra : date.year < 0 ? "BCE" : "CE";
  const unavailable = unknown || ongoing;
  const update = (next: HistoricalDateDto): void => { setRemembered(next); onChange(next); };
  return <section aria-label={title} className="min-w-0 space-y-3 rounded-xl border border-mod-border bg-mod-canvas-accent/30 p-3.5">
    <p className="text-xs font-semibold text-mod-text-secondary">{title}</p>
    <div className="flex items-center gap-2">
      <Input aria-label={"Năm " + label} type="number" min={1} max={2147483648} disabled={unavailable}
        placeholder={title === "Đến" ? "Ví dụ: 206" : "Ví dụ: 221"} className={cn(formField, "min-w-0 flex-1 min-h-9")}
        value={date.year === 0 ? "" : Math.abs(date.year)}
        onChange={(e) => update({ ...date, year: (era === "BCE" ? -1 : 1) * Number(e.target.value) })} />
      <div role="group" aria-label={"Niên đại " + label} className="flex shrink-0 gap-1">
        {(["BCE", "CE"] as const).map((nextEra) => <TimeChoice key={nextEra} label={(nextEra === "BCE" ? "TCN " : "CN ") + label} selected={era === nextEra} disabled={unavailable}
          onClick={() => { setEmptyEra(nextEra); update({ ...date, year: (nextEra === "BCE" ? -1 : 1) * Math.abs(date.year) }); }}>
          {nextEra === "BCE" ? "TCN" : "CN"}
        </TimeChoice>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <TimeChoice label={"Ước lượng " + label} selected={date.approximate && !unavailable} disabled={unavailable} onClick={() => update({ ...date, approximate: !date.approximate })}>Ước lượng</TimeChoice>
      <TimeChoice label={"Chưa rõ " + label} selected={unknown} onClick={() => onUnknown(date)}>Chưa rõ</TimeChoice>
      {onOngoing ? <TimeChoice label={"Đến nay " + label} selected={ongoing} onClick={() => onOngoing(date)}>Đến nay</TimeChoice> : null}
    </div>
    {!taxonomy ? <>
      <TimeChoice label={(date.precision === "YEAR" ? "Thêm tháng/ngày " : "Chỉ năm ") + label} selected={date.precision !== "YEAR"} disabled={unavailable}
        onClick={() => update(date.precision === "YEAR" ? { ...date, precision: "MONTH" } : { year: date.year, precision: "YEAR", approximate: date.approximate })}>
        {date.precision === "YEAR" ? "+ Thêm tháng/ngày" : "− Chỉ năm"}
      </TimeChoice>
      {date.precision !== "YEAR" ? <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-mod-text-secondary">Tháng
          <Input aria-label={"Tháng " + label} type="number" min={1} max={12} disabled={unavailable} className={formField} value={date.month ?? ""}
            onChange={(e) => update({ ...date, month: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="space-y-1 text-xs text-mod-text-secondary">Ngày (tùy chọn)
          <Input aria-label={"Ngày " + label} type="number" min={1} max={31} disabled={unavailable} className={formField} value={date.day ?? ""}
            onChange={(e) => update({ ...date, precision: e.target.value ? "DAY" : "MONTH", day: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
      </div> : null}
    </> : null}
  </section>;
}

export function HistoricalTimeFields({ value, onChange, taxonomy = false }: {
  value: HistoricalTimeDto; onChange: (value: HistoricalTimeDto) => void; taxonomy?: boolean;
}): ReactElement {
  const uncertain = value.kind === "UNKNOWN" || (value.kind === "RANGE" && (value.start === null || value.endState === "UNKNOWN"));
  const update = (next: HistoricalTimeDto): void => {
    const unknown = next.kind === "UNKNOWN" || (next.kind === "RANGE" && (next.start === null || next.endState === "UNKNOWN"));
    onChange(unknown ? next : { ...next, note: undefined });
  };
  return <fieldset className="min-w-0 space-y-3">
    <legend className="mb-2 text-sm font-semibold">Mốc thời gian</legend>
    <div role="group" aria-label="Kiểu thời gian" className="flex flex-wrap gap-2">
      {(!taxonomy ? ["POINT", "RANGE", "UNKNOWN"] as const : ["RANGE", "UNKNOWN"] as const).map((kind) => <TimeChoice key={kind}
        label={kind === "POINT" ? "Một mốc thời gian" : kind === "RANGE" ? "Khoảng thời gian" : "Chưa xác định thời gian"} selected={value.kind === kind}
        onClick={() => { if (value.kind === kind) return; update(kind === "UNKNOWN" ? { kind, note: "" } : kind === "RANGE" ? { kind, start: emptyDate(), end: emptyDate(), endState: "KNOWN" } : { kind, at: emptyDate() }); }}>
        {kind === "POINT" ? "Một mốc" : kind === "RANGE" ? "Khoảng thời gian" : "Chưa xác định"}
      </TimeChoice>)}
    </div>
    {value.kind === "RANGE" ? <div className="grid items-start gap-3 sm:grid-cols-2">
      <DateFields key="start" title="Từ" label="bắt đầu" value={value.start} unknown={value.start === null} taxonomy={taxonomy}
        onChange={(start) => update({ ...value, start })}
        onUnknown={(date) => update({ ...value, start: value.start === null ? date : null })} />
      <DateFields key="end" title="Đến" label="kết thúc" value={value.end} unknown={value.endState === "UNKNOWN"} ongoing={value.endState === "ONGOING"} taxonomy={taxonomy}
        onChange={(end) => update({ ...value, end, endState: "KNOWN" })}
        onUnknown={(date) => update({ ...value, end: value.endState === "UNKNOWN" ? date : null, endState: value.endState === "UNKNOWN" ? "KNOWN" : "UNKNOWN" })}
        onOngoing={(date) => update({ ...value, end: value.endState === "ONGOING" ? date : null, endState: value.endState === "ONGOING" ? "KNOWN" : "ONGOING" })} />
    </div> : value.kind === "UNKNOWN" && taxonomy ? null : <DateFields key="point" title="Mốc thời gian" label="sự kiện" value={value.kind === "POINT" ? value.at : null} unknown={value.kind === "UNKNOWN"} taxonomy={taxonomy}
      onChange={(at) => update({ kind: "POINT", at })}
      onUnknown={(date) => update(value.kind === "UNKNOWN" ? { kind: "POINT", at: date } : { kind: "UNKNOWN", note: "" })} />}
    {uncertain ? <label className="block space-y-1 text-xs font-semibold">Ghi chú thời gian chưa xác định
      <Textarea autoGrow aria-label="Ghi chú thời gian" className={cn(formField, "min-h-16")} value={value.note ?? ""}
        onChange={(e) => onChange({ ...value, note: e.target.value })} placeholder="Giải thích mốc chưa xác định hoặc thông tin hiện có từ tài liệu" />
    </label> : null}
    <p className="text-xs text-mod-text-secondary">Không có năm 0.{taxonomy ? " Thời kỳ và giai đoạn sử dụng khoảng năm." : " Chỉ thêm tháng/ngày khi tài liệu xác định được."}</p>
  </fieldset>;
}
