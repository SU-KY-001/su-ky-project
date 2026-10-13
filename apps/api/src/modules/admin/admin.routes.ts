import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { paginatedSchema, AdminAuditLogSchema, AdminAuditQuerySchema, AdminBanUserSchema, AdminCatalogQuerySchema, AdminConfigSchema, AdminConfigUpdateSchema, AdminContentActionSchema, AdminContentQuerySchema, AdminContentSeriesSchema, AdminCreateUserSchema, AdminDashboardSchema, AdminHistoricalPeriodInputSchema, AdminHistoricalPeriodPatchSchema, AdminHistoricalPeriodSchema, AdminTopicInputSchema, AdminTopicPatchSchema, AdminTopicSchema, AdminUpdateUserSchema, AdminUserQuerySchema, AdminUserSchema, ActivateWeeklyMissionSchema, MissionTemplateInputSchema, MissionTemplatePatchSchema } from "@repo/shared";
import type { AppEnv } from "../../types";
import { requireAdmin } from "../auth";
import { throwOnInvalid } from "../../core/middleware/validation";
import { requestIpAddress } from "../../core/audit";
import { AdminService } from "./admin.service";

const idParam = z.object({ id: z.string() });
const keyParam = z.object({ key: z.string().min(1) });
const contentParam = z.object({ kind: z.enum(["series", "episodes"]), id: z.string().uuid() });
const service = new AdminService();
const context = (c: { req: { raw: { headers: Headers } }; get(name: "session"): NonNullable<AppEnv["Variables"]["session"]> }) => ({ actorId: c.get("session").user.id, ipAddress: requestIpAddress(c.req.raw.headers) });

export const adminRoute = new Hono<AppEnv>()
  .use("*", requireAdmin)
  .get("/", (c) => c.json({ message: "Admin access granted" }))
  .get("/dashboard", async (c) => c.json(AdminDashboardSchema.parse(await service.dashboard())))
  .get("/users", zValidator("query", AdminUserQuerySchema, throwOnInvalid), async (c) => c.json(paginatedSchema(AdminUserSchema).parse(await service.listUsers(c.req.valid("query")))))
  .post("/users", zValidator("json", AdminCreateUserSchema, throwOnInvalid), async (c) => c.json(AdminUserSchema.parse(await service.createUser(c.req.valid("json"), context(c))), 201))
  .patch("/users/:id", zValidator("param", idParam, throwOnInvalid), zValidator("json", AdminUpdateUserSchema, throwOnInvalid), async (c) => c.json(AdminUserSchema.parse(await service.updateUser(c.req.valid("param").id, c.req.valid("json"), context(c)))))
  .post("/users/:id/ban", zValidator("param", idParam, throwOnInvalid), zValidator("json", AdminBanUserSchema, throwOnInvalid), async (c) => c.json(AdminUserSchema.parse(await service.banUser(c.req.valid("param").id, c.req.valid("json"), context(c)))))
  .post("/users/:id/unban", zValidator("param", idParam, throwOnInvalid), async (c) => c.json(AdminUserSchema.parse(await service.unbanUser(c.req.valid("param").id, context(c)))))
  .get("/topics", zValidator("query", AdminCatalogQuerySchema, throwOnInvalid), async (c) => c.json(paginatedSchema(AdminTopicSchema).parse(await service.listTopics(c.req.valid("query")))))
  .post("/topics", zValidator("json", AdminTopicInputSchema, throwOnInvalid), async (c) => c.json(AdminTopicSchema.parse(await service.createTopic(c.req.valid("json"), context(c))), 201))
  .patch("/topics/:id", zValidator("param", idParam, throwOnInvalid), zValidator("json", AdminTopicPatchSchema, throwOnInvalid), async (c) => c.json(AdminTopicSchema.parse(await service.patchTopic(c.req.valid("param").id, c.req.valid("json"), context(c)))))
  .get("/historical-periods", zValidator("query", AdminCatalogQuerySchema, throwOnInvalid), async (c) => c.json(paginatedSchema(AdminHistoricalPeriodSchema).parse(await service.listHistoricalPeriods(c.req.valid("query")))))
  .post("/historical-periods", zValidator("json", AdminHistoricalPeriodInputSchema, throwOnInvalid), async (c) => c.json(AdminHistoricalPeriodSchema.parse(await service.createHistoricalPeriod(c.req.valid("json"), context(c))), 201))
  .patch("/historical-periods/:id", zValidator("param", idParam, throwOnInvalid), zValidator("json", AdminHistoricalPeriodPatchSchema, throwOnInvalid), async (c) => c.json(AdminHistoricalPeriodSchema.parse(await service.patchHistoricalPeriod(c.req.valid("param").id, c.req.valid("json"), context(c)))))
  .get("/content", zValidator("query", AdminContentQuerySchema, throwOnInvalid), async (c) => c.json(paginatedSchema(AdminContentSeriesSchema).parse(await service.listContent(c.req.valid("query")))))
  .post("/content/:kind/:id", zValidator("param", contentParam, throwOnInvalid), zValidator("json", AdminContentActionSchema, throwOnInvalid), async (c) => { const param = c.req.valid("param"); return c.json(await service.interveneContent(param.kind, param.id, c.req.valid("json").action, context(c))); })
  .get("/configs", async (c) => c.json({ items: z.array(AdminConfigSchema).parse(await service.listConfigs()) }))
  .patch("/configs/:key", zValidator("param", keyParam, throwOnInvalid), zValidator("json", AdminConfigUpdateSchema, throwOnInvalid), async (c) => c.json(AdminConfigSchema.parse(await service.updateConfig(c.req.valid("param").key, c.req.valid("json").value, context(c)))))
  .get("/audit-logs", zValidator("query", AdminAuditQuerySchema, throwOnInvalid), async (c) => c.json(paginatedSchema(AdminAuditLogSchema).parse(await service.listAudit(c.req.valid("query")))))
  .get("/mission-templates", async (c) => c.json({ items: await service.listMissionTemplates() }))
  .post("/mission-templates", zValidator("json", MissionTemplateInputSchema, throwOnInvalid), async (c) => c.json(await service.createMissionTemplate(c.req.valid("json"), context(c)), 201))
  .patch("/mission-templates/:id", zValidator("param", idParam, throwOnInvalid), zValidator("json", MissionTemplatePatchSchema, throwOnInvalid), async (c) => c.json(await service.patchMissionTemplate(c.req.valid("param").id, c.req.valid("json"), context(c))))
  .get("/weekly-missions", async (c) => c.json({ items: await service.listWeeklyMissions() }))
  .post("/weekly-missions", zValidator("json", ActivateWeeklyMissionSchema, throwOnInvalid), async (c) => c.json(await service.activateWeeklyMission(c.req.valid("json"), context(c)), 201));
