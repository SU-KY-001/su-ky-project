import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "@repo/shared";

export class DomainError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}
