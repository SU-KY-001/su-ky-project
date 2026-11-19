import { expect, test } from "bun:test";
import { UpdateListeningProgressRequestSchema, ListeningProgressUpdateResultSchema } from "@repo/shared";

const legacy = { assetId: crypto.randomUUID(), positionMs: 0, playedBitmap: "" };
test("progress contract keeps legacy request and legacy response compatible", () => {
  expect(UpdateListeningProgressRequestSchema.parse(legacy)).toEqual(legacy);
  expect(ListeningProgressUpdateResultSchema.safeParse({ narrationId: crypto.randomUUID(), positionMs: 0, playedSeconds: 0, percent: 0, completedAt: null, completion: null }).success).toBe(true);
});
test("session fields must appear together, accept empty initial bitmap, reject bad IDs", () => {
  const sessionId = crypto.randomUUID();
  expect(UpdateListeningProgressRequestSchema.safeParse({ ...legacy, sessionId }).success).toBe(false);
  expect(UpdateListeningProgressRequestSchema.safeParse({ ...legacy, sessionPlayedBitmap: "" }).success).toBe(false);
  expect(UpdateListeningProgressRequestSchema.safeParse({ ...legacy, sessionId: "bad", sessionPlayedBitmap: "" }).success).toBe(false);
  expect(UpdateListeningProgressRequestSchema.safeParse({ ...legacy, sessionId, sessionPlayedBitmap: "" }).success).toBe(true);
  expect(UpdateListeningProgressRequestSchema.safeParse({ ...legacy, sessionId, sessionPlayedBitmap: "x".repeat(4097) }).success).toBe(false);
});
