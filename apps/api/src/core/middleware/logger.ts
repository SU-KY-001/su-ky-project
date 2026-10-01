import type { MiddlewareHandler } from "hono";

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;
    const reqId = c.get("requestId") ?? "unknown";

    await next();

    const duration = Math.round((performance.now() - start) * 100) / 100;
    const status = c.res.status;

    // Structured logging format
    const logData = {
      timestamp: new Date().toISOString(),
      reqId,
      method,
      path,
      status,
      latencyMs: duration,
    };

    if (status >= 500) {
      console.error(JSON.stringify({ level: "ERROR", ...logData }));
    } else if (status >= 400) {
      console.warn(JSON.stringify({ level: "WARN", ...logData }));
    } else {
      console.log(JSON.stringify({ level: "INFO", ...logData }));
    }
  };
}
