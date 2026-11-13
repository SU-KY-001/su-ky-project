import { create } from "zustand";

export type PlayerPresentation = "hidden" | "compact" | "expanded";

interface PlayerState {
  episodeId: string | null;
  presentation: PlayerPresentation;
  setEpisode: (episodeId: string) => void;
  setPresentation: (presentation: PlayerPresentation) => void;
  clearEpisode: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  episodeId: null,
  presentation: "hidden",
  setEpisode: (episodeId) => set({ episodeId, presentation: "compact" }),
  setPresentation: (presentation) => set({ presentation }),
  clearEpisode: () => set({ episodeId: null, presentation: "hidden" }),
}));
