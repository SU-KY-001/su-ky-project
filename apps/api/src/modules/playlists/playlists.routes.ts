import { Hono, type MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PlaylistPageQuerySchema, PlaylistNameSchema, PlaylistIdSchema, PlaylistItemParamSchema, AddPlaylistItemSchema, ReorderPlaylistSchema, PlaylistSchema, PlaylistListSchema, PlaylistDetailSchema } from "@repo/shared";
import { requireAuth } from "../auth/auth.middleware";
import { idempotency, rateLimit, throwOnInvalid } from "../../core/middleware";
import type { AppEnv } from "../../types";
import { PlaylistService } from "./playlists.service";

export function createPlaylistsRoute(service: Pick<PlaylistService, "list" | "get" | "create" | "rename" | "delete" | "add" | "remove" | "reorder"> = new PlaylistService(), guard: MiddlewareHandler<AppEnv> = requireAuth, writeLimit: MiddlewareHandler<AppEnv> = rateLimit("write"), createIdempotency: MiddlewareHandler<AppEnv> = idempotency()): Hono<AppEnv> {
  return new Hono<AppEnv>()
    .use("*", guard, async (c, next) => { c.header("Cache-Control", "private, no-store"); await next(); })
    .get("/", zValidator("query", PlaylistPageQuerySchema, throwOnInvalid), async (c) => c.json(PlaylistListSchema.parse(await service.list(c.get("session")!.user.id, c.req.valid("query")))))
    .post("/", writeLimit, createIdempotency, zValidator("json", PlaylistNameSchema, throwOnInvalid), async (c) => {
      const result = await service.create(c.get("session")!.user.id, c.req.valid("json").name);
      c.header("Location", `/api/me/playlists/${result.id}`);
      return c.json(PlaylistSchema.parse(result), 201);
    })
    .get("/:id", zValidator("param", PlaylistIdSchema, throwOnInvalid), zValidator("query", PlaylistPageQuerySchema, throwOnInvalid), async (c) => c.json(PlaylistDetailSchema.parse(await service.get(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("query")))))
    .patch("/:id", writeLimit, zValidator("param", PlaylistIdSchema, throwOnInvalid), zValidator("json", PlaylistNameSchema, throwOnInvalid), async (c) => c.json(PlaylistSchema.parse(await service.rename(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("json").name))))
    .delete("/:id", writeLimit, zValidator("param", PlaylistIdSchema, throwOnInvalid), async (c) => { await service.delete(c.get("session")!.user.id, c.req.valid("param").id); return c.body(null, 204); })
    .post("/:id/items", writeLimit, zValidator("param", PlaylistIdSchema, throwOnInvalid), zValidator("json", AddPlaylistItemSchema, throwOnInvalid), async (c) => c.json(PlaylistSchema.parse(await service.add(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("json").episodeId))))
    .delete("/:id/items/:episodeId", writeLimit, zValidator("param", PlaylistItemParamSchema, throwOnInvalid), async (c) => c.json(PlaylistSchema.parse(await service.remove(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("param").episodeId))))
    .put("/:id/items/order", writeLimit, zValidator("param", PlaylistIdSchema, throwOnInvalid), zValidator("json", ReorderPlaylistSchema, throwOnInvalid), async (c) => c.json(PlaylistSchema.parse(await service.reorder(c.get("session")!.user.id, c.req.valid("param").id, c.req.valid("json").episodeIds))));
}
export const playlistsRoute = createPlaylistsRoute();
