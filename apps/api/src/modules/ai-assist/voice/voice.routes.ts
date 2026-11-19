import { CreateVoiceJobSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { VoiceService } from "./voice.service";

const episodeParam = z.object({ id: z.string().uuid() });
const jobParam = episodeParam.extend({ jobId: z.string().uuid() });

/** Start / poll / cancel / download one background voice generation (see VoiceService). */
export function createVoiceRoute(service: VoiceService) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post(
      "/episodes/:id/ai/voice",
      rateLimit("ai_generate"),
      zValidator("param", episodeParam, throwOnInvalid),
      zValidator("json", CreateVoiceJobSchema, throwOnInvalid),
      async (c) => c.json(await service.start(c.get("session")!, c.req.valid("param").id, c.req.valid("json").voice), 202),
    )
    .get("/episodes/:id/ai/voice/:jobId", zValidator("param", jobParam, throwOnInvalid), (c) => {
      const { id, jobId } = c.req.valid("param");
      return c.json(service.get(c.get("session")!, id, jobId));
    })
    .delete("/episodes/:id/ai/voice/:jobId", zValidator("param", jobParam, throwOnInvalid), (c) => {
      const { id, jobId } = c.req.valid("param");
      service.cancel(c.get("session")!, id, jobId);
      return c.body(null, 204);
    })
    .get("/episodes/:id/ai/voice/:jobId/audio", zValidator("param", jobParam, throwOnInvalid), async (c) => {
      const { id, jobId } = c.req.valid("param");
      const mp3 = await service.readMp3(c.get("session")!, id, jobId);
      return c.body(new Uint8Array(mp3), 200, { "Content-Type": "audio/mpeg", "Content-Length": String(mp3.length), "Cache-Control": "no-store" });
    });
}
