import { z } from "zod";
import { DialogueVoiceSchema } from "./ai-voice";

/** Gemini TTS inline expression tags; anything else between `<>` is rejected so it is never read aloud. */
export const DIALOGUE_TAGS = [
  "laugh",
  "chuckle",
  "sigh",
  "breath",
  "gasp",
  "cough",
  "throat-clearing",
  "whispers",
  "short pause",
  "long pause",
] as const;
export type DialogueTag = (typeof DIALOGUE_TAGS)[number];

export const DIALOGUE_MAX_TURNS = 300;
export const DIALOGUE_TURN_MAX_CHARS = 2000;
export const DIALOGUE_STYLE_MAX_CHARS = 200;
export const DIALOGUE_NOTE_MAX_CHARS = 500;
export const DIALOGUE_NAME_MAX_CHARS = 40;

export const DialogueSpeakerKeySchema = z.enum(["A", "B"]);
export type DialogueSpeakerKey = z.infer<typeof DialogueSpeakerKeySchema>;

const TAG_PATTERN = /<([^<>]*)>/g;
const tagSet: ReadonlySet<string> = new Set(DIALOGUE_TAGS);

/** Lines are valid when every `<tag>` is allowed, no stray angle bracket remains and `|…|` pairs balance. */
export function isValidDialogueText(text: string): boolean {
  const withoutTags = text.replace(TAG_PATTERN, (match, name: string) => (tagSet.has(name) ? "" : match));
  if (/[<>]/.test(withoutTags)) return false;
  return (withoutTags.match(/\|/g)?.length ?? 0) % 2 === 0;
}

const DialogueSpeakerSchema = z.object({
  key: DialogueSpeakerKeySchema,
  name: z.string().trim().min(1).max(DIALOGUE_NAME_MAX_CHARS),
  voice: DialogueVoiceSchema,
});

const DialogueTurnSchema = z.object({
  id: z.string().uuid(),
  speaker: DialogueSpeakerKeySchema,
  text: z.string().trim().min(1).max(DIALOGUE_TURN_MAX_CHARS).refine(isValidDialogueText, {
    message: "Lời có thẻ không hợp lệ hoặc dấu | không cân bằng",
  }),
  /** Tone for the whole turn, sent to TTS as speech_metadata.style. */
  style: z.string().trim().max(DIALOGUE_STYLE_MAX_CHARS).nullish(),
  /** Moderator note for the recorder; never sent to TTS. */
  note: z.string().trim().max(DIALOGUE_NOTE_MAX_CHARS).nullish(),
});

export const DialogueSchema = z
  .object({
    speakers: z.tuple([DialogueSpeakerSchema, DialogueSpeakerSchema]),
    turns: z.array(DialogueTurnSchema).min(1).max(DIALOGUE_MAX_TURNS),
  })
  .superRefine((value, ctx) => {
    const [a, b] = value.speakers;
    if (a.key !== "A" || b.key !== "B") ctx.addIssue({ code: "custom", message: "Người nói phải là A rồi B", path: ["speakers"] });
    if (a.name.toLowerCase() === b.name.toLowerCase()) ctx.addIssue({ code: "custom", message: "Hai người nói phải khác tên", path: ["speakers"] });
    if (a.voice === b.voice) ctx.addIssue({ code: "custom", message: "Hai người nói phải khác giọng", path: ["speakers"] });
    if (new Set(value.turns.map((turn) => turn.id)).size !== value.turns.length) ctx.addIssue({ code: "custom", message: "Mã lượt bị trùng", path: ["turns"] });
  });
export type Dialogue = z.infer<typeof DialogueSchema>;
export type DialogueTurn = Dialogue["turns"][number];
export type DialogueSpeaker = Dialogue["speakers"][number];

/** Plain words a listener hears: tags and `|` markers removed. */
export function dialogueSpokenText(turn: Pick<DialogueTurn, "text">): string {
  return turn.text
    .replace(TAG_PATTERN, "")
    .replace(/\|/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Stored as `scriptContent` so word count, duration and moderation keep working for dialogue episodes. */
export function dialogueScriptContent(dialogue: Dialogue): string {
  return dialogue.turns.map(dialogueSpokenText).filter(Boolean).join("\n");
}

/** Canonical JSON of everything that changes the audio; hash it. Notes, names, ids and readers are excluded on purpose. */
export function dialogueSpeechKey(dialogue: Dialogue): string {
  return JSON.stringify({
    speakers: dialogue.speakers.map((speaker) => [speaker.key, speaker.voice]),
    turns: dialogue.turns.map((turn) => [turn.speaker, turn.text, turn.style?.trim() || null]),
  });
}
