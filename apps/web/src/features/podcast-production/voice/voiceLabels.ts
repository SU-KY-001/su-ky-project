import type { AiVoice } from "@repo/shared";

/** Moderator-facing name and character of each AI voice, keyed by the voice id the API stores. */
export const VOICE_LABEL: Record<AiVoice, { name: string; detail: string }> = {
  "en-us-riko": { name: "Riko", detail: "Nam, trầm, kể chuyện kiểu podcast" },
  Kore: { name: "Kore", detail: "Chắc, rõ ràng" },
  Charon: { name: "Charon", detail: "Trầm, kể thông tin" },
  Puck: { name: "Puck", detail: "Sôi nổi" },
  Aoede: { name: "Aoede", detail: "Nhẹ nhàng" },
};

/** The stored voice id is a free string (it outlives the list above), so unknown ids fall back to themselves. */
export function voiceName(id: string): string {
  const known = VOICE_LABEL[id as AiVoice];
  return known ? `${known.name} · ${known.detail}` : id;
}
