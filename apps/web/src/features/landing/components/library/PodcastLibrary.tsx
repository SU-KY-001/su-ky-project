import { useState, type ReactElement } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import type { LibraryChapter, PublicHistoricalEventDto } from "@repo/shared";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { libraryService } from "../../services/libraryService";
import { scrollToLandingTarget } from "../../hooks/useLandingMotion";
import { LibraryPages, LibrarySection, LibraryState } from "./LibraryPrimitives";
import { PodcastPlayer } from "./PodcastPlayer";
import { PodcastSeriesGallery } from "./PodcastSeriesGallery";
import { HistoryFilterTree } from "./HistoryFilterTree";
import { LibraryQuiz } from "./LibraryQuiz";
import { ReleaseCalendar } from "./ReleaseCalendar";
import "./podcast-library.css";

export function PodcastLibrary(): ReactElement {
  const [period, setPeriod] = useState("");
  const [phase, setPhase] = useState("");
  const [event, setEvent] = useState<PublicHistoricalEventDto | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const [chapter, setChapter] = useState<LibraryChapter | null>(null);
  const periods = useQuery({ queryKey: ["library-periods"], queryFn: ({ signal }) => libraryService.periods(signal), staleTime: 300000 });
  const events = useQuery({ queryKey: ["library-events", period, phase, eventPage], queryFn: ({ signal }) => libraryService.events({ periodId: period || undefined, phaseId: phase || undefined, page: eventPage }, signal), staleTime: 60000 });
  const phases = periods.data?.items.find((value) => value.id === period)?.phases ?? [];
  const listenRelease = useMutation({ mutationFn: (slug: string) => libraryService.episode(slug), onSuccess: (value) => { setChapter({ id: value.id, slug: value.slug, title: value.title, narrations: value.narrations, sortOrder: 0 }); jump("library-podcasts"); }, onError: () => notify.error({ title: "Chưa mở được tập podcast", description: "Vui lòng thử lại sau." }) });
  function jump(id: string): void { scrollToLandingTarget(id); }
  function resetSelection(): void { setChapter(null); }
  function chooseEvent(value: PublicHistoricalEventDto | null): void {
    if (value) {
      if (period !== value.parent.period.id || phase !== value.parent.phase.id) setEventPage(1);
      setPeriod(value.parent.period.id);
      setPhase(value.parent.phase.id);
    }
    setEvent(value);
    resetSelection();
  }
  function choosePeriod(value: string): void { setPeriod(value); setPhase(""); setEvent(null); setEventPage(1); resetSelection(); }
  function choosePhase(value: string): void { setPhase(value); setEvent(null); setEventPage(1); resetSelection(); }
  function clearHistory(): void { choosePeriod(""); }
  const activePeriod = periods.data?.items.find(item => item.id === period);
  const treeEvents = [...new Map([...(events.data?.items ?? []), ...(event ? [event] : [])].map(item => [item.id, item])).values()];

  return <div className="podcast-library w-full min-w-0 px-4 pb-16 pt-12 text-ink md:px-7 md:pt-16">
    <div className="library-surface relative isolate px-4 py-6 sm:px-7 lg:px-9">
      <div className="min-w-0 divide-y divide-line/70">
        <LibrarySection id="library-history" title="Khám phá chiều dài lịch sử Việt Nam">
          <div className="grid items-start gap-7 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-10">
            <aside className="min-w-0 rounded-2xl bg-paper/50 p-3 sm:p-4" aria-label="Bộ lọc khám phá lịch sử">
              <h3 className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-bronze-dark">Dòng lịch sử</h3>
              {periods.isPending ? <LibraryState loading /> : periods.isError ? <LibraryState error title="Chưa tải được các thời kỳ" retry={() => { void periods.refetch(); }} /> : !periods.data.items.length ? <p className="p-3 text-sm text-muted-foreground">Chưa có thời kỳ công khai.</p> : <HistoryFilterTree periods={periods.data.items} period={period} phase={phase} eventId={event?.id} events={treeEvents} loadingEvents={events.isPending} eventsError={events.isError} page={eventPage} limit={events.data?.limit ?? 6} total={events.data?.total ?? 0} onPeriod={choosePeriod} onPhase={choosePhase} onEvent={chooseEvent} onPage={value => { setEventPage(value); setEvent(null); resetSelection(); }} onClear={clearHistory} onRetry={() => { void events.refetch(); }} />}
            </aside>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm leading-7 text-ink-soft" aria-live="polite">{[activePeriod?.name, phases.find(item => item.id === phase)?.name, event?.name].filter(Boolean).join(" / ") || "Theo dấu những câu chuyện qua từng thời kỳ."}</p>{(period || phase || event) && <Button variant="link" size="sm" onClick={clearHistory}>Xóa bộ lọc</Button>}</div>
              {periods.data && periods.data.items.length > 0 && <ol aria-label="Các mốc thời kỳ" className="library-history-timeline mt-6 flex gap-3 overflow-x-auto pb-4">{periods.data.items.map(item => <li key={item.id} className="w-44 shrink-0"><Button variant="ghost" aria-pressed={period === item.id} className="library-choice h-full w-full flex-col items-start justify-start gap-3 whitespace-normal px-3 py-4 text-left" onClick={() => choosePeriod(item.id)}><span className="text-[11px] font-normal text-bronze-dark">{item.startYear === null ? "Chưa xác định niên đại" : item.startYear < 0 ? `${Math.abs(item.startYear)} TCN` : item.startYear}{item.endYear !== null && ` — ${item.endYear < 0 ? `${Math.abs(item.endYear)} TCN` : item.endYear}`}</span><span className="text-sm leading-6">{item.name}</span></Button></li>)}</ol>}
            <div className="mt-7">{events.isPending ? <LibraryState loading /> : events.isError ? <LibraryState error title="Chưa tải được dòng lịch sử" retry={() => { void events.refetch(); }} /> : events.data.items.length === 0 ? <LibraryState title="Chưa có sự kiện công khai trong lựa chọn này" description="Thử một thời kỳ hoặc giai đoạn khác để tiếp tục khám phá." /> : <div className="grid gap-5 md:grid-cols-2">{(event ? [event] : events.data.items).map((item) => <article key={item.id} className={cn("relative flex flex-col border-l-2 border-bronze/50 bg-paper/50 p-5", event?.id === item.id && "border-bronze bg-paper-deep/40")}><time className="text-xs text-bronze-dark">{item.timeLabel}</time><p className="mt-3 text-[11px] leading-5 text-muted-foreground">{item.parent.period.name} / {item.parent.phase.name}</p><h3 className="mt-2 text-lg font-semibold leading-7">{item.name}</h3><p className="mb-4 mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">{item.summary}</p><div className="mt-auto flex flex-wrap items-center gap-2"><Button size="sm" variant="link" className="px-0" onClick={() => { chooseEvent(item); jump("library-podcasts"); }}>Khám phá podcast <ArrowRight aria-hidden="true" /></Button><Button asChild size="sm" variant="ghost"><Link to={`/history/events/${item.slug}`}>Đọc sự kiện</Link></Button></div></article>)}</div>}{events.data && !event && <LibraryPages page={eventPage} limit={events.data.limit} total={events.data.total} onChange={setEventPage} />}</div>
            </div>
          </div>
        </LibrarySection>
          <LibrarySection id="library-podcasts" title="Series và podcast">
            {(period || phase || event) && <div className="mb-6 flex flex-wrap items-center gap-3"><p className="flex-1 text-sm leading-7 text-muted-foreground">Đang khám phá podcast theo: {event?.name ?? phases.find(item => item.id === phase)?.name ?? activePeriod?.name}</p><Button size="sm" variant="link" onClick={clearHistory}>Xem tất cả series</Button></div>}
            <PodcastSeriesGallery key={`${period}-${phase}-${event?.id ?? "all"}`} filter={{ periodId: period || undefined, phaseId: phase || undefined, eventId: event?.id }} selectedId={chapter?.id} onPlay={item => { setChapter(item); window.setTimeout(() => scrollToLandingTarget("landing-podcast-player"), 0); }} />
            {chapter && <div id="landing-podcast-player" className="mt-9 max-w-3xl scroll-mt-28"><div className="mb-3 flex justify-end"><Button size="sm" variant="ghost" onClick={() => setChapter(null)}>Đóng trình nghe</Button></div><PodcastPlayer key={chapter.id} chapter={chapter} /></div>}
          </LibrarySection>

        <LibrarySection id="library-quiz" title="Thử tài lịch sử"><LibraryQuiz /></LibrarySection>
        <LibrarySection id="upcoming" title="Lịch phát sóng"><ReleaseCalendar onListen={(slug) => listenRelease.mutate(slug)} /></LibrarySection>
      </div>
    </div>
  </div>;
}
