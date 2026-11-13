import {
  DIALOGUE_MAX_SPEAKERS,
  DIALOGUE_MAX_TURNS,
  DIALOGUE_MIN_SPEAKERS,
  DIALOGUE_TURN_MAX_CHARS,
  DialogueSchema,
  PREBUILT_VOICES,
  type Dialogue,
  type DialogueSpeakerKey,
  type DialogueTag,
  type DialogueTurn,
} from "@repo/shared";

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

const DEFAULT_SPEAKER_NAME_PREFIX = "Người nói";
const LEGACY_KEYS = ["A", "B"] as const;
const DEFAULT_VOICES = ["Kore", "Charon"] as const;
const NEW_SPEAKER_KEY_PREFIX = "S";
const FIRST_NEW_SPEAKER_NUMBER = 3;
const UNASSIGNED = "";

export function newDialogue(): Dialogue {
  return {
    speakers: LEGACY_KEYS.map((key, index) => ({ key, name: `${DEFAULT_SPEAKER_NAME_PREFIX} ${index + 1}`, voice: DEFAULT_VOICES[index]! })),
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
  return { ...dialogue, speakers: dialogue.speakers.map((speaker) => (speaker.key === key ? { ...speaker, ...patch } : speaker)) };
}

/** Smallest unused `S3`, `S4`, …; legacy `A`/`B` stay as they are so stored scripts never change. */
export function nextSpeakerKey(dialogue: Dialogue): string {
  const taken = new Set(dialogue.speakers.map((speaker) => speaker.key));
  for (let n = FIRST_NEW_SPEAKER_NUMBER; ; n += 1) {
    const key = `${NEW_SPEAKER_KEY_PREFIX}${n}`;
    if (!taken.has(key)) return key;
  }
}

/** Adds a speaker with the first unused voice and a free default name; unchanged at the 30-speaker cap. */
export function addSpeaker(dialogue: Dialogue): Dialogue {
  if (dialogue.speakers.length >= DIALOGUE_MAX_SPEAKERS) return dialogue;
  const key = nextSpeakerKey(dialogue);
  const voice = PREBUILT_VOICES.find((candidate) => !dialogue.speakers.some((speaker) => speaker.voice === candidate));
  if (!voice) return dialogue;
  const names = new Set(dialogue.speakers.map((speaker) => speaker.name.toLowerCase()));
  let n = dialogue.speakers.length + 1;
  while (names.has(`${DEFAULT_SPEAKER_NAME_PREFIX} ${n}`.toLowerCase())) n += 1;
  return { ...dialogue, speakers: [...dialogue.speakers, { key, name: `${DEFAULT_SPEAKER_NAME_PREFIX} ${n}`, voice }] };
}

/** `blockedBy` is the number of turns still using the speaker; removal is refused then, and below the 2-speaker minimum. */
export function removeSpeaker(dialogue: Dialogue, key: DialogueSpeakerKey): { dialogue: Dialogue; blockedBy: number } {
  const blockedBy = dialogue.turns.filter((turn) => turn.speaker === key).length;
  if (blockedBy > 0 || dialogue.speakers.length <= DIALOGUE_MIN_SPEAKERS) return { dialogue, blockedBy };
  return { dialogue: { ...dialogue, speakers: dialogue.speakers.filter((speaker) => speaker.key !== key) }, blockedBy: 0 };
}

/** Sets the speaker of every turn whose id is in `ids`. */
export function assignTurns(dialogue: Dialogue, ids: ReadonlySet<string>, speaker: DialogueSpeakerKey): Dialogue {
  return dialogueWithTurns(dialogue, dialogue.turns.map((turn) => (ids.has(turn.id) ? { ...turn, speaker } : turn)));
}

/** Ids of turns with no speaker or one that is not declared; they are the "not assigned yet" state of a fresh import. */
export function unassignedTurns(dialogue: Dialogue): string[] {
  const keys = new Set(dialogue.speakers.map((speaker) => speaker.key));
  return dialogue.turns.filter((turn) => !keys.has(turn.speaker)).map((turn) => turn.id);
}

/** Next turn goes to the speaker after the last turn's, wrapping; an unassigned last turn starts from the first speaker. */
export function nextTurnSpeaker(dialogue: Dialogue): DialogueSpeakerKey {
  const last = dialogue.turns.at(-1)?.speaker;
  const index = dialogue.speakers.findIndex((speaker) => speaker.key === last);
  return dialogue.speakers[(index + 1) % dialogue.speakers.length]!.key;
}

const PARAGRAPH_BREAK = /\n\s*\n/;
const SENTENCE_END = /(?<=[.!?…])\s+/;

/** Cuts one over-long paragraph at sentence ends; a single sentence still over the limit is cut hard. */
function cutParagraph(paragraph: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let current = "";
  const flush = (): void => {
    if (current) pieces.push(current);
    current = "";
  };
  for (const sentence of paragraph.split(SENTENCE_END)) {
    if (current && current.length + 1 + sentence.length > maxChars) flush();
    current = current ? `${current} ${sentence}` : sentence;
    while (current.length > maxChars) {
      pieces.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  flush();
  return pieces;
}

/** Pasted text → one paragraph per blank-line block; `splitLong` counts the paragraphs that had to be cut so the UI can say so. */
export function splitScript(text: string, maxChars = DIALOGUE_TURN_MAX_CHARS): { paragraphs: string[]; splitLong: number } {
  const blocks = text.replace(/\r\n?/g, "\n").split(PARAGRAPH_BREAK).map((block) => block.trim()).filter(Boolean);
  let splitLong = 0;
  const paragraphs = blocks.flatMap((block) => {
    if (block.length <= maxChars) return [block];
    splitLong += 1;
    return cutParagraph(block, maxChars);
  });
  return { paragraphs, splitLong };
}

/** Appends or replaces turns from `paragraphs`, all unassigned; over the turn cap is an error, never a silent cut. */
export function importTurns(dialogue: Dialogue, paragraphs: readonly string[], mode: "append" | "replace"): { dialogue: Dialogue } | { error: string } {
  const imported: DialogueTurn[] = paragraphs.map((text) => ({ id: crypto.randomUUID(), speaker: UNASSIGNED, text }));
  const kept = mode === "append" ? dialogue.turns.filter((turn) => turn.text.trim() || turn.speaker !== UNASSIGNED) : [];
  const total = kept.length + imported.length;
  if (total > DIALOGUE_MAX_TURNS) return { error: `Tối đa ${DIALOGUE_MAX_TURNS} lượt, kịch bản sẽ có ${total}. Chia thành nhiều tập hoặc rút gọn.` };
  return { dialogue: dialogueWithTurns(dialogue, [...kept, ...imported]) };
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
  const unassigned = new Set(unassignedTurns(dialogue));
  const missing = dialogue.turns.flatMap((turn, index) => (unassigned.has(turn.id) ? [`Lượt ${index + 1}: chưa gán người nói`] : []));
  const parsed = DialogueSchema.safeParse(dialogue);
  if (parsed.success) return [];
  const schema = parsed.error.issues.filter((issue) => !(issue.path[0] === "turns" && issue.path[2] === "speaker" && unassigned.has(dialogue.turns[issue.path[1] as number]?.id ?? "")));
  return [...new Set([...missing, ...schema.map((issue) => {
    const turn = issue.path[0] === "turns" && typeof issue.path[1] === "number" ? `Lượt ${issue.path[1] + 1}: ` : "";
    return `${turn}${issue.path[2] === "text" && issue.code === "too_small" ? "chưa có lời" : issue.message}`;
  })])];
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
