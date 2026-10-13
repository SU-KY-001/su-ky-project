import type { ReactElement } from "react";
import { Bot, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { UploadedAudioPanel } from "./UploadedAudioPanel";
import { AiVoiceMockPanel } from "./AiVoiceMockPanel";

export function PodcastVoiceStep({ wizard, readOnly, published = false }: { wizard: PodcastCreationWizard; readOnly: boolean; published?: boolean }): ReactElement {
  if (readOnly) return (
    <section aria-labelledby="podcast-voice-title" className="space-y-4">
      <div><h2 id="podcast-voice-title" className="text-lg font-bold text-mod-text">Giọng đọc</h2><p className="mt-1 text-sm text-mod-text-secondary">File thu âm đã gắn với tập podcast.</p></div>
      {wizard.state.uploadedAudio?.previewUrl ? (
        <div className="rounded-xl border border-mod-border bg-mod-surface p-4">
          <p className="mb-3 font-semibold text-mod-text">Nghe file thu âm</p>
          <audio controls src={wizard.state.uploadedAudio.previewUrl} className="w-full" preload="metadata" />
        </div>
      ) : <p className="rounded-xl border border-dashed border-mod-border p-4 text-sm text-mod-text-secondary">Chưa có file thu âm.</p>}
      {wizard.state.uploadedAudio?.analysis ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-mod-canvas-accent p-3"><dt className="text-mod-text-secondary">Định dạng</dt><dd className="mt-1 font-semibold text-mod-text">{wizard.state.uploadedAudio.analysis.formatStatus === "PASS" ? "Đạt" : "Cần kiểm tra"}</dd></div>
          <div className="rounded-lg bg-mod-canvas-accent p-3"><dt className="text-mod-text-secondary">Thời lượng</dt><dd className="mt-1 font-semibold text-mod-text">{wizard.state.uploadedAudio.analysis.clientDurationMs ? `${Math.round(wizard.state.uploadedAudio.analysis.clientDurationMs / 1000)} giây` : "Chưa rõ"}</dd></div>
          <div className="rounded-lg bg-mod-canvas-accent p-3"><dt className="text-mod-text-secondary">Độ ồn</dt><dd className="mt-1 font-semibold text-mod-text">{wizard.state.uploadedAudio.analysis.noiseStatus === "PASS" ? "Ổn" : "Cần kiểm tra"}</dd></div>
        </dl>
      ) : null}
    </section>
  );
  const choices = [
    { id: "upload" as const, title: "Tải file thu âm", description: "Tải một file hoàn chỉnh, kiểm tra và nghe ngay.", icon: Upload },
    { id: "ai" as const, title: "Dùng giọng AI", description: "Xem trước luồng tạo giọng theo từng đoạn.", icon: Bot },
  ];
  return <section aria-labelledby="podcast-voice-title" className="space-y-5">
    <div><h2 id="podcast-voice-title" className="text-lg font-bold text-mod-text">Giọng đọc</h2><p className="mt-1 text-sm text-mod-text-secondary">Chọn rõ một chế độ sản xuất âm thanh cho tập podcast.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => { const Icon = choice.icon; const selected = wizard.state.voiceMode === choice.id; return <button key={choice.id} type="button" aria-pressed={selected} onClick={() => wizard.setVoiceMode(choice.id)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-colors", selected ? "border-mod-primary bg-mod-primary/5" : "border-mod-border hover:bg-mod-canvas-accent")}><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", selected ? "bg-mod-primary text-white" : "bg-mod-canvas-accent text-mod-text-secondary")}><Icon size={19} /></span><span><span className="block font-bold text-mod-text">{choice.title}</span><span className="mt-1 block text-sm text-mod-text-secondary">{choice.description}</span></span></button>; })}
    </div>
    {wizard.state.voiceMode === "upload" ? <UploadedAudioPanel wizard={wizard} published={published} /> : <AiVoiceMockPanel characterCount={wizard.state.scriptText.length} />}
  </section>;
}
