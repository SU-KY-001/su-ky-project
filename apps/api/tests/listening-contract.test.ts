import { describe, expect, it } from "bun:test";
import { ListeningHistoryResponseSchema, ListeningHistoryItemSchema } from "@repo/shared";

describe("listening history contract", () => {
  it("accepts the account-scoped history response returned by the API", () => {
    const episodeId = crypto.randomUUID();
    const narrationId = crypto.randomUUID();
    const result = ListeningHistoryResponseSchema.parse({
      items: [{
        episode: { id: episodeId, slug: "demo-episode", title: "Demo", available: true, series: { slug: "demo-series", title: "Demo series" } },
        lastListenedAt: "2026-10-22T12:00:00.000Z",
        lastNarrationId: narrationId,
        lastPositionMs: 12_500,
        percent: 24.5,
        isCompleted: false,
      }],
      page: 1,
      limit: 10,
      total: 1,
    });
    expect(result.items[0]?.episode.id).toBe(episodeId);
    expect(result.items[0]?.lastNarrationId).toBe(narrationId);
  });

  it("rejects history rows without an account-owned narration", () => {
    expect(() => ListeningHistoryItemSchema.parse({
      episode: { id: crypto.randomUUID(), slug: "demo", title: "Demo", available: true, series: { slug: "series", title: "Series" } },
      lastListenedAt: new Date(),
      lastNarrationId: "not-a-uuid",
      lastPositionMs: 0,
      percent: 0,
      isCompleted: false,
    })).toThrow();
  });
});
