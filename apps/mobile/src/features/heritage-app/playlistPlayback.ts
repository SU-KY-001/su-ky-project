export type PlaylistMode = "normal" | "shuffle" | "repeat";

export function nextPlaylistMode(mode: PlaylistMode): PlaylistMode {
  return mode === "normal" ? "shuffle" : mode === "shuffle" ? "repeat" : "normal";
}

export function playlistOrder<T extends { episodeId: string }>(tracks: T[], mode: PlaylistMode, currentId?: string, random: () => number = Math.random): T[] {
  const ordered = [...tracks];
  if (mode !== "shuffle") return ordered;
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
  }
  const index = ordered.findIndex((track) => track.episodeId === currentId);
  if (index > 0) ordered.unshift(ordered.splice(index, 1)[0]!);
  return ordered;
}

export function nextQueueIndex(index: number, count: number, mode: PlaylistMode): number | null {
  if (count === 0) return null;
  if (index + 1 < count) return index + 1;
  return mode === "repeat" ? 0 : null;
}
