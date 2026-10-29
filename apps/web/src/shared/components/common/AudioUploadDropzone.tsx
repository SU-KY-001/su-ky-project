import { useId, useRef, useState, type ReactElement } from "react";
import { UploadSimple } from "@phosphor-icons/react/dist/icons/UploadSimple";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { SpinnerGap } from "@phosphor-icons/react/dist/icons/SpinnerGap";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

export function AudioUploadDropzone({ onSelect, onRemove, busy = false, hasAudio = false, fileName, previewUrl }: {
  onSelect: (file: File) => Promise<void>;
  onRemove?: () => void;
  busy?: boolean;
  hasAudio?: boolean;
  fileName?: string;
  previewUrl?: string | null;
}): ReactElement {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<File | null>(null);
  const unavailable = busy || uploading;
  const upload = async (file: File): Promise<void> => {
    setCandidate(file); setError(""); setUploading(true);
    try { await onSelect(file); setCandidate(null); }
    catch { setError(hasAudio ? "Không thể tải file mới. Âm thanh hiện tại vẫn được giữ." : "Không thể tải âm thanh. Hãy thử lại hoặc chọn file khác."); }
    finally { setUploading(false); }
  };
  const choose = (files: File[]): void => {
    if (unavailable || files.length === 0) return;
    if (files.length !== 1) { setCandidate(null); setError("Chọn một file âm thanh duy nhất."); return; }
    const file = files[0]!;
    if (!file.size || !/\.(mp3|m4a|ogg)$/i.test(file.name)) { setCandidate(null); setError("Chọn file MP3, M4A hoặc OGG có nội dung."); return; }
    void upload(file);
  };
  const title = unavailable ? "Đang tải âm thanh…" : dragging ? "Thả file âm thanh tại đây" : error ? "Chưa tải được âm thanh" : hasAudio ? "Đã có âm thanh kể chuyện" : "Kéo thả file âm thanh vào đây";
  return <div className="space-y-2" aria-busy={unavailable}>
    <p id={`${id}-label`} className="text-sm font-semibold text-mod-text">Âm thanh kể chuyện</p>
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-conditions`} className={cn("rounded-xl border bg-mod-surface p-4 transition-colors", !hasAudio && "border-dashed", dragging ? "border-mod-primary bg-mod-primary/5" : error ? "border-mod-danger/60" : "border-mod-border")}
      onDragOver={event => { event.preventDefault(); if (!unavailable && event.dataTransfer.types.includes("Files")) setDragging(true); }}
      onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); choose(Array.from(event.dataTransfer.files)); }}>
      <input ref={input} id={id} className="sr-only" tabIndex={-1} type="file" accept=".mp3,.m4a,.ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg" disabled={unavailable} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; choose(files); }} />
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", error ? "text-mod-danger" : hasAudio && !unavailable ? "text-mod-success" : "text-mod-text-secondary")} aria-hidden="true">{unavailable ? <SpinnerGap size={21} className="animate-spin motion-reduce:animate-none" /> : error ? <WarningCircle size={21} /> : hasAudio ? <CheckCircle size={21} /> : <UploadSimple size={21} />}</span>
        <div className="min-w-0 flex-1"><p role="status" aria-live="polite" className="text-sm font-semibold text-mod-text">{title}</p><p id={`${id}-conditions`} className="mt-1 text-xs leading-5 text-mod-text-secondary">{unavailable && candidate ? candidate.name : hasAudio ? fileName || "File đã được tải lên. Bạn có thể nghe thử hoặc thay file." : "MP3, M4A hoặc OGG · Chỉ một file"}</p>{error && <p role="alert" className="mt-2 text-xs leading-5 text-mod-danger">{error}</p>}
          {previewUrl && <audio controls src={previewUrl} className="mt-3 w-full" preload="metadata" aria-label="Nghe thử âm thanh kể chuyện" />}
          <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={unavailable} onClick={() => input.current?.click()}>{hasAudio ? "Chọn file khác" : "Chọn file âm thanh"}</Button>{error && candidate && <Button type="button" variant="outline" size="sm" disabled={unavailable} onClick={() => void upload(candidate)}>Thử tải lại</Button>}{hasAudio && onRemove && <Button type="button" variant="ghost" size="sm" disabled={unavailable} onClick={() => { setCandidate(null); setError(""); onRemove(); }}>Bỏ âm thanh</Button>}</div>
        </div>
      </div>
    </div>
  </div>;
}
