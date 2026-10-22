import { CreateAiCheckSchema, PatchAiCheckItemSchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { AiCheckService } from "../application/ai-check.service";
import { parseLastEventId, runCheckStream, type CheckStreamDeps } from "../application/check-stream";

const episodeParam = z.object({ id: z.string().uuid() });
const checkParam = episodeParam.extend({ checkId: z.string().uuid() });
const itemParam = checkParam.extend({ itemId: z.string().uuid() });

const BASE_PATH = "/api/studio/episodes";
/** Browsers cap ~6 HTTP/1.1 connections per origin; a few tabs per user is plenty. */
const MAX_STREAMS_PER_USER = 4;

export function createAiCheckRoute(service: AiCheckService, stream: CheckStreamDeps) {
  const openStreams = new Map<string, number>();
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
    )
    // Path ends with `/events/stream` so `bypassEventStreams` skips etag (see app.ts); compress already skips event-stream.
    .get("/episodes/:id/ai-checks/:checkId/events/stream", zValidator("param", checkParam, throwOnInvalid), async (c) => {
      const { id, checkId } = c.req.valid("param");
      const session = c.get("session")!;
      await service.authorizeRead(session, id, checkId);
      const open = openStreams.get(session.user.id) ?? 0;
      if (open >= MAX_STREAMS_PER_USER) throw new DomainError(429, "RATE_LIMITED", "Mở quá nhiều kết nối theo dõi");
      openStreams.set(session.user.id, open + 1);
      const lastEventId = parseLastEventId(c.req.header("Last-Event-ID"));
      return streamSSE(c, async (sse) => {
        const abort = new AbortController();
        sse.onAbort(() => abort.abort());
        try {
          await runCheckStream(stream, checkId, lastEventId, {
            signal: abort.signal,
            send: (frame) => sse.writeSSE(frame),
            ping: async () => void (await sse.write(": ping\n\n")),
          });
        } finally {
          const left = (openStreams.get(session.user.id) ?? 1) - 1;
          if (left <= 0) openStreams.delete(session.user.id);
          else openStreams.set(session.user.id, left);
        }
      });
    }
    );
}
