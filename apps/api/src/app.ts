import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import {
  corsConfig,
  errorHandler,
  requestId,
  requestLogger,
} from "./core/middleware";
import { docsRoute } from "./routes/docs";
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
  .use("*", secureHeaders())
  .use("*", corsConfig())
  .use("*", compress())
  .use("*", etag())
  .use(
    "*",
    bodyLimit({
      maxSize: 10 * 1024 * 1024, // 10MB limit
      onError: (c) =>
        c.json(
          {
            success: false,
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request payload exceeds 10MB limit",
            },
            meta: {
              requestId: c.get("requestId") ?? "unknown",
              timestamp: new Date().toISOString(),
            },
          },
          413
        ),
    })
  )
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
  .route("/", docsRoute)
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
