import { Hono } from "hono";
import {
  corsConfig,
  errorHandler,
  requestId,
  requestLogger,
} from "./core/middleware";
import { healthRoute } from "./routes/health";
import { timelineRoute } from "./routes/timeline";
import { seriesRoute } from "./routes/series";
import { episodesRoute } from "./routes/episodes";
import { figuresRoute } from "./routes/figures";
import { adminRoute, auth, currentUserRoute } from "./modules/auth";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>()
  .use("*", requestId())
  .use("*", requestLogger())
  .use("*", corsConfig())
  .onError(errorHandler)
  .notFound((c) => {
    const reqId = c.get("requestId") ?? "unknown";
    return c.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Route '${c.req.method} ${c.req.path}' not found`,
        },
        meta: {
          requestId: reqId,
          timestamp: new Date().toISOString(),
        },
      },
      404
    );
  });

export const routes = app
  .all("/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/me", currentUserRoute)
  .route("/api/admin", adminRoute)
  .route("/health", healthRoute)
  .route("/api/timeline", timelineRoute)
  .route("/api/series", seriesRoute)
  .route("/api/episodes", episodesRoute)
  .route("/api/figures", figuresRoute);

export type AppType = typeof routes;
export default app;
