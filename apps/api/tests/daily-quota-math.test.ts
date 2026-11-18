import { describe, expect, it } from "bun:test";
import { nextResetAt, playDate } from "../src/modules/listening/application/daily-quota";

describe("Vietnam play day", () => {
  it("keeps 23:59 VN in the same day as 00:00 VN", () => {
    const midnight = new Date("2026-11-17T00:00:00+07:00");
    const beforeMidnight = new Date("2026-11-17T23:59:59+07:00");
    expect(playDate(midnight).toISOString()).toBe("2026-11-17T00:00:00.000Z");
    expect(playDate(beforeMidnight).toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });

  it("rolls over at Vietnam midnight, not UTC midnight", () => {
    // 17:00 UTC = 00:00 next day in Vietnam.
    expect(playDate(new Date("2026-11-17T16:59:59Z")).toISOString()).toBe("2026-11-17T00:00:00.000Z");
    expect(playDate(new Date("2026-11-17T17:00:00Z")).toISOString()).toBe("2026-11-18T00:00:00.000Z");
  });

  it("resets at the next Vietnam midnight", () => {
    expect(nextResetAt(new Date("2026-11-17T00:00:00+07:00")).toISOString()).toBe("2026-11-17T17:00:00.000Z");
    expect(nextResetAt(new Date("2026-11-17T23:59:59+07:00")).toISOString()).toBe("2026-11-17T17:00:00.000Z");
  });

  it("handles the month/year rollover", () => {
    const lastSecond = new Date("2026-12-31T16:59:59Z"); // 23:59:59 VN on 31/12
    expect(playDate(lastSecond).toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(nextResetAt(lastSecond).toISOString()).toBe("2026-12-31T17:00:00.000Z");

    const newYear = new Date("2026-12-31T17:00:00Z"); // 00:00 VN on 01/01/2027
    expect(playDate(newYear).toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(nextResetAt(newYear).toISOString()).toBe("2027-01-01T17:00:00.000Z");
  });
});
