import {
  AttachAudioSchema, CreateEntityTagSchema, CreateEpisodeSchema,
  NarrationTypeSchema, PatchEntityTagSchema, PatchEpisodeSchema, PutNarrationSchema,
} from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { MediaStorageGateway } from "../../media";
import { mapEntityTag, mapNarration, mapWorkspace } from "../application/content.mappers";
import type { ContentService } from "../application/content.service";

const idParam = z.object({ id: z.string().uuid() });
const seriesParam = z.object({ seriesId: z.string().uuid() });
const narrationParam = z.object({ id: z.string().uuid(), type: NarrationTypeSchema });
const childParam = z.object({ id: z.string().uuid(), childId: z.string().uuid() });

export function createEpisodeRoute(service: ContentService, storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .post("/series/:seriesId/episodes", idempotency(), rateLimit("write"), zValidator("param", seriesParam, throwOnInvalid), zValidator("json", CreateEpisodeSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const workspace = await service.appendEpisode(session, c.req.valid("param").seriesId, c.req.valid("json"));
      c.header("Location", `/api/studio/episodes/${workspace.id}`);
      return c.json(await mapWorkspace(workspace, storage), 201);
    })
    .get("/episodes/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await mapWorkspace(await service.getEpisodeForRead(session, c.req.valid("param").id), storage));
    })
    .patch("/episodes/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchEpisodeSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await mapWorkspace(await service.updateEpisode(session, c.req.valid("param").id, c.req.valid("json")), storage));
    })
    .post("/episodes/:id/publish", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await mapWorkspace(await service.publishEpisode(session, c.req.valid("param").id), storage));
    })
    .post("/episodes/:id/hide", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await mapWorkspace(await service.hideEpisode(session, c.req.valid("param").id), storage));
    })
    .delete("/episodes/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      await service.deleteEpisode(session, c.req.valid("param").id);
      return c.body(null, 204);
    })
    .post("/episodes/:id/restore", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await mapWorkspace(await service.restoreEpisode(session, c.req.valid("param").id), storage));
    })
    .get("/episodes/:id/narrations/:type", zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, type } = c.req.valid("param");
      return c.json(await mapNarration(await service.getNarration(session, id, type), storage));
    })
    .put("/episodes/:id/narrations/:type", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", PutNarrationSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, type } = c.req.valid("param");
      return c.json(await mapNarration(await service.putNarration(session, id, type, c.req.valid("json")), storage));
    })
    .delete("/episodes/:id/narrations/FIRST_PERSON", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      await service.deleteNarration(session, c.req.valid("param").id);
      return c.body(null, 204);
    })
    .put("/episodes/:id/narrations/:type/audio", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), zValidator("json", AttachAudioSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, type } = c.req.valid("param");
      return c.json(await mapNarration(await service.attachAudio(session, id, type, c.req.valid("json")), storage));
    })
    .delete("/episodes/:id/narrations/:type/audio", rateLimit("write"), zValidator("param", narrationParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, type } = c.req.valid("param");
      await service.detachAudio(session, id, type);
      return c.body(null, 204);
    })
    .get("/episodes/:id/entity-tags", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const items = await service.listEntityTags(session, c.req.valid("param").id);
      return c.json({ items: items.map(mapEntityTag) });
    })
    .post("/episodes/:id/entity-tags", idempotency(), rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", CreateEntityTagSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const item = await service.addEntityTag(session, c.req.valid("param").id, c.req.valid("json").entityId);
      return c.json(mapEntityTag(item), 200);
    })
    .patch("/episodes/:id/entity-tags/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), zValidator("json", PatchEntityTagSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, childId } = c.req.valid("param");
      return c.json(mapEntityTag(await service.patchEntityTag(session, id, childId, c.req.valid("json").status)));
    })
    .delete("/episodes/:id/entity-tags/:childId", rateLimit("write"), zValidator("param", childParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { id, childId } = c.req.valid("param");
      await service.deleteEntityTag(session, id, childId);
      return c.body(null, 204);
    });
}
