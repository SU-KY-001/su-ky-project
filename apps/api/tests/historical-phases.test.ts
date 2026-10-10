import { describe, expect, it } from "bun:test";
import { HISTORICAL_PERIOD_TREE, describeHalfOpenRange } from "@repo/db/historical-seed-data";
import { doesSeriesOverlapRange, isYearInHalfOpenRange, type YearRange } from "@repo/shared";

const periods = HISTORICAL_PERIOD_TREE;
const allPhases = periods.flatMap((period) => period.phases);
const phaseBySlug = (slug: string): YearRange => {
  const phase = allPhases.find((candidate) => candidate.slug === slug);
  if (!phase) throw new Error(`Unknown phase ${slug}`);
  return phase;
};

describe("historical seed invariants (half-open [start, end))", () => {
  it("has 5 periods and 18 phases with unique slugs", () => {
    expect(periods).toHaveLength(5);
    expect(allPhases).toHaveLength(18);
    const slugs = [...periods.map((period) => period.slug), ...allPhases.map((phase) => phase.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("chains periods without gap or overlap", () => {
    for (let index = 0; index < periods.length - 1; index += 1) {
      expect(periods[index]!.endYear).toBe(periods[index + 1]!.startYear);
    }
    expect(periods[0]!.startYear).toBeNull();
    expect(periods.at(-1)!.endYear).toBeNull();
  });

  it("chains the phases of each period and matches the period bounds", () => {
    for (const period of periods) {
      const { phases } = period;
      expect(phases[0]!.startYear).toBe(period.startYear);
      expect(phases.at(-1)!.endYear).toBe(period.endYear);
      for (let index = 0; index < phases.length - 1; index += 1) {
        expect(phases[index]!.endYear).toBe(phases[index + 1]!.startYear);
      }
    }
  });

  it("keeps start < end whenever both bounds exist and never uses year 0", () => {
    for (const range of [...periods, ...allPhases]) {
      if (range.startYear !== null && range.endYear !== null) expect(range.startYear).toBeLessThan(range.endYear);
      expect(range.startYear).not.toBe(0);
      expect(range.endYear).not.toBe(0);
    }
  });

  it("puts every year in exactly one phase", () => {
    for (const year of [-5000, -700, -179, -1, 1, 42, 43, 541, 542, 938, 939, 1857, 1858, 1944, 1945, 1975, 2026]) {
      const owners = allPhases.filter((phase) => isYearInHalfOpenRange(year, phase));
      expect(owners).toHaveLength(1);
    }
  });
});

describe("year range helpers", () => {
  it("places year 43 in phase II and not in phase I", () => {
    expect(isYearInHalfOpenRange(43, phaseBySlug("bac-thuoc-lan-1"))).toBe(false);
    expect(isYearInHalfOpenRange(43, phaseBySlug("bac-thuoc-lan-2"))).toBe(true);
    expect(isYearInHalfOpenRange(42, phaseBySlug("bac-thuoc-lan-1"))).toBe(true);
  });

  it("includes the start year and excludes the end year", () => {
    const range: YearRange = { startYear: -179, endYear: 939 };
    expect(isYearInHalfOpenRange(-179, range)).toBe(true);
    expect(isYearInHalfOpenRange(-180, range)).toBe(false);
    expect(isYearInHalfOpenRange(938, range)).toBe(true);
    expect(isYearInHalfOpenRange(939, range)).toBe(false);
  });

  it("treats endYear = null as ongoing and startYear = null as unbounded past", () => {
    const ongoing = phaseBySlug("thong-nhat-doi-moi");
    expect(isYearInHalfOpenRange(1974, ongoing)).toBe(false);
    expect(isYearInHalfOpenRange(1975, ongoing)).toBe(true);
    expect(isYearInHalfOpenRange(2999, ongoing)).toBe(true);
    const prehistory = phaseBySlug("tien-su");
    expect(isYearInHalfOpenRange(-100000, prehistory)).toBe(true);
    expect(isYearInHalfOpenRange(-700, prehistory)).toBe(false);
  });

  it("assigns -179 to the Bắc thuộc period, not to the prehistory period", () => {
    const [prehistory, bacThuoc] = periods;
    expect(isYearInHalfOpenRange(-179, bacThuoc!)).toBe(true);
    expect(isYearInHalfOpenRange(-179, prehistory!)).toBe(false);
  });

  it("overlaps a closed series span with a half-open phase without adding a year", () => {
    const phaseOne = phaseBySlug("bac-thuoc-lan-1");
    const phaseTwo = phaseBySlug("bac-thuoc-lan-2");
    // Hai Bà Trưng 40–43: the event includes year 43, so it touches both phases.
    expect(doesSeriesOverlapRange({ startYear: 40, endYear: 43 }, phaseOne)).toBe(true);
    expect(doesSeriesOverlapRange({ startYear: 40, endYear: 43 }, phaseTwo)).toBe(true);
    // A series that begins exactly at the phase end is outside the half-open phase.
    expect(doesSeriesOverlapRange({ startYear: 43, endYear: 50 }, phaseOne)).toBe(false);
    // A series that ends one year before the phase starts is outside as well.
    expect(doesSeriesOverlapRange({ startYear: 10, endYear: 42 }, phaseTwo)).toBe(false);
  });

  it("treats a missing series bound as unbounded", () => {
    const phaseTwo = phaseBySlug("bac-thuoc-lan-2");
    expect(doesSeriesOverlapRange({ startYear: null, endYear: null }, phaseTwo)).toBe(true);
    expect(doesSeriesOverlapRange({ startYear: 100, endYear: null }, phaseTwo)).toBe(true);
    expect(doesSeriesOverlapRange({ startYear: null, endYear: 42 }, phaseTwo)).toBe(false);
  });

  it("describes open ends explicitly", () => {
    expect(describeHalfOpenRange(-179, 43)).toBe("Từ năm 179 TCN đến trước năm 43");
    expect(describeHalfOpenRange(1975, null)).toBe("Từ năm 1975 đến nay");
    expect(describeHalfOpenRange(null, -700)).toBe("Đến trước năm 700 TCN");
  });
});
