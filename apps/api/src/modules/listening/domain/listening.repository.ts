import type {
  CompletionAward,
  EpisodeDetailEntity,
  ListeningProgressEntity,
  ListeningProgressWithAudio,
  ListeningProgressWithHistory,
  NarrationWithAudio,
  SeriesDetailEntity,
  SeriesWithCoverAndCount,
} from "./listening.entity";

export interface PublicSeriesQuery {
  page: number;
  limit: number;
  topicId?: string;
  historicalPeriodId?: string;
  fromYear?: number;
  toYear?: number;
  q?: string;
}

/**
 * One transactional unit of work for `PUT /listening-progress/:narrationId`:
 * row-lock the user's progress row, merge the client bitmap against the stored
 * bits within the rate budget, mark completion, and award XP/mission progress.
 *
 * `bitmap` is the validated, zero-padded request bitmap; `merge` and `budget`
 * are application-owned pure policies so the adapter only orchestrates the DB.
 */
export interface ApplyProgressCommand {
  userId: string;
  narrationId: string;
  episodeId: string;
  assetId: string;
  positionMs: number;
  bitmap: Uint8Array;
  totalSeconds: number;
  now: Date;
  /** Monday 00:00 Vietnam time for the weekly-mission window (see mondayInVietnam). */
  weekStartDate: Date;
  xpPerEpisodeCompletion: number;
  completionRatio: number;
  /** Elapsed seconds since the last listen -> how many new bits may be accepted. */
  budget: (elapsedSeconds: number) => number;
  /** (stored bits, allowed budget) -> merged bitmap with `playedSeconds` counted. */
  merge: (stored: Uint8Array, allowed: number) => { bitmap: Uint8Array; playedSeconds: number };
}

export interface ApplyProgressResult {
  positionMs: number;
  playedSeconds: number;
  completedAt: Date | null;
  completion: CompletionAward | null;
}

export interface ListeningRepository {
  /** Public narration (published episode + published series + READY audio) with its audio asset. */
  findPublicNarration(narrationId: string): Promise<NarrationWithAudio | null>;
  findProgress(userId: string, narrationId: string): Promise<ListeningProgressEntity | null>;
  findProgressWithAudio(userId: string, narrationId: string): Promise<ListeningProgressWithAudio | null>;
  applyProgress(command: ApplyProgressCommand): Promise<ApplyProgressResult>;
  /** Published series page (cover asset + published-episode count) and total. */
  listPublicSeries(query: PublicSeriesQuery): Promise<{ items: SeriesWithCoverAndCount[]; total: number }>;
  /** Published series by slug with published episodes + narrations (audio assets included). */
  findPublicSeriesBySlug(slug: string): Promise<SeriesDetailEntity | null>;
  /** Bare progress rows for any of the given episodes (used for the viewer block of /series/:slug). */
  findProgressByEpisodeIds(userId: string, episodeIds: string[]): Promise<ListeningProgressEntity[]>;
  /** Published episode by slug with series (cover + sibling refs), narrations, sources, confirmed tags, quiz. */
  findPublicEpisodeBySlug(slug: string): Promise<EpisodeDetailEntity | null>;
  /** Progress rows incl. audio asset for one episode (viewer block of /episodes/:slug). */
  findProgressForEpisode(userId: string, episodeId: string): Promise<ListeningProgressWithAudio[]>;
  /** All of the user's progress rows newest-first, with audio asset and episode + series. */
  listListeningHistory(userId: string): Promise<ListeningProgressWithHistory[]>;
}
