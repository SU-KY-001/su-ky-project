/**
 * Persistent audio player bar — xuất hiện ở cuối màn hình khi đang phát.
 * Design: nền night, bronze accent, theo design-guidelines §4.8
 */
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Pause,
  Play,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "../context/AudioPlayerContext";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export function PersistentAudioPlayer() {
  const player = useAudioPlayer();
  const [speed, setSpeedState] = useState(1);

  const handleSpeedCycle = useCallback(() => {
    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
    setSpeedState(next);
    player.setSpeed(next);
  }, [speed, player]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      player.seek(Number(e.target.value));
    },
    [player],
  );

  if (!player.track || player.status === "idle") return null;

  const { track, currentMs, durationMs, playing, percent, status, error } = player;

  return (
    <div
      role="region"
      aria-label="Trình phát audio"
      className={cn(
        "fixed bottom-0 inset-x-0 z-50",
        "border-t border-bronze/30 bg-night shadow-[0_-8px_40px_rgba(0,0,0,.55)]",
        "transition-transform duration-300",
        !track && "translate-y-full",
      )}
    >
      {/* Scrub bar */}
      <div className="relative h-1 w-full cursor-pointer bg-night-soft">
        <div
          className="absolute left-0 top-0 h-full bg-bronze transition-[width] duration-100"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={0}
          max={durationMs || 1}
          step={1000}
          value={currentMs}
          onChange={handleSeek}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          aria-label="Kéo để tua"
        />
      </div>

      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 md:gap-5">
        {/* Cover + info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.seriesTitle}
              className="h-11 w-11 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-bronze/30 bg-night-soft">
              <SpeakerHigh size={20} className="text-bronze" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/episodes/${track.episodeSlug}`}
              className="block truncate text-sm font-bold text-paper-soft hover:text-bronze focus-visible:outline-2 focus-visible:outline-focus"
            >
              {track.episodeTitle}
            </Link>
            <p className="truncate text-xs text-paper-deep/70">{track.seriesTitle}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <button
            type="button"
            onClick={() => player.skipBy(-15_000)}
            className="grid h-9 w-9 place-items-center rounded-lg text-paper-deep hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-focus"
            aria-label="Lùi 15 giây"
          >
            <ArrowCounterClockwise size={20} weight="bold" />
          </button>

          <button
            type="button"
            onClick={playing ? player.pause : player.play}
            disabled={status === "loading"}
            className="grid h-11 w-11 place-items-center rounded-full border border-bronze/40 bg-bronze/10 text-bronze hover:bg-bronze/20 focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
            aria-label={playing ? "Tạm dừng" : "Phát"}
          >
            {status === "loading" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-bronze border-t-transparent" />
            ) : playing ? (
              <Pause size={22} weight="fill" />
            ) : (
              <Play size={22} weight="fill" />
            )}
          </button>

          <button
            type="button"
            onClick={() => player.skipBy(15_000)}
            className="grid h-9 w-9 place-items-center rounded-lg text-paper-deep hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-focus"
            aria-label="Tiến 15 giây"
          >
            <ArrowClockwise size={20} weight="bold" />
          </button>
        </div>

        {/* Time + speed */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="min-w-[90px] text-center font-mono text-xs text-paper-deep/80">
            {formatMs(currentMs)} / {formatMs(durationMs)}
          </span>
          <button
            type="button"
            onClick={handleSpeedCycle}
            className="rounded border border-bronze/30 px-2 py-0.5 font-mono text-xs text-bronze hover:bg-bronze/10 focus-visible:outline-2 focus-visible:outline-focus"
            aria-label={`Tốc độ ${speed}x, bấm để thay đổi`}
          >
            {speed}×
          </button>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={player.close}
          className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-paper-deep/60 hover:bg-white/10 hover:text-paper-soft focus-visible:outline-2 focus-visible:outline-focus"
          aria-label="Đóng trình phát"
        >
          <X size={18} />
        </button>
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-2 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
