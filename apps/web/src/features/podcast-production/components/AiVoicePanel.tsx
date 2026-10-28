import { useEffect, useRef, useState, type ReactElement } from "react";
import { AI_VOICES, type AiVoice } from "@repo/shared";
import { LoaderCircle, Mic } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import { useVoiceJob } from "../voice/useVoiceJob";
import { UploadedAudioPanel } from "./UploadedAudioPanel";
import { VOICE_LABEL } from "../voice/voiceLabels";
import { AiRunStatus } from "../ai/AiRunStatus";
import { useAiRunLog } from "../ai/aiRunLog";
import { AI_RUN_TEXT } from "../ai/aiRunMessages";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

const duration = (ms: number): string => `${Math.floor(ms / MS_PER_SECOND / SECONDS_PER_MINUTE)} phút ${Math.round(ms / MS_PER_SECOND) % SECONDS_PER_MINUTE} giây`;

export function AiVoicePanel({ wizard, published }: { wizard: PodcastCreationWizard; published: boolean }): ReactElement {
  const episodeId = wizard.state.episodeId ?? null;
  const [voice, setVoice] = useState<AiVoice>(AI_VOICES[0]);
  const { job, file, error, starting, start, cancel } = useVoiceJob(episodeId);
  const running = job?.status === "RUNNING";
  const hasScript = wizard.state.scriptText.trim().length > 0;
  const { dialogue } = wizard.state;
  const runLog = useAiRunLog();
  const loggedJob = useRef({ id: "", done: -1 });
  const jobId = job?.id;
  const jobDone = job?.done;
  const jobTotal = job?.total;
  useEffect(() => {
    if (!running || jobId === undefined || jobDone === undefined || jobTotal === undefined) return;
    const text = AI_RUN_TEXT.voiceStep(jobDone, jobTotal);
    if (loggedJob.current.id !== jobId) runLog.begin(text);
    else if (loggedJob.current.done !== jobDone) runLog.push("step", text);
    loggedJob.current = { id: jobId, done: jobDone };
  }, [running, jobId, jobDone, jobTotal, runLog.begin, runLog.push]);

  return (
    <section className="space-y-5" aria-labelledby="ai-voice-title">
      <div>
        <h3 id="ai-voice-title" className="font-bold text-mod-text">Tạo giọng đọc bằng AI</h3>
        <p className="mt-1 text-sm text-mod-text-secondary">
          {dialogue
            ? "AI đọc hai vai theo kịch bản hội thoại đã lưu, giữ giọng điệu và expression của từng lượt. Sửa kịch bản sau này phải tạo lại cả tập."
            : "AI đọc kịch bản đã lưu của tập (bỏ qua các tiêu đề phần). Mỗi lần tạo tốn lượt gọi dịch vụ giọng đọc, nên hãy chọn giọng trước."}
        </p>
      </div>

      {dialogue ? (
        <ul className="max-w-lg space-y-1 text-sm text-mod-text">
          {dialogue.speakers.map((speaker) => <li key={speaker.key}><span className="font-semibold">{speaker.name}</span>: {VOICE_LABEL[speaker.voice].name} — {VOICE_LABEL[speaker.voice].detail}</li>)}
        </ul>
      ) : (
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
      )}

      {!episodeId || !hasScript ? <p className="rounded-lg border border-mod-attention/30 bg-mod-attention/5 p-3 text-sm text-mod-attention">Cần có kịch bản đã lưu ở bước Kịch bản trước khi tạo giọng.</p> : null}

      {running && job ? (
        <AiRunStatus title={AI_RUN_TEXT.voiceTitle} step={AI_RUN_TEXT.voiceStep(job.done, job.total)} done={job.done} total={job.total} log={runLog.entries} startedAt={runLog.startedAt} hint={AI_RUN_TEXT.voiceHint} onCancel={() => void cancel()} />
      ) : (
        <Button type="button" disabled={!episodeId || !hasScript || starting} onClick={() => void start(dialogue ? undefined : voice)}>
          {starting ? <LoaderCircle className="animate-spin" /> : <Mic />} {job?.status === "DONE" ? "Tạo lại giọng đọc" : "Tạo giọng đọc"}
        </Button>
      )}

      {job?.status === "ERROR" ? <p role="alert" className="text-sm text-mod-danger">{job.error ?? "Tạo giọng thất bại."}</p> : null}
      {job?.status === "CANCELLED" ? <p className="text-sm text-mod-text-secondary">Đã hủy. Phần đã tạo không được lưu.</p> : null}
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
      {job?.status === "DONE" && job.durationMs !== null ? <p className="text-sm font-semibold text-mod-text">Đã tạo xong {duration(job.durationMs)} âm thanh. Nghe thử rồi bấm "Dùng làm âm thanh của tập". Giọng này được tạo bằng AI.</p> : null}

      {file && job ? (
        <UploadedAudioPanel wizard={wizard} published={published} incomingFile={file} incomingOrigin={{ kind: "AI_VOICE", voice: job.voice ?? dialogue?.speakers.map((speaker) => speaker.voice).join(" + ") ?? "", model: job.model, style: job.style, chars: job.chars, scriptHash: job.scriptHash }} />
      ) : null}
    </section>
  );
}
