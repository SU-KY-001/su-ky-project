import { useState, type FormEvent } from "react";
import { FormField, formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { primaryAction, secondaryAction } from "@/features/moderator/components/ModeratorTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import type { HistoricalPeriod } from "../types";

export type HistoricalDraftKind = "period" | "stage" | "event";
export interface HistoricalDraft {
  kind: HistoricalDraftKind;
  periodId: string;
  stageId: string;
  name: string;
  timeLabel: string;
  summary: string;
}

export function CreateHistoricalContentDialog({ periods, onBack, onSubmit }: { periods: HistoricalPeriod[]; onBack: () => void; onSubmit: (draft: HistoricalDraft) => void }) {
  const [kind, setKind] = useState<HistoricalDraftKind>("period");
  const [periodId, setPeriodId] = useState("");
  const [stageId, setStageId] = useState("");
  const [name, setName] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const stages = periods.find((period) => period.id === periodId)?.stages ?? [];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !timeLabel.trim() || !summary.trim()) { setError("Vui lòng điền đầy đủ tên, mốc thời gian và mô tả."); return; }
    if (kind !== "period" && !periods.some((period) => period.id === periodId)) { setError("Vui lòng chọn thời kỳ cha."); return; }
    if (kind === "event" && !stages.some((stage) => stage.id === stageId)) { setError("Vui lòng chọn giai đoạn cha."); return; }
    onSubmit({ kind, periodId, stageId, name: name.trim(), timeLabel: timeLabel.trim(), summary: summary.trim() });
  };
  return <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden border-mod-text-low/40 bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
    <DialogHeader className="shrink-0 px-6 py-5 pr-16">
      <DialogTitle className="text-xl font-bold">Tạo nội dung lịch sử</DialogTitle>
      <DialogDescription className="text-mod-text-secondary">Chọn loại nội dung, cấp cha và điền thông tin để lưu bản nháp.</DialogDescription>
    </DialogHeader>
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="mod-dialog-scroll-area flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
        <section className="grid gap-4 rounded-lg border border-mod-text-low/25 p-4 sm:grid-cols-2" aria-label="Phân loại nội dung">
          <FormField label="Loại nội dung" htmlFor="history-kind"><ModeratorSelect id="history-kind" label="Loại nội dung" value={kind} onValueChange={(value) => { if (value === "period" || value === "stage" || value === "event") { setKind(value); setError(""); } }} placeholder="Chọn loại nội dung" options={[{ value:"period", label:"Thời kỳ" }, { value:"stage", label:"Giai đoạn" }, { value:"event", label:"Sự kiện" }]} /></FormField>
          {kind !== "period" ? <FormField label="Thời kỳ" htmlFor="history-period" hint={periods.length ? undefined : "Tạo thời kỳ trước khi thêm nội dung con."}><ModeratorSelect id="history-period" required label="Thời kỳ" value={periodId} onValueChange={(value) => { setPeriodId(value); setStageId(""); setError(""); }} placeholder="Chọn thời kỳ" options={periods.map((period) => ({ value:period.id, label:period.name }))} /></FormField> : null}
          {kind === "event" ? <div className="sm:col-span-2"><FormField label="Giai đoạn" htmlFor="history-stage" hint={periodId && !stages.length ? "Thời kỳ này chưa có giai đoạn. Hãy tạo giai đoạn trước." : undefined}><ModeratorSelect id="history-stage" required disabled={!periodId || !stages.length} label="Giai đoạn" value={stageId} onValueChange={(value) => { setStageId(value); setError(""); }} placeholder="Chọn giai đoạn" options={stages.map((stage) => ({ value:stage.id, label:stage.name }))} /></FormField></div> : null}
        </section>
        <FormField label="Tên nội dung" htmlFor="history-name"><Input id="history-name" required aria-label="Tên nội dung" className={formField} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập tên thời kỳ, giai đoạn hoặc sự kiện" /></FormField>
        <FormField label="Mốc thời gian" htmlFor="history-time" hint="Nhập khoảng thời gian hoặc ngày cụ thể, gồm năm TCN nếu có."><Input id="history-time" required aria-label="Mốc thời gian" className={formField} value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} placeholder="Ví dụ: 938 – 1009 hoặc 02/09/1945" /></FormField>
        <FormField label="Mô tả" htmlFor="history-description"><Textarea id="history-description" required aria-label="Mô tả" className={formField + " min-h-32 resize-y leading-6"} rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Mô tả phạm vi và nội dung lịch sử" /></FormField>
        {error ? <p role="alert" className="rounded-md border border-mod-attention/30 bg-mod-attention/5 px-3 py-2 text-sm text-mod-attention">{error}</p> : null}
      </div>
      <footer className="flex shrink-0 justify-end gap-3 bg-mod-surface px-6 py-4"><Button type="button" variant="outline" onClick={onBack} className={secondaryAction}>Hủy</Button><Button type="submit" className={primaryAction}>Lưu bản nháp</Button></footer>
    </form>
  </DialogContent>;
}
