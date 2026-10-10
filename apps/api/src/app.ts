import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import {
  bypassEventStreams,
  corsConfig,
  errorHandler,
  requestId,
  requestLogger,
} from "./core/middleware";
import { renderError } from "./core/errors/error-response";
import { docsRoute } from "./routes/docs";
import { healthRoute } from "./routes/health";
import { adminRoute, auth, currentUserRoute } from "./modules/auth";
import { publicCatalogRoute, studioCatalogRoute } from "./modules/catalog";
import { createStudioContentRoute } from "./modules/content";
import { mediaRoute, mediaStorage } from "./modules/media";
import { meListeningRoute, publicListeningRoute } from "./modules/listening";
import type { AppEnv } from "./types";
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

export const app = new Hono<AppEnv>()
  .use("*", requestId())
  .use("*", requestLogger())
  .use("*", secureHeaders())
  .use("*", corsConfig())
  .use("*", compress())
  .use("*", bypassEventStreams(etag()))
  .use(
    "*",
    bodyLimit({
      maxSize: MAX_REQUEST_BODY_BYTES,
      onError: (c) =>
        renderError(c, 413, "PAYLOAD_TOO_LARGE", "Request payload exceeds 10MB limit"),
    })
  )
  .onError(errorHandler)
  .notFound((c) =>
    renderError(c, 404, "NOT_FOUND", `Route '${c.req.method} ${c.req.path}' not found`)
  );

// Backward-compatibility stub for frontend until timeline module is defined
const timelineRoute = new Hono().get("/", (c) =>
  c.json({
    items: [] as Array<{
      id: string;
      slug: string;
      name: string;
      startYear: number;
      endYear?: number | null;
      description: string;
      episodesCount?: number;
      seriesCount?: number;
    }>,
  })
);

export const routes = app
  .route("/", docsRoute)
  .all("/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/me", currentUserRoute)
  .route("/api", publicCatalogRoute)
  .route("/api", publicListeningRoute)
  .route("/api/me", meListeningRoute)
  .route("/api/studio", studioCatalogRoute)
  .route("/api/studio", createStudioContentRoute(mediaStorage))
  .route("/api/studio/media-assets", mediaRoute)
  .route("/api/admin", adminRoute)
  .route("/health", healthRoute)
  .route("/api/timeline", timelineRoute);

export type AppType = typeof routes;
export default app;
