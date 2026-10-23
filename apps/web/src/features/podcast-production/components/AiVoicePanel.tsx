import { useState, type ReactElement } from "react";
import { AI_VOICES, type AiVoice } from "@repo/shared";
import { LoaderCircle, Mic, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { useVoiceJob } from "../voice/useVoiceJob";
import { UploadedAudioPanel } from "./UploadedAudioPanel";
import { VOICE_LABEL } from "../voice/voiceLabels";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

const duration = (ms: number): string => `${Math.floor(ms / MS_PER_SECOND / SECONDS_PER_MINUTE)} phút ${Math.round(ms / MS_PER_SECOND) % SECONDS_PER_MINUTE} giây`;

export function AiVoicePanel({ wizard, published }: { wizard: PodcastCreationWizard; published: boolean }): ReactElement {
  const episodeId = wizard.state.episodeId ?? null;
  const [voice, setVoice] = useState<AiVoice>(AI_VOICES[0]);
  const { job, file, error, starting, start, cancel } = useVoiceJob(episodeId);
  const running = job?.status === "RUNNING";
  const hasScript = wizard.state.scriptText.trim().length > 0;

  return (
    <section className="space-y-5" aria-labelledby="ai-voice-title">
      <div>
        <h3 id="ai-voice-title" className="font-bold text-mod-text">Tạo giọng đọc bằng AI</h3>
        <p className="mt-1 text-sm text-mod-text-secondary">AI đọc kịch bản đã lưu của tập (bỏ qua các tiêu đề phần). Mỗi lần tạo tốn lượt gọi dịch vụ giọng đọc, nên hãy chọn giọng trước.</p>
      </div>

      <div className="max-w-lg">
        <FormField label="Giọng đọc" htmlFor="ai-voice">
          <ModeratorSelect
            id="ai-voice"
            label="Giọng đọc"
            value={voice}
            onValueChange={(value) => {
              const selected = AI_VOICES.find((id) => id === value);
              if (selected) setVoice(selected);
            }}
            options={AI_VOICES.map((id) => ({ value: id, label: `${VOICE_LABEL[id].name} — ${VOICE_LABEL[id].detail}` }))}
            placeholder="Chọn giọng đọc"
            disabled={running || starting}
          />
        </FormField>
      </div>

      {!episodeId || !hasScript ? <p className="rounded-lg border border-mod-attention/30 bg-mod-attention/5 p-3 text-sm text-mod-attention">Cần có kịch bản đã lưu ở bước Kịch bản trước khi tạo giọng.</p> : null}

      {running && job ? (
        <div className="space-y-2" role="status">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-mod-text"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Đang tạo giọng: {job.done}/{job.total} phần</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void cancel()}><X size={14} aria-hidden="true" /> Hủy</Button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-mod-canvas-accent" role="progressbar" aria-valuemin={0} aria-valuemax={job.total} aria-valuenow={job.done}>
            <div className="h-full bg-mod-primary transition-[width]" style={{ width: `${(job.done / Math.max(job.total, 1)) * 100}%` }} />
          </div>
          <p className="text-xs text-mod-text-secondary">Có thể mất vài phút. Bạn có thể rời trang rồi quay lại, tiến độ vẫn được giữ trong lúc máy chủ còn chạy.</p>
        </div>
      ) : (
        <Button type="button" disabled={!episodeId || !hasScript || starting} onClick={() => void start(voice)}>
          {starting ? <LoaderCircle className="animate-spin" /> : <Mic />} {job?.status === "DONE" ? "Tạo lại giọng đọc" : "Tạo giọng đọc"}
        </Button>
      )}

      {job?.status === "ERROR" ? <p role="alert" className="text-sm text-mod-danger">{job.error ?? "Tạo giọng thất bại."}</p> : null}
      {job?.status === "CANCELLED" ? <p className="text-sm text-mod-text-secondary">Đã hủy. Phần đã tạo không được lưu.</p> : null}
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
      {job?.status === "DONE" && job.durationMs !== null ? <p className="text-sm font-semibold text-mod-text">Đã tạo xong {duration(job.durationMs)} âm thanh. Nghe thử rồi bấm "Dùng làm âm thanh của tập". Giọng này được tạo bằng AI.</p> : null}

      {file && job ? (
        <UploadedAudioPanel wizard={wizard} published={published} incomingFile={file} incomingOrigin={{ kind: "AI_VOICE", voice: job.voice, model: job.model, style: job.style, chars: job.chars, scriptHash: job.scriptHash }} />
      ) : null}
    </section>
  );
}
