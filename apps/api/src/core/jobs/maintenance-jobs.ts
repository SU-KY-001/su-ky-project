import { PgBoss } from "pg-boss";
import { prisma } from "@repo/db";
import { getSystemConfig } from "../config/system-config";
import { logger } from "../logger";
import type { MediaStorageGateway } from "../../modules/media";

const MEDIA_QUEUE = "maintenance.media-cleanup";
const IDEMPOTENCY_QUEUE = "maintenance.idempotency-purge";
const RATE_LIMIT_QUEUE = "maintenance.rate-limit-purge";
const MEDIA_CLEANUP_CRON = "*/30 * * * *";
const IDEMPOTENCY_PURGE_CRON = "0 * * * *";
const RATE_LIMIT_PURGE_CRON = "15 * * * *";
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

let maintenanceBoss: PgBoss | null = null;

export async function cleanupDetachedMedia(storage: MediaStorageGateway): Promise<void> {
  const graceHours = await getSystemConfig("media.cleanup_grace_hours");
  const batchSize = await getSystemConfig("media.cleanup_batch_size");
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
  const assets = await prisma.mediaAsset.findMany({ where: {
    status: { not: "DELETED" }, narrationAudio: null, seriesCover: { none: {} }, sourceFile: null,
    OR: [{ detachedAt: { lt: cutoff } }, { detachedAt: null, createdAt: { lt: cutoff } }],
  }, take: batchSize, orderBy: { createdAt: "asc" } });
  for (const asset of assets) {
    try {
      await storage.destroy(asset.publicId, asset.kind);
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETED", deletedAt: new Date() } });
    } catch (error) {
      logger.warn({ err: error, assetId: asset.id }, "Media cleanup failed");
    }
  }
}

export async function startMaintenanceJobs(connectionString: string, storage: MediaStorageGateway): Promise<void> {
  if (maintenanceBoss) return;
  const boss = new PgBoss({ connectionString });
  boss.on("error", (error: Error) => logger.error({ err: error }, "Maintenance queue error"));
  await boss.start();
  for (const queue of [MEDIA_QUEUE, IDEMPOTENCY_QUEUE, RATE_LIMIT_QUEUE]) await boss.createQueue(queue);
  await boss.schedule(MEDIA_QUEUE, MEDIA_CLEANUP_CRON);
  await boss.schedule(IDEMPOTENCY_QUEUE, IDEMPOTENCY_PURGE_CRON);
  await boss.schedule(RATE_LIMIT_QUEUE, RATE_LIMIT_PURGE_CRON);
  await boss.work(MEDIA_QUEUE, async () => { await cleanupDetachedMedia(storage); });
  await boss.work(IDEMPOTENCY_QUEUE, async () => { await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } }); });
  await boss.work(RATE_LIMIT_QUEUE, async () => { await prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - RATE_LIMIT_RETENTION_MS) } } }); });
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
