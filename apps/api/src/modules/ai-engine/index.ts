import { piRuntime } from "./pi-runtime";

export { assertAiReady } from "./ai-ready";
export {
  AgentAbortedError,
  AgentProviderError,
  AgentValidationError,
  AiDisabledError,
  AiUnavailableError,
  type ProviderFailureKind,
} from "./errors";
export type { AgentUsage } from "./provider-failure";
export { runStructuredAgent, type AgentRunResult, type StructuredAgentRequest } from "./structured-agent-runner";

export const aiEngine = {
  /** True once the lazy runtime init has run and found a model plus API key. */
  isReady: (): boolean => piRuntime.isReady,
};
