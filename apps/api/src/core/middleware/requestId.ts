declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

import type { MiddlewareHandler } from "hono";

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const incomingId = c.req.header("X-Request-Id");
    const id = incomingId || crypto.randomUUID();
    c.set("requestId", id);
    c.header("X-Request-Id", id);
    await next();
  };
}
