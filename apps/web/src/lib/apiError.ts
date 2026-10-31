import { ErrorDetailSchema, type ErrorCode, type ErrorResponse } from "@repo/shared";
import { z } from "zod";

const ErrorBodySchema = z.object({
  error_code: z.string().optional(),
  // Better Auth routes use `code` instead of `error_code`.
  code: z.string().optional(),
  message: z.string().optional(),
  // A malformed `details` must not discard the code and message.
  details: z.array(ErrorDetailSchema).optional().catch(undefined),
});

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | null,
    message: string,
    readonly requestId: string | null,
    readonly retryAfterSeconds: number | null,
    /** Which request fields failed validation (`VALIDATION_ERROR`); empty otherwise. */
    readonly details: NonNullable<ErrorResponse["details"]> = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(response: Pick<Response,"json"|"status"|"headers">): Promise<ApiError> {
    const body = ErrorBodySchema.safeParse(await response.json().catch(() => null));
    const parsed = body.success ? body.data : {};
    const retryAfter = Number(response.headers.get("Retry-After"));
    return new ApiError(
      response.status,
      parsed.error_code ?? parsed.code ?? null,
      parsed.message ?? `Yêu cầu thất bại (${response.status})`,
      response.headers.get("X-Request-Id"),
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
      parsed.details,
    );
  }

  get isRetryable(): boolean {
    return this.status === HTTP_TOO_MANY_REQUESTS || this.status >= HTTP_SERVER_ERROR_MIN;
  }

  /** Typed code check: a misspelled or renamed API code fails `tsc` instead of silently never matching. */
  is(code: ErrorCode): boolean {
    return this.errorCode === code;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** Network failure (no response) or 429/5xx: the same Idempotency-Key may be sent again. */
export function canReuseIdempotencyKey(error: unknown): boolean {
  return error instanceof ApiError ? error.isRetryable : true;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
}

export function errorRequestId(error: unknown): string | null {
  return error instanceof ApiError ? error.requestId : null;
}
