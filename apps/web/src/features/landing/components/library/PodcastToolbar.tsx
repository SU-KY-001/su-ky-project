import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { libraryService } from "../../services/libraryService";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";
import { primaryNarration } from "./playlistFormat";
import { PlaylistArtwork } from "./PlaylistArtwork";
import { AudioPlayback } from "./PodcastPlayer";
import { PodcastQuizInvitation } from "./PodcastQuizInvitation";

export function PodcastToolbar(): ReactElement | null {
  const state = usePodcastPlaybackStore();
  const session = useCurrentUser();
  const queryClient = useQueryClient();
  const [invitation, setInvitation] = useState<{ slug: string; title: string; questionCount: number } | null>(null);
  const latestEnd = useRef(0);
  const handledEpisodes = useRef(new Set<string>());
  const toolbar = useRef<HTMLElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(100);
  const episode = state.playlist?.episodes.find(item => item.id === state.episodeId);
  const narration = episode && primaryNarration(episode);
  const visible = Boolean(episode && narration && session.data);
  const listeningSession = visible ? session.data?.id ?? null : null;
  useEffect(() => {
    latestEnd.current++; handledEpisodes.current.clear(); setInvitation(null);
    return () => { latestEnd.current++; };
  }, [listeningSession]);
  useLayoutEffect(() => {
    document.documentElement.dataset.audioToolbar = String(visible);
    return () => { delete document.documentElement.dataset.audioToolbar; };
  }, [visible]);
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!visible || !element) return;
    const update = (): void => { const height = element.getBoundingClientRect().height; if (height > 0) setToolbarHeight(Math.ceil(height)); };
    const observer = new ResizeObserver(update); observer.observe(element); update();
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => { if (!session.isPending && !session.isError && !session.data) state.close(); }, [session.isPending, session.isError, session.data, state.close]);
  if (!visible || !episode || !narration || !session.data || !state.playlist) return null;
  const playable = state.playlist.episodes.filter(item => primaryNarration(item));
  const index = playable.findIndex(item => item.id === episode.id);
  const canPrevious = state.history.length > 0 || index > 0;
  const canNext = state.shuffle ? playable.length > 1 || state.repeat === "all" : index < playable.length - 1 || state.repeat === "all";
  function finishEpisode(): void {
    const ended = episode!;
    const current = usePodcastPlaybackStore.getState();
    if (current.episodeId !== ended.id || current.playRequest !== state.playRequest || current.pauseRequested) return;
    const request = ++latestEnd.current;
    setInvitation(null);
    if (!handledEpisodes.current.has(ended.slug)) {
      void queryClient.fetchQuery({ queryKey: ["quiz-for-finished-episode", session.data!.id, ended.slug], queryFn: ({ signal }) => libraryService.quizzes({ episodeSlug: ended.slug }, signal), staleTime: 0 }).then(result => {
        const quiz = result.items.find(item => item.episodeSlug === ended.slug && item.questionCount > 0);
        if (request === latestEnd.current && quiz && !handledEpisodes.current.has(ended.slug)) setInvitation({ slug: ended.slug, title: ended.title, questionCount: quiz.questionCount });
      }).catch(() => undefined);
    }
    state.next();
  }
  function dismissInvitation(): void { if (invitation) handledEpisodes.current.add(invitation.slug); setInvitation(null); }
  function startQuiz(): void { state.pause(); dismissInvitation(); }
  return createPortal(<><aside ref={toolbar} className="fixed inset-x-0 bottom-0 z-[45] grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_36px_18px] items-center gap-x-3 gap-y-1 border-t border-line bg-paper-soft px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_color-mix(in_srgb,var(--color-ink)_5%,transparent)] min-[761px]:grid-cols-[minmax(0,1fr)_minmax(260px,42vw)_minmax(0,1fr)] min-[761px]:grid-rows-[36px_18px] min-[761px]:gap-x-4 min-[761px]:px-[22px] min-[761px]:pt-3 min-[761px]:pb-[max(12px,env(safe-area-inset-bottom))] min-[1051px]:grid-cols-[minmax(0,1fr)_minmax(280px,520px)_minmax(0,1fr)] min-[1051px]:gap-x-7 [&>[role=alert]]:col-span-2 [&>[role=alert]]:row-span-2 [&>[role=status]]:col-span-2 [&>[role=status]]:row-span-2" aria-label="Thanh phát podcast"><div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 min-[761px]:row-span-2 min-[1051px]:gap-3 [&>.playlist-artwork]:w-8 [&>.playlist-artwork]:shrink-0 min-[421px]:[&>.playlist-artwork]:w-10 min-[1051px]:[&>.playlist-artwork]:w-12"><PlaylistArtwork sources={[episode.poster?.url]} title={`Poster ${episode.title}`} /><div className="flex min-w-0 flex-1 flex-col gap-1"><Link to={`/series/${encodeURIComponent(state.playlist.slug)}?episode=${encodeURIComponent(episode.slug)}`}><strong className="line-clamp-1 text-xs min-[761px]:line-clamp-2">{episode.title}</strong></Link><span className="text-[10px] text-ink-soft">{state.playlist.creator}</span></div><Button variant="ghost" size="icon-sm" aria-label="Đóng thanh phát podcast" onClick={state.close}><X /></Button></div><AudioPlayback key={`${narration.id}-${session.data.id}`} narrationId={narration.id} userId={session.data.id} playlist pauseRequested={state.pauseRequested} playRequest={state.playRequest} onPlayingChange={state.setPlaying} shuffle={state.shuffle} repeat={state.repeat} onShuffle={state.toggleShuffle} onRepeat={state.cycleRepeat} onPrevious={canPrevious ? state.previous : undefined} onNext={canNext ? state.next : undefined} onFinished={finishEpisode} /></aside>{invitation && <PodcastQuizInvitation {...invitation} bottom={toolbarHeight + 12} onStart={startQuiz} onDismiss={dismissInvitation} />}</>, document.body);
}
