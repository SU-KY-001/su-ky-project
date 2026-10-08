import { Hono } from "hono";
import type { AppEnv } from "../../types";
import type { MediaStorageGateway } from "../media/application/media-storage";
import { createEpisodeRoute } from "./presentation/episode.routes";
import { createSeriesRoute } from "./presentation/series.routes";

export function createStudioContentRoute(storage?: MediaStorageGateway) {
  return new Hono<AppEnv>()
    .route("/series", createSeriesRoute(storage))
    .route("/", createEpisodeRoute(storage));
}

export { createSeriesDraft, appendEpisodes } from "./application/content-writer";
export { loadSeriesForRead, assertWritable } from "./application/content-access";
