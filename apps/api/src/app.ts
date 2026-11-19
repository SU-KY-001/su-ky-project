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
import { auth, currentUserRoute } from "./modules/auth";
import { adminRoute } from "./modules/admin";
import { publicCatalogRoute, studioCatalogRoute } from "./modules/catalog";
import { createEpisodeRepository, createStudioContentRoute } from "./modules/content";
import { createStudioAiAssistRoute, getEpisodeAiSummary } from "./modules/ai-assist";
import { mediaRoute, mediaStorage } from "./modules/media";
import { meListeningRoute, publicListeningRoute } from "./modules/listening";
import { adminMembershipRoute, meMembershipRoute, paymentWebhookRoute, publicMembershipRoute } from "./modules/membership";
import { createReleaseRoutes, createReleaseService } from "./modules/releases";
import { meMissionRoute, publicQuizRoute, studioQuizRoute } from "./modules/gamification";
import type { AppEnv } from "./types";
import { showcaseRoute } from "./modules/showcase";
import { exhibitionRoute, publicExhibitionRoute } from "./modules/exhibition";
import { playlistsRoute } from "./modules/playlists";
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

const releaseService = createReleaseService(
  createEpisodeRepository(),
  mediaStorage,
  getEpisodeAiSummary,
);

export const app = new Hono<AppEnv>()
  .use("*", requestId())
  .use("*", requestLogger())
  .use("*", secureHeaders())
  .use("*", corsConfig())
  .use("*", compress())
  .use("*", bypassEventStreams(etag({
    // 304 phải giữ header CORS, nếu không trình duyệt chặn revalidation của response cache.
    retainedHeaders: ["cache-control", "content-location", "date", "etag", "expires", "vary", "access-control-allow-origin", "access-control-allow-credentials", "access-control-expose-headers"],
  })))
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

export const routes = app
  .route("/", docsRoute)
  .all("/api/auth/*", (c) => {
    // Native clients (React Native) replay the session cookie from their cookie
    // jar but send no Origin/Sec-Fetch headers, which makes Better Auth force its
    // origin check and reject with MISSING_OR_NULL_ORIGIN. They authenticate with
    // bearer tokens, so the cookie is struck for anything that cannot be a browser.
    const headers = c.req.raw.headers;
    const fromBrowser =
      headers.has("origin") || headers.has("referer") ||
      headers.has("sec-fetch-site") || headers.has("sec-fetch-mode") || headers.has("sec-fetch-dest");
    if (fromBrowser || !headers.has("cookie")) return auth.handler(c.req.raw);

    const withoutCookies = new Headers(headers);
    withoutCookies.delete("cookie");
    return auth.handler(new Request(c.req.raw, { headers: withoutCookies }));
  })
  .route("/api/me", currentUserRoute)
  .route("/api/me/playlists", playlistsRoute)
  .route("/api", publicCatalogRoute)
  .route("/api", publicListeningRoute)
  .route("/api", publicMembershipRoute)
  .route("/api", publicExhibitionRoute)
  .route("/api", publicQuizRoute)
  .route("/api/showcase", showcaseRoute)
  .route("/api/me", meListeningRoute)
  .route("/api/me/membership", meMembershipRoute)
  .route("/api/me", meMissionRoute)
  .route("/api/studio", studioCatalogRoute)
  .route("/api/studio", studioQuizRoute)
  .route("/api/studio", exhibitionRoute)
  .route("/api/studio", createStudioContentRoute(mediaStorage))
  .route("/api/studio", createStudioAiAssistRoute())
  .route("/api/studio/media-assets", mediaRoute)
  .route("/api/payments", paymentWebhookRoute)
  .route("/api/admin/membership", adminMembershipRoute)
  .route("/api/admin", adminRoute)
  .route("/api/admin/releases", createReleaseRoutes(releaseService).admin)
  .route("/api/studio/releases", createReleaseRoutes(releaseService).studio)
  .route("/health", healthRoute);

export type AppType = typeof routes;
export default app;
