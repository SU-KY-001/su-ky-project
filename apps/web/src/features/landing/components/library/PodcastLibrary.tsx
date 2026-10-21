import { useEffect, useRef, useState, type ReactElement } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import type { LibraryChapter, PublicHistoricalEventDto } from "@repo/shared";
import { ArrowRight, CalendarBlank, ClockCounterClockwise, Headphones, Medal, Play } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { libraryService } from "../../services/libraryService";
import { scrollToLandingTarget } from "../../hooks/useLandingMotion";
import { LibraryPages, LibrarySection, LibrarySelect, LibraryState } from "./LibraryPrimitives";
import { PodcastPlayer } from "./PodcastPlayer";
import { LibraryAchievements } from "./LibraryAchievements";
import { ReleaseCalendar } from "./ReleaseCalendar";
import "./podcast-library.css";

const navigation = [
  { id: "library-history", title: "Dòng lịch sử", icon: ClockCounterClockwise },
  { id: "library-podcasts", title: "Podcast theo sự kiện", icon: Headphones },
  { id: "library-honors", title: "Thành tựu & vinh danh", icon: Medal },
  { id: "upcoming", title: "Lịch phát hành", icon: CalendarBlank },
];

export function PodcastLibrary(): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("library-history");
  const [period, setPeriod] = useState("");
  const [phase, setPhase] = useState("");
  const [event, setEvent] = useState<PublicHistoricalEventDto | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const [seriesPage, setSeriesPage] = useState(1);
  const [seriesSlug, setSeriesSlug] = useState("");
  const [chapter, setChapter] = useState<LibraryChapter | null>(null);
  const periods = useQuery({ queryKey: ["library-periods"], queryFn: ({ signal }) => libraryService.periods(signal), staleTime: 300000 });
  const events = useQuery({ queryKey: ["library-events", period, phase, eventPage], queryFn: ({ signal }) => libraryService.events({ periodId: period || undefined, phaseId: phase || undefined, page: eventPage }, signal), staleTime: 60000 });
  const series = useQuery({ queryKey: ["library-series-list", period, phase, event?.id, seriesPage], queryFn: ({ signal }) => libraryService.series({ periodId: period || undefined, phaseId: phase || undefined, eventId: event?.id, page: seriesPage }, signal), staleTime: 60000 });
  const currentSeries = series.data?.items.find((item) => item.slug === seriesSlug);
  const playlist = useQuery({ queryKey: ["library-series", currentSeries?.slug], queryFn: ({ signal }) => libraryService.seriesDetail(currentSeries!.slug, signal), enabled: Boolean(currentSeries) });
  const phases = periods.data?.items.find((value) => value.id === period)?.phases ?? [];
  const eventOptions = [...new Map([...(events.data?.items ?? []), ...(event ? [event] : [])].map((item) => [item.id, { id: item.id, name: item.name }])).values()];
  const listenRelease = useMutation({ mutationFn: (slug: string) => libraryService.episode(slug), onSuccess: (value) => { setChapter({ id: value.id, slug: value.slug, title: value.title, narrations: value.narrations, sortOrder: 0 }); jump("library-podcasts"); }, onError: () => notify.error({ title: "Chưa mở được tập podcast", description: "Vui lòng thử lại sau." }) });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { root: document.getElementById("landing-page"), rootMargin: "-15% 0px -60% 0px", threshold: 0 });
    root.current?.querySelectorAll(".library-section").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function jump(id: string): void { setActive(id); scrollToLandingTarget(id); }
  function resetSelection(): void { setSeriesPage(1); setSeriesSlug(""); setChapter(null); }
  function chooseEvent(value: PublicHistoricalEventDto | null): void { setEvent(value); resetSelection(); }

  return <div ref={root} className="podcast-library w-full min-w-0 px-4 pb-16 pt-12 text-ink md:px-7 md:pt-16">
    <div className="library-surface relative isolate px-4 py-6 sm:px-7 lg:px-9">
      <div className="grid gap-x-10 xl:grid-cols-[184px_minmax(0,1fr)] 2xl:gap-x-14">
        <aside className="library-sidebar self-start py-6 xl:sticky xl:top-28"><p className="mb-5 text-xs uppercase tracking-[.2em] text-bronze-dark">Thư viện Sử Ký</p><nav aria-label="Mục lục thư viện" className="flex gap-1 overflow-x-auto pb-3 xl:flex-col xl:overflow-visible">{navigation.map(({ id, title, icon: Icon }) => <Button key={id} variant="ghost" aria-current={active === id ? "location" : undefined} className="library-choice h-auto justify-start gap-3 px-3 py-3 text-xs xl:whitespace-normal xl:text-left" onClick={() => jump(id)}><Icon size={18} className="shrink-0" aria-hidden="true" />{title}</Button>)}</nav></aside>

        <div className="min-w-0 divide-y divide-line/70">
          <LibrarySection id="library-history" title="Lịch sử bắt đầu từ một điều tò mò." description="Chọn thời kỳ, giai đoạn hoặc sự kiện để khám phá nội dung.">
            {periods.isError ? <LibraryState error title="Chưa tải được các thời kỳ" retry={() => { void periods.refetch(); }} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><LibrarySelect id="library-period" label="Thời kỳ" value={period} onChange={(value) => { setPeriod(value); setPhase(""); setEvent(null); setEventPage(1); resetSelection(); }} options={periods.data?.items ?? []} disabled={periods.isPending} allLabel="Tất cả thời kỳ" /><LibrarySelect id="library-phase" label="Giai đoạn" value={phase} onChange={(value) => { setPhase(value); setEvent(null); setEventPage(1); resetSelection(); }} options={phases} disabled={!period || phases.length === 0} allLabel="Tất cả giai đoạn" /><LibrarySelect id="library-event" label="Sự kiện trong danh sách" value={event?.id ?? ""} onChange={(value) => chooseEvent(events.data?.items.find((item) => item.id === value) ?? (event?.id === value ? event : null))} options={eventOptions} disabled={events.isPending || eventOptions.length === 0} allLabel="Tất cả sự kiện" /></div>}
            {(period || phase || event) && <div className="mt-5 flex flex-wrap items-center gap-3"><p className="flex-1 text-xs leading-6 text-muted-foreground">{[periods.data?.items.find((item) => item.id === period)?.name, phases.find((item) => item.id === phase)?.name, event?.name].filter(Boolean).join(" / ")}</p><Button size="sm" variant="link" onClick={() => { setPeriod(""); setPhase(""); setEvent(null); setEventPage(1); resetSelection(); }}>Xóa bộ lọc</Button></div>}
            {periods.data && periods.data.items.length > 0 && <div className="mt-7"><p className="mb-4 text-xs text-muted-foreground">Theo dòng thời kỳ</p><ol className="flex gap-4 overflow-x-auto pb-5">{periods.data.items.map((item) => <li key={item.id} className="w-44 shrink-0"><Button variant="ghost" aria-pressed={period === item.id} className="library-choice h-full w-full flex-col items-start justify-start gap-3 whitespace-normal px-3 py-4 text-left" onClick={() => { setPeriod(item.id); setPhase(""); setEvent(null); setEventPage(1); resetSelection(); }}><span className="text-[11px] font-normal text-bronze-dark">{item.startYear === null ? "Chưa xác định niên đại" : item.startYear < 0 ? `${Math.abs(item.startYear)} TCN` : item.startYear}{item.endYear !== null && ` — ${item.endYear < 0 ? `${Math.abs(item.endYear)} TCN` : item.endYear}`}</span><span className="text-sm leading-6">{item.name}</span></Button></li>)}</ol>{period && phases.length > 0 && <div className="mt-5"><p className="mb-3 text-xs text-muted-foreground">Các giai đoạn trong thời kỳ</p><div className="flex flex-wrap gap-2">{phases.map((item) => <Button key={item.id} size="sm" variant="ghost" className="library-choice h-auto whitespace-normal text-left" aria-pressed={phase === item.id} onClick={() => { setPhase(item.id); setEvent(null); setEventPage(1); resetSelection(); }}>{item.name}</Button>)}</div></div>}</div>}
            <div className="mt-8">{events.isPending ? <LibraryState loading /> : events.isError ? <LibraryState error title="Chưa tải được dòng lịch sử" retry={() => { void events.refetch(); }} /> : events.data.items.length === 0 ? <LibraryState title="Chưa có sự kiện công khai trong lựa chọn này" description="Thử một thời kỳ hoặc giai đoạn khác để tiếp tục khám phá." /> : <div className="grid gap-5 md:grid-cols-2">{(event ? [event] : events.data.items).map((item) => <article key={item.id} className={cn("relative flex flex-col border-l-2 border-bronze/50 bg-paper/50 p-5", event?.id === item.id && "border-bronze bg-paper-deep/40")}><time className="text-xs text-bronze-dark">{item.timeLabel}</time><p className="mt-3 text-[11px] leading-5 text-muted-foreground">{item.parent.period.name} / {item.parent.phase.name}</p><h3 className="mt-2 text-lg font-semibold leading-7">{item.name}</h3><p className="mb-4 mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">{item.summary}</p><div className="mt-auto flex flex-wrap items-center gap-2"><Button size="sm" variant="link" className="px-0" onClick={() => { chooseEvent(item); jump("library-podcasts"); }}>Khám phá podcast <ArrowRight aria-hidden="true" /></Button><Button asChild size="sm" variant="ghost"><Link to={`/history/events/${item.slug}`}>Đọc sự kiện</Link></Button></div></article>)}</div>}{events.data && !event && <LibraryPages page={eventPage} limit={events.data.limit} total={events.data.total} onChange={setEventPage} />}</div>
          </LibrarySection>

          <LibrarySection id="library-podcasts" title={event ? event.name : "Chọn một câu chuyện để bắt đầu."}>
            {series.isPending ? <LibraryState loading /> : series.isError ? <LibraryState error retry={() => { void series.refetch(); }} /> : !series.data?.items.length && !chapter ? <LibraryState title="Chưa có tập podcast phù hợp" description="Chọn một sự kiện hoặc thời kỳ khác trong dòng lịch sử." /> : <div className="grid items-start gap-7 2xl:grid-cols-[minmax(0,1fr)_300px]"><div className="min-w-0"><LibrarySelect id="library-playlist" label="Series trong bộ sưu tập" value={currentSeries?.slug ?? ""} onChange={(value) => { setSeriesSlug(value); setChapter(null); }} options={(series.data?.items ?? []).map((item) => ({ id: item.slug, name: item.title }))} allLabel="Chọn series" />{series.data && <LibraryPages page={seriesPage} limit={series.data.limit} total={series.data.total} onChange={(value) => { setSeriesPage(value); setSeriesSlug(""); setChapter(null); }} />}{!currentSeries ? <LibraryState title="Chọn series để xem các tập podcast" description="Danh sách tập sẽ xuất hiện sau khi bạn chọn một series trong bộ sưu tập." /> : playlist.isPending ? <LibraryState loading /> : playlist.isError ? <LibraryState error retry={() => { void playlist.refetch(); }} /> : playlist.data?.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <ol className="mt-4 divide-y divide-line">{playlist.data?.episodes.map((item, index) => <li key={item.id} className={cn("flex items-center gap-3 py-5", chapter?.id === item.id && "bg-paper-deep/35")}><span className="w-6 shrink-0 text-xs text-bronze-dark">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-medium leading-6">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.narrations.some((voice) => voice.available) ? `${item.narrations.filter((voice) => voice.available).length} góc kể có thể nghe` : "Bản thu đang được chuẩn bị"}</p></div><Button size="icon" variant={chapter?.id === item.id ? "default" : "outline"} disabled={!item.narrations.some((voice) => voice.available)} aria-label={`Chọn nghe ${item.title}`} onClick={() => setChapter(item)}><Play aria-hidden="true" /></Button></li>)}</ol>}</div><div className="min-w-0 2xl:sticky 2xl:top-28">{chapter ? <PodcastPlayer key={chapter.id} chapter={chapter} /> : <div className="rounded-xl border border-line bg-paper/60 p-6"><Headphones size={30} className="text-bronze-dark" aria-hidden="true" /><p className="mt-5 font-medium">Dành một khoảng lặng để nghe.</p><p className="mt-3 text-sm leading-7 text-muted-foreground">{currentSeries ? "Chọn nút phát bên cạnh một tập. Bạn có thể đổi góc kể, tốc độ và tiếp tục từ tiến độ đã lưu." : "Chọn một series, sau đó chọn tập podcast bạn muốn nghe."}</p></div>}</div></div>}
          </LibrarySection>

          <LibrarySection id="library-honors" title="Đi xa hơn qua mỗi lần lắng nghe."><LibraryAchievements /></LibrarySection>
          <LibrarySection id="upcoming" title="Hẹn bạn ở chương tiếp theo."><ReleaseCalendar onListen={(slug) => listenRelease.mutate(slug)} /></LibrarySection>
        </div>
      </div>
    </div>
  </div>;
}
