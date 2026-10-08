import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { logger } from "../logger";

export const errorHandler: ErrorHandler = (err, c) => {
  const reqId = c.get("requestId") ?? "unknown";

  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request payload failed validation schema",
          details: err.flatten(),
        },
        meta: {
          requestId: reqId,
          timestamp: new Date().toISOString(),
        },
      },
      400
    );
  }

  if (err instanceof HTTPException) {
    const status = err.status;
    const code =
      status === 404
        ? "NOT_FOUND"
        : status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : status === 400
              ? "BAD_REQUEST"
              : status === 409
                ? "CONFLICT"
                : status === 503
                  ? "SERVICE_UNAVAILABLE"
                  : "HTTP_ERROR";

    return c.json(
      {
        success: false,
        error: {
          code,
          message: err.message || "HTTP exception occurred",
        },
        meta: {
          requestId: reqId,
          timestamp: new Date().toISOString(),
        },
      },
      status
    );
  }

  logger.error({ err, reqId }, `[${reqId}] Unhandled exception: ${err.message || String(err)}`);

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "An internal server error occurred"
            : err.message || "An unexpected error occurred",
      },
      meta: {
        requestId: reqId,
        timestamp: new Date().toISOString(),
      },
    },
    500
  );
};
