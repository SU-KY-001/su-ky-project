import type {
  HistoricalDateDto,
  HistoricalTimeDto,
} from "./schemas/historical-time";
import type { YearRange } from "./historical-range";

function assertYear(year: number): void {
  if (
    !Number.isInteger(year) ||
    year === 0 ||
    year < -2147483648 ||
    year > 2147483647
  )
    throw new RangeError("Năm lịch sử không hợp lệ");
}
export function nextHistoricalYear(year: number): number {
  assertYear(year);
  const next = year === -1 ? 1 : year + 1;
  assertYear(next);
  return next;
}
export function previousHistoricalYear(year: number): number {
  assertYear(year);
  const previous = year === 1 ? -1 : year - 1;
  assertYear(previous);
  return previous;
}
export function daysInHistoricalMonth(year: number, month: number): number {
  const astronomicalYear = year < 0 ? year + 1 : year;
  const leap =
    astronomicalYear % 4 === 0 &&
    (astronomicalYear % 100 !== 0 || astronomicalYear % 400 === 0);
  return month === 2
    ? leap
      ? 29
      : 28
    : [4, 6, 9, 11].includes(month)
      ? 30
      : 31;
}
type Bound = [number, number, number];
function bounds(date: HistoricalDateDto): [Bound, Bound] {
  const month = date.month ?? 1;
  return [
    [date.year, month, date.day ?? 1],
    [
      date.year,
      date.month ?? 12,
      date.day ?? daysInHistoricalMonth(date.year, date.month ?? 12),
    ],
  ];
}
function compare(a: Bound, b: Bound): -1 | 0 | 1 {
  for (let i = 0; i < 3; i++) {
    if (a[i]! < b[i]!) return -1;
    if (a[i]! > b[i]!) return 1;
  }
  return 0;
}
export function compareHistoricalDates(
  a: HistoricalDateDto,
  b: HistoricalDateDto,
): -1 | 0 | 1 | "OVERLAP" {
  const [alo, ahi] = bounds(a);
  const [blo, bhi] = bounds(b);
  if (compare(ahi, blo) < 0) return -1;
  if (compare(alo, bhi) > 0) return 1;
  if (compare(alo, blo) === 0 && compare(ahi, bhi) === 0) return 0;
  return "OVERLAP";
}
export function formatHistoricalDate(date: HistoricalDateDto): string {
  const year = `${Math.abs(date.year)} ${date.year < 0 ? "TCN" : "CN"}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const value =
    date.precision === "DAY"
      ? `${pad(date.day!)}/${pad(date.month!)}/${year}`
      : date.precision === "MONTH"
        ? `${pad(date.month!)}/${year}`
        : year;
  return `${date.approximate ? "Khoảng " : ""}${value}`;
}
export function formatHistoricalTime(time: HistoricalTimeDto): string {
  if (time.kind === "UNKNOWN") return `Chưa xác định: ${time.note}`;
  if (time.kind === "POINT") return formatHistoricalDate(time.at);
  return `${time.start ? formatHistoricalDate(time.start) : "Chưa rõ bắt đầu"} – ${time.end ? formatHistoricalDate(time.end) : time.endState === "ONGOING" ? "nay" : "chưa rõ kết thúc"}`;
}
export function toLegacyYearRange(
  time: HistoricalTimeDto,
  convention: "HALF_OPEN" | "CLOSED",
): YearRange {
  if (time.kind === "UNKNOWN") return { startYear: null, endYear: null };
  if (time.kind === "POINT")
    return {
      startYear: time.at.year,
      endYear:
        convention === "HALF_OPEN"
          ? nextHistoricalYear(time.at.year)
          : time.at.year,
    };
  return {
    startYear: time.start?.year ?? null,
    endYear: time.end
      ? convention === "HALF_OPEN"
        ? nextHistoricalYear(time.end.year)
        : time.end.year
      : null,
  };
}
export function fromLegacyYearRange(
  range: YearRange,
  convention: "HALF_OPEN" | "CLOSED",
): HistoricalTimeDto {
  const date = (year: number): HistoricalDateDto => ({
    year,
    precision: "YEAR",
    approximate: false,
  });
  if (
    range.startYear === null &&
    range.endYear === null &&
    convention === "CLOSED"
  )
    return {
      kind: "UNKNOWN",
      note: "Chưa xác định thời gian trong dữ liệu cũ",
    };
  if (
    convention === "CLOSED" &&
    range.startYear !== null &&
    range.startYear === range.endYear
  )
    return { kind: "POINT", at: date(range.startYear) };
  return {
    kind: "RANGE",
    start: range.startYear === null ? null : date(range.startYear),
    end:
      range.endYear === null
        ? null
        : date(
            convention === "HALF_OPEN"
              ? previousHistoricalYear(range.endYear)
              : range.endYear,
          ),
    endState:
      range.endYear !== null
        ? "KNOWN"
        : convention === "HALF_OPEN"
          ? "ONGOING"
          : "UNKNOWN",
  };
}
