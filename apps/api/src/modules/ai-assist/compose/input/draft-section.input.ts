import type { DraftSectionRequest, ToneInput } from "@repo/shared";
import { toneInstruction } from "../prompts/tone";
import { EPISODE_DESC_MAX_CHARS, SERIES_DESC_MAX_CHARS } from "../constants";
import { angleTag, narratorTag, type AngleInput, type NarratorInput } from "./outline.input";
import { contextTags, tag, wrap, type SeriesContext } from "./xml";

export type SectionPosition = "FIRST" | "MIDDLE" | "LAST";

export const sectionPosition = (index: number, total: number): SectionPosition =>
  index === 0 ? "FIRST" : index === total - 1 ? "LAST" : "MIDDLE";

export const toneTag = (tone: ToneInput): string => tag("tone", {}, toneInstruction(tone));

export interface DraftInputArgs {
  series: SeriesContext;
  episode: SeriesContext;
  sourcesXml: string | null;
  request: DraftSectionRequest;
  angle: AngleInput;
  narrator: NarratorInput | null;
}

/** The whole outline gives the thread (title + goal); only the current section carries its points. */
function outlineXml(request: DraftSectionRequest): string {
  const sections = request.outline.map((section, i) => {
    if (i !== request.index) return tag("section", { index: i, title: section.title }, section.goal);
    const points = section.points.map((p) => tag("point", {}, p)).join("\n");
    return wrap(
      "section",
      { index: i, current: "true", title: section.title, goal: section.goal, targetWords: section.targetWords, position: sectionPosition(i, request.outline.length) },
      points,
    );
  });
  return wrap("outline", {}, sections.join("\n"));
}

/** spec-prompts-compose.md 4.2. `<before>` is dropped for the first section and when there is no previous text. */
export function buildDraftInput(args: DraftInputArgs): string {
  const { request } = args;
  const parts = contextTags(args.series, args.episode, { series: SERIES_DESC_MAX_CHARS, episode: EPISODE_DESC_MAX_CHARS });
  if (args.sourcesXml) parts.push(args.sourcesXml);
  parts.push(tag("topic", {}, request.topic), angleTag(args.angle), toneTag(request.tone));
  if (args.narrator) parts.push(narratorTag(args.narrator));
  parts.push(outlineXml(request));
  const before = request.previousText?.trim();
  if (request.index > 0 && before) parts.push(tag("before", {}, before));
  return parts.join("\n");
}
