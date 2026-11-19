import { env } from "../../../core/env";

export interface ComposeConfig {
  /** Deadline of one synchronous compose call, queue wait included. */
  callTimeoutMs: number;
  /** Upper bound of `count` for rewrite (the schema ceiling is REWRITE_MAX_VARIANTS). */
  maxVariants: number;
  /** Total excerpt characters of series sources put in one prompt. */
  maxSourceChars: number;
  maxConcurrentPerUser: number;
}

export function readComposeConfig(): ComposeConfig {
  return {
    callTimeoutMs: env.AI_ASSIST_CALL_TIMEOUT_MS,
    maxVariants: env.AI_REWRITE_MAX_VARIANTS,
    maxSourceChars: env.AI_ASSIST_MAX_SOURCE_CHARS,
    maxConcurrentPerUser: env.AI_ASSIST_MAX_CONCURRENT_PER_USER,
  };
}
