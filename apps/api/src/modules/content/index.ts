import { Hono } from "hono";
import type { AppEnv } from "../../types";
import type { MediaStorageGateway } from "../media";
import { ContentService } from "./application/content.service";
import type { EpisodeRepository } from "./domain/content.repository";
import {
  PrismaEpisodeRepository,
  PrismaSeriesRepository,
} from "./infrastructure/prisma-content.repository";
import { createEpisodeRoute } from "./presentation/episode.routes";
import { createSeriesRoute } from "./presentation/series.routes";

export const contentService = new ContentService(
  new PrismaSeriesRepository(),
  new PrismaEpisodeRepository(),
);

export function createEpisodeRepository(): EpisodeRepository {
  return new PrismaEpisodeRepository();
}

export type { EpisodeRepository } from "./domain/content.repository";

export function createStudioContentRoute(storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .route("/series", createSeriesRoute(contentService, storage))
    .route("/", createEpisodeRoute(contentService, storage));
}
