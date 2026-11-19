import { expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { PodcastRankingService } from "../src/modules/listening/application/podcast-ranking.service";
import { PlaylistService } from "../src/modules/playlists/playlists.service";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("PostgreSQL ranking counts/scopes/windows and private playlist lifecycle", async () => {
  assertTestDatabase();
  const rollback = new Error("Rollback isolated ranking/playlist fixtures");
  try {
    await prisma.$transaction(async (tx) => {
      const author = crypto.randomUUID(); const listener = crypto.randomUUID(); const other = crypto.randomUUID();
      await tx.user.createMany({ data: [author, listener, other].map((id) => ({ id, name: "API integration", email: `${id}@test.example` })) });
      const series = await tx.series.create({ data: { ownerId: author, slug: `ranking-${author}`, title: "Series", status: "PUBLISHED" } });
      const episodes = [];
      for (const [index, title] of ["Alpha", "Beta", "Hidden"].entries()) {
        const episode = await tx.episode.create({ data: { seriesId: series.id, title, slug: `${author}-${index}`, sortOrder: index, status: index === 2 ? "HIDDEN" : "PUBLISHED" } });
        const audio = await tx.mediaAsset.create({ data: { kind: "AUDIO", status: "READY", publicId: `${author}-${index}`, uploadedById: author, durationMs: 60000 } });
        const narration = await tx.episodeNarration.create({ data: { episodeId: episode.id, narrationType: "THIRD_PERSON", audioAssetId: audio.id } });
        episodes.push({ ...episode, narrationId: narration.id, audioAssetId: audio.id });
      }
      const a = episodes[0]!; const b = episodes[1]!; const hidden = episodes[2]!;
      const start = new Date("2026-11-08T17:00:00Z");
      for (const episode of episodes) for (const userId of [listener, other]) await tx.listeningSession.create({ data: { id: crypto.randomUUID(), userId, narrationId: episode.narrationId, episodeId: episode.id, audioAssetId: episode.audioAssetId, durationMs: 60000, startedAt: start, qualifiedAt: new Date(start.getTime() + 30000), playedBitmap: new Uint8Array(8), playedMs: 30000 } });
      for (const [startedAt, qualifiedAt] of [[new Date("2026-11-08T16:59:59Z"), start], [new Date("2026-11-15T17:00:00Z"), new Date("2026-11-15T17:00:30Z")], [start, null]] as const) await tx.listeningSession.create({ data: { id: crypto.randomUUID(), userId: listener, narrationId: a.narrationId, episodeId: a.id, audioAssetId: a.audioAssetId, durationMs: 60000, startedAt, qualifiedAt, playedBitmap: new Uint8Array(8), playedMs: 30000 } });
      const adapter = { playlist: tx.playlist, $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as typeof prisma;
      const rankings = new PodcastRankingService(adapter, () => new Date("2026-11-10T00:00:00Z"));
      const personal = await rankings.list(listener, { scope: "personal", period: "week", page: 1, limit: 4 });
      expect(personal.total).toBe(2); expect(personal.items.map((row) => row.title)).toEqual(["Alpha", "Beta"]);
      expect(personal.items.map((row) => row.listenCount)).toEqual([1, 1]);
      const monthly = await rankings.list(listener, { scope: "personal", period: "month", page: 1, limit: 4 });
      expect(monthly.items[0]?.title).toBe("Alpha");
      expect(monthly.items[0]?.listenCount).toBe(2);
      const system = await rankings.list(listener, { scope: "system", period: "week", page: 2, limit: 1 });
      expect(system.items[0]?.title).toBe("Beta"); expect(system.items[0]?.listenCount).toBe(2); expect(system.items[0]?.rank).toBe(2);
      expect((await rankings.list(crypto.randomUUID(), { scope: "personal", period: "week", page: 1, limit: 4 })).items).toEqual([]);

      const playlists = new PlaylistService(adapter);
      const list = await playlists.create(listener, "My list");
      await expect(playlists.get(other, list.id, { page: 1, limit: 5 })).rejects.toMatchObject({ status: 404 });
      await expect(playlists.rename(other, list.id, "Not mine")).rejects.toMatchObject({ status: 404 });
      await playlists.add(listener, list.id, a.id); await playlists.add(listener, list.id, b.id); await playlists.add(listener, list.id, a.id);
      expect((await playlists.get(listener, list.id, { page: 1, limit: 5 })).total).toBe(2);
      await expect(playlists.add(listener, list.id, hidden.id)).rejects.toMatchObject({ status: 422 });
      await playlists.reorder(listener, list.id, [b.id, a.id]);
      expect((await playlists.get(listener, list.id, { page: 1, limit: 1 })).items[0]?.episodeId).toBe(b.id);
      await expect(playlists.reorder(listener, list.id, [a.id])).rejects.toMatchObject({ status: 409 });
      await tx.episode.update({ where: { id: b.id }, data: { status: "HIDDEN" } });
      const unavailable = (await playlists.get(listener, list.id, { page: 1, limit: 5 })).items[0]!;
      expect(unavailable.available).toBe(false); expect(unavailable.narrations).toEqual([]);
      await playlists.remove(listener, list.id, a.id); await playlists.remove(listener, list.id, a.id);
      await playlists.delete(listener, list.id);
      expect(await tx.playlistItem.count({ where: { playlistId: list.id } })).toBe(0);
      const cascade = await playlists.create(listener, "Cascade"); await playlists.add(listener, cascade.id, a.id);
      await tx.user.delete({ where: { id: listener } });
      expect(await tx.playlist.count({ where: { ownerId: listener } })).toBe(0);
      expect(await tx.playlistItem.count({ where: { playlistId: cascade.id } })).toBe(0);
      expect(await tx.listeningSession.count({ where: { userId: listener } })).toBe(0);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
});
