import { CreateMediaAssetSchema, VerifyMediaAssetSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { MediaService } from "../application/media.service";

const idParam = z.object({ id: z.string().uuid() });

export function createMediaRoute(service: MediaService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post("/", idempotency(), rateLimit("media_upload"), zValidator("json", CreateMediaAssetSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const result = await service.create(c.req.valid("json"), session.user.id);
      c.header("Location", `/api/studio/media-assets/${result.assetId}`);
      return c.json(result, 201);
    })
    .get("/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await service.get(c.req.valid("param").id, session.user.id, session.user.role === "admin"));
    })
    .post("/:id/verify", rateLimit("media_upload"), zValidator("param", idParam, throwOnInvalid), zValidator("json", VerifyMediaAssetSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await service.verify(c.req.valid("param").id, session.user.id, session.user.role === "admin", c.req.valid("json").publicId));
    });
}
