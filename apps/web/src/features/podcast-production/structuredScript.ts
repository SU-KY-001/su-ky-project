import { analyzeStructuredScript, DIALOGUE_VOICES, DIALOGUE_MAX_SPEAKERS, DIALOGUE_MAX_TURNS, type Dialogue } from "@repo/shared";
import { splitScript, nextSpeakerKey } from "./dialogueState";

export function structuredDialogue(text: string, existing?: Dialogue): Dialogue {
  const analysis = analyzeStructuredScript(text);
  if (analysis.kind !== "dialogue") throw new Error(analysis.issues.join(" ") || "File không có cấu trúc hội thoại rõ ràng.");
  const speakers = existing ? [...existing.speakers] : [];
  const turns: Dialogue["turns"] = [];
  for (const turn of analysis.turns) {
    let speaker = speakers.find((item) => item.name.toLocaleLowerCase("vi-VN") === turn.speaker.toLocaleLowerCase("vi-VN"));
    if (!speaker) {
      const voice = DIALOGUE_VOICES.find((item) => !speakers.some((person) => person.voice === item));
      if (!voice || speakers.length >= DIALOGUE_MAX_SPEAKERS) throw new Error("Số người nói vượt giới hạn cho phép.");
      speaker = { key: nextSpeakerKey({ speakers, turns: [] }), name: turn.speaker, voice }; speakers.push(speaker);
    }
    turns.push(...splitScript(turn.text).paragraphs.map((paragraph) => ({ id: crypto.randomUUID(), speaker: speaker.key, text: paragraph })));
  }
  if ((existing?.turns.length ?? 0) + turns.length > DIALOGUE_MAX_TURNS) throw new Error("Quá nhiều lượt thoại; hãy chia nhỏ kịch bản.");
  return { speakers, turns: [...(existing?.turns ?? []), ...turns] };
}
