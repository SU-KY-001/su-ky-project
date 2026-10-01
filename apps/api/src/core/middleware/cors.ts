import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

export function corsConfig(): MiddlewareHandler {
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes("*")) return allowedOrigins[0] ?? "*";
      if (allowedOrigins.includes(origin)) return origin;
      // Allow localhost origins only in non-production environments
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
        return origin;
      }
      return allowedOrigins[0] ?? "";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
  });
}
