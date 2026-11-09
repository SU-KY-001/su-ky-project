import { expect, test } from "bun:test";
import { podcastRankingWindow } from "../src/modules/listening/application/podcast-ranking-window";

test("week starts Monday00 Vietnam, including Sunday UTC boundary", () => {
  expect(podcastRankingWindow("week", new Date("2026-11-08T16:59:59Z"))).toEqual({ start: new Date("2026-11-01T17:00:00Z"), end: new Date("2026-11-08T17:00:00Z") });
  expect(podcastRankingWindow("week", new Date("2026-11-08T17:00:00Z"))).toEqual({ start: new Date("2026-11-08T17:00:00Z"), end: new Date("2026-11-15T17:00:00Z") });
});
test("month uses calendar Vietnam boundaries including leap year and year rollover", () => {
  expect(podcastRankingWindow("month", new Date("2026-12-31T17:00:00Z"))).toEqual({ start: new Date("2026-12-31T17:00:00Z"), end: new Date("2027-01-31T17:00:00Z") });
  expect(podcastRankingWindow("month", new Date("2024-02-20T00:00:00Z"))).toEqual({ start: new Date("2024-01-31T17:00:00Z"), end: new Date("2024-02-29T17:00:00Z") });
});
