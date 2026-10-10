/** Schema self-correction attempts inside a single agent run. */
export const MAX_AGENT_RETRY_COUNT = 1;

export const PI_MODEL_REFRESH_TIMEOUT_MS = 1500;

/** Model used when PI_MODEL is unset, keyed by PI_PROVIDER. */
export const DEFAULT_PI_MODEL_BY_PROVIDER: Record<string, string> = {
  google: "gemini-2.5-flash",
  "opencode-go": "minimax-m3",
};
