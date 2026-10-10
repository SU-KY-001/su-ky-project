import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { aiEngine } from "../src/modules/ai-engine";
import { MAX_AGENT_RETRY_COUNT } from "../src/modules/ai-engine/ai-engine.constants";
import { AgentValidationError } from "../src/modules/ai-engine/errors";
import { extractJson, parseWithSchemaRetry } from "../src/modules/ai-engine/schema-retry";

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
