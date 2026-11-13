import { useState, type ReactElement, type SyntheticEvent } from "react";
import { formatClock } from "./readinessLabels";

export function ReviewAudio({ src }: { src: string }): ReactElement {
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState(0);
  const [failed, setFailed] = useState(false);
  const readDuration = (event: SyntheticEvent<HTMLAudioElement>): void => {
    const seconds = event.currentTarget.duration;
    if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
  };
  return <div className="space-y-2">
    <audio controls={duration !== null} preload="metadata" src={src} className="w-full" aria-label="Nghe bản thu âm podcast" onLoadedMetadata={readDuration} onDurationChange={readDuration} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onError={() => setFailed(true)} />
    {failed ? <p role="alert" className="text-sm text-mod-danger">Không tải được bản thu âm. Vui lòng thử lại.</p> : duration === null ? <p role="status" className="text-xs text-mod-text-secondary">Đang tải thông tin bản thu âm…</p> : <p className="text-xs tabular-nums text-mod-text-secondary" aria-label="Thời gian bản thu âm">{formatClock(Math.floor(position) * 1000)} / {formatClock(Math.floor(duration) * 1000)}</p>}
  </div>;
}
