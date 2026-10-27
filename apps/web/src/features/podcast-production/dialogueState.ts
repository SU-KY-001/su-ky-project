import { DIALOGUE_VOICES, DialogueSchema, type Dialogue, type DialogueSpeakerKey, type DialogueTag, type DialogueTurn } from "@repo/shared";

/** Vietnamese stage direction shown to the person recording; every tag in DIALOGUE_TAGS must have one. */
export const DIALOGUE_TAG_CUE: Record<DialogueTag, string> = {
  laugh: "cười",
  chuckle: "cười khẽ",
  sigh: "thở dài",
  breath: "hít thở",
  gasp: "ngạc nhiên",
  cough: "ho",
  "throat-clearing": "e hèm",
  whispers: "thì thầm",
  "short pause": "nghỉ ngắn",
  "long pause": "nghỉ dài",
};

const DEFAULT_NAMES = ["Người nói A", "Người nói B"] as const;

export function newDialogue(): Dialogue {
  const [first, second] = DIALOGUE_VOICES;
  return {
    speakers: [
      { key: "A", name: DEFAULT_NAMES[0], voice: first! },
      { key: "B", name: DEFAULT_NAMES[1], voice: second! },
    ],
    turns: [newTurn("A")],
  };
}

export function newTurn(speaker: DialogueSpeakerKey): DialogueTurn {
  return { id: crypto.randomUUID(), speaker, text: "" };
}

export const dialogueWithTurns = (dialogue: Dialogue, turns: DialogueTurn[]): Dialogue => ({ ...dialogue, turns });

export function updateTurn(dialogue: Dialogue, id: string, patch: Partial<Omit<DialogueTurn, "id">>): Dialogue {
  return dialogueWithTurns(dialogue, dialogue.turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
}

export function moveTurn(dialogue: Dialogue, id: string, offset: -1 | 1): Dialogue {
  const from = dialogue.turns.findIndex((turn) => turn.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= dialogue.turns.length) return dialogue;
  const turns = [...dialogue.turns];
  [turns[from], turns[to]] = [turns[to]!, turns[from]!];
  return dialogueWithTurns(dialogue, turns);
}

/** The last turn cannot be removed: a dialogue always has at least one (the schema requires it). */
export function removeTurn(dialogue: Dialogue, id: string): Dialogue {
  return dialogue.turns.length <= 1 ? dialogue : dialogueWithTurns(dialogue, dialogue.turns.filter((turn) => turn.id !== id));
}

export function updateSpeaker(dialogue: Dialogue, key: DialogueSpeakerKey, patch: { name?: string; voice?: Dialogue["speakers"][number]["voice"] }): Dialogue {
  const [a, b] = dialogue.speakers;
  return { ...dialogue, speakers: key === "A" ? [{ ...a, ...patch }, b] : [a, { ...b, ...patch }] };
}

/** Inserts `<tag> ` at `position`; the tag stays a separate word so TTS reads the next word normally. */
export function insertTag(text: string, position: number, tag: DialogueTag): { text: string; caret: number } {
  const at = Math.min(Math.max(position, 0), text.length);
  const before = text.slice(0, at);
  const lead = before && !before.endsWith(" ") ? " " : "";
  const inserted = `${lead}<${tag}> `;
  return { text: before + inserted + text.slice(at), caret: at + inserted.length };
}

/** Human-readable problems that would make the server reject a save; empty when the dialogue is valid. */
export function dialogueIssues(dialogue: Dialogue): string[] {
  const parsed = DialogueSchema.safeParse(dialogue);
  if (parsed.success) return [];
  return [...new Set(parsed.error.issues.map((issue) => {
    const turn = issue.path[0] === "turns" && typeof issue.path[1] === "number" ? `Lượt ${issue.path[1] + 1}: ` : "";
    return `${turn}${issue.path[2] === "text" && issue.code === "too_small" ? "chưa có lời" : issue.message}`;
  }))];
}

export type DialogueSegment = { kind: "text" | "cue" | "reply"; value: string };

const SEGMENT_PATTERN = /<([^<>]+)>|\|([^|]*)\|/g;

/** Splits a turn into spoken text, stage directions (`<tag>`) and the other speaker's short replies (`|…|`). */
export function dialogueSegments(text: string): DialogueSegment[] {
  const segments: DialogueSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(SEGMENT_PATTERN)) {
    if (match.index > last) segments.push({ kind: "text", value: text.slice(last, match.index) });
    if (match[1] !== undefined) segments.push({ kind: "cue", value: DIALOGUE_TAG_CUE[match[1] as DialogueTag] ?? match[1] });
    else segments.push({ kind: "reply", value: match[2] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments.filter((segment) => segment.value.trim());
}
