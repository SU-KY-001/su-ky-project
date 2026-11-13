import { PgBoss } from "pg-boss";
import { z } from "zod";
import { prisma, type Prisma } from "@repo/db";
import { getSystemConfig } from "../config/system-config";
import { logger } from "../logger";
import type { MediaStorageGateway } from "../../modules/media";
import { reapStaleAiChecks } from "../../modules/ai-assist";
import { sessionRetentionCutoff } from "../../modules/listening/application/listening-session-policy";

const MEDIA_QUEUE = "maintenance.media-cleanup";
const IDEMPOTENCY_QUEUE = "maintenance.idempotency-purge";
const RATE_LIMIT_QUEUE = "maintenance.rate-limit-purge";
const AI_CHECK_REAPER_QUEUE = "maintenance.ai-check-reaper";
const LISTENING_SESSION_PURGE_QUEUE = "maintenance.listening-session-purge";
const MEDIA_CLEANUP_CRON = "*/30 * * * *";
const IDEMPOTENCY_PURGE_CRON = "0 * * * *";
const RATE_LIMIT_PURGE_CRON = "15 * * * *";
const AI_CHECK_REAPER_CRON = "* * * * *";
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

let maintenanceBoss: PgBoss | null = null;

const exhibitionMediaSchema = z.object({
  metadata: z.object({ coverAssetId: z.string().nullable().optional() }),
  audioAssetId: z.string().nullable().optional(),
  items: z.array(z.object({ imageAssetId: z.string() })),
});

export function exhibitionMediaIds(exhibitions: { draftDocument: unknown; publishedDocument: unknown }[]): string[] {
  const ids = new Set<string>();
  for (const exhibition of exhibitions) {
    for (const value of [exhibition.draftDocument, exhibition.publishedDocument]) {
      if (value === null) continue;
      const document = exhibitionMediaSchema.parse(value);
      if (document.metadata.coverAssetId) ids.add(document.metadata.coverAssetId);
      if (document.audioAssetId) ids.add(document.audioAssetId);
      for (const item of document.items) ids.add(item.imageAssetId);
    }
  }
  return [...ids];
}

export async function cleanupDetachedMedia(storage: MediaStorageGateway): Promise<void> {
  const graceHours = await getSystemConfig("media.cleanup_grace_hours");
  const batchSize = await getSystemConfig("media.cleanup_batch_size");
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
  const exhibitions = await prisma.exhibition.findMany({ select: { draftDocument: true, publishedDocument: true } });
  const assets = await prisma.mediaAsset.findMany({ where: { ...detachedMediaWhere(cutoff), id: { notIn: exhibitionMediaIds(exhibitions) } }, take: batchSize, orderBy: { createdAt: "asc" } });
  for (const asset of assets) {
    try {
      await storage.destroy(asset.publicId, asset.kind);
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETED", deletedAt: new Date() } });
    } catch (error) {
      logger.warn({ err: error, assetId: asset.id }, "Media cleanup failed");
    }
  }
}

export function detachedMediaWhere(cutoff: Date): Prisma.MediaAssetWhereInput {
  return {
    status: { not: "DELETED" }, narrationAudio: null, seriesCover: { none: {} }, seriesCoverLandscape: { none: {} }, sourceFile: null, sourceRevisions: {none:{}},
    episodeAttachment: null, quizPosters: { none: {} }, quizDraftPosters: { none: {} }, orderProof: null,
    OR: [{ detachedAt: { lt: cutoff } }, { detachedAt: null, createdAt: { lt: cutoff } }],
  };
}

export async function startMaintenanceJobs(connectionString: string, storage: MediaStorageGateway): Promise<void> {
  if (maintenanceBoss) return;
  const boss = new PgBoss({ connectionString });
  boss.on("error", (error: Error) => logger.error({ err: error }, "Maintenance queue error"));
  await boss.start();
  for (const queue of [MEDIA_QUEUE, IDEMPOTENCY_QUEUE, RATE_LIMIT_QUEUE, AI_CHECK_REAPER_QUEUE, LISTENING_SESSION_PURGE_QUEUE]) await boss.createQueue(queue);
  await boss.schedule(LISTENING_SESSION_PURGE_QUEUE, "30 2 * * *");
  await boss.work(LISTENING_SESSION_PURGE_QUEUE, async () => {
    await prisma.listeningSession.deleteMany({ where: { startedAt: { lt: sessionRetentionCutoff(new Date()) } } });
  });
  await boss.schedule(MEDIA_QUEUE, MEDIA_CLEANUP_CRON);
  await boss.schedule(IDEMPOTENCY_QUEUE, IDEMPOTENCY_PURGE_CRON);
  await boss.schedule(RATE_LIMIT_QUEUE, RATE_LIMIT_PURGE_CRON);
  await boss.schedule(AI_CHECK_REAPER_QUEUE, AI_CHECK_REAPER_CRON);
  await boss.work(MEDIA_QUEUE, async () => { await cleanupDetachedMedia(storage); });
  await boss.work(IDEMPOTENCY_QUEUE, async () => { await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } }); });
  await boss.work(RATE_LIMIT_QUEUE, async () => { await prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - RATE_LIMIT_RETENTION_MS) } } }); });
  await boss.work(AI_CHECK_REAPER_QUEUE, async () => {
    const reaped = await reapStaleAiChecks();
    if (reaped > 0) logger.warn({ reaped }, "Closed stale AI checks");
  });
  // A crash leaves RUNNING rows nobody will finish; close them now instead of waiting for the first tick.
  await reapStaleAiChecks();
  maintenanceBoss = boss;
}

export function isMaintenanceRunning(): boolean {
  return maintenanceBoss !== null;
}

export async function stopMaintenanceJobs(): Promise<void> {
  const boss = maintenanceBoss;
  maintenanceBoss = null;
  if (boss) await boss.stop();
}
