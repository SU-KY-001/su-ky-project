import { prisma } from "@repo/db";
import { app } from "./app";
import { env, logger } from "./core";
import {
  startScriptWorkflowRuntime,
  stopScriptWorkflowRuntime,
} from "./modules/script-workflow";

const port = env.PORT;

if (!env.DATABASE_URL) {
  logger.fatal("DATABASE_URL is required: the script workflow queue runs on PostgreSQL");
  process.exit(1);
}

try {
  await startScriptWorkflowRuntime(env.DATABASE_URL);
} catch (err) {
  logger.fatal({ err }, "Failed to start the script workflow runtime");
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
    await stopScriptWorkflowRuntime();
    logger.info("Script workflow queue stopped cleanly.");
  } catch (err) {
    logger.error({ err }, "Error while stopping the script workflow queue during shutdown");
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
