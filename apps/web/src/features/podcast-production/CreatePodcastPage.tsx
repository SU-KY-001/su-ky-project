import { useState, type FormEvent } from "react";
import { CreationPage, FormField, formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { primaryAction, secondaryAction } from "@/features/moderator/components/ModeratorTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import type { PodcastSeries } from "@/features/moderator/WorkspaceData";
import type { HistoricalPeriod } from "@/features/historical-library/types";

export interface PodcastDraft {
  kind: "series" | "episode";
  seriesId: string;
  eventId: string;
  name: string;
  description: string;
  script: string;
}

export function CreatePodcastPage({ series, periods, onBack, onSubmit, initialKind = "series" }: { series: PodcastSeries[]; periods: HistoricalPeriod[]; onBack: () => void; onSubmit: (draft: PodcastDraft) => void; initialKind?: "series" | "episode" }) {
  const [kind, setKind] = useState<"series" | "episode">(initialKind);
  const [seriesId, setSeriesId] = useState("");
  const [eventId, setEventId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");
  const [error, setError] = useState("");
  const events = periods.flatMap((period) => period.stages.flatMap((stage) => stage.events.map((event) => ({ event, label: [period.name, stage.name, event.name].join(" / ") }))));
  const chosenSeries = series.find((item) => item.id === seriesId);
  const effectiveEventId = kind === "episode" && chosenSeries?.eventId ? chosenSeries.eventId : eventId;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !description.trim()) { setError("Vui lòng điền tên và mô tả podcast."); return; }
    if (kind === "episode" && !chosenSeries) { setError("Vui lòng chọn series."); return; }
    if (!events.some(({ event }) => event.id === effectiveEventId)) { setError("Vui lòng chọn sự kiện lịch sử liên quan."); return; }
    onSubmit({ kind, seriesId, eventId: effectiveEventId, name: name.trim(), description: description.trim(), script: script.trim() });
  };
  return <CreationPage title="Tạo podcast" onBack={onBack}>
    <form noValidate onSubmit={submit} className="flex w-full min-w-0 flex-col gap-6">
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)]">
        <Card className="min-w-0 border-mod-text-low/35 bg-mod-surface text-mod-text shadow-sm">
          <CardHeader><CardTitle>Phân loại podcast</CardTitle><CardDescription className="text-mod-text-secondary">Chọn series và nội dung lịch sử liên quan.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FormField label="Loại podcast" htmlFor="podcast-kind"><ModeratorSelect id="podcast-kind" label="Loại podcast" value={kind} onValueChange={(value) => { if (value === "series" || value === "episode") { setKind(value); setError(""); } }} placeholder="Chọn loại podcast" options={[{value:"series",label:"Series"},{value:"episode",label:"Tập podcast"}]} /></FormField>
            {kind === "episode" ? <FormField label="Series" htmlFor="podcast-series" hint={!series.length ? "Tạo series trước khi thêm tập podcast." : undefined}><ModeratorSelect id="podcast-series" required label="Series" value={seriesId} onValueChange={(value) => { setSeriesId(value); setEventId(""); setError(""); }} placeholder="Chọn series" options={series.map((item) => ({value:item.id,label:item.name}))} /></FormField> : null}
            <FormField label="Sự kiện lịch sử" htmlFor="podcast-event" hint={kind === "episode" && chosenSeries?.eventId ? "Tập podcast sử dụng sự kiện đã gắn với series." : "Chọn sự kiện làm cơ sở cho nội dung podcast."}><ModeratorSelect id="podcast-event" required label="Sự kiện lịch sử" disabled={kind === "episode" && Boolean(chosenSeries?.eventId)} value={effectiveEventId} onValueChange={setEventId} placeholder="Chọn sự kiện lịch sử" options={events.map(({event,label})=>({value:event.id,label}))} /></FormField>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-mod-text-low/35 bg-mod-surface text-mod-text shadow-sm">
          <CardHeader><CardTitle>Thông tin podcast</CardTitle><CardDescription className="text-mod-text-secondary">Tên, mô tả và kịch bản của nội dung.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FormField label={kind === "series" ? "Tên series" : "Tên tập podcast"} htmlFor="podcast-name"><Input id="podcast-name" required aria-label="Tên podcast" className={formField} value={name} onChange={(event) => setName(event.target.value)} /></FormField>
            <FormField label="Mô tả" htmlFor="podcast-description"><Textarea autoGrow id="podcast-description" required aria-label="Mô tả podcast" className={formField + " min-h-40 leading-6"} value={description} onChange={(event) => setDescription(event.target.value)} /></FormField>
            {kind === "episode" ? <FormField label="Kịch bản" htmlFor="podcast-script" hint="Có thể bổ sung kịch bản sau khi lưu bản nháp."><Textarea id="podcast-script" aria-label="Kịch bản" className={formField + " min-h-64 resize-y leading-6"} rows={12} value={script} onChange={(event) => setScript(event.target.value)} placeholder="Nhập kịch bản cho tập podcast" /></FormField> : null}
          </CardContent>
        </Card>
      </div>
      {error ? <p role="alert" className="rounded-md border border-mod-attention/30 bg-mod-attention/5 px-3 py-2 text-sm text-mod-attention">{error}</p> : null}
      <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-mod-text-low/30 bg-mod-surface py-4"><Button type="button" variant="outline" className={secondaryAction} onClick={onBack}>Hủy</Button><Button type="submit" className={primaryAction}>Lưu bản nháp</Button></footer>
    </form>
  </CreationPage>;
}
