import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PublicHonorsQuerySchema, PublicReleaseQuerySchema } from "@repo/shared";
import { throwOnInvalid } from "../../core/middleware";
import { publicHonors, publicReleases } from "./showcase.service";

export const showcaseRoute = new Hono()
  .get("/honors", zValidator("query", PublicHonorsQuerySchema, throwOnInvalid), async (c) => c.json(await publicHonors(c.req.valid("query").period)))
  .get("/releases", zValidator("query", PublicReleaseQuerySchema, throwOnInvalid), async (c) => {
    const { from, to, seriesId } = c.req.valid("query");
    return c.json(await publicReleases(from, to, seriesId));
  });
