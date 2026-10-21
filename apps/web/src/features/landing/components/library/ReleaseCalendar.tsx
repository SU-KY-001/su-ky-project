import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight, Headphones } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { libraryService } from "../../services/libraryService";
import { LibrarySelect, LibraryState } from "./LibraryPrimitives";

const dayMs = 86400000;
const vietnamOffset = 7 * 3600000;
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export function ReleaseCalendar({ onListen }: { onListen: (slug: string) => void }): ReactElement {
  const [view, setView] = useState<"week" | "month">("month");
  const [anchor, setAnchor] = useState(() => {
    const today = new Date(Date.now() + vietnamOffset);
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  });
  const [series, setSeries] = useState("");
  const first = view === "month" ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)) : new Date(anchor);
  first.setUTCDate(first.getUTCDate() - (first.getUTCDay() + 6) % 7);
  const count = view === "month" ? 42 : 7;
  const from = new Date(first.getTime() - vietnamOffset);
  const to = new Date(from.getTime() + count * dayMs);
  const releases = useQuery({ queryKey: ["library-releases", from.toISOString(), to.toISOString()], queryFn: ({ signal }) => libraryService.releases(from, to, undefined, signal), staleTime: 30000, refetchInterval: 60000 });
  const options = [...new Map((releases.data?.items ?? []).map((item) => [item.series.id, { id: item.series.id, name: item.series.title }])).values()];
  const items = (releases.data?.items ?? []).filter((item) => !series || item.series.id === series);
  const days = Array.from({ length: count }, (_, index) => new Date(first.getTime() + index * dayMs));
  function move(direction: number): void {
    setSeries("");
    setAnchor(view === "month" ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + direction, 1)) : new Date(anchor.getTime() + direction * 7 * dayMs));
  }
  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5"><div className="w-full sm:w-64"><LibrarySelect id="library-calendar-series" label="Theo series trong lịch" value={series} onChange={setSeries} options={options} disabled={options.length === 0} allLabel="Tất cả series" /></div><div className="flex flex-wrap items-center gap-2"><div role="group" aria-label="Kiểu lịch" className="mr-2 flex gap-1">{(["week", "month"] as const).map((value) => <Button key={value} size="sm" variant={view === value ? "secondary" : "ghost"} aria-pressed={view === value} onClick={() => { setView(value); setSeries(""); }}>{value === "week" ? "Tuần" : "Tháng"}</Button>)}</div><Button size="icon-sm" variant="outline" onClick={() => move(-1)} aria-label="Khoảng lịch trước"><CaretLeft /></Button><Button size="icon-sm" variant="outline" onClick={() => move(1)} aria-label="Khoảng lịch sau"><CaretRight /></Button></div></div>
    <h3 className="mb-5 text-lg font-medium" aria-live="polite">{view === "month" ? anchor.toLocaleDateString("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" }) : `${first.toLocaleDateString("vi-VN", { timeZone: "UTC" })} — ${days[6].toLocaleDateString("vi-VN", { timeZone: "UTC" })}`}</h3>
    {releases.isError ? <LibraryState error title="Chưa tải được lịch phát hành" retry={() => { void releases.refetch(); }} /> : releases.isPending ? <LibraryState loading /> : <>
      <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="w-full min-w-[620px] table-fixed border-collapse">
          <caption className="sr-only">
            Lịch phát hành {view === "month" ? anchor.toLocaleDateString("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" }) : `${first.toLocaleDateString("vi-VN", { timeZone: "UTC" })} — ${days[6].toLocaleDateString("vi-VN", { timeZone: "UTC" })}`}. Giờ Việt Nam (GMT+7).
          </caption>
          <thead><tr>{["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((day) => <th key={day} scope="col" className="bg-paper-deep/50 p-3 text-center text-xs font-normal text-muted-foreground">{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: count / 7 }, (_, week) => <tr key={dayKey(days[week * 7])}>{days.slice(week * 7, week * 7 + 7).map((day) => {
            const entries = items.filter((item) => dayKey(new Date(item.scheduledAt.getTime() + vietnamOffset)) === dayKey(day));
            const dateLabel = day.toLocaleDateString("vi-VN", { dateStyle: "full", timeZone: "UTC" });
            const today = dayKey(new Date(Date.now() + vietnamOffset)) === dayKey(day);
            return <td key={dayKey(day)} className={cn("border-t border-r border-line p-2 align-top last:border-r-0", view === "month" && day.getUTCMonth() !== anchor.getUTCMonth() && "bg-paper/70 text-muted-foreground")}>
              <div className="min-h-24">
                <time dateTime={dayKey(day)} aria-current={today ? "date" : undefined} className={cn("inline-grid size-6 place-items-center text-xs", today && "rounded-full bg-primary text-primary-foreground")}><span aria-hidden="true">{day.getUTCDate()}</span><span className="sr-only">{dateLabel}</span></time>
                {entries.length > 0 && <ul aria-label={`Các tập phát hành ngày ${dateLabel}`} className="mt-2 space-y-2">{entries.map((item) => <li key={item.id} className="rounded bg-bronze/10 p-2">
                  <p className="break-words text-xs font-medium leading-5">{item.title}</p>
                  <p className="mt-1 break-words text-[11px] leading-4 text-muted-foreground">{item.series.title}</p>
                  <time dateTime={item.scheduledAt.toISOString()} className="mt-2 block text-[11px] text-bronze-dark">{item.scheduledAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</time>
                  <span className="sr-only">{item.released ? "Đã phát hành" : "Sắp lên sóng"}</span>
                  {item.released && <Button variant="link" size="xs" aria-label={`Nghe tập ${item.title}`} className="mt-1 h-auto whitespace-normal px-0 text-left" onClick={() => onListen(item.episodeSlug)}>Nghe tập</Button>}
                </li>)}</ul>}
              </div>
            </td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      {items.length > 0 ? <ul className="mt-5 divide-y divide-line md:hidden">{items.map((item) => <li key={item.id} className="py-5"><time className="text-xs text-bronze-dark">{item.scheduledAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" })}</time><p className="mt-2 font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.series.title}</p><div className="mt-3 flex items-center gap-3"><Badge variant="outline">{item.released ? "Đã phát hành" : "Sắp lên sóng"}</Badge>{item.released && <Button size="sm" variant="link" onClick={() => onListen(item.episodeSlug)}><Headphones aria-hidden="true" /> Nghe tập</Button>}</div></li>)}</ul> : <div className="mt-5"><LibraryState title="Khoảng thời gian này chưa có lịch phát hành" description="Các tập đã sẵn sàng lên sóng sẽ xuất hiện tại đây. Bạn có thể xem tuần hoặc tháng tiếp theo." /></div>}
      <p className="mt-4 text-xs text-muted-foreground">Giờ Việt Nam (GMT+7). Lịch được cập nhật khi tập đã sẵn sàng phát hành.</p>
    </>}
  </div>;
}
