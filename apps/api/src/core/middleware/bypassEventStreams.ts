import type { MiddlewareHandler } from "hono";

const EVENT_STREAM_PATH_SUFFIX = "/events/stream";

/**
 * Skips a response-buffering middleware (e.g. etag, which digests the whole body)
 * for SSE routes: their body never ends, so the middleware would hang the stream.
 */
export function bypassEventStreams(middleware: MiddlewareHandler): MiddlewareHandler {
  return (c, next) =>
    c.req.path.endsWith(EVENT_STREAM_PATH_SUFFIX) ? next() : middleware(c, next);
}
