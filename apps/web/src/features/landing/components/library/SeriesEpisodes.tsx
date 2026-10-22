import type { ReactElement } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Headphones } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { PodcastEpisodeCard } from "./PodcastEpisodeCard";
import { PodcastPlayer } from "./PodcastPlayer";
import "./podcast-gallery.css";

export function SeriesEpisodes({ slug }: { slug: string }): ReactElement {
  const [params, setParams] = useSearchParams();
  const detail = useQuery({ queryKey: ["library-series", slug], queryFn: ({ signal }) => libraryService.seriesDetail(slug, signal), staleTime: 60000 });
  const selected = detail.data?.episodes.find(item => item.slug === params.get("episode"));
  return <main className="min-h-dvh bg-paper px-4 py-8 text-ink sm:px-8 lg:px-14"><div className="mx-auto max-w-[1500px]">
    <Button asChild variant="link" className="mb-8 px-0"><Link to="/#library-podcasts"><ArrowLeft />Về thư viện podcast</Link></Button>
    {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error title="Chưa mở được series" description="Series có thể chưa công khai hoặc kết nối đang gián đoạn." retry={() => { void detail.refetch(); }} /> : <>
      <header className="mb-10 max-w-3xl"><p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-bronze-dark"><Headphones aria-hidden="true" />Series podcast · {detail.data.episodes.length} tập</p><h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{detail.data.title}</h1>{detail.data.description && <p className="mt-5 whitespace-pre-line text-sm leading-8 text-ink-soft">{detail.data.description}</p>}</header>
      {selected && <section id="series-player" aria-label="Trình nghe podcast" className="mb-10 max-w-3xl"><div className="mb-3 flex justify-end"><Button variant="ghost" size="sm" onClick={() => { const next = new URLSearchParams(params); next.delete("episode"); setParams(next, { preventScrollReset: true }); }}>Đóng trình nghe</Button></div><PodcastPlayer key={selected.id} chapter={selected} /></section>}
      {params.has("episode") && !selected && <p role="status" className="mb-6 text-sm text-ink-soft">Tập được chọn không còn trong danh sách công khai của series.</p>}
      <section aria-label="Toàn bộ tập podcast">{detail.data.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <ul className="podcast-series-grid">{detail.data.episodes.map(episode => <li key={episode.id}><PodcastEpisodeCard episode={episode} selected={selected?.id === episode.id} onPlay={item => { const next = new URLSearchParams(params); next.set("episode", item.slug); setParams(next, { preventScrollReset: true }); window.scrollTo({ top: 0, behavior: "instant" }); }} /></li>)}</ul>}</section>
    </>}
  </div></main>;
}
