/** Agent output was invalid after the self-correction retries: a content error, not a transient one. */
export class AgentValidationError extends Error {
  readonly errors: string;
  constructor(message: string, errors: string) {
    super(message);
    this.name = "AgentValidationError";
    this.errors = errors;
  }
}

export type ProviderFailureKind =
  | "AUTH"
  | "QUOTA"
  | "RATE_LIMIT"
  | "UNAVAILABLE"
  | "BLOCKED"
  | "TRUNCATED"
  | "OTHER";

/** The model provider failed (not the model's content). `retryable` tells the caller if a later run may succeed. */
export class AgentProviderError extends Error {
  readonly kind: ProviderFailureKind;
  readonly status?: number;
  readonly retryable: boolean;
  constructor(info: { kind: ProviderFailureKind; status?: number; retryable: boolean; message: string }) {
    super(info.message);
    this.name = "AgentProviderError";
    this.kind = info.kind;
    this.status = info.status;
    this.retryable = info.retryable;
  }
}

/** The caller's AbortSignal fired. Deliberately not an AgentProviderError: nothing is wrong with the provider. */
export class AgentAbortedError extends Error {
  constructor() {
    super("Agent run aborted");
    this.name = "AgentAbortedError";
  }
}

/** The whole run exceeded PI_RUN_TIMEOUT_MS (tool loop or hung tool). Retryable by a later run. */
export class AgentTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Agent run exceeded ${timeoutMs}ms`);
    this.name = "AgentTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/** No usable model/credential. Map to 503 AI_UNAVAILABLE. */
export class AiUnavailableError extends Error {
  constructor() {
    super("AI is not configured");
    this.name = "AiUnavailableError";
  }
}

/** Emergency switch `ai_assist.enabled` is off. Map to 503 AI_DISABLED. */
export class AiDisabledError extends Error {
  constructor() {
    super("AI assistant is disabled");
    this.name = "AiDisabledError";
  }
}
