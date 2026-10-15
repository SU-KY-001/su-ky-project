import { describe, expect, test } from "bun:test";
import { weeksOverlappingMonth } from "./listeningService";

describe("monthly mission review", () => {
  test("includes every Monday whose week overlaps the selected month", () => {
    expect(weeksOverlappingMonth("2026-10")).toEqual([
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ]);
  });

  test("includes the preceding Monday when a month starts on Sunday", () => {
    expect(weeksOverlappingMonth("2026-02")).toEqual([
      "2026-01-26",
      "2026-02-02",
      "2026-02-09",
      "2026-02-16",
      "2026-02-23",
    ]);
  });

  test("rejects an invalid month value", () => {
    expect(weeksOverlappingMonth("2026")).toEqual([]);
  });
});
