import { piRuntime } from "./pi-runtime";

export { runStructuredAgent, type StructuredAgentRequest } from "./structured-agent-runner";

export const aiEngine = {
  /** True once the lazy runtime init has run and found a model plus API key. */
  isReady: (): boolean => piRuntime.isReady,
};
