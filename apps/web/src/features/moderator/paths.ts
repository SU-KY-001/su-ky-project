import { APP_PATHS } from "@/shared/constants/routes";
import type { ModeratorSection } from "./types";

const BASE = APP_PATHS.moderator;

// `satisfies Record` makes adding a ModeratorSection without a URL a compile error.
export const moderatorSectionPath = {
  overview: BASE,
  timeline: `${BASE}/timeline`,
  events: `${BASE}/events`,
  sources: `${BASE}/sources`,
  podcast: `${BASE}/podcast`,
  assignments: `${BASE}/assignments`,
  tickets: `${BASE}/tickets`,
  pending: `${BASE}/pending`,
  schedule: `${BASE}/schedule`,
  angles: `${BASE}/angles`,
  quizzes: `${BASE}/quizzes`,
} as const satisfies Record<ModeratorSection, string>;

/** Sections other than overview; their URL segment equals the section id. */
export const MODERATOR_SECTION_SEGMENTS = (Object.keys(moderatorSectionPath) as ModeratorSection[]).filter(
  (section): section is Exclude<ModeratorSection, "overview"> => section !== "overview",
);

export function moderatorSectionFromPath(pathname: string): ModeratorSection {
  const segment = pathname.split("/")[2];
  return MODERATOR_SECTION_SEGMENTS.find((section) => section === segment) ?? "overview";
}

export const moderatorPodcastPath = {
  list: moderatorSectionPath.podcast,
  newSeries: `${moderatorSectionPath.podcast}/series/new`,
  newEpisode: `${moderatorSectionPath.podcast}/episodes/new`,
  series: (id: string) => `${moderatorSectionPath.podcast}/series/${encodeURIComponent(id)}`,
  episode: (id: string) => `${moderatorSectionPath.podcast}/episodes/${encodeURIComponent(id)}`,
} as const;

/** Router patterns for the podcast sub-routes; kept next to the builders above so they cannot drift. */
export const moderatorPodcastPattern = {
  newSeries: moderatorPodcastPath.newSeries,
  newEpisode: moderatorPodcastPath.newEpisode,
  series: `${moderatorSectionPath.podcast}/series/:seriesId`,
  episode: `${moderatorSectionPath.podcast}/episodes/:episodeId`,
} as const;
