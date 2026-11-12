import {
  AttachProofSchema,
  CreateMediaAssetSchema,
  CreateMembershipOrderSchema,
  PaginationQuerySchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth } from "../../auth";
import type { MembershipService } from "../application/membership.service";

const idParam = z.object({ id: z.string().uuid() });

export function createPublicMembershipRoute(service: MembershipService) {
  return new Hono<AppEnv>().get("/membership/plans", async (c) => c.json(await service.listPlans()));
}

export function createMeMembershipRoute(service: MembershipService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth)
    .get("/", async (c) => c.json(await service.getEntitlement(c.get("session")!.user.id)))
    .post(
      "/orders",
      idempotency(),
      rateLimit("membership_order"),
      zValidator("json", CreateMembershipOrderSchema, throwOnInvalid),
      async (c) => {
        const order = await service.createOrder(c.get("session")!.user.id, c.req.valid("json").planCode);
        c.header("Location", `/api/me/membership/orders/${order.id}`);
        return c.json(order, 201);
      },
    )
    .get("/orders", zValidator("query", PaginationQuerySchema, throwOnInvalid), async (c) => {
      const { page, limit } = c.req.valid("query");
      return c.json(await service.listOrders(c.get("session")!.user.id, page, limit));
    })
    .get("/orders/:id", zValidator("param", idParam, throwOnInvalid), async (c) =>
      c.json(await service.getOrder(c.get("session")!.user.id, c.req.valid("param").id)),
    )
    .post(
      "/orders/:id/proof-ticket",
      rateLimit("media_upload"),
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", CreateMediaAssetSchema, throwOnInvalid),
      async (c) =>
        c.json(
          await service.createProofTicket(
            c.get("session")!.user.id,
            c.req.valid("param").id,
            c.req.valid("json"),
          ),
        ),
    )
    .post(
      "/orders/:id/proof",
      zValidator("param", idParam, throwOnInvalid),
      zValidator("json", AttachProofSchema, throwOnInvalid),
      async (c) => {
        const body = c.req.valid("json");
        return c.json(
          await service.attachProof(c.get("session")!.user.id, c.req.valid("param").id, body.assetId, body.publicId),
        );
      },
    );
}
