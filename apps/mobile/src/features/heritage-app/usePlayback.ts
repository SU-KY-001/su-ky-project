import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AppState } from "react-native";
import { useAuthStore } from "@/lib/authStore";
import type { PlaybackState } from "@/shared/ui";
import { createUuid, podcastApi, type PodcastEpisode } from "./podcastApi";

export interface LivePlaybackState extends PlaybackState {
  isLoading: boolean;
  error: string | null;
  requiresAuth: boolean;
  retry: () => void;
  stop: () => void;
  didFinish: boolean;
  finishedSessionId: string | null;
}

interface ProgressState { bits: Uint8Array; previous: number; positionMs: number; dirty: boolean; saving: boolean }
interface ListeningSessionState {
  id: string; userId: string; narrationId: string; assetId: string;
  bits: Uint8Array; progress: ProgressState; initialized: boolean; dirty: boolean;
  pending: Promise<void> | null;
}

export interface HistoryResumeRequest {
  token: number;
  narrationId: string;
  positionMs: number;
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

const storageKey = (userId: string, narrationId: string): string => `suky.playback.pos.${userId}.${narrationId}`;

export function usePlayback(
  episode: PodcastEpisode | null,
  narrationId: string | null,
  autoplayToken: number,
  userId: string | null,
  onRequireAuth: () => void,
  resumeRequest: HistoryResumeRequest | null = null,
): LivePlaybackState {
  const queryClient = useQueryClient();
  const [playRequested, setPlayRequested] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const listeningSession = useRef<ListeningSessionState | null>(null);
  const retiredSessions = useRef<ListeningSessionState[]>([]);
  const playIntent = useRef(false);
  const [sessionStarting, setSessionStarting] = useState(false);

  const playbackQuery = useQuery({
    queryKey: ["podcast", "playback", episode?.id, narrationId, userId],
    queryFn: async () => {
      if (!narrationId || !episode) throw new Error("No narration");
      const result = await podcastApi.playback(narrationId);
      if (result.episodeId !== episode.id) throw new Error("Playback does not belong to the selected episode");
      return result;
    },
    enabled: Boolean(narrationId && episode && userId),
    staleTime: 0,
    retry: 0,
  });

  // Không dùng audio dự phòng: mỗi tập chỉ được phát URL mà API cấp cho đúng narration của nó.
  const audioSource = playbackQuery.data?.url ?? null;
  const player = useAudioPlayer(audioSource, { updateInterval: 1_000 });
  const status = useAudioPlayerStatus(player);

  const restored = useRef(false);
  const ready = useRef(false);
  const lastSavedLocal = useRef(0);
  const handledToken = useRef(autoplayToken);
  const restoreGeneration = useRef(0);
  const appliedResumeToken = useRef<number | null>(null);

  const progressRef = useRef<ProgressState>({
    bits: new Uint8Array(),
    previous: -1,
    positionMs: 0,
    dirty: false,
    saving: false,
  });
  const progressIdentity = useRef("");
  const progressStates = useRef(new Map<string, ProgressState>());
  const lifetimeWrites = useRef(new Map<string, Promise<void>>());
  const playOperation = useRef(0);
  const armedFinishedSession = useRef<string | null>(null);

  const syncSession = useCallback((session: ListeningSessionState): Promise<void> => {
    if (useAuthStore.getState().user?.id !== session.userId) return Promise.resolve();
    if (session.pending) return session.pending;
    if (session.initialized && !session.dirty && !session.progress.dirty) return Promise.resolve();
    const initial = !session.initialized;
    const sessionBitmap = encodeBase64(initial ? new Uint8Array(session.bits.length) : session.bits);
    const identity = `${session.userId}:${session.narrationId}:${session.assetId}`;
    if (!initial) session.dirty = false;
    // Serialize lifetime writes for this audio, including old sessions retried after replay.
    const previous = lifetimeWrites.current.get(identity) ?? Promise.resolve();
    const request = previous.catch(() => undefined).then(async () => {
      if (useAuthStore.getState().user?.id !== session.userId) return;
      const progress = progressStates.current.get(identity) ?? session.progress;
      const lifetime = encodeBase64(progress.bits);
      if (!initial) progress.dirty = false;
      const result = await podcastApi.saveProgress(session.narrationId, { assetId: session.assetId, positionMs: progress.positionMs, playedBitmap: lifetime, sessionId: session.id, sessionPlayedBitmap: sessionBitmap });
      if (!result.listeningSession) throw new Error("Tính năng nghe hiện chưa sẵn sàng. Vui lòng thử lại sau.");
      session.initialized = true;
      if (session.progress !== progress) session.progress.dirty = false;
      if (!initial && result.listeningSession.playedBitmap !== sessionBitmap) session.dirty = true;
      if (useAuthStore.getState().user?.id !== session.userId) return;
      if (listeningSession.current === session) setSessionError(null);
      void queryClient.invalidateQueries({ queryKey: ["me", "listening-history", session.userId] });
      void queryClient.invalidateQueries({ queryKey: ["me", "top-podcasts"] });
      if (result.completion) void queryClient.invalidateQueries({ queryKey: ["podcast", "series"] });
    }).catch((error: unknown) => {
      session.dirty = true;
      if (listeningSession.current === session) setSessionError(error instanceof Error && error.message.startsWith("Tính năng nghe") ? error.message : "Chưa đồng bộ được phiên nghe. Kiểm tra kết nối và thử lại.");
      throw error;
    }).finally(() => {
      session.pending = null;
      if (lifetimeWrites.current.get(identity) === request) lifetimeWrites.current.delete(identity);
    });
    lifetimeWrites.current.set(identity, request);
    session.pending = request;
    return request;
  }, [queryClient]);
  const retireSession = useCallback((session: ListeningSessionState): void => {
    session.progress = { ...session.progress, bits: new Uint8Array(session.progress.bits) };
    retiredSessions.current.push(session);
    void (async () => {
      try {
        await syncSession(session);
        if (session.dirty || session.progress.dirty) await syncSession(session);
        if (!session.dirty && !session.progress.dirty) retiredSessions.current = retiredSessions.current.filter((item) => item !== session);
      } catch { /* The interval retries retired sessions for this account. */ }
    })();
  }, [syncSession]);

  const beginPlayback = useCallback(async (forceNew = false, expectedOperation?: number): Promise<void> => {
    const data = playbackQuery.data;
    if (!data || !userId || !narrationId) return;
    if (expectedOperation !== undefined && expectedOperation !== playOperation.current) return;
    const operation = expectedOperation ?? ++playOperation.current;
    playIntent.current = true;
    progressRef.current.positionMs = Math.max(0, Math.min(Math.round(player.currentTime * 1000), data.durationMs));
    progressRef.current.previous = -1;
    let session = listeningSession.current;
    if (forceNew && session) { retireSession(session); session = null; }
    if (!session || session.userId !== userId || session.narrationId !== narrationId || session.assetId !== data.assetId) {
      session = { id: createUuid(), userId, narrationId, assetId: data.assetId, bits: new Uint8Array(Math.ceil(Math.ceil(data.durationMs / 1000) / 8)), progress: progressRef.current, initialized: false, dirty: false, pending: null };
      listeningSession.current = session;
    }
    try {
      if (!session.initialized) setSessionStarting(true);
      if (!session.initialized) await syncSession(session);
      if (operation !== playOperation.current || !playIntent.current || listeningSession.current !== session || useAuthStore.getState().user?.id !== userId) return;
      player.play();
    } catch { /* State retains the same session UUID and bitmap for retry. */ }
    finally { if (listeningSession.current === session) setSessionStarting(false); }
  }, [playbackQuery.data, userId, narrationId, syncSession, player, retireSession]);

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
    const identity = `${userId}:${data.narrationId}:${data.assetId}`;
    if (progressIdentity.current === identity) {
      bits.forEach((byte, index) => { progressRef.current.bits[index] |= byte; });
      return;
    }
    progressIdentity.current = identity;
    progressRef.current = {
      bits,
      previous: -1,
      positionMs: data.positionMs,
      dirty: false,
      saving: false,
    };
    progressStates.current.set(identity, progressRef.current);
  }, [playbackQuery.data, userId]);

  useEffect(() => {
    const previous = listeningSession.current;
    playOperation.current += 1;
    armedFinishedSession.current = null;
    listeningSession.current = null;
    playIntent.current = false;
    setSessionStarting(false);
    setSessionError(null);
    if (previous) retireSession(previous);
    retiredSessions.current = retiredSessions.current.filter((item) => item.userId === userId);
    for (const key of progressStates.current.keys()) if (!userId || !key.startsWith(`${userId}:`)) progressStates.current.delete(key);
  }, [narrationId, userId, playbackQuery.data?.assetId, autoplayToken, retireSession]);

  useEffect(() => {
    restoreGeneration.current += 1;
    playOperation.current += 1;
    restored.current = false;
    ready.current = false;
    lastSavedLocal.current = 0;
    player.pause();
    void player.seekTo(0);
  }, [narrationId, player, userId, resumeRequest?.token]);

  useEffect(() => {
    if (restored.current || !playbackQuery.data || playbackQuery.data.narrationId !== narrationId || !status.isLoaded || totalDurationSeconds <= 0 || !narrationId) return;
    restored.current = true;
    const generation = restoreGeneration.current;
    const serverPositionSeconds = (playbackQuery.data?.positionMs ?? 0) / 1000;

    void AsyncStorage.getItem(storageKey(userId ?? "guest", narrationId))
      .then(async (savedValue) => {
        if (generation !== restoreGeneration.current) return;
        const localSaved = Number(savedValue);
        const requested = resumeRequest?.narrationId === narrationId && appliedResumeToken.current !== resumeRequest.token ? resumeRequest.positionMs / 1000 : null;
        const bestPosition =
          requested !== null
            ? Number.isFinite(requested) && requested > 0 && requested < totalDurationSeconds - 2 ? requested : 0
            : Number.isFinite(localSaved) && localSaved > 1 && localSaved < totalDurationSeconds - 2
            ? localSaved
            : serverPositionSeconds > 1 && serverPositionSeconds < totalDurationSeconds - 2
              ? serverPositionSeconds
              : 0;

        await player.seekTo(bestPosition);
        if (requested !== null && generation === restoreGeneration.current && resumeRequest) appliedResumeToken.current = resumeRequest.token;
      })
      .catch(() => undefined)
      .finally(() => {
        if (generation !== restoreGeneration.current) return;
        ready.current = true;
        if (handledToken.current !== autoplayToken || playRequested) {
          handledToken.current = autoplayToken;
          setPlayRequested(false);
          void beginPlayback();
        }
      });
  }, [status.isLoaded, totalDurationSeconds, narrationId, playbackQuery.data?.positionMs, autoplayToken, playRequested, player, resumeRequest, beginPlayback]);

  useEffect(() => {
    const data = playbackQuery.data;
    if (!data || !status.isLoaded) return;
    const now = status.currentTime;
    const state = progressRef.current;
    const delta = now - state.previous;

    if (ready.current && (status.playing || status.didJustFinish) && listeningSession.current?.initialized && state.previous >= 0 && delta > 0 && delta <= 5) {
      const totalSec = Math.ceil(data.durationMs / 1000);
      for (let sec = Math.floor(state.previous); sec < Math.floor(now); sec++) {
        if (sec >= 0 && sec < totalSec) {
          state.bits[Math.floor(sec / 8)] |= 1 << (sec % 8);
          listeningSession.current.bits[Math.floor(sec / 8)] |= 1 << (sec % 8);
        }
      }
      if (status.didJustFinish && now >= data.durationMs / 1000) {
        const last = Math.ceil(data.durationMs / 1000) - 1;
        state.bits[Math.floor(last / 8)] |= 1 << (last % 8);
        listeningSession.current.bits[Math.floor(last / 8)] |= 1 << (last % 8);
      }
      state.dirty = true;
      listeningSession.current.progress = state;
      listeningSession.current.dirty = true;
    }
    state.positionMs = Math.min(Math.round(now * 1000), data.durationMs);
    state.previous = now;
  }, [status.currentTime, status.isLoaded, status.playing, status.didJustFinish, playbackQuery.data]);

  const syncProgressToServer = useCallback(async (): Promise<void> => {
    const session = listeningSession.current;
    if (session) await syncSession(session).catch(() => undefined);
    for (const old of retiredSessions.current) {
      if (old.userId !== useAuthStore.getState().user?.id) continue;
      await syncSession(old).catch(() => undefined);
      if (!old.dirty && !old.progress.dirty) retiredSessions.current = retiredSessions.current.filter((item) => item !== old);
    }
  }, [syncSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") void syncProgressToServer(); });
    return () => subscription.remove();
  }, [syncProgressToServer]);
  useEffect(() => {
    if (!ready.current || totalDurationSeconds <= 0 || !narrationId || !userId) return;
    const finished = status.didJustFinish || currentPositionSeconds >= totalDurationSeconds - 1;
    if (!finished && currentPositionSeconds < 1) return;
    const now = Date.now();
    if (!finished && status.playing && now - lastSavedLocal.current < 3000) return;
    lastSavedLocal.current = now;
    void AsyncStorage.setItem(storageKey(userId, narrationId), String(finished ? 0 : Math.floor(currentPositionSeconds))).catch(() => undefined);
  }, [currentPositionSeconds, status.playing, status.didJustFinish, totalDurationSeconds, narrationId, userId]);

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
      void beginPlayback();
    } else {
      setPlayRequested(true);
    }
  }, [autoplayToken, ready, status.isLoaded, player, beginPlayback]);

  const toggle = useCallback((): void => {
    if (!userId) {
      onRequireAuth();
      return;
    }
    if (player.playing) {
      playOperation.current += 1;
      playIntent.current = false;
      player.pause();
      if (userId) void syncProgressToServer();
      return;
    }
    if (!ready.current) { setPlayRequested(true); return; }
    const replay = totalDurationSeconds > 0 && player.currentTime >= totalDurationSeconds - 0.5;
    if (replay) { const operation = ++playOperation.current; progressRef.current.previous = -1; void player.seekTo(0).then(() => beginPlayback(true, operation)).catch(() => undefined); }
    else void beginPlayback();
  }, [userId, onRequireAuth, player, totalDurationSeconds, syncProgressToServer, beginPlayback]);

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
    const operation = ++playOperation.current;
    player.pause();
    progressRef.current.previous = -1;
    void player.seekTo(0).then(() => beginPlayback(true, operation)).catch(() => undefined);
  }, [player, beginPlayback]);

  const stop = useCallback((): void => {
    playOperation.current += 1;
    restoreGeneration.current += 1;
    restored.current = false;
    ready.current = false;
    playIntent.current = false;
    player.pause();
    const session = listeningSession.current;
    listeningSession.current = null;
    if (session) retireSession(session);
    progressRef.current.previous = -1;
    setSessionStarting(false);
    setPlayRequested(false);
    handledToken.current = autoplayToken;
  }, [player, retireSession, autoplayToken]);

  const error = !narrationId
    ? "Tập này chưa có bản thu sẵn sàng."
    : !userId
      ? "Đăng nhập để nghe podcast và lưu tiến trình."
    : playbackQuery.isError
      ? "Không thể tải âm thanh từ máy chủ."
      : sessionError;

  useEffect(() => {
    const session = listeningSession.current;
    if (session?.initialized && ready.current && session.narrationId === narrationId && session.assetId === playbackQuery.data?.assetId && status.playing && !status.didJustFinish) armedFinishedSession.current = session.id;
  }, [status.playing, status.didJustFinish, narrationId, playbackQuery.data?.assetId, sessionStarting]);
  const finishedSessionId = status.didJustFinish && ready.current && listeningSession.current?.id === armedFinishedSession.current && listeningSession.current?.narrationId === narrationId && listeningSession.current?.assetId === playbackQuery.data?.assetId ? listeningSession.current.id : null;

  return {
    isPlaying: status.playing,
    position: currentPositionSeconds,
    duration: totalDurationSeconds,
    toggle,
    seekBy,
    seekToRatio,
    restart,
    stop,
    didFinish: finishedSessionId !== null,
    finishedSessionId,
    isLoading: sessionStarting || playbackQuery.isFetching || (Boolean(userId) && playRequested && !status.isLoaded),
    error,
    requiresAuth: Boolean(narrationId && !userId),
    retry: () => {
      if (!userId) {
        onRequireAuth();
        return;
      }
      if (playbackQuery.data && ready.current && !playbackQuery.isError) void beginPlayback();
      else { setPlayRequested(true); void playbackQuery.refetch(); }
    },
  };
}
