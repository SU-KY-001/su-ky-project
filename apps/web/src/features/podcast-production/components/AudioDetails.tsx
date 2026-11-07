import type { ReactElement } from "react";
import type { AudioAnalysis } from "@repo/shared";
import { Download } from "lucide-react";
import { usePodcastEpisode } from "../hooks/usePodcastProduction";
import { voiceName } from "../voice/voiceLabels";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const BYTES_PER_MB = 1024 * 1024;
const SHORT_ID_LENGTH = 8;

const minutes = (ms: number): string => {
  const total = Math.round(ms / MS_PER_SECOND);
  return `${Math.floor(total / SECONDS_PER_MINUTE)} phút ${total % SECONDS_PER_MINUTE} giây`;
};

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 sm:grid-cols-[10rem_1fr]">
      <dt className="text-mod-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-mod-text">{value}</dd>
    </div>
  );
}

/** Everything a moderator needs to tell which recording is attached, where it came from and how it was checked. */
export function AudioDetails({ episodeId, analysis }: { episodeId: string | null; analysis?: AudioAnalysis }): ReactElement | null {
  const audio = usePodcastEpisode(episodeId ?? "").data?.narrations.find((item) => item.type === "THIRD_PERSON")?.audio ?? null;
  if (!audio) return null;
  const origin = analysis?.origin;
  const durationMs = audio.durationMs ?? analysis?.clientDurationMs ?? null;
  const rows: Array<[string, string]> = [];

  if (origin?.kind === "AI_VOICE") {
    rows.push(["Nguồn", "Giọng đọc AI"], ["Giọng", voiceName(origin.voice)], ["Mô hình", origin.model], ["Phong cách", origin.style || "Mặc định"], ["Số ký tự đã đọc", origin.chars.toLocaleString("vi-VN")]);
  } else if (origin?.kind === "UPLOAD") {
    rows.push(["Nguồn", "Tải lên từ máy"], ["Tên file", origin.fileName]);
  } else {
    rows.push(["Nguồn", "Chưa ghi nhận (file gắn trước khi hệ thống lưu thông tin này)"]);
  }
  rows.push(["Định dạng", `${(audio.format ?? "không rõ").toUpperCase()}${audio.sizeBytes ? ` · ${(audio.sizeBytes / BYTES_PER_MB).toFixed(1)} MB` : ""}`]);
  if (durationMs) rows.push(["Thời lượng", minutes(durationMs)]);
  if (analysis?.estimatedScriptDurationMs) rows.push(["Ước tính từ kịch bản", `${minutes(analysis.estimatedScriptDurationMs)}${analysis.durationStatus === "WARNING" ? " · lệch nhiều, cần kiểm tra" : ""}`]);
  if (analysis) rows.push(["Độ ồn", analysis.noiseStatus === "PASS" ? "Ổn" : analysis.noiseStatus === "WARNING" ? "Cần kiểm tra" : "Chưa xác định"]);
  if (audio.attachedAt) rows.push(["Gắn vào tập lúc", new Date(audio.attachedAt).toLocaleString("vi-VN")]);
  rows.push(["Mã file", audio.assetId.slice(0, SHORT_ID_LENGTH)]);

  return (
    <section aria-label="Thông tin file thu âm" className="rounded-xl border border-mod-border bg-mod-surface px-4 py-2 text-sm">
      <dl className="divide-y divide-mod-border">{rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}</dl>
      {audio.previewUrl ? (
        <a className="my-2 inline-flex items-center gap-2 font-semibold text-mod-primary hover:underline" href={audio.previewUrl} target="_blank" rel="noreferrer">
          <Download size={15} aria-hidden="true" /> Mở file gốc
        </a>
      ) : null}
    </section>
  );
}
