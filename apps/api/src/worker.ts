import { prisma } from "@repo/db";
import { env, logger } from "./core";
import { startReleaseJobs, stopReleaseJobs } from "./core/jobs/release-jobs";
import { releaseRepository, releaseService } from "./modules/releases";

const HEARTBEAT_INTERVAL_MS = 30_000;

if (!env.DATABASE_URL) {
  logger.fatal("DATABASE_URL is required for the release worker");
  process.exit(1);
}

async function writeHeartbeat(): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: "worker.release.heartbeat" },
    create: {
      key: "worker.release.heartbeat",
      value: { timestamp: new Date().toISOString(), processId: process.pid },
      description: "Nhịp sống của tiến trình tự động phát hành podcast",
    },
    update: {
      value: { timestamp: new Date().toISOString(), processId: process.pid },
    },
  });
}

try {
  await startReleaseJobs(env.DATABASE_URL, releaseService, releaseRepository);
  await writeHeartbeat();
  logger.info({ processId: process.pid }, "Release worker started");
} catch (error) {
  logger.fatal({ err: error }, "Failed to start release worker");
  await prisma.$disconnect();
  process.exit(1);
}

const heartbeat = setInterval(() => {
  writeHeartbeat().catch((error) =>
    logger.error({ err: error }, "Release worker heartbeat failed"),
  );
}, HEARTBEAT_INTERVAL_MS);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeat);
  logger.info({ signal }, "Stopping release worker");
  try {
    await stopReleaseJobs();
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
