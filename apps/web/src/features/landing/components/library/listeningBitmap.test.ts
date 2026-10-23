import { describe, expect, it } from "bun:test";
import { mergePlayedRanges } from "./listeningBitmap";

function ranges(...values: [number, number][]): TimeRanges {
  return { length: values.length, start: index => values[index]![0], end: index => values[index]![1] };
}

describe("actual listening coverage", () => {
  it("counts the final fractional second so a full listen reaches 100%", () => {
    expect(mergePlayedRanges(new Uint8Array(23), ranges([0, 181.942857]), 181943)).toBe(182);
  });
  it("does not count skipped sections and does not double-count replayed ranges", () => {
    const bits = new Uint8Array(13);
    expect(mergePlayedRanges(bits, ranges([0, 7], [95, 100]), 100000)).toBe(12);
    expect(mergePlayedRanges(bits, ranges([0, 7], [95, 100]), 100000)).toBe(12);
    expect(mergePlayedRanges(bits, ranges([7, 95]), 100000)).toBe(100);
  });
  it("preserves coverage from previous sessions", () => {
    const bits = new Uint8Array(2);
    mergePlayedRanges(bits, ranges([0, 5]), 10000);
    expect(mergePlayedRanges(bits, ranges([5, 10]), 10000)).toBe(10);
  });
});
