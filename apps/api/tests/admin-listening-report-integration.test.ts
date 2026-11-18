import { expect, test } from "bun:test";
import { prisma, type PrismaClient } from "@repo/db";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";
import { ListeningReportService } from "../src/modules/admin/listening-report/listening-report.service";
import { PrismaListeningReportRepository } from "../src/modules/admin/listening-report/prisma-listening-report.repository";

test.skipIf(!RUN_INTEGRATION)("PostgreSQL aggregates Vietnam day boundaries, repeated listeners, two voices and distinct completions", async () => {
  assertTestDatabase();
  const rollback = new Error("Rollback listening report fixtures");
  try {
    await prisma.$transaction(async (tx) => {
      // Temporary tables shadow only the four queried tables on this transaction's connection.
      // This validates PostgreSQL aggregation without changing persistent rows or applying migrations.
      await tx.$executeRaw`CREATE TEMP TABLE listening_sessions (user_id text, episode_id uuid, narration_id uuid, started_at timestamptz, played_ms integer, qualified_at timestamptz) ON COMMIT DROP`;
      await tx.$executeRaw`CREATE TEMP TABLE listening_progress (user_id text, episode_id uuid, completed_at timestamptz) ON COMMIT DROP`;
      await tx.$executeRaw`CREATE TEMP TABLE episodes (id uuid, title text, series_id uuid) ON COMMIT DROP`;
      await tx.$executeRaw`CREATE TEMP TABLE series (id uuid, title text) ON COMMIT DROP`;
      const seriesId = crypto.randomUUID(); const episodeId = crypto.randomUUID(); const secondId = crypto.randomUUID();
      await tx.$executeRaw`INSERT INTO series VALUES (${seriesId}::uuid, 'Report tests')`;
      await tx.$executeRaw`INSERT INTO episodes VALUES (${episodeId}::uuid, 'Two voices', ${seriesId}::uuid), (${secondId}::uuid, 'Short session', ${seriesId}::uuid)`;
      await tx.$executeRaw`INSERT INTO listening_sessions VALUES
        ('a', ${episodeId}::uuid, gen_random_uuid(), '2099-01-01T16:59:59Z', 30000, '2099-01-01T16:59:59Z'),
        ('a', ${episodeId}::uuid, gen_random_uuid(), '2099-01-01T17:00:00Z', 30000, '2099-01-01T17:00:00Z'),
        ('a', ${episodeId}::uuid, gen_random_uuid(), '2099-01-02T16:59:59Z', 40000, '2099-01-02T16:59:59Z'),
        ('b', ${secondId}::uuid, gen_random_uuid(), '2099-01-02T00:00:00Z', 5000, NULL),
        ('b', ${secondId}::uuid, gen_random_uuid(), '2099-01-02T17:00:00Z', 30000, '2099-01-02T17:00:00Z'),
        ('a', ${episodeId}::uuid, gen_random_uuid(), '2099-01-02T03:00:00Z', 30000, '2099-01-02T03:00:00Z'),
        ('b', ${secondId}::uuid, gen_random_uuid(), '2099-01-02T04:00:00Z', 0, NULL)`;
      await tx.$executeRaw`INSERT INTO listening_progress VALUES
        ('a', ${episodeId}::uuid, '2099-01-02T00:00:00Z'), ('a', ${episodeId}::uuid, '2099-01-02T00:00:00Z')`;
      const db = { $transaction: async (run: (transaction: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaClient;
      const report = await new ListeningReportService(new PrismaListeningReportRepository(db), () => new Date("2099-01-03T00:00:00Z")).report({ from: "2099-01-02", to: "2099-01-02" });
      expect(report.summary).toEqual({ uniqueListeners: 2, validListens: 3, listeningMs: 105000, completedEpisodes: 1 });
      expect(report.daily).toEqual([{ date: "2099-01-02", uniqueListeners: 2, validListens: 3, listeningMs: 105000 }]);
      expect(report.topEpisodes).toHaveLength(1);
      expect(report.weekly?.reduce((sum, row) => sum + row.validListens, 0)).toBe(report.summary.validListens);
      expect(report.monthly?.[0]?.uniqueListeners).toBe(2);
      expect(report.topEpisodes[0]).toMatchObject({ episodeId, uniqueListeners: 1, validListens: 3, listeningMs: 100000 });
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
});
