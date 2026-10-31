import type { RewriteRequest } from "@repo/shared";
import { EPISODE_DESC_MAX_CHARS, SERIES_DESC_MAX_CHARS } from "../constants";
import { toneTag } from "./draft-section.input";
import { contextTags, tag, wrap, type SeriesContext } from "./xml";

export interface RewriteInputArgs {
  series: SeriesContext;
  episode: SeriesContext;
  sourcesXml: string | null;
  request: RewriteRequest;
}

/** spec-prompts-compose.md 5.2. Optional tags are dropped when empty. */
export function buildRewriteInput(args: RewriteInputArgs): string {
  const { request } = args;
  const parts = contextTags(args.series, args.episode, { series: SERIES_DESC_MAX_CHARS, episode: EPISODE_DESC_MAX_CHARS });
  if (args.sourcesXml) parts.push(args.sourcesXml);
  if (request.tone) parts.push(toneTag(request.tone));
  const before = request.contextBefore?.trim();
  if (before) parts.push(tag("before", {}, before));
  parts.push(wrap("target_text", {}, request.blocks.map((b) => tag("block", { ref: b.ref }, b.text)).join("\n")));
  const after = request.contextAfter?.trim();
  if (after) parts.push(tag("after", {}, after));
  const instruction = request.instruction?.trim();
  if (instruction) parts.push(tag("instruction", {}, instruction));
  parts.push(`<count>${request.count}</count>`);
  return parts.join("\n");
}
