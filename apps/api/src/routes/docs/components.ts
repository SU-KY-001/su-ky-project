import { ErrorResponseSchema } from "@repo/shared";
import { component } from "./registry";

const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

export const SECURITY_COOKIE = "cookieAuth";
export const SECURITY_BEARER = "bearerAuth";

const errorRef = component("ErrorResponse", ErrorResponseSchema);

export const securitySchemes = {
  [SECURITY_COOKIE]: {
    type: "apiKey",
    in: "cookie",
    name: BETTER_AUTH_SESSION_COOKIE,
    description:
      "Session cookie do Better Auth đặt sau `POST /api/auth/sign-in/email`. Trình duyệt tự gửi; client khác cần `credentials: include`.",
  },
  [SECURITY_BEARER]: {
    type: "http",
    scheme: "bearer",
    description:
      "Session token dạng Bearer (plugin `bearer` của Better Auth). Lấy từ header `set-auth-token` của response đăng nhập.",
  },
} as const;

export const IDEMPOTENCY_KEY_PARAM = "IdempotencyKey";

export const parameters = {
  [IDEMPOTENCY_KEY_PARAM]: {
    name: "Idempotency-Key",
    in: "header",
    required: true,
    description:
      "UUID v4 do client sinh cho mỗi thao tác tạo mới. Gửi lại cùng key và cùng body trong thời hạn lưu sẽ nhận lại đúng kết quả cũ (kèm header `Idempotent-Replayed`) thay vì tạo bản ghi thứ hai.",
    schema: { type: "string", format: "uuid" },
  },
} as const;

const errorContent = (code: string, message: string) => ({
  "application/json": {
    schema: errorRef,
    example: { error_code: code, message },
  },
});

export const RETRY_AFTER_HEADER = {
  "Retry-After": {
    description: "Số giây client nên chờ trước khi thử lại.",
    schema: { type: "integer", minimum: 1 },
  },
} as const;

export const COMMON_RESPONSES = {
  BadRequest: {
    description: "Dữ liệu không hợp lệ (`VALIDATION_ERROR`, `BAD_REQUEST`).",
    content: errorContent("VALIDATION_ERROR", "Invalid request"),
  },
  Unauthorized: {
    description: "Chưa đăng nhập (`AUTH_REQUIRED`).",
    content: errorContent("AUTH_REQUIRED", "Authentication required"),
  },
  Forbidden: {
    description: "Đã đăng nhập nhưng không đủ vai trò (`FORBIDDEN`).",
    content: errorContent("FORBIDDEN", "Insufficient permissions"),
  },
  NotFound: {
    description: "Không tìm thấy hoặc không thuộc quyền truy cập (`NOT_FOUND`).",
    content: errorContent("NOT_FOUND", "Resource not found"),
  },
  Conflict: {
    description: "Xung đột trạng thái (`CONFLICT` hoặc mã nghiệp vụ cụ thể).",
    content: errorContent("CONFLICT", "Request conflicts with current state"),
  },
  Unprocessable: {
    description: "Hợp lệ về cú pháp nhưng vi phạm quy tắc nghiệp vụ (mã lỗi cụ thể trong `error_code`).",
    content: errorContent("EPISODE_NOT_PUBLISHABLE", "Publish checklist is not satisfied"),
  },
  PayloadTooLarge: {
    description: "Body vượt giới hạn 10 MB (`PAYLOAD_TOO_LARGE`).",
    content: errorContent("PAYLOAD_TOO_LARGE", "Request payload exceeds 10MB limit"),
  },
  RateLimited: {
    description: "Vượt hạn mức gọi (`RATE_LIMITED`). Có thể thử lại sau `Retry-After` giây.",
    headers: RETRY_AFTER_HEADER,
    content: errorContent("RATE_LIMITED", "Rate limit exceeded"),
  },
  InternalError: {
    description: "Lỗi máy chủ không lường trước (`INTERNAL_SERVER_ERROR`).",
    content: errorContent("INTERNAL_SERVER_ERROR", "An internal server error occurred"),
  },
  ServiceUnavailable: {
    description: "Dịch vụ phụ thuộc chưa sẵn sàng (`SERVICE_UNAVAILABLE`, `MEDIA_PROVIDER_UNAVAILABLE`).",
    content: errorContent("SERVICE_UNAVAILABLE", "Service temporarily unavailable"),
  },
} as const;

export type CommonResponseName = keyof typeof COMMON_RESPONSES;

export const STATUS_TO_COMMON_RESPONSE: Record<number, CommonResponseName> = {
  400: "BadRequest",
  401: "Unauthorized",
  403: "Forbidden",
  404: "NotFound",
  409: "Conflict",
  413: "PayloadTooLarge",
  422: "Unprocessable",
  429: "RateLimited",
  500: "InternalError",
  503: "ServiceUnavailable",
};

export const errorResponseRef = errorRef;
