import { expect, test } from "bun:test";
import { prisma, type PrismaClient } from "@repo/db";
import { PrismaListeningRepository } from "../src/modules/listening/infrastructure/prisma-listening.repository";
import type { ApplyProgressCommand } from "../src/modules/listening/domain/listening.repository";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("PostgreSQL session atomic writes, session ownership, unique ID and user cascade", async () => {
  assertTestDatabase();
  const rollback = new Error("Rollback session fixtures");
  try {
    await prisma.$transaction(async (tx) => {
      const ownerId = crypto.randomUUID(); const listenerId = crypto.randomUUID(); const otherId = crypto.randomUUID();
      await tx.user.createMany({ data: [ownerId, listenerId, otherId].map((id) => ({ id, name: "Session test", email: `${id}@test.example` })) });
      const series = await tx.series.create({ data: { ownerId, slug: `session-${ownerId}`, title: "Session tests", status: "PUBLISHED" } });
      const episode = await tx.episode.create({ data: { seriesId: series.id, title: "Session episode", slug: `session-${listenerId}`, sortOrder: 1, status: "PUBLISHED" } });
      const asset = await tx.mediaAsset.create({ data: { kind: "AUDIO", publicId: `session-${listenerId}`, uploadedById: ownerId, status: "READY", durationMs: 60000 } });
      const narration = await tx.episodeNarration.create({ data: { episodeId: episode.id, narrationType: "THIRD_PERSON", audioAssetId: asset.id } });
      const adapter = { $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => {
        await tx.$executeRawUnsafe("SAVEPOINT session_sync_test");
        try { const result = await fn(tx); await tx.$executeRawUnsafe("RELEASE SAVEPOINT session_sync_test"); return result; }
        catch (error) { await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT session_sync_test"); throw error; }
      } } as unknown as PrismaClient;
      const repo = new PrismaListeningRepository(adapter);
      const started = new Date("2026-11-09T00:00:00Z"); const sessionId = crypto.randomUUID();
      const command = (ms: number, userId = listenerId): ApplyProgressCommand => ({
        userId, narrationId: narration.id, episodeId: episode.id, assetId: asset.id, positionMs: 30000, bitmap: new Uint8Array(8), totalSeconds: 60, now: new Date(started.getTime() + ms), xpPerEpisodeCompletion: 0, completionRatio: 1, budget: () => 0,
        merge: (stored) => ({ bitmap: stored, playedSeconds: 0 }),
        session: { id: sessionId, bitmap: new Uint8Array([255,255,255,255,0,0,0,0]), durationMs: 60000, maxRate: 1 },
      });
      await repo.applyProgress(command(0));
      await repo.applyProgress(command(30000));
      await repo.applyProgress(command(30000));
      expect(await tx.listeningSession.count({ where: { userId: listenerId } })).toBe(1);
      const session = await tx.listeningSession.findUniqueOrThrow({ where: { id: sessionId } });
      expect(session.playedMs).toBe(30000); expect(session.startedAt).toEqual(started); expect(session.qualifiedAt).not.toBeNull();
      await expect(repo.applyProgress(command(40000, otherId))).rejects.toMatchObject({ status: 409 });
      expect(await tx.listeningProgress.count({ where: { userId: otherId } })).toBe(0);
      await tx.user.delete({ where: { id: listenerId } });
      expect(await tx.listeningSession.count({ where: { id: sessionId } })).toBe(0);
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
});
