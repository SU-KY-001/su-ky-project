import type { MiddlewareHandler } from "hono";
import { logger } from "../logger";

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;
    const reqId = c.get("requestId") ?? "unknown";

    await next();

    const duration = Math.round((performance.now() - start) * 100) / 100;
    const status = c.res.status;

    const meta = {
      reqId,
      method,
      path,
      status,
      latencyMs: duration,
    };

    if (status >= 500) {
      logger.error(meta, "HTTP request failed with server error");
    } else if (status >= 400) {
      logger.warn(meta, "HTTP request warning or client error");
    } else {
      logger.info(meta, "HTTP request completed");
    }
  };
}
