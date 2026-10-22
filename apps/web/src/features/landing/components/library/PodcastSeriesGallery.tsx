import { useEffect, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import type { LibraryChapter, LibrarySeries } from "@repo/shared";
import { ArrowRight, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { libraryService, type LibraryFilter } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { PodcastEpisodeCard } from "./PodcastEpisodeCard";
import "./podcast-gallery.css";

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
      const poster = element.querySelector<HTMLElement>(".podcast-poster-button");
      const container = element.parentElement;
      setPosterCenter(poster && container ? poster.getBoundingClientRect().top - container.getBoundingClientRect().top + poster.offsetHeight / 2 : 0);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const firstPoster = element.querySelector(".podcast-poster-button");
    if (firstPoster) observer.observe(firstPoster);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [detail.data]);
  function move(direction: number): void { if (rail.current) rail.current.scrollBy({ left: direction * rail.current.clientWidth * .85 }); }
  return <section className="podcast-series-row" aria-labelledby={`gallery-${series.id}`}>
    <header className="podcast-series-heading"><p>Series</p><h3 id={`gallery-${series.id}`}>{series.title}</h3><span>{series.episodeCount} tập podcast</span><Button asChild variant="link" className="podcast-view-all"><Link to={`/series/${encodeURIComponent(series.slug)}`}>Xem toàn bộ <ArrowRight aria-hidden="true" /></Link></Button></header>
    <div className="podcast-rail-container min-w-0">
      {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error title="Chưa tải được các tập của series" retry={() => { void detail.refetch(); }} /> : detail.data.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <>
        <ul id={`podcast-rail-${series.id}`} ref={rail} className="podcast-poster-rail" aria-label={`Tập podcast thuộc ${series.title}`}>{detail.data.episodes.map(episode => <li key={episode.id}><PodcastEpisodeCard hoverPreview episode={episode} selected={selectedId === episode.id} onPlay={item => onPlay(item, series.slug)} onView={item => navigate(`/series/${encodeURIComponent(series.slug)}?episode=${encodeURIComponent(item.slug)}`)} /></li>)}</ul>
        {!edges.start && <Button size="icon" variant="outline" className="podcast-rail-arrow podcast-rail-arrow-prev" style={{ top: posterCenter }} aria-controls={`podcast-rail-${series.id}`} aria-label={`Các tập trước của ${series.title}`} onClick={() => move(-1)}><CaretLeft /></Button>}
        {!edges.end && <Button size="icon" variant="outline" className="podcast-rail-arrow podcast-rail-arrow-next" style={{ top: posterCenter }} aria-controls={`podcast-rail-${series.id}`} aria-label={`Các tập tiếp theo của ${series.title}`} onClick={() => move(1)}><CaretRight /></Button>}
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
