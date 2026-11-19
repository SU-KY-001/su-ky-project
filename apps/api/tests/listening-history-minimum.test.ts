import { expect, test } from "bun:test";
import { ListeningService } from "../src/modules/listening/application/listening.service";
import type { ListeningRepository } from "../src/modules/listening/domain/listening.repository";
import type { MediaStorageGateway } from "../src/modules/media";

test("history excludes0–4 accepted seconds and retains older eligible narration", async () => {
  const rows = [
    { episodeId: "same", narrationId: "new-zero", playedSeconds: 0, lastListenedAt: new Date("2026-11-09") },
    { episodeId: "too-short", narrationId: "four", playedSeconds: 4, lastListenedAt: new Date("2026-11-08") },
    { episodeId: "same", narrationId: "eligible", playedSeconds: 5, lastListenedAt: new Date("2026-11-07") },
  ].map((row) => ({ ...row, completedAt: null, positionMs: 5000, audioAsset: { durationMs: 60000 }, episode: { id: row.episodeId, slug: row.episodeId, title: row.episodeId, status: "PUBLISHED", deletedAt: null, series: { slug: "s", title: "S", status: "PUBLISHED", deletedAt: null } } }));
  const repo = { listListeningHistory: async () => rows } as unknown as ListeningRepository;
  const result = await new ListeningService(repo, {} as MediaStorageGateway).getHistory("self", { page: 1, limit: 4, status: "all" });
  expect(result.total).toBe(1);
  expect(result.items[0]?.lastNarrationId).toBe("eligible");
});
