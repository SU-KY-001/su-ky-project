import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { PlaybackState } from "@/shared/ui";
import { podcastApi, type PodcastEpisode } from "./podcastApi";

export interface LivePlaybackState extends PlaybackState {
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < len ? B64_CHARS[b2 & 63] : "=";
  }
  return result;
}

function decodeBase64(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e0 = B64_CHARS.indexOf(clean[i]);
    const e1 = B64_CHARS.indexOf(clean[i + 1]);
    const e2 = i + 2 < len ? B64_CHARS.indexOf(clean[i + 2]) : 64;
    const e3 = i + 3 < len ? B64_CHARS.indexOf(clean[i + 3]) : 64;
    bytes[p++] = (e0 << 2) | (e1 >> 4);
    if (e2 !== 64 && e2 !== -1) bytes[p++] = ((e1 & 15) << 4) | (e2 >> 2);
    if (e3 !== 64 && e3 !== -1) bytes[p++] = ((e2 & 3) << 6) | e3;
  }
  return bytes.subarray(0, p);
}

const bundledPodcastAudio = require("@/assets/audio/bach-dang-938.mp3");

const storageKey = (narrationId: string): string => `suky.playback.pos.${narrationId}`;

export function usePlayback(
  episode: PodcastEpisode | null,
  narrationId: string | null,
  autoplayToken: number,
  userId: string | null,
  onRequireAuth: () => void,
): LivePlaybackState {
  const queryClient = useQueryClient();
  const [playRequested, setPlayRequested] = useState(false);

  const playbackQuery = useQuery({
    queryKey: ["podcast", "playback", narrationId],
    queryFn: () => (narrationId ? podcastApi.playback(narrationId) : Promise.reject(new Error("No narration"))),
    enabled: Boolean(narrationId),
    staleTime: 0,
    retry: 0,
  });

  // Chỉ sử dụng audio mẫu cục bộ khi không có narrationId (chế độ demo offline);
  // Khi có narrationId từ API, chỉ dùng URL phát trực tuyến từ Cloudinary của tập đó.
  const audioSource = playbackQuery.data?.url ?? (narrationId ? null : (episode ? bundledPodcastAudio : null));
  const player = useAudioPlayer(audioSource, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const restored = useRef(false);
  const ready = useRef(false);
  const lastSavedLocal = useRef(0);
  const handledToken = useRef(autoplayToken);

  const progressRef = useRef<{
    bits: Uint8Array;
    previous: number;
    positionMs: number;
    dirty: boolean;
    saving: boolean;
  }>({
    bits: new Uint8Array(),
    previous: -1,
    positionMs: 0,
    dirty: false,
    saving: false,
  });

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const totalDurationSeconds =
    (playbackQuery.data?.durationMs ? playbackQuery.data.durationMs / 1000 : 0) ||
    (Number.isFinite(status.duration) ? status.duration : 0);
  const currentPositionSeconds = Math.min(status.currentTime, totalDurationSeconds || status.currentTime);

  useEffect(() => {
    const data = playbackQuery.data;
    if (!data) return;
    const totalSeconds = Math.ceil(data.durationMs / 1000);
    const bits = new Uint8Array(Math.ceil(totalSeconds / 8));
    if (data.playedBitmap) {
      try {
        const stored = decodeBase64(data.playedBitmap);
        bits.set(stored.subarray(0, bits.length));
      } catch {
        // bỏ qua nếu bitmap cũ không hợp lệ
      }
    }
    progressRef.current = {
      bits,
      previous: -1,
      positionMs: data.positionMs,
      dirty: false,
      saving: false,
    };
  }, [playbackQuery.data]);

  useEffect(() => {
    restored.current = false;
    ready.current = false;
    lastSavedLocal.current = 0;
    player.pause();
    void player.seekTo(0);
  }, [narrationId, player]);

  useEffect(() => {
    if (restored.current || !status.isLoaded || totalDurationSeconds <= 0 || !narrationId) return;
    restored.current = true;
    const serverPositionSeconds = (playbackQuery.data?.positionMs ?? 0) / 1000;

    void AsyncStorage.getItem(storageKey(narrationId))
      .then((savedValue) => {
        const localSaved = Number(savedValue);
        const bestPosition =
          Number.isFinite(localSaved) && localSaved > 1 && localSaved < totalDurationSeconds - 2
            ? localSaved
            : serverPositionSeconds > 1 && serverPositionSeconds < totalDurationSeconds - 2
              ? serverPositionSeconds
              : 0;

        if (bestPosition > 0) {
          void player.seekTo(bestPosition);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        ready.current = true;
        if (handledToken.current !== autoplayToken || playRequested) {
          handledToken.current = autoplayToken;
          setPlayRequested(false);
          player.play();
        }
      });
  }, [status.isLoaded, totalDurationSeconds, narrationId, playbackQuery.data?.positionMs, autoplayToken, playRequested, player]);

  useEffect(() => {
    const data = playbackQuery.data;
    if (!data || !status.isLoaded) return;
    const now = status.currentTime;
    const state = progressRef.current;
    const delta = now - state.previous;

    if (state.previous >= 0 && delta > 0 && delta <= 5) {
      const totalSec = Math.ceil(data.durationMs / 1000);
      for (let sec = Math.floor(state.previous); sec < Math.floor(now); sec++) {
        if (sec >= 0 && sec < totalSec) {
          state.bits[Math.floor(sec / 8)] |= 1 << (sec % 8);
        }
      }
      state.dirty = true;
    }
    state.positionMs = Math.min(Math.round(now * 1000), data.durationMs);
    state.previous = now;
  }, [status.currentTime, status.isLoaded, playbackQuery.data]);

  const syncProgressToServer = useCallback(async (): Promise<void> => {
    const data = playbackQuery.data;
    const state = progressRef.current;
    if (!data || !narrationId || !state.dirty || state.saving) return;
    state.saving = true;
    state.dirty = false;
    const bitmap = encodeBase64(state.bits);
    try {
      const result = await podcastApi.saveProgress(narrationId, {
        assetId: data.assetId,
        positionMs: state.positionMs,
        playedBitmap: bitmap,
      });
      if (result.completedAt) {
        void queryClient.invalidateQueries({ queryKey: ["podcast"] });
      }
    } catch {
      state.dirty = true;
    } finally {
      state.saving = false;
    }
  }, [playbackQuery.data, narrationId, queryClient]);

  useEffect(() => {
    if (!ready.current || totalDurationSeconds <= 0 || !narrationId) return;
    const finished = status.didJustFinish || currentPositionSeconds >= totalDurationSeconds - 1;
    if (!finished && currentPositionSeconds < 1) return;
    const now = Date.now();
    if (!finished && status.playing && now - lastSavedLocal.current < 3000) return;
    lastSavedLocal.current = now;
    void AsyncStorage.setItem(storageKey(narrationId), String(finished ? 0 : Math.floor(currentPositionSeconds))).catch(() => undefined);
  }, [currentPositionSeconds, status.playing, status.didJustFinish, totalDurationSeconds, narrationId]);

  useEffect(() => {
    if (!playbackQuery.data) return;
    const intervalMs = Math.max(5000, playbackQuery.data.syncIntervalMs);
    const timer = setInterval(() => {
      void syncProgressToServer();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playbackQuery.data, syncProgressToServer]);

  useEffect(() => {
    if (!status.playing) {
      void syncProgressToServer();
    }
  }, [status.playing, syncProgressToServer]);

  useEffect(() => {
    if (handledToken.current === autoplayToken) return;
    handledToken.current = autoplayToken;
    if (ready.current && status.isLoaded) {
      player.play();
    } else {
      setPlayRequested(true);
    }
  }, [autoplayToken, ready, status.isLoaded, player]);

  const toggle = useCallback((): void => {
    if (player.playing) {
      player.pause();
      if (userId) void syncProgressToServer();
      return;
    }
    if (totalDurationSeconds > 0 && player.currentTime >= totalDurationSeconds - 0.5) {
      void player.seekTo(0);
    }
    player.play();
  }, [userId, player, totalDurationSeconds, syncProgressToServer]);

  const seekBy = useCallback(
    (seconds: number): void => {
      const target = Math.max(0, Math.min(totalDurationSeconds || Infinity, player.currentTime + seconds));
      progressRef.current.previous = -1;
      void player.seekTo(target);
    },
    [player, totalDurationSeconds],
  );

  const seekToRatio = useCallback(
    (ratio: number): void => {
      if (totalDurationSeconds > 0) {
        progressRef.current.previous = -1;
        void player.seekTo(Math.max(0, Math.min(1, ratio)) * totalDurationSeconds);
      }
    },
    [player, totalDurationSeconds],
  );

  const restart = useCallback((): void => {
    progressRef.current.previous = -1;
    void player.seekTo(0);
    player.play();
  }, [player]);

  const error = playbackQuery.isError
    ? "Không thể tải âm thanh từ máy chủ."
    : !narrationId && !episode
      ? "Bản thu đang được chuẩn bị"
      : null;

  return {
    isPlaying: status.playing,
    position: currentPositionSeconds,
    duration: totalDurationSeconds,
    toggle,
    seekBy,
    seekToRatio,
    restart,
    isLoading: playbackQuery.isPending || (playRequested && !status.isLoaded),
    error,
    retry: () => void playbackQuery.refetch(),
  };
}
