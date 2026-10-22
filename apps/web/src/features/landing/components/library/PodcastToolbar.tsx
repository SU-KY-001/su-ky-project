import { useEffect, useLayoutEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { X } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";
import { primaryNarration } from "./playlistFormat";
import { PlaylistArtwork } from "./PlaylistArtwork";
import { AudioPlayback } from "./PodcastPlayer";
import "./series-playlist.css";

export function PodcastToolbar(): ReactElement | null {
  const state = usePodcastPlaybackStore();
  const session = useCurrentUser();
  const episode = state.playlist?.episodes.find(item => item.id === state.episodeId);
  const narration = episode && primaryNarration(episode);
  const visible = Boolean(episode && narration && session.data);
  useLayoutEffect(() => {
    document.documentElement.dataset.audioToolbar = String(visible);
    return () => { delete document.documentElement.dataset.audioToolbar; };
  }, [visible]);
  useEffect(() => { if (!session.isPending && !session.isError && !session.data) state.close(); }, [session.isPending, session.isError, session.data, state.close]);
  if (!visible || !episode || !narration || !session.data || !state.playlist) return null;
  const playable = state.playlist.episodes.filter(item => primaryNarration(item));
  const index = playable.findIndex(item => item.id === episode.id);
  const canPrevious = state.history.length > 0 || index > 0;
  const canNext = state.shuffle ? playable.length > 1 || state.repeat === "all" : index < playable.length - 1 || state.repeat === "all";
  return createPortal(<aside className="playlist-now-playing" aria-label="Thanh phát podcast"><div className="playlist-current-episode"><PlaylistArtwork sources={[episode.poster?.url]} title={`Poster ${episode.title}`} /><div><Link to={`/series/${encodeURIComponent(state.playlist.slug)}?episode=${encodeURIComponent(episode.slug)}`}><strong>{episode.title}</strong></Link><span>{state.playlist.creator}</span></div><Button variant="ghost" size="icon-sm" aria-label="Đóng thanh phát podcast" onClick={state.close}><X /></Button></div><AudioPlayback key={`${narration.id}-${session.data.id}`} narrationId={narration.id} userId={session.data.id} playlist playRequest={state.playRequest} onPlayingChange={state.setPlaying} shuffle={state.shuffle} repeat={state.repeat} onShuffle={state.toggleShuffle} onRepeat={state.cycleRepeat} onPrevious={canPrevious ? state.previous : undefined} onNext={canNext ? state.next : undefined} onFinished={state.next} /></aside>, document.body);
}
