import type { Dialogue, DialogueSpeakerKey } from "@repo/shared";

/** Static class strings so Tailwind can see them; the `mod-*` tokens do not offer 6 distinguishable hues. */
const SPEAKER_DOT_CLASSES = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500", "bg-indigo-500"] as const;
const UNASSIGNED_DOT_CLASS = "border border-dashed border-mod-danger bg-transparent";

/** Colour follows the speaker's position in `dialogue.speakers`, cycling after 6; an unknown key (unassigned turn) gets the dashed marker. */
export function speakerColorClass(dialogue: Dialogue, key: DialogueSpeakerKey): string {
  const index = dialogue.speakers.findIndex((speaker) => speaker.key === key);
  return index < 0 ? UNASSIGNED_DOT_CLASS : SPEAKER_DOT_CLASSES[index % SPEAKER_DOT_CLASSES.length]!;
}
