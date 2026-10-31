import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode, ErrorResponse } from "@repo/shared";

export function renderError(
  c: Context,
  status: ContentfulStatusCode,
  errorCode: ErrorCode,
  message: string,
  details?: ErrorResponse["details"]
): Response {
  return c.json({ error_code: errorCode, message, ...(details?.length ? { details } : {}) }, status);
}
