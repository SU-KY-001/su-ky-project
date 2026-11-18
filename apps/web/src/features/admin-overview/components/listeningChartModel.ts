import type { AdminListeningReport } from "@repo/shared";
export type ListeningGrouping = "day" | "week" | "month";
export interface ListeningBucket {
  date: string; from: string; to: string;
  validListens: number | null; uniqueListeners: number | null; listeningMs: number | null; hours: number | null;
}
export function defaultListeningGrouping(days: number, mobile: boolean): ListeningGrouping {
  return days > 90 ? "month" : days > 31 || (mobile && days > 7) ? "week" : "day";
}
export function listeningValueAxis(values: number[], duration: boolean): { maximum: number; ticks: number[] } {
  const max = Math.max(duration ? .25 : 4, ...values);
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(duration ? .01 : 1, ([1, 2, 5, 10].find((n) => n * magnitude >= rough) ?? 10) * magnitude);
  const maximum = Math.ceil(max / step) * step;
  return { maximum, ticks: Array.from({ length: Math.round(maximum / step) + 1 }, (_, i) => Number((i * step).toFixed(4))) };
}
export function listeningBuckets(rows: AdminListeningReport["daily"] | undefined, grouping: ListeningGrouping, from: string, to: string): ListeningBucket[] {
  const map = new Map((rows ?? []).map((row) => [row.date, row]));
  const cursor = new Date(`${from}T00:00:00Z`);
  if (grouping === "week") cursor.setUTCDate(cursor.getUTCDate() - (cursor.getUTCDay() + 6) % 7);
  if (grouping === "month") cursor.setUTCDate(1);
  const buckets: ListeningBucket[] = [];
  while (cursor.toISOString().slice(0, 10) <= to) {
    const date = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    if (grouping === "month") next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + (grouping === "week" ? 7 : 1));
    const end = new Date(next.getTime() - 86400000).toISOString().slice(0, 10);
    const row = map.get(date);
    buckets.push({ date, from: date < from ? from : date, to: end > to ? to : end, validListens: row?.validListens ?? null, uniqueListeners: row?.uniqueListeners ?? null, listeningMs: row?.listeningMs ?? null, hours: row ? row.listeningMs / 3600000 : null });
    cursor.setTime(next.getTime());
  }
  return buckets;
}
