import { describe, expect, it, vi } from "bun:test";
import { z } from "zod";
import { aiEngine } from "../src/modules/ai-engine";
import { MAX_AGENT_RETRY_COUNT } from "../src/modules/ai-engine/ai-engine.constants";
import { AgentValidationError } from "../src/modules/ai-engine/errors";
import { extractJson, parseWithSchemaRetry } from "../src/modules/ai-engine/schema-retry";
import { summarizeEvent } from "../src/modules/ai-engine/pi-tracer";
import { classifyProviderFailure, sumUsage } from "../src/modules/ai-engine/provider-failure";
import { createRunGuard } from "../src/modules/ai-engine/run-guard";
import { AgentAbortedError, AgentTimeoutError } from "../src/modules/ai-engine/errors";

const Schema = z.object({ title: z.string(), count: z.number().int() });
const JSON_SCHEMA = '{"type":"object"}';

describe("ai-engine", () => {
  it("does not initialise the runtime on import", () => {
    expect(aiEngine.isReady()).toBe(false);
  });

  describe("extractJson", () => {
    it("unwraps fenced blocks and surrounding prose", () => {
      expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
      expect(extractJson('Here you go: {"a":1} done')).toBe('{"a":1}');
    });
  });

  describe("parseWithSchemaRetry", () => {
    it("returns valid output without re-prompting", async () => {
      let prompts = 0;
      const result = await parseWithSchemaRetry('{"title":"x","count":2}', Schema, JSON_SCHEMA, {
        reprompt: async () => {
          prompts += 1;
          return "";
        },
      });
      expect(result.data).toEqual({ title: "x", count: 2 });
      expect(result.attempt).toBe(0);
      expect(prompts).toBe(0);
    });

    it("re-prompts with the validation errors and accepts the corrected reply", async () => {
      const seen: string[] = [];
      const result = await parseWithSchemaRetry('{"title":"x","count":"two"}', Schema, JSON_SCHEMA, {
        reprompt: async (prompt) => {
          seen.push(prompt);
          return '{"title":"x","count":2}';
        },
      });
      expect(result.data.count).toBe(2);
      expect(result.attempt).toBe(1);
      expect(seen).toHaveLength(1);
      expect(seen[0]).toContain("count");
      expect(seen[0]).toContain(JSON_SCHEMA);
    });

    it("re-prompts when the reply is not JSON", async () => {
      const result = await parseWithSchemaRetry("not json", Schema, JSON_SCHEMA, {
        reprompt: async (prompt) => {
          expect(prompt).toContain("Response is not valid JSON");
          return '{"title":"x","count":1}';
        },
      });
      expect(result.data.title).toBe("x");
    });

    it("throws AgentValidationError once retries are exhausted", async () => {
      let prompts = 0;
      const failure = parseWithSchemaRetry('{"title":1}', Schema, JSON_SCHEMA, {
        reprompt: async () => {
          prompts += 1;
          return '{"title":1}';
        },
      });
      await expect(failure).rejects.toBeInstanceOf(AgentValidationError);
      expect(prompts).toBe(MAX_AGENT_RETRY_COUNT);
    });

    it("surfaces invalid JSON as AgentValidationError after the last retry", async () => {
      const failure = parseWithSchemaRetry("nope", Schema, JSON_SCHEMA, { reprompt: async () => "still nope" });
      await expect(failure).rejects.toMatchObject({ name: "AgentValidationError", errors: "Response is not valid JSON" });
    });
  });
});

describe("classifyProviderFailure", () => {
  const cases: Array<[string, string | undefined, string, string, boolean]> = [
    ["error", "403 An active OpenCode Go subscription is required", "AUTH", "403", false],
    ["error", "401 API key not valid", "AUTH", "401", false],
    ["error", "429 RESOURCE_EXHAUSTED: too many requests", "RATE_LIMIT", "429", true],
    ["error", "429 You exceeded your current quota, check billing", "QUOTA", "429", false],
    ["error", "503 The model is overloaded", "UNAVAILABLE", "503", true],
    ["error", "request timed out", "UNAVAILABLE", "", true],
    ["error", "408 Request Timeout", "UNAVAILABLE", "408", true],
    ["error", "Response blocked by safety filter", "BLOCKED", "", false],
    ["error", "400 Bad Request: invalid argument", "OTHER", "400", false],
    ["error", "402 Payment Required", "OTHER", "402", false],
    ["error", undefined, "OTHER", "", false],
    ["length", undefined, "TRUNCATED", "", false],
  ];
  it.each(cases)("%s %s -> %s", (stopReason, message, kind, status, retryable) => {
    const failure = classifyProviderFailure(stopReason, message);
    expect(failure.kind).toBe(kind as typeof failure.kind);
    expect(failure.status).toBe(status ? Number(status) : undefined);
    expect(failure.retryable).toBe(retryable);
  });
});

describe("sumUsage", () => {
  it("adds every assistant message, including the correction turn, and ignores the rest", () => {
    const messages = [
      { role: "user", content: "x", usage: { input: 999, output: 999 } },
      { role: "assistant", usage: { input: 10, output: 4 } },
      { role: "assistant", usage: { input: 20, output: 6 } },
      { role: "assistant" },
    ];
    expect(sumUsage(messages)).toEqual({ input: 30, output: 10, total: 40 });
  });
});

describe("summarizeEvent redaction", () => {
  const message = { role: "assistant", content: [{ type: "text", text: "TOP-SECRET-SCRIPT" }] };
  const events = [
    { type: "message_end", message },
    { type: "message_update", message, assistantMessageEvent: { type: "text_delta", delta: "TOP-SECRET-SCRIPT" } },
  ];
  it("never carries message text by default", () => {
    for (const event of events) {
      const summary = summarizeEvent(event as never);
      expect(JSON.stringify(summary)).not.toContain("TOP-SECRET");
    }
  });
  it("carries text only when redaction is switched off", () => {
    expect(JSON.stringify(summarizeEvent(events[0] as never, false))).toContain("TOP-SECRET");
  });
});

describe("createRunGuard", () => {
  // Stands in for session.prompt() stuck in an endless tool loop or a hung tool.
  const neverSettles = new Promise<never>(() => undefined);

  it("rejects a run that never terminates once the deadline passes, and aborts the session signal", async () => {
    vi.useFakeTimers();
    try {
      const guard = createRunGuard(undefined, 30);
      const outcome = Promise.race([neverSettles, guard.expired]);
      vi.advanceTimersByTime(30);
      await expect(outcome).rejects.toBeInstanceOf(AgentTimeoutError);
      expect(guard.signal.aborted).toBe(true);
      guard.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects with AgentAbortedError when the caller aborts, before the deadline", async () => {
    const caller = new AbortController();
    const guard = createRunGuard(caller.signal, 60_000);
    const outcome = Promise.race([neverSettles, guard.expired]);
    caller.abort();
    await expect(outcome).rejects.toBeInstanceOf(AgentAbortedError);
    expect(guard.signal.aborted).toBe(true);
    guard.dispose();
  });

  it("is already expired when the caller signal was aborted up front", async () => {
    const caller = new AbortController();
    caller.abort();
    const guard = createRunGuard(caller.signal, 60_000);
    expect(guard.signal.aborted).toBe(true);
    await expect(guard.expired).rejects.toBeInstanceOf(AgentAbortedError);
    guard.dispose();
  });

  it("does not fire after dispose", () => {
    vi.useFakeTimers();
    try {
      const guard = createRunGuard(undefined, 20);
      guard.dispose();
      vi.advanceTimersByTime(60);
      expect(guard.signal.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
