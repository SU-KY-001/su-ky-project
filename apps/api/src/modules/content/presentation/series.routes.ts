import { CreateSeriesSchema, EpisodeOrderSchema, PatchSeriesSchema, SeriesQuerySchema } from "@repo/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requestIpAddress } from "../../../core/audit";
import { idempotency, rateLimit, throwOnInvalid } from "../../../core/middleware";
import type { AppEnv } from "../../../types";
import { requireAuth, requireRole } from "../../auth";
import type { MediaStorageGateway } from "../../media";
import { mapSeriesDetail, mapSeriesListItem } from "../application/content.mappers";
import type { ContentService } from "../application/content.service";

const idParam = z.object({ id: z.string().uuid() });

export function createSeriesRoute(service: ContentService, storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .use("*", requireAuth, requireRole("moderator", "admin"))
    .get("/", zValidator("query", SeriesQuerySchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(await service.listSeries(session, c.req.valid("query")).then(({ items, ...meta }) => ({ items: items.map((series) => mapSeriesListItem(series, storage)), ...meta })));
    })
    .post("/", idempotency(), rateLimit("write"), zValidator("json", CreateSeriesSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const series = await service.createSeries(session, c.req.valid("json"), requestIpAddress(c.req.raw.headers));
      c.header("Location", `/api/studio/series/${series.id}`);
      return c.json(mapSeriesDetail(series, storage), 201);
    })
    .get("/:id", zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(mapSeriesDetail(await service.getSeriesDetailForRead(session, c.req.valid("param").id), storage));
    })
    .patch("/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", PatchSeriesSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(mapSeriesDetail(await service.updateSeries(session, c.req.valid("param").id, c.req.valid("json"), requestIpAddress(c.req.raw.headers)), storage));
    })
    .post("/:id/publish", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(mapSeriesDetail(await service.publishSeries(session, c.req.valid("param").id), storage));
    })
    .post("/:id/hide", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(mapSeriesDetail(await service.hideSeries(session, c.req.valid("param").id), storage));
    })
    .delete("/:id", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      await service.deleteSeries(session, c.req.valid("param").id);
      return c.body(null, 204);
    })
    .post("/:id/restore", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      return c.json(mapSeriesDetail(await service.restoreSeries(session, c.req.valid("param").id), storage));
    })
    .put("/:id/episode-order", rateLimit("write"), zValidator("param", idParam, throwOnInvalid), zValidator("json", EpisodeOrderSchema, throwOnInvalid), async (c) => {
      const session = c.get("session")!;
      const { episodeIds, baseUpdatedAt } = c.req.valid("json");
      const series = await service.reorderEpisodes(session, c.req.valid("param").id, episodeIds, baseUpdatedAt);
      return c.json(mapSeriesDetail(series, storage).episodes);
    });
}
