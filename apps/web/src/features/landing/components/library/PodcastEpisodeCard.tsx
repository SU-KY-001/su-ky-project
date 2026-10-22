import { useState, type ReactElement } from "react";
import type { LibraryChapter } from "@repo/shared";
import { Clock, Image as ImageIcon, Play } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";

export function PodcastEpisodeCard({ episode, selected, onPlay }: { episode: LibraryChapter; selected: boolean; onPlay: (episode: LibraryChapter) => void }): ReactElement {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const poster = episode.poster?.url;
  const narration = episode.narrations.find(item => item.available && item.type === "THIRD_PERSON") ?? episode.narrations.find(item => item.available);
  const seconds = narration?.durationMs ? Math.ceil(narration.durationMs / 1000) : null;
  const duration = seconds === null ? "Chưa có thời lượng" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <article className="podcast-poster-card" data-selected={selected}>
    <Button variant="ghost" className="podcast-poster-button" aria-label={`Chọn nghe ${episode.title}`} aria-pressed={selected} onClick={() => onPlay(episode)}>
      {poster && failedSrc !== poster ? <img src={poster} alt={`Poster ${episode.title}`} loading="lazy" decoding="async" onError={() => setFailedSrc(poster)} /> : <span className="podcast-poster-fallback"><ImageIcon size={42} weight="light" aria-hidden="true" /><span>Chưa có poster</span></span>}
      <span className="podcast-episode-number">Tập {String(Math.max(1, episode.sortOrder)).padStart(2, "0")}</span>
      <span className="podcast-poster-play"><Play weight="fill" aria-hidden="true" /></span>
    </Button>
    <div className="podcast-poster-copy"><h4>{episode.title}</h4><p className="podcast-poster-description">{episode.description?.trim() || "Mô tả đang được bổ sung."}</p><p className="podcast-poster-duration"><Clock aria-hidden="true" /><span title={narration?.type === "FIRST_PERSON" ? "Thời lượng lời kể nhân vật" : "Thời lượng người dẫn chuyện"}>{duration}</span>{!narration && <span>· Bản thu đang chuẩn bị</span>}</p></div>
  </article>;
}
