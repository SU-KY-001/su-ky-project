import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "@repo/shared";
import { DomainError } from "../errors/domain-error";
import { renderError } from "../errors/error-response";
import { RequestValidationError } from "../errors/request-validation-error";
import { logger } from "../logger";

const HTTP_ERROR_CODES: Partial<Record<number, ErrorCode>> = {
  400: "BAD_REQUEST",
  401: "AUTH_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  503: "SERVICE_UNAVAILABLE",
};

export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof RequestValidationError) {
    return renderError(c, 400, "VALIDATION_ERROR", error.message);
  }
  if (error instanceof DomainError) {
    return renderError(c, error.status, error.code, error.message);
  }
  if (error instanceof HTTPException) {
    const status = error.status as ContentfulStatusCode;
    return renderError(c, status, HTTP_ERROR_CODES[status] ?? "HTTP_ERROR", error.message);
  }

  logger.error(
    {
      err: error,
      reqId: c.get("requestId") ?? "unknown",
      userId: c.get("session")?.user.id ?? null,
      method: c.req.method,
      path: c.req.path,
    },
    "Unhandled request exception"
  );
  const message =
    process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : error.message || "An unexpected error occurred";
  return renderError(c, 500, "INTERNAL_SERVER_ERROR", message);
};
