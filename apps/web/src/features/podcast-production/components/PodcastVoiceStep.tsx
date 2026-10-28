import type { ReactElement } from "react";
import { Bot, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { UploadedAudioPanel } from "./UploadedAudioPanel";
import { AudioDetails } from "./AudioDetails";
import { AiVoicePanel } from "./AiVoicePanel";
import { DialogueRecordingSheet } from "./DialogueRecordingSheet";

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
      <AudioDetails episodeId={wizard.state.episodeId ?? null} analysis={wizard.state.uploadedAudio?.analysis} />
    </section>
  );
  const { dialogue } = wizard.state;
  const choices = [
    { id: "upload" as const, title: dialogue ? "Thu âm thủ công" : "Tải file thu âm", description: dialogue ? "Hai người thu ngoài hệ thống theo bản đọc, rồi tải một file hoàn chỉnh lên." : "Tải một file hoàn chỉnh, kiểm tra và nghe ngay.", icon: Upload },
    { id: "ai" as const, title: "Dùng giọng AI", description: dialogue ? "AI đọc hai vai theo kịch bản hội thoại đã lưu." : "AI đọc kịch bản đã lưu thành file âm thanh.", icon: Bot },
  ];
  return <section aria-labelledby="podcast-voice-title" className="space-y-5">
    <div><h2 id="podcast-voice-title" className="text-lg font-bold text-mod-text">Giọng đọc</h2><p className="mt-1 text-sm text-mod-text-secondary">Chọn rõ một chế độ sản xuất âm thanh cho tập podcast.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => { const Icon = choice.icon; const selected = wizard.state.voiceMode === choice.id; return <button key={choice.id} type="button" aria-pressed={selected} onClick={() => wizard.setVoiceMode(choice.id)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-colors", selected ? "border-mod-primary bg-mod-primary/5" : "border-mod-border hover:bg-mod-canvas-accent")}><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", selected ? "bg-mod-primary text-white" : "bg-mod-canvas-accent text-mod-text-secondary")}><Icon size={19} /></span><span><span className="block font-bold text-mod-text">{choice.title}</span><span className="mt-1 block text-sm text-mod-text-secondary">{choice.description}</span></span></button>; })}
    </div>
    {wizard.state.voiceMode === "upload" ? (
      <div className="space-y-5">
        {dialogue ? <DialogueRecordingSheet dialogue={dialogue} /> : null}
        <UploadedAudioPanel wizard={wizard} published={published} />
      </div>
    ) : <AiVoicePanel wizard={wizard} published={published} />}
  </section>;
}
