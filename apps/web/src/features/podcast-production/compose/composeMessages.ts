import { isApiError } from "@/lib/apiError";

const HTTP_UNPROCESSABLE = 422;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;
const HTTP_TIMEOUT = 504;

/** True when the user (or closing the dialog) aborted the call: never shown as an error. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Maps a compose API failure (phase-06 "Lỗi hiển thị") to what the moderator should do next. */
export function describeComposeError(error: unknown, fallback: string): string {
  // Decide by code before status: the status of these two is an API detail that may change.
  if (isApiError(error)) {
    if (error.is("HASH_MISMATCH")) return "Đoạn đã đổi, chọn lại rồi viết lại.";
    if (error.is("SCRIPT_TOO_LONG")) return "Độ dài vượt giới hạn kịch bản. Giảm thời lượng hoặc số từ.";
  }
  if (isApiError(error, HTTP_RATE_LIMITED)) {
    return `Bạn dùng AI soạn thảo quá nhiều.${error.retryAfterSeconds ? ` Thử lại sau ${error.retryAfterSeconds} giây.` : " Thử lại sau ít phút."}`;
  }
  if (isApiError(error, HTTP_BAD_GATEWAY)) return "AI chưa viết được, thử đổi chỉ dẫn hoặc thử lại.";
  if (isApiError(error, HTTP_TIMEOUT)) return "AI phản hồi quá lâu, thử lại.";
  if (isApiError(error, HTTP_UNAVAILABLE)) {
    return error.is("AI_DISABLED")
      ? "Trợ lý AI đang tắt. Báo quản trị."
      : "Dịch vụ AI tạm không dùng được, báo quản trị.";
  }
  if (isApiError(error, HTTP_UNPROCESSABLE)) return error.message;
  return error instanceof Error ? error.message : fallback;
}
