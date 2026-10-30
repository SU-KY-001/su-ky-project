import { useCallback, useEffect, useRef, useState } from "react";
import type { AiVoice, VoiceJob } from "@repo/shared";
import { ApiError, errorMessage } from "@/lib/apiError";
import { voiceService } from "./voiceService";

const POLL_INTERVAL_MS = 2000;
const HTTP_NOT_FOUND = 404;
const storageKey = (episodeId: string): string => `podcast-voice-job:${episodeId}`;

export interface VoiceJobState {
  job: VoiceJob | null;
  /** The finished mp3, downloaded once the job is DONE. */
  file: File | null;
  error: string;
  starting: boolean;
  start: (voice?: AiVoice) => Promise<void>;
  cancel: () => Promise<void>;
}

/**
 * Starts / resumes / polls one voice job. The job id is kept in sessionStorage so leaving the step (or a reload)
 * does not lose a job that is still running on the server.
 */
export function useVoiceJob(episodeId: string | null): VoiceJobState {
  const [job, setJob] = useState<VoiceJob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const jobId = job?.id ?? (episodeId ? sessionStorage.getItem(storageKey(episodeId)) : null);
  const status = job?.status ?? null;
  const fetched = useRef<string | null>(null);

  const forget = useCallback(() => {
    if (episodeId) sessionStorage.removeItem(storageKey(episodeId));
    setJob(null);
  }, [episodeId]);

  useEffect(() => {
    if (!episodeId || !jobId || status === "DONE" || status === "ERROR" || status === "CANCELLED") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (): Promise<void> => {
      try {
        const next = await voiceService.get(episodeId, jobId, controller.signal);
        setJob(next);
        if (next.status === "RUNNING") timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (caught instanceof ApiError && caught.status === HTTP_NOT_FOUND) {
          forget();
          setError("Lượt tạo giọng đã hết hạn (máy chủ khởi động lại hoặc quá lâu). Hãy tạo lại.");
        } else setError(errorMessage(caught));
      }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [episodeId, jobId, status, forget]);

  useEffect(() => {
    if (!episodeId || status !== "DONE" || !job || fetched.current === job.id) return;
    fetched.current = job.id;
    const controller = new AbortController();
    voiceService.audio(episodeId, job.id, controller.signal)
      .then((blob) => setFile(new File([blob], "giong-doc-ai.mp3", { type: "audio/mpeg" })))
      .catch((caught) => { if (!controller.signal.aborted) setError(errorMessage(caught)); });
    return () => controller.abort();
  }, [episodeId, status, job]);

  const start = useCallback(async (voice?: AiVoice): Promise<void> => {
    if (!episodeId) return;
    setStarting(true);
    setError("");
    setFile(null);
    try {
      const created = await voiceService.start(episodeId, voice ? { voice } : {});
      sessionStorage.setItem(storageKey(episodeId), created.id);
      setJob(created);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setStarting(false);
    }
  }, [episodeId]);

  const cancel = useCallback(async (): Promise<void> => {
    if (!episodeId || !job) return;
    try {
      await voiceService.cancel(episodeId, job.id);
      setJob({ ...job, status: "CANCELLED" });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [episodeId, job]);

  return { job, file, error, starting, start, cancel };
}
