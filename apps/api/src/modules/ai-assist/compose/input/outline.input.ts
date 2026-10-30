import { OUTLINE_MAX_SECTIONS, OUTLINE_MIN_SECTIONS } from "@repo/shared";
import { EPISODE_DESC_MAX_CHARS, NARRATOR_SUMMARY_MAX_CHARS, OUTLINE_WORDS_PER_SECTION, SERIES_DESC_MAX_CHARS } from "../constants";
import { clip, contextTags, escapeAttr, tag, type SeriesContext } from "./xml";

export interface AngleInput {
  name: string;
  description: string;
  guide: string;
}

export interface NarratorInput {
  name: string;
  summary: string | null;
}

export const suggestedSections = (targetWords: number): number =>
  Math.min(OUTLINE_MAX_SECTIONS, Math.max(OUTLINE_MIN_SECTIONS, Math.round(targetWords / OUTLINE_WORDS_PER_SECTION)));

export const angleTag = (angle: AngleInput): string => tag("angle", { name: angle.name, description: angle.description }, angle.guide);

/** FIRST_PERSON only; the caller passes null otherwise. */
export const narratorTag = (narrator: NarratorInput): string =>
  tag("narrator", { name: narrator.name }, narrator.summary ? clip(narrator.summary, NARRATOR_SUMMARY_MAX_CHARS) : undefined);

export interface OutlineInputArgs {
  series: SeriesContext;
  episode: SeriesContext;
  sourcesXml: string | null;
  topic: string;
  angle: AngleInput;
  narrator: NarratorInput | null;
  targetWords: number;
}

/** spec-prompts-compose.md 2.2: stable context first, then the request. */
export function buildOutlineInput(args: OutlineInputArgs): string {
  const parts = contextTags(args.series, args.episode, { series: SERIES_DESC_MAX_CHARS, episode: EPISODE_DESC_MAX_CHARS });
  if (args.sourcesXml) parts.push(args.sourcesXml);
  parts.push(tag("topic", {}, args.topic), angleTag(args.angle));
  if (args.narrator) parts.push(narratorTag(args.narrator));
  parts.push(`<target words="${escapeAttr(String(args.targetWords))}" suggestedSections="${suggestedSections(args.targetWords)}"/>`);
  return parts.join("\n");
}
