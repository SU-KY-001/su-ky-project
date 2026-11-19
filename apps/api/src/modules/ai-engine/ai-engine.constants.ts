/** Schema self-correction attempts inside a single agent run. */
export const MAX_AGENT_RETRY_COUNT = 1;

export const PI_MODEL_REFRESH_TIMEOUT_MS = 1500;

/** Model used when PI_MODEL is unset, keyed by PI_PROVIDER. */
export const DEFAULT_PI_MODEL_BY_PROVIDER: Record<string, string> = {
  google: "gemini-3.5-flash-lite",
  "opencode-go": "minimax-m3",
  openai: "gpt-6-luna",
  commandcode: "deepseek/deepseek-v4.1-flash",
};

/** CommandCode is not part of the bundled model catalog, so pi-runtime registers it as an OpenAI-compatible endpoint. */
export const COMMAND_CODE_PROVIDER = "commandcode";
/** Catalog limits of the CommandCode chat models; they describe the endpoint, nothing in the request path depends on them. */
export const COMMAND_CODE_CONTEXT_WINDOW = 262144;
export const COMMAND_CODE_MAX_TOKENS = 32768;
