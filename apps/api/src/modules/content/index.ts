import { Hono } from "hono";
import type { AppEnv } from "../../types";
import type { MediaStorageGateway } from "../media";
import { PrismaEpisodeRepository, PrismaSeriesRepository } from "./infrastructure/prisma-content.repository";
import { ContentService } from "./application/content.service";
import { createEpisodeRoute } from "./presentation/episode.routes";
import { createSeriesRoute } from "./presentation/series.routes";

const contentService = new ContentService(new PrismaSeriesRepository(), new PrismaEpisodeRepository());

export function createStudioContentRoute(storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .route("/series", createSeriesRoute(contentService, storage))
    .route("/", createEpisodeRoute(contentService, storage));
}
