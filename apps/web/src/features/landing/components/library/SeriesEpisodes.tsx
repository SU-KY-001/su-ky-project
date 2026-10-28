import { useState, type ReactElement } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LibraryChapter } from "@repo/shared";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Play } from "@phosphor-icons/react/dist/icons/Play";
import { Pause } from "@phosphor-icons/react/dist/icons/Pause";
import { Button } from "@/shared/components/ui/button";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { PlaylistArtwork } from "./PlaylistArtwork";
import { playlistDate, playlistDuration, primaryNarration } from "./playlistFormat";
import { PublicationNotice } from "./PublicationNotice";
import { usePodcastAccess } from "../../hooks/usePodcastAccess";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";

export function SeriesEpisodes({ slug }: { slug: string }): ReactElement {
  const [params] = useSearchParams();
  const [expandedDescription, setExpandedDescription] = useState(false);
  const playback = usePodcastPlaybackStore();
  const reducedMotion = useReducedMotion();
  const { requestAccess, signedIn, accessDialog } = usePodcastAccess();
  const detail = useQuery({ queryKey: ["library-series", slug], queryFn: ({ signal }) => libraryService.seriesDetail(slug, signal), staleTime: 60000 });
  const selected = detail.data?.episodes.find(item => item.slug === params.get("episode"));
  const totalDuration = detail.data?.episodes.reduce((sum, episode) => sum + (primaryNarration(episode)?.durationMs ?? 0), 0) ?? 0;
  const missingDuration = detail.data?.episodes.some(episode => !primaryNarration(episode)?.durationMs);
  const creator = detail.data?.creator?.name || "Moderator";
  async function selectEpisode(episode: LibraryChapter): Promise<void> {
    if (!detail.data || !await requestAccess()) return;
    playback.play({ slug, title: detail.data.title, creator, episodes: detail.data.episodes }, episode.id);
  }
  const current = playback.playlist?.slug === slug ? detail.data?.episodes.find(episode => episode.id === playback.episodeId) : undefined;
  const firstPlayable = detail.data?.episodes.find(episode => primaryNarration(episode));
  const playing = Boolean(current && playback.playing);
  return <main className="relative isolate min-h-dvh overflow-clip bg-transparent text-ink" data-playing={Boolean(current && signedIn)}>{accessDialog}
    <title>{detail.data ? `${detail.data.title} · Sử Ký Việt Nam` : "Series podcast · Sử Ký Việt Nam"}</title>
    <meta property="og:type" content="music.playlist" />
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(680px,95vh,1000px)] overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] after:absolute after:inset-0 after:bg-paper/70" aria-hidden="true">
      <AnimatePresence initial={false}>
        {current?.poster?.url && <motion.img className="absolute inset-0 size-full object-cover object-center saturate-[.7]" key={current.id} src={current.poster.url} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.6 }} />}
      </AnimatePresence>
    </div>
    <div className="mx-auto max-w-[1450px] px-[clamp(20px,4vw,64px)] pb-16 pt-[116px]">
      {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error title="Chưa mở được series" description="Series có thể chưa công khai hoặc kết nối đang gián đoạn." retry={() => { void detail.refetch(); }} /> : <>
        <header className="relative isolate grid grid-cols-1 items-end gap-6 pb-9 pt-6 min-[541px]:grid-cols-[200px_minmax(0,1fr)] min-[901px]:grid-cols-[260px_minmax(0,1fr)] min-[901px]:gap-8">
          <PlaylistArtwork mosaic sources={detail.data.episodes.slice(0, 4).map(episode => episode.poster?.url)} title={`Ảnh bìa ghép từ các tập của ${detail.data.title}`} />
          <div className="min-w-0"><span className="text-xs font-medium">Playlist · {detail.data.episodes.length} episode podcast</span><h1 className="mb-[22px] mt-3.5 text-[34px] font-bold leading-[1.13] tracking-[-.05em] [overflow-wrap:anywhere] min-[541px]:text-[clamp(32px,4.7vw,70px)]">{detail.data.title}</h1><p className="text-sm text-ink-soft">Tạo bởi <strong className="text-ink">{creator}</strong></p><p className="mt-4 flex flex-wrap items-center gap-2 text-xs leading-[1.8] text-ink-soft [&>svg]:size-[17px]"><Headphones aria-hidden="true" /><span>Podcast</span><span aria-hidden="true">•</span><time dateTime={detail.data.publishedAt?.toISOString()}>{playlistDate(detail.data.publishedAt)}</time><span aria-hidden="true">•</span><span>{playlistDuration(totalDuration)}{missingDuration && totalDuration > 0 ? " (đã có audio)" : ""}</span></p></div>
        </header>
        <section className="my-7 flex flex-col items-start gap-6 min-[541px]:mb-11 min-[541px]:mt-9 min-[541px]:gap-[30px]" aria-label="Giới thiệu playlist">
          <Button className="size-[62px] rounded-full border-0 bg-vermilion text-paper-soft hover:bg-vermilion-dark [&_svg]:!size-[27px]" disabled={!firstPlayable} aria-label={playing ? "Tạm dừng playlist" : "Nghe playlist"} onClick={() => { const episode = current ?? (selected && primaryNarration(selected) ? selected : firstPlayable); if (episode) void selectEpisode(episode); }}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</Button>
          {detail.data.description && <div className="max-w-[850px]"><h2 className="mb-5 w-fit border-b-2 border-vermilion pb-3 text-sm font-semibold">Giới thiệu</h2><p className={`mb-2 whitespace-pre-line text-sm leading-[1.9] text-ink-soft ${expandedDescription ? "" : "line-clamp-3"}`}>{detail.data.description}</p>{detail.data.description.length > 180 && <Button variant="link" className="h-auto p-0" aria-expanded={expandedDescription} onClick={() => setExpandedDescription(value => !value)}>{expandedDescription ? "Thu gọn" : "Xem thêm"}</Button>}</div>}
        </section>
        <section aria-labelledby="playlist-episodes-title"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold min-[541px]:text-[22px]" id="playlist-episodes-title">Các tập podcast</h2><span className="text-xs text-ink-soft">{detail.data.episodes.length} tập</span></div>
          {detail.data.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <ol className="flex flex-col gap-2">{detail.data.episodes.map(episode => {
            const audio = primaryNarration(episode);
            const active = current?.id === episode.id && signedIn;
            return <li key={episode.id}><article id={`episode-${episode.id}`} className="group relative grid scroll-mt-28 grid-cols-[80px_minmax(0,1fr)] items-start gap-3.5 rounded-[14px] px-2 py-4 transition-colors hover:bg-bronze/10 focus-within:bg-bronze/10 data-[active=true]:bg-bronze/10 motion-reduce:transition-none min-[541px]:grid-cols-[130px_minmax(0,1fr)_42px] min-[541px]:items-center min-[541px]:gap-4 min-[541px]:p-[18px] min-[901px]:grid-cols-[180px_minmax(0,1fr)_52px] min-[901px]:gap-6 [&>.playlist-artwork]:aspect-square min-[541px]:[&>.playlist-artwork]:aspect-[16/10]" data-active={active}>
              <button type="button" className="absolute inset-0 z-[1] size-full cursor-pointer rounded-[inherit] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed" aria-label={`${active && playing ? "Tạm dừng" : "Nghe"} ${episode.title}`} aria-current={active ? "true" : undefined} disabled={!audio} onClick={() => { void selectEpisode(episode); }} />
              <PlaylistArtwork sources={[episode.poster?.url]} title={`Poster ${episode.title}`} />
              <div><h3 className="text-sm font-semibold leading-normal min-[541px]:text-[17px]">{episode.title}</h3><p className="mt-[3px] text-xs text-ink-soft">{creator}</p><p className="mt-2 line-clamp-2 text-xs leading-[1.8] text-ink-soft group-data-[active=true]:block group-data-[active=true]:whitespace-pre-line min-[541px]:mt-3 min-[541px]:text-[13px]">{episode.description || "Mô tả đang được bổ sung."}</p><p className="mt-[9px] flex flex-wrap gap-1.5 text-[10px] font-medium min-[541px]:text-xs"><time dateTime={episode.publishedAt?.toISOString()}>{playlistDate(episode.publishedAt)}</time><span aria-hidden="true">•</span><span>{playlistDuration(audio?.durationMs)}</span></p>{active ? <PublicationNotice slug={episode.slug} /> : null}</div>
              <span className={`col-start-2 -mt-1 grid size-[38px] place-items-center justify-self-end rounded-full bg-vermilion text-paper-soft min-[541px]:col-auto min-[541px]:mt-0 min-[541px]:size-[42px] [&>svg]:size-[18px] ${audio ? "" : "opacity-50"}`} aria-hidden="true">{active && playing ? <Pause weight="fill" /> : <Play weight="fill" />}</span>
            </article></li>;
          })}</ol>}
        </section>
        {params.has("episode") && !selected && <p role="status" className="my-6 text-sm text-ink-soft">Tập được chọn không còn trong danh sách công khai của series.</p>}
      </>}
    </div>
  </main>;
}
