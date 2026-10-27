import { useEffect, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
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
import { scrollToLandingTarget } from "../../hooks/useLandingMotion";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";
import "./series-playlist.css";

export function SeriesEpisodes({ slug }: { slug: string }): ReactElement {
  const [params] = useSearchParams();
  const [expandedDescription, setExpandedDescription] = useState(false);
  const playback = usePodcastPlaybackStore();
  const { requestAccess, signedIn, accessDialog } = usePodcastAccess();
  const detail = useQuery({ queryKey: ["library-series", slug], queryFn: ({ signal }) => libraryService.seriesDetail(slug, signal), staleTime: 60000 });
  const selected = detail.data?.episodes.find(item => item.slug === params.get("episode"));
  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => scrollToLandingTarget(`episode-${selected.id}`));
    return () => cancelAnimationFrame(frame);
  }, [selected?.id]);
  const totalDuration = detail.data?.episodes.reduce((sum, episode) => sum + (primaryNarration(episode)?.durationMs ?? 0), 0) ?? 0;
  const missingDuration = detail.data?.episodes.some(episode => !primaryNarration(episode)?.durationMs);
  const creator = detail.data?.creator?.name || "Moderator";
  async function selectEpisode(episode: LibraryChapter): Promise<void> {
    if (!detail.data || !await requestAccess()) return;
    playback.play({ slug, title: detail.data.title, creator, episodes: detail.data.episodes }, episode.id);
  }
  const current = detail.data?.episodes.find(episode => episode.id === playback.episodeId);
  const firstPlayable = detail.data?.episodes.find(episode => primaryNarration(episode));
  const playing = Boolean(current && playback.playing);
  return <main className="series-playlist" data-playing={Boolean(current && signedIn)}>{accessDialog}
    <title>{detail.data ? `${detail.data.title} · Sử Ký Việt Nam` : "Series podcast · Sử Ký Việt Nam"}</title>
    <meta property="og:type" content="music.playlist" />
    <div className="playlist-page-content">
      {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error title="Chưa mở được series" description="Series có thể chưa công khai hoặc kết nối đang gián đoạn." retry={() => { void detail.refetch(); }} /> : <>
        <header className="playlist-header">
          <PlaylistArtwork mosaic sources={detail.data.episodes.slice(0, 4).map(episode => episode.poster?.url)} title={`Ảnh bìa ghép từ các tập của ${detail.data.title}`} />
          <div className="playlist-header-copy"><span className="playlist-eyebrow">Playlist · {detail.data.episodes.length} episode podcast</span><h1>{detail.data.title}</h1><p className="playlist-creator">Tạo bởi <strong>{creator}</strong></p><p className="playlist-meta"><Headphones aria-hidden="true" /><span>Podcast</span><span aria-hidden="true">•</span><time dateTime={detail.data.publishedAt?.toISOString()}>{playlistDate(detail.data.publishedAt)}</time><span aria-hidden="true">•</span><span>{playlistDuration(totalDuration)}{missingDuration && totalDuration > 0 ? " (đã có audio)" : ""}</span></p></div>
        </header>
        <section className="playlist-overview" aria-label="Giới thiệu playlist">
          <Button className="playlist-play playlist-main-play" disabled={!firstPlayable} aria-label={playing ? "Tạm dừng playlist" : "Nghe playlist"} onClick={() => { const episode = current ?? (selected && primaryNarration(selected) ? selected : firstPlayable); if (episode) void selectEpisode(episode); }}>{playing ? <Pause weight="fill" /> : <Play weight="fill" />}</Button>
          {detail.data.description && <div className="playlist-description"><h2>Giới thiệu</h2><p className={expandedDescription ? "" : "line-clamp-3"}>{detail.data.description}</p>{detail.data.description.length > 180 && <Button variant="link" className="h-auto p-0" aria-expanded={expandedDescription} onClick={() => setExpandedDescription(value => !value)}>{expandedDescription ? "Thu gọn" : "Xem thêm"}</Button>}</div>}
        </section>
        <section className="playlist-episodes" aria-labelledby="playlist-episodes-title"><div className="playlist-list-heading"><h2 id="playlist-episodes-title">Các tập podcast</h2><span>{detail.data.episodes.length} tập</span></div>
          {detail.data.episodes.length === 0 ? <LibraryState title="Series chưa có tập đã phát hành" /> : <ol>{detail.data.episodes.map(episode => {
            const audio = primaryNarration(episode);
            const active = playback.episodeId === episode.id && signedIn;
            return <li key={episode.id}><article id={`episode-${episode.id}`} className="playlist-episode scroll-mt-28" data-active={active} data-viewed={selected?.id === episode.id}>
              <PlaylistArtwork sources={[episode.poster?.url]} title={`Poster ${episode.title}`} />
              <div className="playlist-episode-copy"><h3>{episode.title}</h3><p className="playlist-episode-author">{creator}</p><p className="playlist-episode-summary">{episode.description || "Mô tả đang được bổ sung."}</p><p className="playlist-episode-meta"><time dateTime={episode.publishedAt?.toISOString()}>{playlistDate(episode.publishedAt)}</time><span aria-hidden="true">•</span><span>{playlistDuration(audio?.durationMs)}</span></p>{active || selected?.id === episode.id ? <PublicationNotice slug={episode.slug} /> : null}</div>
              <Button size="icon" className="playlist-play playlist-row-play" aria-label={`${active && playing ? "Tạm dừng" : "Nghe"} ${episode.title}`} disabled={!audio} onClick={() => { void selectEpisode(episode); }}>{active && playing ? <Pause weight="fill" /> : <Play weight="fill" />}</Button>
            </article></li>;
          })}</ol>}
        </section>
        {params.has("episode") && !selected && <p role="status" className="my-6 text-sm text-ink-soft">Tập được chọn không còn trong danh sách công khai của series.</p>}
      </>}
    </div>
  </main>;
}
