import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import type { AudioAnalysis } from "@repo/shared";
import { CheckCircle2, LoaderCircle, Upload, Volume2 } from "lucide-react";
import { uploadCatalogMedia } from "@/features/historical-library/services/catalogMediaService";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import {
  analyzePodcastAudio,
  createObjectUrlLease,
  isSupportedPodcastAudio,
} from "../audioAnalysis";
import { useWordsPerMinute } from "../hooks/usePodcastProduction";
import { estimatedDurationMs } from "../scriptDuration";

const statusLabel = {
  PASS: "Đạt",
  WARNING: "Cần kiểm tra",
  UNKNOWN: "Chưa xác định",
} as const;

export function UploadedAudioPanel({
  wizard,
  published,
}: {
  wizard: PodcastCreationWizard;
  published: boolean;
}): ReactElement {
  const leaseRef = useRef<ReturnType<typeof createObjectUrlLease> | null>(null);
  if (!leaseRef.current) leaseRef.current = createObjectUrlLease();
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(
    wizard.state.uploadedAudio?.analysis ?? null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const wordsPerMinute = useWordsPerMinute();
  // Config still loading: 0 means "no estimate", which the analysis reports as UNKNOWN rather than a wrong number.
  const estimatedMs = wordsPerMinute ? estimatedDurationMs(wizard.state.scriptText, wordsPerMinute) : 0;

  useEffect(() => () => leaseRef.current?.dispose(), []);

  const selectAudio = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!isSupportedPodcastAudio(selected)) {
      setError("Chỉ hỗ trợ MP3, M4A hoặc OGG đúng định dạng âm thanh.");
      return;
    }
    setError("");
    setFile(selected);
    setConfirmReplace(false);
    setLocalPreview(leaseRef.current?.replace(selected) ?? null);
    setAnalyzing(true);
    try {
      setAnalysis(await analyzePodcastAudio(selected, estimatedMs));
    } catch {
      setAnalysis(null);
      setError("Không đọc được thông tin âm thanh. Hãy thử một file khác.");
    } finally {
      setAnalyzing(false);
    }
  };

  const upload = async (): Promise<void> => {
    if (!file || !analysis) return;
    setUploading(true);
    setError("");
    try {
      const assetId = await uploadCatalogMedia(file, "AUDIO");
      await wizard.attachAudio(assetId, analysis, localPreview, published && Boolean(wizard.state.uploadedAudio) && confirmReplace);
      leaseRef.current?.dispose();
      setLocalPreview(null);
      setFile(null);
      setConfirmReplace(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được file thu âm.");
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = localPreview ?? wizard.state.uploadedAudio?.previewUrl ?? null;
  const needsConfirmation = published && Boolean(wizard.state.uploadedAudio) && Boolean(file);
  return (
    <section className="space-y-4" aria-labelledby="uploaded-audio-title">
      <div className="rounded-xl border border-dashed border-mod-text-low/60 bg-mod-canvas-accent p-5 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-mod-primary/10 text-mod-primary">
          <Upload size={20} aria-hidden="true" />
        </span>
        <h3 id="uploaded-audio-title" className="mt-3 font-bold text-mod-text">Tải file thu âm hoàn chỉnh</h3>
        <p className="mt-1 text-sm text-mod-text-secondary">MP3, M4A hoặc OGG. Bạn có thể nghe ngay sau khi chọn.</p>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <label className="cursor-pointer">
            Chọn file âm thanh
            <input className="sr-only" type="file" accept=".mp3,.m4a,.ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg" onChange={(event) => void selectAudio(event)} />
          </label>
        </Button>
      </div>

      {file ? <p className="text-sm font-semibold text-mod-text">{file.name}</p> : null}
      {previewUrl ? (
        <div className="rounded-xl border border-mod-border p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-mod-text"><Volume2 size={17} className="text-mod-primary" /> Nghe trước file thu âm</div>
          <audio controls src={previewUrl} className="w-full" preload="metadata" />
        </div>
      ) : null}

      {analyzing ? (
        <p className="flex items-center gap-2 text-sm text-mod-text-secondary"><LoaderCircle className="animate-spin" /> Đang kiểm tra file…</p>
      ) : analysis ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <CheckCard label="Định dạng" value={statusLabel[analysis.formatStatus]} warning={analysis.formatStatus === "WARNING"} />
          <CheckCard label="Thời lượng" value={analysis.clientDurationMs ? `${Math.round(analysis.clientDurationMs / 1000)} giây · ${statusLabel[analysis.durationStatus]}` : statusLabel.UNKNOWN} warning={analysis.durationStatus === "WARNING"} />
          <CheckCard label="Độ ồn sơ bộ" value={analysis.noiseLevelDb === null ? statusLabel.UNKNOWN : `${analysis.noiseLevelDb.toFixed(1)} dB · ${statusLabel[analysis.noiseStatus]}`} warning={analysis.noiseStatus === "WARNING"} />
        </div>
      ) : null}

      {needsConfirmation ? (
        <label className="flex items-start gap-3 rounded-lg border border-mod-attention/30 bg-mod-attention/5 p-3 text-sm text-mod-text">
          <Checkbox checked={confirmReplace} onCheckedChange={(checked) => setConfirmReplace(checked === true)} aria-label="Xác nhận thay file âm thanh đã phát hành" />
          <span>Tôi xác nhận thay file âm thanh đang phát hành của tập này.</span>
        </label>
      ) : null}

      {analysis && file ? (
        <div className="flex justify-end">
          <Button type="button" disabled={uploading || (needsConfirmation && !confirmReplace)} onClick={() => void upload()}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
            {uploading ? "Đang tải lên…" : wizard.state.uploadedAudio ? "Thay file đã lưu" : "Tải lên và lưu"}
          </Button>
        </div>
      ) : null}
      {wizard.state.uploadedAudio ? <p className="flex items-center gap-2 text-sm font-semibold text-mod-success"><CheckCircle2 size={17} /> File thu âm đã được lưu với tập podcast.</p> : null}
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
    </section>
  );
}

function CheckCard({ label, value, warning }: { label: string; value: string; warning: boolean }): ReactElement {
  return <div className="rounded-lg border border-mod-border p-3"><p className="text-xs font-semibold text-mod-text-secondary">{label}</p><p className={warning ? "mt-1 font-bold text-mod-attention" : "mt-1 font-bold text-mod-success"}>{value}</p></div>;
}

