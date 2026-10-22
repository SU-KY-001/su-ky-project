import { CreateAiCheckSchema, PatchAiCheckItemSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { AiCheckService } from "../application/ai-check.service";

const episodeParam = z.object({ id: z.string().uuid() });
const checkParam = episodeParam.extend({ checkId: z.string().uuid() });
const itemParam = checkParam.extend({ itemId: z.string().uuid() });

const BASE_PATH = "/api/studio/episodes";

export function createAiCheckRoute(service: AiCheckService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post(
      "/episodes/:id/ai-checks",
      idempotency(),
      rateLimit("ai_check"),
      zValidator("param", episodeParam, throwOnInvalid),
      zValidator("json", CreateAiCheckSchema, throwOnInvalid),
      async (c) => {
        const { id } = c.req.valid("param");
        const created = await service.create(c.get("session")!, id, c.req.valid("json"));
        return c.json(created, 202, { Location: `${BASE_PATH}/${id}/ai-checks/${created.id}` });
      },
    )
    .get("/episodes/:id/ai-checks", zValidator("param", episodeParam, throwOnInvalid), async (c) =>
      c.json({ items: await service.list(c.get("session")!, c.req.valid("param").id) }),
    )
    .get("/episodes/:id/ai-checks/:checkId", zValidator("param", checkParam, throwOnInvalid), async (c) => {
      const { id, checkId } = c.req.valid("param");
      return c.json(await service.get(c.get("session")!, id, checkId));
    })
    .post("/episodes/:id/ai-checks/:checkId/cancel", rateLimit("write"), zValidator("param", checkParam, throwOnInvalid), async (c) => {
      const { id, checkId } = c.req.valid("param");
      return c.json(await service.cancel(c.get("session")!, id, checkId));
    })
    .patch(
      "/episodes/:id/ai-checks/:checkId/items/:itemId",
      rateLimit("write"),
      zValidator("param", itemParam, throwOnInvalid),
      zValidator("json", PatchAiCheckItemSchema, throwOnInvalid),
      async (c) => {
        const { id, checkId, itemId } = c.req.valid("param");
        return c.json(await service.patchItem(c.get("session")!, id, checkId, itemId, c.req.valid("json")));
      },
    );
}
