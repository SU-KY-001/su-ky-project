import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIALOGUE_MAX_SPEAKERS, DialogueSchema, PREBUILT_VOICES, dialogueScriptContent, dialogueUsedSpeakerKeys, isValidDialogueText, type Dialogue } from "@repo/shared";
import { env } from "../../src/core/env";
import { buildDialogueBody, buildSingleBody, turnSpeechText } from "../../src/modules/ai-assist/voice/gemini-tts";
import { chunkDialogue, scriptSpeechHash, silenceWav } from "../../src/modules/ai-assist/voice/speech-text";
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
  test("one part per turn with speaker and style; blank style omitted; two prebuilt voices in multiSpeakerVoiceConfig", () => {
    const d = dialogue();
    const body = JSON.parse(buildDialogueBody(d.turns, d.speakers));
    const parts = body.contents[0].parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual({ text: "Chào |ừ| bạn.", speech_metadata: { speaker: "A", style: "vui vẻ" } });
    expect(parts[1].speech_metadata).toEqual({ speaker: "B" });
    expect(body.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(body.generationConfig.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs).toEqual([
      { speaker: "A", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      { speaker: "B", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
    ]);
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

const threeSpeakers = (): Dialogue =>
  ({
    speakers: [
      { key: "A", name: "Veda", voice: "Kore" },
      { key: "B", name: "Rami", voice: "Charon" },
      { key: "S3", name: "Lan", voice: "Puck" },
    ],
    turns: [
      { id: id(1), speaker: "A", text: "Một |ừ| hai." },
      { id: id(2), speaker: "S3", text: "<laugh> Ba.", style: "vui" },
      { id: id(3), speaker: "B", text: "Bốn." },
    ],
  }) as Dialogue;

describe("VoiceService per-turn path (speaker count other than 2)", () => {
  const d = threeSpeakers();
  const content = { getEpisodeForRead: async () => ({ contentRevision: 1, narrations: narrations(d) }) } as never;

  test("one request per turn with the speaker's voice, pipes stripped; duration includes the gaps", async () => {
    const received: { text: string; style: string | null | undefined; voice: string }[] = [];
    let multiCalls = 0;
    const service = new VoiceService(content, {
      synthesizeTurn: async (turn, voice) => { received.push({ text: turn.text, style: turn.style, voice }); return wav; },
      synthesizeDialogue: async () => { multiCalls += 1; return wav; },
      encode: async () => {},
    });
    const job = await service.start(session, EPISODE);
    expect(job.total).toBe(3);
    await until(() => service.get(session, EPISODE, job.id).status === "DONE");
    expect(multiCalls).toBe(0);
    expect(received.map((r) => r.voice)).toEqual(["Kore", "Puck", "Charon"]);
    const done = service.get(session, EPISODE, job.id);
    // 3 one-second clips + 2 gaps; the gap is TTS_TURN_GAP_MS.
    expect(done.durationMs).toBe(3000 + 2 * env.TTS_TURN_GAP_MS);
  });

  test("declared 3 speakers but only 2 have turns: keeps the single multi-speaker request with those 2", async () => {
    const two = { ...d, turns: d.turns.filter((turn) => turn.speaker !== "S3") } as Dialogue;
    const service = new VoiceService({ getEpisodeForRead: async () => ({ contentRevision: 1, narrations: narrations(two) }) } as never, {
      synthesizeTurn: async () => { throw new Error("per-turn must not run"); },
      synthesizeDialogue: async (_turns, speakers) => { used.push(speakers.map((s) => s.key)); return wav; },
      encode: async () => {},
    });
    const used: string[][] = [];
    const job = await service.start(session, EPISODE);
    await until(() => service.get(session, EPISODE, job.id).status === "DONE");
    expect(used).toEqual([["A", "B"]]);
  });
});

describe("per-turn request body and silence", () => {
  test("single body uses the turn's model and omits an empty style; pipes are stripped, tags kept", () => {
    const body = JSON.parse(buildSingleBody(turnSpeechText({ text: "Một |ừ| <laugh> hai." }), "Puck", { model: "m", style: "" }));
    expect(body.model).toBe("m");
    expect(body.input[0].content[0].annotations).toEqual([]);
    expect(body.input[0].content[0].text).toBe("Một ừ <laugh> hai.");
  });

  test("silenceWav is a valid 24 kHz mono 16-bit WAV of the requested length", () => {
    const silence = silenceWav(250);
    expect(silence.toString("ascii", 0, 4)).toBe("RIFF");
    expect(silence.readUInt32LE(24)).toBe(24_000);
    expect(silence.readUInt32LE(40)).toBe(12_000);
    expect(silence.length).toBe(44 + 12_000);
  });
});

describe("DialogueSchema with N speakers", () => {
  const base = threeSpeakers();
  const messages = (value: unknown): string[] => {
    const parsed = DialogueSchema.safeParse(value);
    return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
  };
  const manySpeakers = (count: number) => Array.from({ length: count }, (_, i) => ({ key: `S${i}`, name: `N${i}`, voice: PREBUILT_VOICES[i % PREBUILT_VOICES.length] }));

  test("legacy A/B data and 3 speakers parse", () => {
    expect(DialogueSchema.safeParse(dialogue()).success).toBe(true);
    expect(DialogueSchema.safeParse(base).success).toBe(true);
  });

  test("30 speakers pass; 31 and 1 are rejected", () => {
    const turn = { id: id(1), speaker: "S0", text: "x" };
    expect(DialogueSchema.safeParse({ speakers: manySpeakers(DIALOGUE_MAX_SPEAKERS), turns: [turn] }).success).toBe(true);
    expect(DialogueSchema.safeParse({ speakers: manySpeakers(DIALOGUE_MAX_SPEAKERS + 1).map((s, i) => ({ ...s, voice: PREBUILT_VOICES[i % 30] })), turns: [turn] }).success).toBe(false);
    expect(DialogueSchema.safeParse({ speakers: manySpeakers(1), turns: [turn] }).success).toBe(false);
  });

  test("duplicate key, name (any case) and voice each raise their own issue", () => {
    const speakers = base.speakers;
    expect(messages({ ...base, speakers: [speakers[0], { ...speakers[1], key: "A" }, speakers[2]] })).toContain("Khoá người nói bị trùng");
    expect(messages({ ...base, speakers: [speakers[0], { ...speakers[1], name: "VEDA" }, speakers[2]] })).toContain("Các người nói phải khác tên");
    expect(messages({ ...base, speakers: [speakers[0], { ...speakers[1], voice: "Kore" }, speakers[2]] })).toContain("Các người nói phải khác giọng");
  });

  test("a turn referencing an unknown speaker is rejected at its path", () => {
    const parsed = DialogueSchema.safeParse({ ...base, turns: [{ id: id(1), speaker: "ZZ", text: "x" }] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.find((issue) => issue.message.includes("không tồn tại"))?.path).toEqual(["turns", 0, "speaker"]);
  });

  test("dialogueUsedSpeakerKeys keeps first-appearance order without repeats", () => {
    expect(dialogueUsedSpeakerKeys({ ...base, turns: [...base.turns, base.turns[0]!] })).toEqual(["A", "S3", "B"]);
  });
});
