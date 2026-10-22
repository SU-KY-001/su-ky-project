import { CreateAngleSchema, UpdateAngleSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { AngleService } from "../angles/angle.service";

// Not `.uuid()`: the service answers 404 for any id that is not the caller's angle (built-ins included).
const angleParam = z.object({ id: z.string().min(1).max(64) });

export function createAngleRoute(service: AngleService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .get("/ai/angles", async (c) => c.json({ items: await service.list(c.get("session")!.user.id) }))
    .post("/ai/angles", rateLimit("write"), zValidator("json", CreateAngleSchema, throwOnInvalid), async (c) =>
      c.json(await service.create(c.get("session")!.user.id, c.req.valid("json")), 201),
    )
    .patch(
      "/ai/angles/:id",
      rateLimit("write"),
      zValidator("param", angleParam, throwOnInvalid),
      zValidator("json", UpdateAngleSchema, throwOnInvalid),
      async (c) => c.json(await service.update(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("json"))),
    )
    .delete("/ai/angles/:id", rateLimit("write"), zValidator("param", angleParam, throwOnInvalid), async (c) => {
      await service.remove(c.get("session")!.user.id, c.req.valid("param").id);
      return c.body(null, 204);
    });
}
