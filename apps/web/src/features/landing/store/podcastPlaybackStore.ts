import { create } from "zustand";
import type { LibraryChapter } from "@repo/shared";
import { primaryNarration } from "../components/library/playlistFormat";

export interface PodcastPlaylist {
  slug: string;
  title: string;
  creator: string;
  episodes: LibraryChapter[];
}

interface PlaybackState {
  playlist: PodcastPlaylist | null;
  episodeId: string | null;
  playRequest: number;
  playing: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  history: string[];
  play: (playlist: PodcastPlaylist, episodeId: string) => void;
  close: () => void;
  setPlaying: (value: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  next: () => void;
  previous: () => void;
}

export const usePodcastPlaybackStore = create<PlaybackState>((set, get) => ({
  playlist: null, episodeId: null, playRequest: 0, playing: false, shuffle: true, repeat: "off", history: [],
  play: (playlist, episodeId) => {
    if (!playlist.episodes.some(episode => episode.id === episodeId && primaryNarration(episode))) return;
    set(state => ({ playlist, episodeId, playRequest: state.playRequest + 1, playing: state.episodeId === episodeId ? state.playing : false, history: state.playlist?.slug === playlist.slug ? state.episodeId && state.episodeId !== episodeId ? [...state.history, state.episodeId] : state.history : [] }));
  },
  close: () => set({ playlist: null, episodeId: null, playing: false, history: [] }),
  setPlaying: playing => set({ playing }),
  toggleShuffle: () => set(state => ({ shuffle: !state.shuffle })),
  cycleRepeat: () => set(state => ({ repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" })),
  next: () => {
    const state = get();
    if (!state.playlist) return;
    const playable = state.playlist.episodes.filter(episode => primaryNarration(episode));
    const index = playable.findIndex(episode => episode.id === state.episodeId);
    const candidates = playable.filter(episode => episode.id !== state.episodeId);
    const next = state.shuffle && candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : playable[index + 1] ?? (state.repeat === "all" ? playable[0] : undefined);
    if (next) state.play(state.playlist, next.id);
  },
  previous: () => {
    const state = get();
    if (!state.playlist) return;
    const playable = state.playlist.episodes.filter(episode => primaryNarration(episode));
    const previous = playable.find(episode => episode.id === state.history.at(-1)) ?? playable[playable.findIndex(episode => episode.id === state.episodeId) - 1];
    if (previous) set({ episodeId: previous.id, history: state.history.slice(0, -1), playing: false, playRequest: state.playRequest + 1 });
  },
}));
