import type { StepType } from "@repo/shared";

/** pg-boss queue name per agent step (one worker per step type). */
export const WORKFLOW_QUEUES: Record<StepType, string> = {
  RESEARCHER: "agent.research-consultation",
  SOURCE_EVALUATOR: "agent.evaluate-sources",
  FACT_EXTRACTOR: "agent.extract-facts",
  STORY_PLANNER: "agent.plan-story",
  SCRIPT_WRITER: "agent.write-script",
  ORALIZER: "agent.oralize-script",
  FACT_CHECKER: "agent.check-facts",
};

/** Schema/lint self-correction attempts inside a single agent run. */
export const MAX_AGENT_RETRY_COUNT = 1;

/** pg-boss delivery retries for transient (non-content) failures. */
export const MAX_QUEUE_RETRY_COUNT = 3;

export const PI_MODEL_REFRESH_TIMEOUT_MS = 1500;

/** Model used when PI_MODEL is unset, keyed by PI_PROVIDER. */
export const DEFAULT_PI_MODEL_BY_PROVIDER: Record<string, string> = {
  google: "gemini-2.5-flash",
  "opencode-go": "minimax-m3",
};

export const SSE_POLL_INTERVAL_MS = 1000;
/** Must stay below Bun.serve idleTimeout (10s default) or quiet streams get dropped before the first ping. */
export const SSE_HEARTBEAT_MS = 8000;
export const SSE_BATCH_LIMIT = 200;
