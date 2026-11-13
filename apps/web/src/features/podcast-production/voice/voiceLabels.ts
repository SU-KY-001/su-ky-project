import { AI_VOICES, type AiVoice } from "@repo/shared";

/** Moderator-facing name and character of each AI voice, keyed by the voice id the API stores. */
const FEMALE_VOICES: ReadonlySet<string> = new Set([
  "Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore", "Laomedeia", "Leda",
  "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr",
]);

/** Hand-written characters for the voices the moderator met first; the rest only state gender (the Cloud TTS table). */
const KNOWN_DETAIL: Partial<Record<AiVoice, string>> = {
  "en-us-riko": "Nam, trầm, kể chuyện kiểu podcast",
  Kore: "Chắc, rõ ràng",
  Charon: "Trầm, kể thông tin",
  Puck: "Sôi nổi",
  Aoede: "Nhẹ nhàng",
};

export const VOICE_LABEL = Object.fromEntries(
  AI_VOICES.map((id) => [
    id,
    { name: id === "en-us-riko" ? "Riko" : id, detail: KNOWN_DETAIL[id] ?? (FEMALE_VOICES.has(id) ? "Nữ" : "Nam") },
  ]),
) as Record<AiVoice, { name: string; detail: string }>;

/** `origin.voice` is capped at 60 chars by the API, so long speaker lists are summarised. */
const ORIGIN_VOICE_MAX_LISTED = 3;
export function formatVoiceOrigin(voices: readonly string[]): string {
  const listed = voices.slice(0, ORIGIN_VOICE_MAX_LISTED).join(" + ");
  const rest = voices.length - ORIGIN_VOICE_MAX_LISTED;
  return rest > 0 ? `${listed} (+${rest})` : listed;
}

/** The stored voice id is a free string (it outlives the list above), so unknown ids fall back to themselves. */
export function voiceName(id: string): string {
  const known = VOICE_LABEL[id as AiVoice];
  return known ? `${known.name} · ${known.detail}` : id;
}
