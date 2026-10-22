import { describe, expect, mock, test } from "bun:test";
import { AttachAudioSchema, type AudioOrigin } from "@repo/shared";

// mapNarration reads two numeric settings from the DB; origin handling does not depend on them.
mock.module("../src/core/config/system-config", () => ({ getSystemConfig: async (key: string) => (key === "script.words_per_minute" ? 150 : 0.3) }));
const { mapNarration } = await import("../src/modules/content/application/content.mappers");

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const analysis = (origin?: unknown) => ({
  clientDurationMs: 390_000, estimatedScriptDurationMs: 380_000, durationRatio: 1.03, noiseLevelDb: -40,
  formatStatus: "PASS", durationStatus: "PASS", noiseStatus: "PASS", checkedAt: "2026-10-22T17:48:00.000Z",
  ...(origin ? { origin } : {}),
});

/** Request body -> route validation -> Json column (stringify round-trip) -> episode mapping, as the API does it. */
async function roundTrip(origin?: unknown) {
  const body = AttachAudioSchema.parse({ assetId: ASSET_ID, analysis: analysis(origin) });
  const stored = JSON.parse(JSON.stringify(body.analysis));
  const mapped = await mapNarration({
    id: "n1", narrationType: "THIRD_PERSON", narratorEntity: null, scriptContent: null, scriptDocument: null, scriptUpdatedAt: null,
    audioAnalysis: stored, audioAttachedAt: new Date(), updatedAt: new Date(),
    audioAsset: { id: ASSET_ID, durationMs: 390_000, sizeBytes: 3_000_000n, format: "mp3" },
  } as never);
  return mapped.audioAnalysis;
}

describe("audio origin", () => {
  test("AI voice origin survives attach and episode mapping", async () => {
    const origin: AudioOrigin = { kind: "AI_VOICE", voice: "en-us-riko", model: "gemini-3.8-flash-lite-tts", style: "Podcast - Calm, measured delivery", chars: 6564 };
    expect((await roundTrip(origin))?.origin).toEqual(origin);
  });

  test("upload origin survives attach and episode mapping", async () => {
    const origin: AudioOrigin = { kind: "UPLOAD", fileName: "tap-4 final.mp3" };
    expect((await roundTrip(origin))?.origin).toEqual(origin);
  });

  test("a recording attached before origin existed still maps, without origin", async () => {
    const mapped = await roundTrip();
    expect(mapped?.clientDurationMs).toBe(390_000);
    expect(mapped?.origin).toBeUndefined();
  });

  test.each([
    ["unknown kind", { kind: "TAPE", fileName: "a.mp3" }],
    ["empty file name", { kind: "UPLOAD", fileName: "" }],
    ["AI voice missing model", { kind: "AI_VOICE", voice: "Kore", style: "", chars: 1 }],
    ["extra key on origin", { kind: "UPLOAD", fileName: "a.mp3", path: "/etc" }],
  ])("attach rejects %s", (_name, origin) => {
    expect(AttachAudioSchema.safeParse({ assetId: ASSET_ID, analysis: analysis(origin) }).success).toBe(false);
  });
});
