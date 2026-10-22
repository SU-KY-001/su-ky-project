import { DomainError } from "../../../core/errors/domain-error";
import { AgentAbortedError, AgentProviderError, AgentTimeoutError, AgentValidationError } from "../../ai-engine";
import { ComposeBadOutputError } from "../compose/errors";

export interface MappedFailure {
  /** A DomainError for every known failure; anything unexpected is passed through unchanged. */
  error: unknown;
  /** Log label; never contains content. */
  outcome: string;
}

const badOutput = () => new DomainError(502, "AI_BAD_OUTPUT", "AI chưa viết được, thử đổi chỉ dẫn hoặc thử lại");

/** spec-prompts-compose.md section 6: the HTTP error of each way a compose call can fail. */
export function mapComposeFailure(err: unknown, guardSignal: AbortSignal, callerSignal: AbortSignal): MappedFailure {
  if (err instanceof DomainError) return { error: err, outcome: `http_${err.status}` };
  if (err instanceof ComposeBadOutputError) {
    if (err.reason === "NO_VARIANTS") {
      return { error: new DomainError(502, "AI_NO_VARIANTS", "AI chưa viết được bản nào, thử đổi chỉ dẫn"), outcome: "no_variants" };
    }
    return { error: badOutput(), outcome: "bad_output" };
  }
  if (err instanceof AgentValidationError) return { error: badOutput(), outcome: "schema_invalid" };
  // The call deadline fires the guard without the caller aborting; PI_RUN_TIMEOUT_MS surfaces as AgentTimeoutError.
  if (err instanceof AgentTimeoutError || (guardSignal.aborted && !callerSignal.aborted)) {
    return { error: new DomainError(504, "AI_TIMEOUT", "AI phản hồi quá lâu, thử lại"), outcome: "timeout" };
  }
  if (err instanceof AgentAbortedError) return { error: new DomainError(408, "HTTP_ERROR", "Yêu cầu đã bị hủy"), outcome: "aborted" };
  if (err instanceof AgentProviderError) {
    const outcome = `provider_${err.kind.toLowerCase()}`;
    switch (err.kind) {
      case "AUTH":
        return { error: new DomainError(503, "AI_PROVIDER_AUTH", "Dịch vụ AI từ chối khóa truy cập, báo quản trị"), outcome };
      case "QUOTA":
        return { error: new DomainError(503, "AI_PROVIDER_QUOTA", "Dịch vụ AI hết hạn mức, báo quản trị"), outcome };
      case "RATE_LIMIT":
      case "UNAVAILABLE":
        return { error: new DomainError(503, "AI_UNAVAILABLE", "Dịch vụ AI tạm không dùng được, thử lại sau"), outcome };
      default:
        return { error: badOutput(), outcome };
    }
  }
  return { error: err, outcome: "error" };
}
