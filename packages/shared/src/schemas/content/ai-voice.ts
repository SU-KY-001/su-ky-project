import { z } from "zod";

/** Gemini prebuilt voices offered to the moderator (prebuilt names, plus "en-us-riko" from the Extended Voice Library). */
export const AI_VOICES = ["en-us-riko", "Kore", "Charon", "Puck", "Aoede"] as const;
export const AiVoiceSchema = z.enum(AI_VOICES);
export type AiVoice = z.infer<typeof AiVoiceSchema>;

/** A two-speaker Gemini request only accepts prebuilt voices, not the Extended Library "en-us-riko". */
export const DIALOGUE_VOICES = AI_VOICES.filter((voice) => voice !== "en-us-riko");
export const DialogueVoiceSchema = z.enum(["Kore", "Charon", "Puck", "Aoede"]);

/** Single-narrator episodes send `voice`; dialogue episodes omit it (voices come from `dialogue.speakers`). The server enforces which form applies. */
export const CreateVoiceJobSchema = z.object({ voice: AiVoiceSchema.optional() });
export type CreateVoiceJobInput = z.infer<typeof CreateVoiceJobSchema>;

export const VOICE_JOB_STATUSES = ["RUNNING", "DONE", "ERROR", "CANCELLED"] as const;

/** sha256 hex of the normalized spoken script; recomputed by the server at attach to detect a script edited after generation. */
export const ScriptHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

/** Progress of one background voice generation; `total`/`done` count the speech chunks. */
export const VoiceJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(VOICE_JOB_STATUSES),
  mode: z.enum(["SINGLE", "DIALOGUE"]),
  /** Null for DIALOGUE jobs. */
  voice: AiVoiceSchema.nullable(),
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
