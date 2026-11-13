import { piRuntime } from "./pi-runtime";

export { assertAiReady } from "./ai-ready";
export {
  AgentAbortedError,
  AgentProviderError,
  AgentTimeoutError,
  AgentValidationError,
  AiDisabledError,
  AiUnavailableError,
  type ProviderFailureKind,
} from "./errors";
export type { AgentUsage } from "./provider-failure";
export { runStructuredAgent, type AgentRunResult, type StructuredAgentRequest } from "./structured-agent-runner";
export type { ToolResultEvent } from "./tool-hooks";
export { createRunGuard } from "./run-guard";

export const aiEngine = {
  /** True once the lazy runtime init has run and found a model plus API key. */
  isReady: (): boolean => piRuntime.isReady,
  /** Id of the resolved model, or null before init / when none was found. */
  modelId: (): string | null => piRuntime.model?.id ?? null,
};
