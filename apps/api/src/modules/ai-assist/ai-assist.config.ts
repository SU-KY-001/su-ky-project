import { env } from "../../core/env";

export interface AiAssistConfig {
  /** Deadline for one whole check (all batches). */
  checkTimeoutMs: number;
  blockConcurrency: number;
  maxConcurrentPerUser: number;
  globalModelConcurrency: number;
  batchBlocks: number;
  batchMaxChars: number;
  maxToolCalls: number;
  runHeartbeatMs: number;
  staleAfterMs: number;
}

export function readAiAssistConfig(): AiAssistConfig {
  return {
    checkTimeoutMs: env.AI_ASSIST_TIMEOUT_MS,
    blockConcurrency: env.AI_ASSIST_BLOCK_CONCURRENCY,
    maxConcurrentPerUser: env.AI_ASSIST_MAX_CONCURRENT_PER_USER,
    globalModelConcurrency: env.AI_ASSIST_GLOBAL_MODEL_CONCURRENCY,
    batchBlocks: env.AI_ASSIST_BATCH_BLOCKS,
    batchMaxChars: env.AI_ASSIST_BATCH_MAX_CHARS,
    maxToolCalls: env.AI_ASSIST_MAX_TOOL_CALLS,
    runHeartbeatMs: env.AI_ASSIST_RUN_HEARTBEAT_MS,
    staleAfterMs: env.AI_ASSIST_STALE_AFTER_MS,
  };
}
