import { AgentProviderError, type ProviderFailureKind } from "./errors";

const QUOTA_PATTERN = /quota|billing|usage limit|out of budget|insufficient/i;
const RATE_LIMIT_PATTERN = /rate.?limit|too many requests|resource.?exhausted/i;
const AUTH_PATTERN = /api key|unauthor|permission|forbidden|subscription|credential/i;
const BLOCKED_PATTERN = /safety|blocked|content.?filter|prohibited/i;
const UNAVAILABLE_PATTERN =
  /overloaded|unavailable|server.?error|internal.?error|timeout|timed out|network|connection|fetch failed|socket hang up|ENOTFOUND|EAI_AGAIN/i;
const STATUS_PATTERN = /\b([45]\d\d)\b/;

const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;
const AUTH_STATUSES = new Set([401, 403]);

function failure(kind: ProviderFailureKind, retryable: boolean, status: number | undefined, errorMessage: string) {
  return new AgentProviderError({ kind, retryable, status, message: `Provider ${kind}${status ? ` (${status})` : ""}: ${errorMessage}` });
}

/**
 * Why: Pi reports provider failures as an assistant message with `stopReason: "error"` and free text.
 * Only 408/429/5xx/network failures are retryable (Google's guidance); 400/401/402/403 never are.
 * Pure so the table is testable without a model.
 */
export function classifyProviderFailure(stopReason: string | undefined, errorMessage: string | undefined): AgentProviderError {
  const text = errorMessage ?? "";
  if (stopReason === "length") return failure("TRUNCATED", false, undefined, text || "output hit the length limit");
  const status = Number(STATUS_PATTERN.exec(text)?.[1]) || undefined;

  if (QUOTA_PATTERN.test(text)) return failure("QUOTA", false, status, text);
  if (status !== undefined && AUTH_STATUSES.has(status)) return failure("AUTH", false, status, text);
  if (status === HTTP_TOO_MANY_REQUESTS || RATE_LIMIT_PATTERN.test(text)) return failure("RATE_LIMIT", true, status, text);
  if (BLOCKED_PATTERN.test(text)) return failure("BLOCKED", false, status, text);
  if (AUTH_PATTERN.test(text)) return failure("AUTH", false, status, text);
  if (status === HTTP_REQUEST_TIMEOUT || (status !== undefined && status >= HTTP_SERVER_ERROR_MIN) || UNAVAILABLE_PATTERN.test(text)) {
    return failure("UNAVAILABLE", true, status, text);
  }
  return failure("OTHER", false, status, text);
}

export interface AgentUsage {
  input: number;
  output: number;
  total: number;
}

/** Reads one property off an untrusted value without asserting its shape. */
export function readField(source: unknown, key: string): unknown {
  return source && typeof source === "object" ? Reflect.get(source, key) : undefined;
}

function readNumber(source: unknown, key: string): number {
  const value = readField(source, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Sums token usage over every assistant message of a session (includes the schema-correction turn). */
export function sumUsage(messages: readonly unknown[]): AgentUsage {
  let input = 0;
  let output = 0;
  for (const message of messages) {
    if (readField(message, "role") !== "assistant") continue;
    const usage = readField(message, "usage");
    input += readNumber(usage, "input");
    output += readNumber(usage, "output");
  }
  return { input, output, total: input + output };
}
