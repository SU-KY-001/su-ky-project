import { prisma } from "@repo/db";
import { env, logger } from "./core";
import { startProductionReminderJobs, stopProductionReminderJobs } from "./core/jobs/release-jobs";
import { releaseRepository } from "./modules/releases";

const HEARTBEAT_INTERVAL_MS = 30_000;

if (!env.DATABASE_URL) {
  logger.fatal("DATABASE_URL is required for the production reminder worker");
  process.exit(1);
}

async function writeHeartbeat(): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: "worker.release.heartbeat" },
    create: {
      key: "worker.release.heartbeat",
      value: { timestamp: new Date().toISOString(), processId: process.pid },
      description: "Nhịp sống của tiến trình nhắc hạn sản xuất podcast",
    },
    update: {
      value: { timestamp: new Date().toISOString(), processId: process.pid },
      description: "Nhịp sống của tiến trình nhắc hạn sản xuất podcast",
    },
  });
}

try {
  await startProductionReminderJobs(env.DATABASE_URL, releaseRepository);
  await writeHeartbeat();
  logger.info({ processId: process.pid }, "Production reminder worker started");
} catch (error) {
  logger.fatal({ err: error }, "Failed to start production reminder worker");
  await prisma.$disconnect();
  process.exit(1);
}

const heartbeat = setInterval(() => {
  writeHeartbeat().catch((error) =>
    logger.error({ err: error }, "Production reminder worker heartbeat failed"),
  );
}, HEARTBEAT_INTERVAL_MS);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeat);
  logger.info({ signal }, "Stopping production reminder worker");
  try {
    await stopProductionReminderJobs();
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
