/**
 * AudioPlayer Context — Global persistent audio player
 *
 * Quản lý toàn bộ trạng thái phát audio:
 * - load narration playback session
 * - play / pause / seek
 * - đồng bộ tiến độ (playedBitmap + positionMs) lên server mỗi `syncIntervalMs`
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { listeningService, type PlaybackResponse } from "../services/listeningService";

/* ---------- types ---------- */
export type PlayerStatus = "idle" | "loading" | "ready" | "error";

export interface PlayerTrack {
  narrationId: string;
  episodeId: string;
  episodeSlug: string;
  episodeTitle: string;
  seriesTitle: string;
  coverUrl: string | null;
  audio: PlaybackResponse["audio"];
  syncIntervalMs: number;
  completionThreshold: number;
}

interface AudioPlayerState {
  track: PlayerTrack | null;
  status: PlayerStatus;
  currentMs: number;
  durationMs: number;
  playing: boolean;
  percent: number;
  /** Phần trăm đã nghe thực sự (bitmap) */
  playedPercent: number;
  completedAt: string | null;
  error: string | null;
}

interface AudioPlayerActions {
  loadNarration: (
    narrationId: string,
    meta: Omit<PlayerTrack, "narrationId" | "episodeId" | "audio" | "syncIntervalMs" | "completionThreshold">,
  ) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  setSpeed: (rate: number) => void;
  skipBy: (deltaMs: number) => void;
  close: () => void;
}

const defaultState: AudioPlayerState = {
  track: null,
  status: "idle",
  currentMs: 0,
  durationMs: 0,
  playing: false,
  percent: 0,
  playedPercent: 0,
  completedAt: null,
  error: null,
};

const AudioPlayerContext = createContext<(AudioPlayerState & AudioPlayerActions) | null>(null);

/* ---------- bitmap helpers ---------- */
function emptyBitmap(totalSeconds: number): Uint8Array {
  return new Uint8Array(Math.ceil(totalSeconds / 8));
}

function setBit(bitmap: Uint8Array, second: number): Uint8Array {
  const copy = new Uint8Array(bitmap);
  const byte = Math.floor(second / 8);
  const bit = second % 8;
  if (byte < copy.length) copy[byte] |= 1 << bit;
  return copy;
}

function bitmapToBase64(bitmap: Uint8Array): string {
  let binary = "";
  for (const byte of bitmap) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function countBits(bitmap: Uint8Array): number {
  let n = 0;
  for (const byte of bitmap) {
    let v = byte;
    while (v) { n += v & 1; v >>>= 1; }
  }
  return n;
}

function base64ToUint8Array(b64: string): Uint8Array {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

/* ---------- Provider ---------- */
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bitmapRef = useRef<Uint8Array>(new Uint8Array(0));
  const lastSyncRef = useRef<number>(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<PlayerTrack | null>(null);
  const loadRequestRef = useRef(0);

  const [state, setState] = useState<AudioPlayerState>(defaultState);

  /* ---- helpers ---- */
  const setPartial = useCallback((patch: Partial<AudioPlayerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const persistProgress = useCallback(async (
    track: PlayerTrack,
    positionMs: number,
    bitmap: Uint8Array,
  ) => {
    try {
      const result = await listeningService.updateProgress(track.narrationId, {
        assetId: track.audio.assetId,
        positionMs,
        playedBitmap: bitmapToBase64(bitmap),
      });
      if (trackRef.current?.narrationId !== track.narrationId) return;
      const total = Math.ceil(track.audio.durationMs / 1000);
      setPartial({
        playedPercent: total > 0 ? Math.min(100, (countBits(bitmap) / total) * 100) : 0,
        completedAt: (result as { completedAt: string | null }).completedAt ?? null,
      });
    } catch {
      // silent — do not interrupt playback on sync error
    }
  }, [setPartial]);

  /* ---- sync to server ---- */
  const syncProgress = useCallback(async (force = false) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track) return;
    const now = Date.now();
    if (!force && now - lastSyncRef.current < track.syncIntervalMs) return;
    lastSyncRef.current = now;
    await persistProgress(
      track,
      Math.round(audio.currentTime * 1000),
      new Uint8Array(bitmapRef.current),
    );
  }, [persistProgress]);

  /* ---- timeupdate handler ---- */
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const currentMs = Math.round(audio.currentTime * 1000);
    const durationMs = Math.round(audio.duration * 1000) || 0;
    const second = Math.floor(audio.currentTime);
    bitmapRef.current = setBit(bitmapRef.current, second);
    setPartial({
      currentMs,
      durationMs,
      percent: durationMs > 0 ? Math.min(100, (currentMs / durationMs) * 100) : 0,
    });
  }, [setPartial]);

  /* ---- public actions ---- */
  const play = useCallback(() => {
    audioRef.current?.play().catch(() => { /* Autoplay blocked */ });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((ms: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = ms / 1000;
    setPartial({ currentMs: ms });
  }, [setPartial]);

  const skipBy = useCallback((deltaMs: number) => {
    if (!audioRef.current) return;
    const next = Math.max(0, Math.min(audioRef.current.duration * 1000, (audioRef.current.currentTime * 1000) + deltaMs));
    audioRef.current.currentTime = next / 1000;
  }, []);

  const setSpeed = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const close = useCallback(() => {
    loadRequestRef.current += 1;
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    const audio = audioRef.current;
    const track = trackRef.current;
    if (audio && track) {
      audio.onpause = null;
      audio.ontimeupdate = null;
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.pause();
      void persistProgress(track, Math.round(audio.currentTime * 1000), new Uint8Array(bitmapRef.current));
      audio.removeAttribute("src");
      audio.load();
    }
    trackRef.current = null;
    bitmapRef.current = new Uint8Array(0);
    setState(defaultState);
  }, [persistProgress]);

  const loadNarration = useCallback(async (
    narrationId: string,
    meta: Omit<PlayerTrack, "narrationId" | "episodeId" | "audio" | "syncIntervalMs" | "completionThreshold">,
  ) => {
    const requestId = ++loadRequestRef.current;
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);

    const previousAudio = audioRef.current;
    const previousTrack = trackRef.current;
    if (previousAudio && previousTrack) {
      previousAudio.onpause = null;
      previousAudio.pause();
      void persistProgress(
        previousTrack,
        Math.round(previousAudio.currentTime * 1000),
        new Uint8Array(bitmapRef.current),
      );
    }

    setPartial({ status: "loading", playing: false, error: null });
    try {
      const data = await listeningService.playback(narrationId);
      if (requestId !== loadRequestRef.current) return;
      const totalSeconds = Math.ceil(data.audio.durationMs / 1000);

      // Khôi phục bitmap từ server
      let bitmap = emptyBitmap(totalSeconds);
      if (data.progress?.playedBitmap) {
        const saved = base64ToUint8Array(data.progress.playedBitmap);
        bitmap = saved.length > 0 ? saved : bitmap;
      }
      bitmapRef.current = bitmap;

      const track: PlayerTrack = {
        narrationId,
        episodeId: data.episodeId,
        audio: data.audio,
        syncIntervalMs: data.sync.intervalMs,
        completionThreshold: data.sync.completionThreshold,
        ...meta,
      };
      trackRef.current = track;

      // Tạo <audio> element
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = "metadata";
      }
      const audio = audioRef.current;
      audio.pause();
      audio.src = data.audio.url;
      audio.currentTime = data.progress ? (data.progress.positionMs / 1000) : 0;

      // Wire events
      const onTimeUpdate = () => handleTimeUpdate();
      const onPlay = () => setPartial({ playing: true });
      const onPause = () => { setPartial({ playing: false }); void syncProgress(true); };
      const onEnded = () => { setPartial({ playing: false }); void syncProgress(true); };
      const onError = () => setPartial({ status: "error", error: "Không thể phát audio." });
      const onLoadedMetadata = () => {
        setPartial({ durationMs: Math.round(audio.duration * 1000), status: "ready" });
      };

      audio.ontimeupdate = onTimeUpdate;
      audio.onplay = onPlay;
      audio.onpause = onPause;
      audio.onended = onEnded;
      audio.onerror = onError;
      audio.onloadedmetadata = onLoadedMetadata;

      const playedPercent = totalSeconds > 0
        ? Math.min(100, (countBits(bitmap) / totalSeconds) * 100) : 0;

      setPartial({
        track,
        status: "ready",
        currentMs: data.progress?.positionMs ?? 0,
        durationMs: data.audio.durationMs,
        percent: data.progress
          ? Math.min(100, ((data.progress.positionMs) / data.audio.durationMs) * 100) : 0,
        playedPercent,
        completedAt: data.progress?.completedAt ?? null,
        playing: false,
        error: null,
      });

      // Start sync timer
      syncTimerRef.current = setInterval(() => { void syncProgress(); }, track.syncIntervalMs);

      // Auto-play
      audio.play().catch(() => {});
    } catch (err: unknown) {
      if (requestId !== loadRequestRef.current) return;
      const msg = err instanceof Error ? err.message : "Không thể tải audio.";
      setPartial({ status: "error", error: msg });
    }
  }, [handleTimeUpdate, persistProgress, setPartial, syncProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loadRequestRef.current += 1;
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      const audio = audioRef.current;
      const track = trackRef.current;
      if (audio && track) {
        audio.onpause = null;
        audio.ontimeupdate = null;
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onloadedmetadata = null;
        audio.pause();
        void persistProgress(track, Math.round(audio.currentTime * 1000), new Uint8Array(bitmapRef.current));
      }
    };
  }, [persistProgress]);

  const value: AudioPlayerState & AudioPlayerActions = {
    ...state,
    loadNarration,
    play,
    pause,
    seek,
    skipBy,
    setSpeed,
    close,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
