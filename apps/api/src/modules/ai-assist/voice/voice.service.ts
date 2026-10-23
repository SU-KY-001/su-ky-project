import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AiVoice, EditorDocument, VoiceJob } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";
import { logger } from "../../../core/logger";
import type { Session } from "../../auth";
import type { ContentService } from "../../content/application/content.service";
import { synthesizeWav } from "./gemini-tts";
import { chunkSpeech, scriptSpeechHash, speechNarration, speechParagraphs } from "./speech-text";

const execFileAsync = promisify(execFile);
const LOG_SCOPE = "ai-voice";
const WAV_HEADER_BYTES = 44;
const PCM_BYTES_PER_SECOND = 24_000 * 2; // Gemini TTS output: 24 kHz, mono, 16-bit
const MP3_QUALITY = "4";
const FFMPEG_TIMEOUT_MS = 120_000;
const MP3_SAMPLE_RATE = 44_100;
const SWEEP_INTERVAL_MS = 60_000;
const JOB_DIR = join(tmpdir(), "suky-voice");

interface Job {
  id: string;
  userId: string;
  episodeId: string;
  /** Identity of the script the job reads (see scriptSpeechHash) and the episode revision it was read at. */
  scriptHash: string;
  contentRevision: number;
  voice: AiVoice;
  status: VoiceJob["status"];
  total: number;
  done: number;
  chars: number;
  error: string | null;
  durationMs: number | null;
  mp3Path: string | null;
  finishedAt: number | null;
  abort: AbortController;
}

const toDto = (job: Job): VoiceJob => ({
  id: job.id, status: job.status, voice: job.voice, total: job.total, done: job.done, chars: job.chars, error: job.error, durationMs: job.durationMs,
  scriptHash: job.scriptHash, contentRevision: job.contentRevision,
  model: env.TTS_MODEL, style: env.TTS_STYLE,
});

export interface VoiceDeps {
  synthesize?: typeof synthesizeWav;
  /** Joins the WAV files listed in `listFile` (ffmpeg concat format) into the mp3 at `outFile`. */
  encode?: (listFile: string, outFile: string) => Promise<void>;
}

const encodeWithFfmpeg = async (listFile: string, outFile: string): Promise<void> => {
  // Gemini's native 24 kHz is resampled once here to the fixed output rate.
  await execFileAsync(env.FFMPEG_PATH, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-codec:a", "libmp3lame", "-ar", String(MP3_SAMPLE_RATE), "-q:a", MP3_QUALITY, outFile], { timeout: FFMPEG_TIMEOUT_MS });
};

/**
 * Voice generation runs as a background job: a real episode takes minutes, longer than a request should stay open.
 * Jobs live in memory (single API instance) and the mp3 in the OS temp dir; both expire after `TTS_JOB_TTL_MS`.
 * The result is not stored anywhere permanent: the web downloads it and attaches it through the existing audio upload.
 */
export class VoiceService {
  private readonly jobs = new Map<string, Job>();

  private readonly synthesize: typeof synthesizeWav;
  private readonly encode: (listFile: string, outFile: string) => Promise<void>;

  constructor(private readonly content: Pick<ContentService, "getEpisodeForRead">, deps: VoiceDeps = {}) {
    this.synthesize = deps.synthesize ?? synthesizeWav;
    this.encode = deps.encode ?? encodeWithFfmpeg;
    setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS).unref();
  }

  async start(session: Session, episodeId: string, voice: AiVoice): Promise<VoiceJob> {
    const episode = await this.content.getEpisodeForRead(session, episodeId);
    const narration = speechNarration(episode.narrations);
    const chunks = chunkSpeech(speechParagraphs((narration?.scriptDocument ?? null) as EditorDocument | null, narration?.scriptContent ?? null), env.TTS_CHUNK_CHARS);
    if (!chunks.length) throw new DomainError(422, "VALIDATION_ERROR", "Tập chưa có kịch bản đã lưu để đọc");

    const scriptHash = scriptSpeechHash(episode.narrations);
    // From here to jobs.set() there is no await: two concurrent starts cannot both pass this check.
    const running = [...this.jobs.values()].find((job) => job.episodeId === episodeId && job.userId === session.user.id && job.status === "RUNNING");
    if (running?.scriptHash === scriptHash && running.voice === voice) return toDto(running);
    // The script or voice changed since that job started: its audio would be stale, so replace it rather than hand it back.
    if (running) {
      running.abort.abort();
      this.finish(running, "CANCELLED", null);
    }
    const job: Job = {
      id: randomUUID(), userId: session.user.id, episodeId, scriptHash, contentRevision: episode.contentRevision,
      voice, status: "RUNNING", total: chunks.length, done: 0,
      chars: chunks.reduce((sum, chunk) => sum + chunk.length, 0), error: null, durationMs: null, mp3Path: null, finishedAt: null, abort: new AbortController(),
    };
    this.jobs.set(job.id, job);
    void this.run(job, chunks);
    return toDto(job);
  }

  get(session: Session, episodeId: string, jobId: string): VoiceJob {
    return toDto(this.owned(session, episodeId, jobId));
  }

  cancel(session: Session, episodeId: string, jobId: string): void {
    const job = this.owned(session, episodeId, jobId);
    if (job.status === "RUNNING") {
      job.abort.abort();
      this.finish(job, "CANCELLED", null);
    }
  }

  async readMp3(session: Session, episodeId: string, jobId: string): Promise<Buffer> {
    const job = this.owned(session, episodeId, jobId);
    if (job.status !== "DONE" || !job.mp3Path) throw new DomainError(409, "CONFLICT", "Giọng đọc chưa tạo xong");
    return readFile(job.mp3Path);
  }

  private owned(session: Session, episodeId: string, jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job || job.episodeId !== episodeId || (job.userId !== session.user.id && session.user.role !== "admin")) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy lượt tạo giọng đọc");
    return job;
  }

  private finish(job: Job, status: Job["status"], error: string | null): void {
    job.status = status;
    job.error = error;
    job.finishedAt = Date.now();
  }

  private async run(job: Job, chunks: string[]): Promise<void> {
    const dir = join(JOB_DIR, job.id);
    const started = Date.now();
    try {
      await mkdir(dir, { recursive: true });
      const wavs = new Array<Buffer>(chunks.length);
      let next = 0;
      const worker = async (): Promise<void> => {
        while (job.status === "RUNNING") {
          const index = next++;
          if (index >= chunks.length) return;
          wavs[index] = await this.synthesize(chunks[index]!, job.voice, job.abort.signal);
          job.done += 1;
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(env.TTS_CONCURRENCY, chunks.length) }, worker));
      } catch (error) {
        job.abort.abort(); // stop the sibling workers: their quota would be wasted
        throw error;
      }
      if (job.status !== "RUNNING") return;

      const files: string[] = [];
      for (const [index, wav] of wavs.entries()) {
        const file = join(dir, `part${index}.wav`);
        await writeFile(file, wav);
        files.push(file);
      }
      const list = join(dir, "parts.txt");
      await writeFile(list, files.map((file) => `file '${file.replaceAll("\\", "/")}'`).join("\n"));
      const mp3 = join(dir, "voice.mp3");
      await this.encode(list, mp3);
      // cancel() may have landed while ffmpeg ran: a cancelled job must stay CANCELLED, not be flipped to DONE.
      if (job.status !== "RUNNING") return;
      job.durationMs = Math.round((wavs.reduce((sum, wav) => sum + wav.length - WAV_HEADER_BYTES, 0) / PCM_BYTES_PER_SECOND) * 1000);
      job.mp3Path = mp3;
      this.finish(job, "DONE", null);
      logger.info({ scope: LOG_SCOPE, jobId: job.id, episodeId: job.episodeId, chunks: chunks.length, chars: job.chars, elapsedMs: Date.now() - started }, "voice job done");
    } catch (error) {
      if (job.status !== "RUNNING") return;
      const message = error instanceof DomainError ? error.message : "Không tạo được giọng đọc. Thử lại sau.";
      this.finish(job, "ERROR", message);
      logger.error({ scope: LOG_SCOPE, jobId: job.id, episodeId: job.episodeId, err: error }, "voice job failed");
    } finally {
      if (job.status !== "DONE") await rm(dir, { recursive: true, force: true });
    }
  }

  private async sweep(): Promise<void> {
    const cutoff = Date.now() - env.TTS_JOB_TTL_MS;
    for (const job of this.jobs.values()) {
      if (job.finishedAt !== null && job.finishedAt < cutoff) {
        this.jobs.delete(job.id);
        await rm(join(JOB_DIR, job.id), { recursive: true, force: true });
      }
    }
  }
}
