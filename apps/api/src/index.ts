import { prisma } from "@repo/db";
import { app } from "./app";
import { env, logger } from "./core";
import { startMaintenanceJobs, stopMaintenanceJobs } from "./core/jobs/maintenance-jobs";
import { mediaStorage } from "./modules/media";

const port = env.PORT;

if (!env.DATABASE_URL) {
  logger.fatal("DATABASE_URL is required: the maintenance queue runs on PostgreSQL");
  process.exit(1);
}

try {
  await startMaintenanceJobs(env.DATABASE_URL, mediaStorage);
} catch (err) {
  logger.fatal({ err }, "Failed to start the maintenance queue");
  await prisma.$disconnect();
  process.exit(1);
}

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

logger.info(
  {
    port: server.port,
    env: env.NODE_ENV,
    bunVersion: Bun.version,
  },
  `🏯 Su-Ky API Service running on http://localhost:${server.port}`
);

async function handleShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal. Closing connections...");
  server.stop(true);

  try {
    await stopMaintenanceJobs();
    logger.info("Maintenance queues stopped cleanly.");
  } catch (err) {
    logger.error({ err }, "Error while stopping maintenance queues during shutdown");
  }

  try {
    await prisma.$disconnect();
    logger.info("Database connection closed cleanly.");
  } catch (err) {
    logger.error({ err }, "Error while disconnecting database during shutdown");
  }

  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default server;
