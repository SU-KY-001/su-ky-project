import { describe, expect, it } from "bun:test";
import { QuizGenerationService, type QuizGenerationDeps } from "../src/modules/ai-assist/quiz/quiz-generation.service";
import { ModelGate } from "../src/modules/ai-assist/model-gate";

const text = "Chiến dịch kéo dài 56 ngày đêm. ".repeat(20);
const modelQuestion = { text: "Chiến dịch kéo dài bao nhiêu ngày đêm?", options: ["36 ngày", "46 ngày", "56 ngày", "66 ngày"], correctIndex: 2, explanation: "Kịch bản ghi rõ chiến dịch kéo dài 56 ngày đêm.", quote: "Chiến dịch kéo dài 56 ngày đêm." };
const input = { count: 1, scriptHash: "v1", exclude: [] };
const signal = new AbortController().signal;
function deps(overrides: Partial<QuizGenerationDeps> = {}): QuizGenerationDeps {
  return {
    loadScript: async () => ({ text, hash: "v1" }), assertReady: async () => {},
    gate: new ModelGate(1), timeoutMs: 1000, maxConcurrentPerUser: 1,
    runAgent: async request => ({ data: request.schema.parse({ questions: [modelQuestion] }), usage: { input: 1, output: 1, total: 2 }, model: "test", durationMs: 1, attempts: 1 }),
    ...overrides,
  };
}
describe("script quiz generation service", () => {
  it("accepts a saved draft script and records its source hash", async () => {
    const result = await new QuizGenerationService(deps()).generate("user", "episode", input, signal);
    expect(result.questions[0].evidence).toEqual({ quote: modelQuestion.quote, scriptHash: "v1" });
    expect(result.questions[0].correctIndex).toBe(2);
  });
  it("does not call the model without a script or on stale input", async () => {
    let calls = 0;
    const dependencies = deps({ assertReady: async () => { calls++; } });
    await expect(new QuizGenerationService({ ...dependencies, loadScript: async () => null }).generate("u", "e", input, signal)).rejects.toThrow("chưa có kịch bản");
    await expect(new QuizGenerationService(dependencies).generate("u", "e", { ...input, scriptHash: "old" }, signal)).rejects.toThrow("vừa thay đổi");
    expect(calls).toBe(0);
  });
  it("rejects results if the script changes during generation", async () => {
    let reads = 0;
    const service = new QuizGenerationService(deps({ loadScript: async () => ({ text, hash: ++reads === 1 ? "v1" : "v2" }) }));
    await expect(service.generate("u", "e", input, signal)).rejects.toThrow("trong lúc tạo");
  });
  it("propagates ownership failures before consulting the model", async () => {
    const service = new QuizGenerationService(deps({ loadScript: async () => { throw new Error("not owner"); } }));
    await expect(service.generate("u", "e", input, signal)).rejects.toThrow("not owner");
  });
  it("bounds a model call even when the provider ignores abort", async () => {
    const service = new QuizGenerationService(deps({ timeoutMs: 10, runAgent: () => new Promise(() => {}) }));
    const result = await Promise.race([
      service.generate("u", "e", input, signal).catch((error: Error) => error.message),
      new Promise<string>(resolve => setTimeout(() => resolve("still running"), 80)),
    ]);
    expect(result).toContain("quá lâu");
  });
});
