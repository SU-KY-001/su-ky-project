import {
  DraftSectionResponseSchema,
  OutlineResponseSchema,
  RewriteResponseSchema,
  type CreateOutlineInput,
  type DraftSectionRequest,
  type RewriteRequest,
} from "@repo/shared";
import { client } from "@/lib/client";
import { parse } from "../services/podcastProductionService";

const episodes = client.api.studio.episodes[":id"].ai;

/** Every call takes the AbortSignal of the open dialog: closing the dialog cancels the model call server-side too. */
export const composeService = {
  outline: (id: string, json: CreateOutlineInput, signal: AbortSignal) =>
    parse(episodes.outline.$post({ param: { id }, json }, { init: { signal } }), OutlineResponseSchema),
  draftSection: (id: string, json: DraftSectionRequest, signal: AbortSignal) =>
    parse(episodes["draft-section"].$post({ param: { id }, json }, { init: { signal } }), DraftSectionResponseSchema),
  rewrite: (id: string, json: RewriteRequest, signal: AbortSignal) =>
    parse(episodes.rewrite.$post({ param: { id }, json }, { init: { signal } }), RewriteResponseSchema),
};
