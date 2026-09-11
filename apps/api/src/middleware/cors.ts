import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

export function corsConfig(): MiddlewareHandler {
  const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

  return cors({
    origin: (origin) => {
      if (!origin || allowedOrigin === "*") return allowedOrigin;
      if (origin === allowedOrigin) return allowedOrigin;
      // Allow localhost origins only in non-production environments
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
        return origin;
      }
      return allowedOrigin;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
  });
}
