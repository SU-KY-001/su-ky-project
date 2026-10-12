import { describe, expect, it } from "bun:test";
import {
  HistoricalDateSchema,
  HistoricalTimeSchema,
  HistoricalYearSchema,
  nextHistoricalYear,
  previousHistoricalYear,
  formatHistoricalTime,
  compareHistoricalDates,
  toLegacyYearRange,
} from "@repo/shared";

const year = (year: number) => ({
  year,
  precision: "YEAR" as const,
  approximate: false,
});
describe("historical time", () => {
  it("rejects year zero and invalid precision, accepts prehistory", () => {
    expect(HistoricalYearSchema.safeParse(0).success).toBe(false);
    expect(HistoricalYearSchema.parse(-40000)).toBe(-40000);
    expect(
      HistoricalDateSchema.safeParse({ ...year(-179), month: 1 }).success,
    ).toBe(false);
    expect(
      HistoricalDateSchema.safeParse({
        year: 1945,
        precision: "DAY",
        month: 2,
        day: 31,
      }).success,
    ).toBe(false);
    expect(
      HistoricalDateSchema.safeParse({
        year: 2000,
        precision: "DAY",
        month: 2,
        day: 29,
      }).success,
    ).toBe(true);
    expect(
      HistoricalDateSchema.safeParse({
        year: 1900,
        precision: "DAY",
        month: 2,
        day: 29,
      }).success,
    ).toBe(false);
  });
  it("crosses eras without year zero and guards overflow", () => {
    expect(nextHistoricalYear(-1)).toBe(1);
    expect(previousHistoricalYear(1)).toBe(-1);
    expect(() => nextHistoricalYear(2147483647)).toThrow();
    expect(() => previousHistoricalYear(-2147483648)).toThrow();
    expect(
      toLegacyYearRange(
        {
          kind: "RANGE",
          start: year(-700),
          end: year(-179),
          endState: "KNOWN",
        },
        "HALF_OPEN",
      ),
    ).toEqual({ startYear: -700, endYear: -178 });
    expect(
      toLegacyYearRange({ kind: "POINT", at: year(-179) }, "CLOSED"),
    ).toEqual({ startYear: -179, endYear: -179 });
  });
  it("preserves uncertain dates and formats BCE without inventing a day", () => {
    expect(
      formatHistoricalTime({
        kind: "POINT",
        at: { ...year(-700), approximate: true },
      }),
    ).toBe("Khoảng 700 TCN");
    expect(
      formatHistoricalTime({
        kind: "POINT",
        at: {
          year: 1945,
          precision: "DAY",
          month: 9,
          day: 2,
          approximate: false,
        },
      }),
    ).toBe("02/09/1945 CN");
    expect(
      compareHistoricalDates(year(1945), {
        year: 1945,
        precision: "DAY",
        month: 9,
        day: 2,
        approximate: false,
      }),
    ).toBe("OVERLAP");
    expect(
      HistoricalTimeSchema.safeParse({ kind: "UNKNOWN", note: "" }).success,
    ).toBe(false);
    expect(
      HistoricalTimeSchema.safeParse({
        kind: "RANGE",
        start: year(938),
        end: year(-179),
        endState: "KNOWN",
      }).success,
    ).toBe(false);
    expect(
      HistoricalTimeSchema.safeParse({
        kind: "RANGE",
        start: year(-1),
        end: year(1),
        endState: "KNOWN",
      }).success,
    ).toBe(true);
    expect(
      HistoricalTimeSchema.safeParse({
        kind: "RANGE",
        start: year(1945),
        end: null,
        endState: "KNOWN",
      }).success,
    ).toBe(false);
  });
});
