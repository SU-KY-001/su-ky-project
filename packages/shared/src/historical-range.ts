/**
 * Year-range rules for Thời kỳ / Giai đoạn / Series (plan 261010-1200).
 *
 * - Period and phase use the half-open convention `[startYear, endYear)`: `endYear` is
 *   excluded, so adjacent phases share a boundary year without overlapping.
 * - `startYear = null` means unknown (prehistory); `endYear = null` means ongoing.
 * - Series use a closed range `[startYear, endYear]` because moderators type the event
 *   span as historians write it ("40–43" includes year 43).
 * - BCE years are negative and there is no year 0; values are only compared, never subtracted.
 */
export interface YearRange {
  startYear: number | null;
  endYear: number | null;
}

/** True when `startYear <= year < endYear` (null bounds are unbounded). */
export function isYearInHalfOpenRange(year: number, range: YearRange): boolean {
  const afterStart = range.startYear === null || range.startYear <= year;
  const beforeEnd = range.endYear === null || year < range.endYear;
  return afterStart && beforeEnd;
}

/**
 * True when the closed series span intersects the half-open range:
 * `series.start < range.end && series.end >= range.start` (null = unbounded).
 */
export function doesSeriesOverlapRange(series: YearRange, range: YearRange): boolean {
  const startsBeforeRangeEnds = series.startYear === null || range.endYear === null || series.startYear < range.endYear;
  const endsAfterRangeStarts = series.endYear === null || range.startYear === null || series.endYear >= range.startYear;
  return startsBeforeRangeEnds && endsAfterRangeStarts;
}
