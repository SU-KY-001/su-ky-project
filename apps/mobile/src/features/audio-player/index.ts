// Playback, download, background audio, and lock-screen behavior are out of scope
// for this structural scaffold. The Zustand store only tracks player presentation.
export { usePlayerStore } from "./store/playerStore";
export type { PlayerPresentation } from "./store/playerStore";
