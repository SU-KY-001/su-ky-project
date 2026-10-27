import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dialogueScriptContent, isValidDialogueText, type Dialogue } from "@repo/shared";
import { buildDialogueBody } from "../../src/modules/ai-assist/voice/gemini-tts";
import { chunkDialogue, scriptSpeechHash } from "../../src/modules/ai-assist/voice/speech-text";
import { VoiceService } from "../../src/modules/ai-assist/voice/voice.service";

const EPISODE = "11111111-1111-4111-8111-111111111111";
const session = { user: { id: "user-1", role: "moderator" } } as never;
const wav = Buffer.alloc(44 + 48_000);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const dialogue = (over: Partial<Dialogue["turns"][number]> = {}, voices: [string, string] = ["Kore", "Charon"]): Dialogue =>
  ({
    speakers: [
      { key: "A", name: "Veda", voice: voices[0] },
      { key: "B", name: "Rami", voice: voices[1] },
    ],
    turns: [
      { id: id(1), speaker: "A", text: "Chào |ừ| bạn.", style: "vui vẻ", note: "mở đầu", ...over },
      { id: id(2), speaker: "B", text: "<laugh> Chào lại." },
    ],
  }) as Dialogue;
const narrations = (d: Dialogue) => [{ narrationType: "THIRD_PERSON", scriptDocument: null, scriptContent: dialogueScriptContent(d), dialogue: d }];
const until = async (condition: () => boolean): Promise<void> => {
  for (let waited = 0; !condition(); waited += 5) {
    if (waited > 2000) throw new Error("condition not met");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

afterAll(() => rm(join(tmpdir(), "suky-voice"), { recursive: true, force: true }));

describe("dialogue text rules", () => {
  test("accepts allowed tags and balanced |…|; rejects unknown tags, stray brackets and odd pipes", () => {
    expect(isValidDialogueText("<short pause> Xin <laugh> chào |ừ|.")).toBe(true);
    expect(isValidDialogueText("<shout> Xin chào")).toBe(false);
    expect(isValidDialogueText("a < b")).toBe(false);
    expect(isValidDialogueText("Xin |chào")).toBe(false);
  });
});

describe("dialogue speech hash", () => {
  test("ignores note, names and ids but follows text, style, voice and order", () => {
    const base = scriptSpeechHash(narrations(dialogue()));
    expect(scriptSpeechHash(narrations(dialogue({ note: "ghi chú khác", id: id(9) })))).toBe(base);
    expect(scriptSpeechHash(narrations(dialogue({ text: "Chào bạn." })))).not.toBe(base);
    expect(scriptSpeechHash(narrations(dialogue({ style: "buồn" })))).not.toBe(base);
    expect(scriptSpeechHash(narrations(dialogue({}, ["Puck", "Charon"])))).not.toBe(base);
    const swapped = dialogue();
    swapped.turns.reverse();
    expect(scriptSpeechHash(narrations(swapped))).not.toBe(base);
  });
});

describe("Gemini dialogue request", () => {
  test("one content item per turn with speaker and style; blank style omitted; two speakers in conversational mode", () => {
    const d = dialogue();
    const body = JSON.parse(buildDialogueBody(d.turns, d.speakers));
    const items = body.input[0].content;
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "text", text: "Chào |ừ| bạn.", annotations: [{ type: "speech_metadata", speaker: "A", style: "vui vẻ" }] });
    expect(items[1].annotations).toEqual([{ type: "speech_metadata", speaker: "B" }]);
    expect(body.generation_config.speech_config).toEqual({
      mode: "conversational",
      speakers: [{ speaker: "A", voice: "Kore" }, { speaker: "B", voice: "Charon" }],
    });
  });
});

describe("chunkDialogue", () => {
  test("packs whole turns in order and never splits one, even when it exceeds the limit", () => {
    const turns = ["aaaa", "bb", "cccccccc", "d"].map((text, i) => ({ id: id(i), speaker: "A", text })) as Dialogue["turns"];
    expect(chunkDialogue(turns, 6).map((chunk) => chunk.map((t) => t.text))).toEqual([["aaaa", "bb"], ["cccccccc"], ["d"]]);
  });
});

describe("VoiceService with a dialogue", () => {
  const episode = { contentRevision: 3, narrations: narrations(dialogue()) };
  const content = { getEpisodeForRead: async () => episode } as never;

  test("synthesizes the turns with the script's speakers, rejects a voice, reports mode and null voice", async () => {
    const received: { turns: number; voices: string[] }[] = [];
    const service = new VoiceService(content, {
      synthesizeDialogue: async (turns, speakers) => { received.push({ turns: turns.length, voices: speakers.map((s) => s.voice) }); return wav; },
      encode: async () => {},
    });
    await expect(service.start(session, EPISODE, "Kore")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const job = await service.start(session, EPISODE);
    expect(job).toMatchObject({ mode: "DIALOGUE", voice: null, total: 1, scriptHash: scriptSpeechHash(episode.narrations) });
    await until(() => service.get(session, EPISODE, job.id).status === "DONE");
    expect(received).toEqual([{ turns: 2, voices: ["Kore", "Charon"] }]);
  });

  test("a single-narrator episode still requires a voice", async () => {
    const single = { getEpisodeForRead: async () => ({ contentRevision: 1, narrations: [{ narrationType: "THIRD_PERSON", scriptDocument: null, scriptContent: "Một." }] }) } as never;
    await expect(new VoiceService(single, { synthesize: async () => wav, encode: async () => {} }).start(session, EPISODE)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
