import { prisma } from "@repo/db";
import { app } from "./app";
import { env, logger } from "./core";

const port = env.PORT;

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
