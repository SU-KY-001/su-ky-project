import { expect, test } from "bun:test";
import { defaultListeningGrouping, listeningValueAxis, listeningBuckets } from "./listeningChartModel";

test("chooses grouping by range and screen", () => {
  expect(defaultListeningGrouping(7, true)).toBe("day");
  expect(defaultListeningGrouping(30, false)).toBe("day");
  expect(defaultListeningGrouping(30, true)).toBe("week");
  expect(defaultListeningGrouping(60, false)).toBe("week");
  expect(defaultListeningGrouping(180, true)).toBe("month");
});
test("small counts retain headroom and duration ticks can be fractional", () => {
  expect(listeningValueAxis([1], false).maximum).toBeGreaterThan(1);
  expect(listeningValueAxis([.4], true).maximum).toBeGreaterThanOrEqual(.4);
});
test("keeps missing data separate from an observed zero, clips calendar weeks to report dates", () => {
  const rows = [{ date: "2026-11-16", uniqueListeners: 1, validListens: 2, listeningMs: 60000 }];
  const buckets = listeningBuckets(rows, "week", "2026-11-17", "2026-11-30");
  expect(buckets[0]?.from).toBe("2026-11-17");
  expect(buckets[0]?.to).toBe("2026-11-22");
  expect(buckets[1]?.validListens).toBeNull();
});
