import { useEffect, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import type { LibraryChapter, LibrarySeries } from "@repo/shared";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { CaretLeft } from "@phosphor-icons/react/dist/icons/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Button } from "@/shared/components/ui/button";
import { libraryService, type LibraryFilter } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { PodcastEpisodeCard } from "./PodcastEpisodeCard";

function SeriesGalleryRow({ series, selectedId, onPlay }: { series: LibrarySeries; selectedId?: string; onPlay: (episode: LibraryChapter, seriesSlug: string) => void }): ReactElement {
  const navigate = useNavigate();
  const detail = useQuery({ queryKey: ["library-series", series.slug], queryFn: ({ signal }) => libraryService.seriesDetail(series.slug, signal), staleTime: 60000 });
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [posterCenter, setPosterCenter] = useState(0);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = (): void => {
      setEdges({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
      const poster = element.querySelector<HTMLElement>("[data-podcast-poster]");
      const container = element.parentElement;
      setPosterCenter(poster && container ? poster.getBoundingClientRect().top - container.getBoundingClientRect().top + poster.offsetHeight / 2 : 0);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const firstPoster = element.querySelector("[data-podcast-poster]");
    if (firstPoster) observer.observe(firstPoster);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [detail.data]);
  function move(direction: number): void { if (rail.current) rail.current.scrollBy({ left: direction * rail.current.clientWidth * .85 }); }
  return <section className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[175px_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-7" aria-labelledby={`gallery-${series.id}`}>
    <header className="flex min-w-0 flex-col items-start sm:py-3"><p className="mb-2.5 text-[10px] uppercase tracking-[.18em] text-bronze-dark">Series</p><h3 className="text-[21px] font-semibold leading-[1.4] tracking-[-.035em] [overflow-wrap:anywhere] sm:text-[clamp(20px,1.8vw,30px)]" id={`gallery-${series.id}`}>{series.title}</h3><span className="mt-2 text-[11px] text-ink-soft sm:mt-3">{series.episodeCount} tập podcast</span><Button asChild variant="link" className="mt-3.5 h-auto p-0 text-xs text-ink sm:mt-6"><Link to={`/series/${encodeURIComponent(series.slug)}`}>Xem toàn bộ <ArrowRight aria-hidden="true" /></Link></Button></header>
    <div className="relative min-w-0">
      {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error title="Chưa tải được các tập của series" retry={() => { void detail.refetch(); }} /> : detail.data.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <>
        <ul id={`podcast-rail-${series.id}`} ref={rail} className="flex snap-x snap-proximity gap-3.5 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-3.5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto sm:gap-5" aria-label={`Tập podcast thuộc ${series.title}`}>{detail.data.episodes.map(episode => <li key={episode.id} className="min-w-0 flex-[0_0_86%] snap-start sm:flex-[0_0_min(100%,clamp(300px,58%,440px))] lg:flex-[0_0_clamp(320px,37%,520px)] min-[1700px]:basis-[37%]"><PodcastEpisodeCard hoverPreview episode={episode} selected={selectedId === episode.id} onPlay={item => onPlay(item, series.slug)} onView={item => navigate(`/series/${encodeURIComponent(series.slug)}?episode=${encodeURIComponent(item.slug)}`)} /></li>)}</ul>
        {!edges.start && <Button size="icon" variant="outline" className="absolute -left-1.5 z-[3] size-11 -translate-y-1/2 rounded-full bg-paper-soft text-ink shadow-md sm:-left-3" style={{ top: posterCenter }} aria-controls={`podcast-rail-${series.id}`} aria-label={`Các tập trước của ${series.title}`} onClick={() => move(-1)}><CaretLeft /></Button>}
        {!edges.end && <Button size="icon" variant="outline" className="absolute -right-1.5 z-[3] size-11 -translate-y-1/2 rounded-full bg-paper-soft text-ink shadow-md sm:-right-3" style={{ top: posterCenter }} aria-controls={`podcast-rail-${series.id}`} aria-label={`Các tập tiếp theo của ${series.title}`} onClick={() => move(1)}><CaretRight /></Button>}
      </>}
    </div>
  </section>;
}

export function PodcastSeriesGallery({ filter, selectedId, onPlay }: { filter: LibraryFilter; selectedId?: string; onPlay: (episode: LibraryChapter, seriesSlug: string) => void }): ReactElement {
  const catalog = useInfiniteQuery({ queryKey: ["library-gallery-series", filter.periodId, filter.phaseId, filter.eventId], initialPageParam: 1, queryFn: ({ pageParam, signal }) => libraryService.series({ ...filter, page: pageParam }, signal), getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined, staleTime: 60000 });
  const series = catalog.data?.pages.flatMap(page => page.items) ?? [];
  if (catalog.isPending) return <LibraryState loading />;
  if (catalog.isError && !catalog.data) return <LibraryState error title="Chưa tải được các series" retry={() => { void catalog.refetch(); }} />;
  if (!series.length) return <LibraryState title="Chưa có series phù hợp" description="Thử một thời kỳ hoặc sự kiện khác để khám phá podcast." />;
  return <div>
    <div className="space-y-7 md:space-y-9">{series.map(item => <SeriesGalleryRow key={item.id} series={item} selectedId={selectedId} onPlay={onPlay} />)}</div>
    {catalog.isFetchNextPageError && <p role="alert" className="mt-6 text-sm text-destructive">Chưa tải thêm được series. Bạn có thể thử lại.</p>}
    {catalog.hasNextPage && <div className="mt-9 flex justify-center"><Button variant="outline" disabled={catalog.isFetchingNextPage} onClick={() => { void catalog.fetchNextPage(); }}>{catalog.isFetchingNextPage ? "Đang tải…" : catalog.isFetchNextPageError ? "Thử tải thêm series" : "Tải thêm series"}</Button></div>}
  </div>;
}
