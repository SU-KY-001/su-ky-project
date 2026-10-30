import { useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import type { PublicHistoricalEventDto } from "@repo/shared";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { libraryService } from "../../services/libraryService";
import { scrollToLandingTarget } from "../../hooks/useLandingMotion";
import { LibraryPages, LibrarySection, LibraryState } from "./LibraryPrimitives";
import { usePodcastAccess } from "../../hooks/usePodcastAccess";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";
import { PodcastSeriesGallery } from "./PodcastSeriesGallery";
import { HistoryFilterTree } from "./HistoryFilterTree";
import { LibraryQuiz } from "./LibraryQuiz";
import { ReleaseCalendar } from "./ReleaseCalendar";
import { ExhibitionSection } from "../ExhibitionSection";

export function PodcastLibrary(): ReactElement {
  const { requestAccess, accessDialog } = usePodcastAccess();
  const [period, setPeriod] = useState("");
  const [phase, setPhase] = useState("");
  const [event, setEvent] = useState<PublicHistoricalEventDto | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const queryClient = useQueryClient();
  const playback = usePodcastPlaybackStore();
  const periods = useQuery({ queryKey: ["library-periods"], queryFn: ({ signal }) => libraryService.periods(signal), staleTime: 300000 });
  const events = useQuery({ queryKey: ["library-events", period, phase, eventPage], queryFn: ({ signal }) => libraryService.events({ periodId: period || undefined, phaseId: phase || undefined, page: eventPage }, signal), staleTime: 60000 });
  const phases = periods.data?.items.find((value) => value.id === period)?.phases ?? [];
  const listenRelease = useMutation({ mutationFn: (slug: string) => libraryService.episode(slug), onSuccess: (value) => { if (value.series) void startPodcast(value.series.slug, value.id); else notify.error({ title: "Chưa tìm được series của tập podcast" }); }, onError: () => notify.error({ title: "Chưa mở được tập podcast", description: "Vui lòng thử lại sau." }) });
  async function startPodcast(seriesSlug: string, episodeId: string): Promise<void> {
    try {
      const series = await queryClient.fetchQuery({ queryKey: ["library-series", seriesSlug], queryFn: ({ signal }) => libraryService.seriesDetail(seriesSlug, signal), staleTime: 60000 });
      playback.play({ slug: series.slug, title: series.title, creator: series.creator?.name ?? "Moderator", episodes: series.episodes }, episodeId);
    } catch {
      notify.error({ title: "Chưa mở được tập podcast", description: "Vui lòng thử lại." });
    }
  }
  function jump(id: string): void { scrollToLandingTarget(id); }
  function chooseEvent(value: PublicHistoricalEventDto | null): void {
    if (value) {
      if (period !== value.parent.period.id || phase !== value.parent.phase.id) setEventPage(1);
      setPeriod(value.parent.period.id);
      setPhase(value.parent.phase.id);
    }
    setEvent(value);

  }
  function choosePeriod(value: string): void { setPeriod(value); setPhase(""); setEvent(null); setEventPage(1); }
  function choosePhase(value: string): void { setPhase(value); setEvent(null); setEventPage(1); }
  function clearHistory(): void { choosePeriod(""); }
  const activePeriod = periods.data?.items.find(item => item.id === period);
  const treeEvents = [...new Map([...(events.data?.items ?? []), ...(event ? [event] : [])].map(item => [item.id, item])).values()];

  return <div className="podcast-library w-full min-w-0 px-4 pb-16 pt-12 text-ink md:px-7 md:pt-16">
    {accessDialog}
    <div className="library-surface relative isolate px-4 py-6 sm:px-7 lg:px-9">
      <div className="min-w-0 divide-y divide-line/70">
        <LibrarySection id="library-history" title="Khám phá chiều dài lịch sử Việt Nam">
          <div className="grid items-start gap-7 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-10">
            <aside className="min-w-0 rounded-2xl bg-paper/50 p-3 sm:p-4" aria-label="Bộ lọc khám phá lịch sử">
              <h3 className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-bronze-dark">Dòng lịch sử</h3>
              {periods.isPending ? <LibraryState loading /> : periods.isError ? <LibraryState error title="Chưa tải được các thời kỳ" retry={() => { void periods.refetch(); }} /> : !periods.data.items.length ? <p className="p-3 text-sm text-muted-foreground">Chưa có thời kỳ công khai.</p> : <HistoryFilterTree periods={periods.data.items} period={period} phase={phase} eventId={event?.id} events={treeEvents} loadingEvents={events.isPending} eventsError={events.isError} page={eventPage} limit={events.data?.limit ?? 6} total={events.data?.total ?? 0} onPeriod={choosePeriod} onPhase={choosePhase} onEvent={chooseEvent} onPage={value => { setEventPage(value); setEvent(null); }} onClear={clearHistory} onRetry={() => { void events.refetch(); }} />}
            </aside>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm leading-7 text-ink-soft" aria-live="polite">{[activePeriod?.name, phases.find(item => item.id === phase)?.name, event?.name].filter(Boolean).join(" / ") || "Theo dấu những câu chuyện qua từng thời kỳ."}</p>{(period || phase || event) && <Button variant="link" size="sm" onClick={clearHistory}>Xóa bộ lọc</Button>}</div>
              {periods.data && periods.data.items.length > 0 && <ol aria-label="Các mốc thời kỳ" className="mt-6 flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{periods.data.items.map(item => <li key={item.id} className="w-44 shrink-0"><Button variant="ghost" aria-pressed={period === item.id} className="h-full w-full flex-col items-start justify-start gap-3 whitespace-normal rounded-xl border-0 bg-transparent px-3 py-4 text-left text-ink-soft hover:bg-bronze/10 hover:text-ink aria-pressed:bg-bronze/20 aria-pressed:text-ink" onClick={() => choosePeriod(item.id)}><span className="text-[11px] font-normal text-bronze-dark">{item.startYear === null ? "Chưa xác định niên đại" : item.startYear < 0 ? `${Math.abs(item.startYear)} TCN` : item.startYear}{item.endYear !== null && ` — ${item.endYear < 0 ? `${Math.abs(item.endYear)} TCN` : item.endYear}`}</span><span className="text-sm leading-6">{item.name}</span></Button></li>)}</ol>}
            <div className="mt-7">{events.isPending ? <LibraryState loading /> : events.isError ? <LibraryState error title="Chưa tải được dòng lịch sử" retry={() => { void events.refetch(); }} /> : events.data.items.length === 0 ? <LibraryState title="Chưa có sự kiện công khai trong lựa chọn này" description="Thử một thời kỳ hoặc giai đoạn khác để tiếp tục khám phá." /> : <div className="grid gap-5 md:grid-cols-2">{(event ? [event] : events.data.items).map((item) => <article key={item.id} className={cn("relative flex flex-col border-l-2 border-bronze/50 bg-paper/50 p-5", event?.id === item.id && "border-bronze bg-paper-deep/40")}><time className="text-xs text-bronze-dark">{item.timeLabel}</time><p className="mt-3 text-[11px] leading-5 text-muted-foreground">{item.parent.period.name} / {item.parent.phase.name}</p><h3 className="mt-2 text-lg font-semibold leading-7">{item.name}</h3><p className="mb-4 mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">{item.summary}</p><div className="mt-auto flex flex-wrap items-center gap-2"><Button size="sm" variant="link" className="px-0" onClick={() => { chooseEvent(item); jump("library-podcasts"); }}>Khám phá podcast <ArrowRight aria-hidden="true" /></Button><Button asChild size="sm" variant="ghost"><Link to={`/history/events/${item.slug}`}>Đọc sự kiện</Link></Button></div></article>)}</div>}{events.data && !event && <LibraryPages page={eventPage} limit={events.data.limit} total={events.data.total} onChange={setEventPage} />}</div>
            </div>
          </div>
        </LibrarySection>
        <ExhibitionSection />
        <LibrarySection id="library-podcasts" title="Series và podcast">
            {(period || phase || event) && <div className="mb-6 flex flex-wrap items-center gap-3"><p className="flex-1 text-sm leading-7 text-muted-foreground">Đang khám phá podcast theo: {event?.name ?? phases.find(item => item.id === phase)?.name ?? activePeriod?.name}</p><Button size="sm" variant="link" onClick={clearHistory}>Xem tất cả series</Button></div>}
            <PodcastSeriesGallery key={`${period}-${phase}-${event?.id ?? "all"}`} filter={{ periodId: period || undefined, phaseId: phase || undefined, eventId: event?.id }} onPlay={async (item, seriesSlug) => { if (!await requestAccess()) return; await startPodcast(seriesSlug, item.id); }} />
          </LibrarySection>

        <LibrarySection id="library-quiz" title="Thử tài lịch sử"><LibraryQuiz /></LibrarySection>
        <LibrarySection id="upcoming" title="Lịch phát sóng"><ReleaseCalendar onListen={async (slug) => { if (await requestAccess()) listenRelease.mutate(slug); }} /></LibrarySection>
      </div>
    </div>
  </div>;
}
