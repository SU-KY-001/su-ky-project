import { Hono, type MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AdminListeningReportQuerySchema, AdminListeningReportSchema } from "@repo/shared";
import type { AppEnv } from "../../../types";
import { requireAdmin } from "../../auth";
import { throwOnInvalid } from "../../../core/middleware/validation";
import { ListeningReportService } from "./listening-report.service";
import { PrismaListeningReportRepository } from "./prisma-listening-report.repository";

export function createListeningReportRoute(
  service: Pick<ListeningReportService, "report"> = new ListeningReportService(new PrismaListeningReportRepository()),
  guard: MiddlewareHandler<AppEnv> = requireAdmin,
) {
  return new Hono<AppEnv>().use("*", guard).get("/listening", zValidator("query", AdminListeningReportQuerySchema, throwOnInvalid), async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(AdminListeningReportSchema.parse(await service.report(c.req.valid("query"))));
  });
}
