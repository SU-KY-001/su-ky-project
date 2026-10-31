import { Prisma } from "@repo/db";
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
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

// Hint for clients when the database is unreachable or its pool is exhausted.
const DB_UNAVAILABLE_RETRY_AFTER_SECONDS = 5;

type MappedError = { status: ContentfulStatusCode; code: ErrorCode; message: string };

const DB_UNAVAILABLE: MappedError = {
  status: 503,
  code: "SERVICE_UNAVAILABLE",
  message: "Cơ sở dữ liệu tạm thời không phản hồi. Thử lại sau ít phút.",
};

// Messages never include Prisma's own text: it names tables and columns.
const PRISMA_REQUEST_ERRORS: Record<string, MappedError> = {
  P2002: { status: 409, code: "CONFLICT", message: "Dữ liệu bị trùng với một bản ghi đã có." },
  P2003: { status: 409, code: "CONFLICT", message: "Dữ liệu đang được tham chiếu hoặc tham chiếu tới bản ghi không tồn tại." },
  P2025: { status: 404, code: "NOT_FOUND", message: "Không tìm thấy bản ghi." },
  P2034: { status: 409, code: "WRITE_CONFLICT", message: "Thao tác xung đột với một thao tác khác. Thử lại." },
  P1001: DB_UNAVAILABLE,
  P1002: DB_UNAVAILABLE,
  P1008: DB_UNAVAILABLE,
  P1017: DB_UNAVAILABLE,
  P2024: DB_UNAVAILABLE,
};

function mapPrismaError(error: unknown): MappedError | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    // Only unreachable-database codes are transient; bad credentials (P1000) or a broken config will not heal on retry.
    return error.errorCode ? (PRISMA_REQUEST_ERRORS[error.errorCode] ?? null) : null;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) return PRISMA_REQUEST_ERRORS[error.code] ?? null;
  return null;
}

export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof RequestValidationError) {
    return renderError(c, 400, "VALIDATION_ERROR", error.message, error.details);
  }
  if (error instanceof DomainError) {
    return renderError(c, error.status, error.code, error.message);
  }
  if (error instanceof HTTPException) {
    const status = error.status as ContentfulStatusCode;
    return renderError(c, status, HTTP_ERROR_CODES[status] ?? "HTTP_ERROR", error.message);
  }
  const mapped = mapPrismaError(error);
  if (mapped) {
    logger[mapped.status >= 500 ? "error" : "warn"](
      {
        err: error,
        reqId: c.get("requestId") ?? "unknown",
        userId: c.get("session")?.user.id ?? null,
        method: c.req.method,
        path: c.req.path,
      },
      "Database error mapped to API error"
    );
    if (mapped === DB_UNAVAILABLE) c.header("Retry-After", String(DB_UNAVAILABLE_RETRY_AFTER_SECONDS));
    return renderError(c, mapped.status, mapped.code, mapped.message);
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
  return renderError(c, 500, "INTERNAL_SERVER_ERROR", "An internal server error occurred");
};
