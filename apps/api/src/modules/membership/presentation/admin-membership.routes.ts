import {
  AdminGrantMembershipSchema,
  AdminMemberQuerySchema,
  AdminMembershipOrderQuerySchema,
  AdminMembershipReportQuerySchema,
  AdminPlanPatchSchema,
  AdminResolveTransactionSchema,
  AdminRevokeMembershipSchema,
  AdminTransactionQuerySchema,
  AdminVerifyOrderSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import { requestIpAddress } from "../../../core/audit";
import type { AppEnv } from "../../../types";
import { requireAdmin } from "../../auth";
import type { AdminMembershipService } from "../application/admin-membership.service";

const idParam = z.object({ id: z.string().uuid() });
const codeParam = z.object({ code: z.string().min(1).max(32) });
const userParam = z.object({ userId: z.string().min(1).max(36) });

const context = (c: {
  req: { raw: { headers: Headers } };
  get(name: "session"): NonNullable<AppEnv["Variables"]["session"]>;
}) => ({ actorId: c.get("session").user.id, ipAddress: requestIpAddress(c.req.raw.headers) });

export function createAdminMembershipRoute(service: AdminMembershipService) {
  return new Hono<AppEnv>()
    .use("*", requireAdmin)
    .get("/plans", async (c) => c.json(await service.listPlans()))
    .patch(
      "/plans/:code",
      rateLimit("write"),
      zValidator("param", codeParam, throwOnInvalid),
      zValidator("json", AdminPlanPatchSchema, throwOnInvalid),
      async (c) => c.json(await service.updatePlan(c.req.valid("param").code, c.req.valid("json"), context(c))),
    )
    .get("/orders", zValidator("query", AdminMembershipOrderQuerySchema, throwOnInvalid), async (c) =>
      c.json(await service.listOrders(c.req.valid("query"))),
    )
    .get("/orders/:id", zValidator("param", idParam, throwOnInvalid), async (c) =>
      c.json(await service.getOrder(c.req.valid("param").id)),
    )
    .post(
      "/orders/:id/verify",
      rateLimit("write"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", AdminVerifyOrderSchema, throwOnInvalid),
      async (c) => c.json(await service.verifyOrder(c.req.valid("param").id, c.req.valid("json"), context(c))),
    )
    .get("/transactions", zValidator("query", AdminTransactionQuerySchema, throwOnInvalid), async (c) => {
      const { from, to, ...query } = c.req.valid("query");
      return c.json(
        await service.listTransactions({
          ...query,
          ...(from ? { from: new Date(`${from}T00:00:00+07:00`) } : {}),
          ...(to ? { to: new Date(`${to}T00:00:00+07:00`) } : {}),
        }),
      );
    })
    .post(
      "/transactions/:id/resolve",
      rateLimit("write"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", AdminResolveTransactionSchema, throwOnInvalid),
      async (c) => c.json(await service.resolveTransaction(c.req.valid("param").id, c.req.valid("json"), context(c))),
    )
    .get("/members", zValidator("query", AdminMemberQuerySchema, throwOnInvalid), async (c) =>
      c.json(await service.listMembers(c.req.valid("query"))),
    )
    .post(
      "/members/:userId/grant",
      rateLimit("write"),
      zValidator("param", userParam, throwOnInvalid),
      zValidator("json", AdminGrantMembershipSchema, throwOnInvalid),
      async (c) => c.json(await service.grant(c.req.valid("param").userId, c.req.valid("json"), context(c))),
    )
    .post(
      "/members/:userId/revoke",
      rateLimit("write"),
      zValidator("param", userParam, throwOnInvalid),
      zValidator("json", AdminRevokeMembershipSchema, throwOnInvalid),
      async (c) => c.json(await service.revoke(c.req.valid("param").userId, c.req.valid("json"), context(c))),
    )
    .get("/report", zValidator("query", AdminMembershipReportQuerySchema, throwOnInvalid), async (c) =>
      c.json(await service.report(c.req.valid("query"))),
    );
}
