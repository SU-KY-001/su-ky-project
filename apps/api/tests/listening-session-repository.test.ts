import { expect, test } from "bun:test";
import { PrismaListeningRepository } from "../src/modules/listening/infrastructure/prisma-listening.repository";
import type { ApplyProgressCommand } from "../src/modules/listening/domain/listening.repository";
import type { PrismaClient, ListeningSession } from "@repo/db";

function setup(): { repo: PrismaListeningRepository; sessions: Map<string, ListeningSession>; progressWrites: () => number } {
  const sessions = new Map<string, ListeningSession>();
  let writes = 0;
  const tx = {
    $queryRaw: async () => [],
    listeningProgress: {
      createMany: async () => ({}),
      findUniqueOrThrow: async () => ({ id: "progress", audioAssetId: "asset", playedBitmap: new Uint8Array(8), completedAt: null, lastListenedAt: new Date("2026-11-09T00:00:00Z") }),
      update: async () => { writes++; },
    },
    listeningSession: {
      createMany: async ({ data }: { data: ListeningSession[] }) => { for (const row of data) if (!sessions.has(row.id)) sessions.set(row.id, { ...row, playedMs: 0, qualifiedAt: null }); },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => sessions.get(where.id),
      update: async ({ where, data }: { where: { id: string }; data: Partial<ListeningSession> }) => { const row = sessions.get(where.id)!; sessions.set(where.id, { ...row, ...data }); },
    },
  };
  const db = { $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  return { repo: new PrismaListeningRepository(db), sessions, progressWrites: () => writes };
}
function command(time: number, sessionId?: string, userId = "self", assetId = "asset"): ApplyProgressCommand {
  const bitmap = new Uint8Array(8); bitmap.fill(255);
  return { userId, narrationId: "narration", episodeId: "episode", assetId, positionMs: 30000, bitmap: new Uint8Array(8), totalSeconds: 60, now: new Date(time), xpPerEpisodeCompletion: 0, completionRatio: 1,
    budget: () => 0, merge: (stored) => ({ bitmap: stored, playedSeconds: 0 }),
    ...(sessionId ? { session: { id: sessionId, bitmap, durationMs: 60000, maxRate: 1 } } : {}),
  };
}
const start = Date.parse("2026-11-09T00:00:00Z");
test("legacy sync never creates a session or changes its response shape", async () => {
  const { repo, sessions } = setup();
  const result = await repo.applyProgress(command(start));
  expect(sessions.size).toBe(0); expect(result.listeningSession).toBeUndefined();
  expect(result.positionMs).toBe(30000);
});
test("session retry qualifies once, retains start/qualified time and accepts cumulative unique time", async () => {
  const { repo, sessions } = setup();
  expect((await repo.applyProgress(command(start, "session"))).listeningSession?.playedMs).toBe(0);
  const qualified = (await repo.applyProgress(command(start + 30000, "session"))).listeningSession!;
  expect(qualified.playedMs).toBe(30000); expect(qualified.qualifiedAt?.getTime()).toBe(start + 30000);
  for (let i = 0; i < 5; i++) expect((await repo.applyProgress(command(start + 30000, "session"))).listeningSession?.playedMs).toBe(30000);
  const later = (await repo.applyProgress(command(start + 40000, "session"))).listeningSession!;
  expect(later.startedAt.getTime()).toBe(start); expect(later.qualifiedAt).toEqual(qualified.qualifiedAt); expect(sessions.size).toBe(1);
});
test("new session can qualify again despite existing lifetime progress", async () => {
  const { repo, sessions } = setup();
  await repo.applyProgress(command(start, "one")); await repo.applyProgress(command(start + 30000, "one"));
  await repo.applyProgress(command(start + 31000, "two"));
  expect((await repo.applyProgress(command(start + 61000, "two"))).listeningSession?.qualifiedAt).not.toBeNull();
  expect(sessions.size).toBe(2);
});
test("foreign account or changed asset session reuse is rejected before progress write", async () => {
  const { repo, progressWrites } = setup();
  await repo.applyProgress(command(start, "shared"));
  const before = progressWrites();
  await expect(repo.applyProgress(command(start + 40000, "shared", "other"))).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  await expect(repo.applyProgress(command(start + 40000, "shared", "self", "new-asset"))).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
  const changedNarration = command(start + 40000, "shared"); changedNarration.narrationId = "other-narration";
  await expect(repo.applyProgress(changedNarration)).rejects.toMatchObject({ status: 409 });
  expect(progressWrites()).toBe(before);
});
