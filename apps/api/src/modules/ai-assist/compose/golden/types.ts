import type { ZodType } from "zod";

/**
 * One golden case (spec-prompts-compose.md section 8). Offline: `recorded` (a deliberately flawed model output) goes
 * through `validate` and the result must satisfy `invariants`. Live (`LIVE_LLM=1`): the real model answers
 * `userPrompt`, then the same `validate` + `invariants` run. No text matching against a fixed answer.
 */
export interface GoldenCase<TRaw, TResult> {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<TRaw>;
  recorded: TRaw;
  validate: (raw: TRaw) => TResult;
  /** Violated invariants; empty = pass. */
  invariants: (result: TResult) => string[];
  /** Invariants over the prompt itself (what was sent), checked offline only. */
  promptChecks?: (userPrompt: string) => string[];
}

/** Collects the names of the failed checks. */
export const failed = (checks: Record<string, boolean>): string[] =>
  Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
