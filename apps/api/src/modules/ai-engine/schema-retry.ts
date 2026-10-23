import type { z } from "zod";
import { MAX_AGENT_RETRY_COUNT } from "./ai-engine.constants";
import { AgentValidationError } from "./errors";
import { buildSchemaRetryPrompt } from "./schema-retry.prompt";

export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export interface SchemaRetryHooks {
  /** Sends a correction prompt to the model and returns its new raw reply. */
  reprompt: (prompt: string) => Promise<string>;
  onInvalid?: (info: { attempt: number; rawSnippet: string; issues?: unknown }) => void;
}

/**
 * Why: the backend owns schema enforcement; the LLM harness only returns text.
 * Parse + validate, re-prompt with the validation errors up to MAX_AGENT_RETRY_COUNT times, then fail.
 */
export async function parseWithSchemaRetry<T>(
  raw: string,
  schema: z.ZodType<T>,
  jsonSchemaStr: string,
  hooks: SchemaRetryHooks
): Promise<{ data: T; attempt: number; raw: string }> {
  let current = raw;
  for (let attempt = 0; attempt <= MAX_AGENT_RETRY_COUNT; attempt++) {
    let errors: string;
    let failure: AgentValidationError;
    try {
      const validated = schema.safeParse(JSON.parse(extractJson(current)));
      if (validated.success) return { data: validated.data, attempt, raw: current };
      errors = JSON.stringify(validated.error.issues);
      failure = new AgentValidationError("Agent output failed schema validation", errors);
      hooks.onInvalid?.({ attempt, rawSnippet: current.slice(0, 500), issues: validated.error.issues });
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      errors = "Response is not valid JSON";
      failure = new AgentValidationError("Agent returned invalid JSON", errors);
      hooks.onInvalid?.({ attempt, rawSnippet: current.slice(0, 500) });
    }
    if (attempt >= MAX_AGENT_RETRY_COUNT) throw failure;
    current = await hooks.reprompt(buildSchemaRetryPrompt(errors, jsonSchemaStr));
  }
  throw new AgentValidationError("Agent failed after retry", "No valid output produced");
}
