import { describe, expect, it } from "bun:test";
import { estimatedDurationMs, estimatedReadMinutes, scriptWordCount } from "./scriptDuration";

describe("scriptDuration", () => {
  it("counts whitespace-separated words", () => {
    expect(scriptWordCount("  Năm 938,\nNgô Quyền  ")).toBe(4);
    expect(scriptWordCount("   ")).toBe(0);
  });

  it("derives duration from words per minute, not characters", () => {
    const text = Array.from({ length: 300 }, () => "từ").join(" ");
    expect(estimatedDurationMs(text, 150)).toBe(120_000);
    expect(estimatedDurationMs(text, 300)).toBe(60_000);
    expect(estimatedDurationMs("", 150)).toBe(0);
  });

  it("rounds to at least one minute for a non-empty script", () => {
    expect(estimatedReadMinutes("một hai ba", 150)).toBe(1);
    expect(estimatedReadMinutes("", 150)).toBe(0);
    expect(estimatedReadMinutes(Array.from({ length: 450 }, () => "a").join(" "), 150)).toBe(3);
  });
});
