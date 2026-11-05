import { describe, expect, test } from "bun:test";
import { AI_VOICES, PREBUILT_VOICES } from "@repo/shared";
import { VOICE_LABEL, formatVoiceOrigin } from "./voiceLabels";

const ORIGIN_VOICE_MAX_CHARS = 60; // editor-document.ts origin.voice .max(60)

describe("voice labels", () => {
  test("every selectable voice has a label with a name and detail", () => {
    for (const id of AI_VOICES) expect(VOICE_LABEL[id].name && VOICE_LABEL[id].detail).toBeTruthy();
  });
});

describe("formatVoiceOrigin", () => {
  test("joins up to 3 voices, then summarises the rest", () => {
    expect(formatVoiceOrigin(["Kore", "Charon"])).toBe("Kore + Charon");
    expect(formatVoiceOrigin(["Kore", "Charon", "Puck"])).toBe("Kore + Charon + Puck");
    expect(formatVoiceOrigin(["Kore", "Charon", "Puck", "Aoede"])).toBe("Kore + Charon + Puck (+1)");
  });

  test("30 voices, even the longest names, stay within the API limit", () => {
    const longest = [...PREBUILT_VOICES].sort((a, b) => b.length - a.length);
    expect(formatVoiceOrigin(PREBUILT_VOICES).length).toBeLessThanOrEqual(ORIGIN_VOICE_MAX_CHARS);
    expect(formatVoiceOrigin(longest).length).toBeLessThanOrEqual(ORIGIN_VOICE_MAX_CHARS);
  });
});
