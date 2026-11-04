import { z } from "zod";

/** Gemini prebuilt voices (all 30 from the Cloud TTS table); usable in multi-speaker and single-speaker requests. */
export const PREBUILT_VOICES = [
  "Achernar", "Achird", "Algenib", "Algieba", "Alnilam", "Aoede", "Autonoe", "Callirrhoe", "Charon", "Despina",
  "Enceladus", "Erinome", "Fenrir", "Gacrux", "Iapetus", "Kore", "Laomedeia", "Leda", "Orus", "Pulcherrima",
  "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Sulafat", "Umbriel", "Vindemiatrix", "Zephyr", "Zubenelgenubi",
] as const;

/** Voices offered to the moderator: the prebuilt ones plus "en-us-riko" from the Extended Voice Library. */
export const AI_VOICES = ["en-us-riko", ...PREBUILT_VOICES] as const;
export const AiVoiceSchema = z.enum(AI_VOICES);
export type AiVoice = z.infer<typeof AiVoiceSchema>;

/** A multi-speaker Gemini request only accepts prebuilt voices, not the Extended Library "en-us-riko". */
export const DIALOGUE_VOICES = PREBUILT_VOICES;
export const DialogueVoiceSchema = z.enum(PREBUILT_VOICES);

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
