import { z } from "zod";

/** Gemini prebuilt voices offered to the moderator (prebuilt names, plus "en-us-riko" from the Extended Voice Library). */
export const AI_VOICES = ["en-us-riko", "Kore", "Charon", "Puck", "Aoede"] as const;
export const AiVoiceSchema = z.enum(AI_VOICES);
export type AiVoice = z.infer<typeof AiVoiceSchema>;

export const CreateVoiceJobSchema = z.object({ voice: AiVoiceSchema });
export type CreateVoiceJobInput = z.infer<typeof CreateVoiceJobSchema>;

export const VOICE_JOB_STATUSES = ["RUNNING", "DONE", "ERROR", "CANCELLED"] as const;

/** sha256 hex of the normalized spoken script; recomputed by the server at attach to detect a script edited after generation. */
export const ScriptHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

/** Progress of one background voice generation; `total`/`done` count the speech chunks. */
export const VoiceJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(VOICE_JOB_STATUSES),
  voice: AiVoiceSchema,
  total: z.number().int(),
  done: z.number().int(),
  chars: z.number().int(),
  /** Script the audio was generated from; copy into the AI_VOICE origin on attach. */
  scriptHash: ScriptHashSchema,
  /** Episode contentRevision the script was read at. */
  contentRevision: z.number().int().nonnegative(),
  error: z.string().nullable(),
  /** Set once status is DONE. */
  durationMs: z.number().int().nullable(),
  model: z.string(),
  style: z.string(),
});
export type VoiceJob = z.infer<typeof VoiceJobSchema>;
