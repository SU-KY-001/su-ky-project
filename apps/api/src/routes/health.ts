import { Hono } from "hono";
import { prisma } from "@repo/db";
import type { SystemHealthDto } from "@repo/shared";
import { logger } from "../core/logger";
import { isMaintenanceRunning } from "../core/jobs/maintenance-jobs";

export const healthRoute = new Hono().get("/", async (c) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";

  try {
    const { promise: timeoutPromise, reject } = Promise.withResolvers<never>();
    const timer = setTimeout(() => reject(new Error("DB ping timeout")), 2000);
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise,
    ]).finally(() => clearTimeout(timer));
    dbStatus = "connected";
  } catch (error) {
    logger.warn(
      { err: error },
      `Healthcheck: PostgreSQL connection failed or unavailable: ${(error as Error).message}`
    );
    dbStatus = "disconnected";
  }
  const queue = isMaintenanceRunning() ? "running" : "stopped";
  const isHealthy = dbStatus === "connected" && queue === "running";
  const globalObj: Record<string, unknown> = globalThis;
  let bunVersion = "1.4.0";
  const bunEntry = globalObj.Bun;
  if (
    bunEntry &&
    typeof bunEntry === "object" &&
    "version" in bunEntry &&
    typeof bunEntry.version === "string"
  ) {
    bunVersion = bunEntry.version;
  }
  const healthData: SystemHealthDto = {
    status: isHealthy ? "ok" : "degraded",
    service: "su-ky-api",
    version: "1.0.0",
    runtime: "Bun",
    bunVersion,
    database: dbStatus,
    queue,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return c.json(healthData, isHealthy ? 200 : 503);
});
