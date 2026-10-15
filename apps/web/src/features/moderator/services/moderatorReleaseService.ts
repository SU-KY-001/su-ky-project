import {
  AssignableEpisodeListSchema,
  AssignedReleaseListSchema,
  EpisodeReviewRecordSchema,
  ReleaseProgressListSchema,
  ReleaseReminderListSchema,
} from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import { z } from "zod";

async function parse<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const response = await request;
  if (!response.ok) throw await ApiError.fromResponse(response);
  return schema.parse(await response.json());
}

const releases = client.api.studio.releases;

export const moderatorReleaseService = {
  assignments: () => parse(releases.assignments.$get(), AssignedReleaseListSchema),
  assignableEpisodes: () => parse(releases["assignable-episodes"].$get(), AssignableEpisodeListSchema),
  reviewQueue: () => parse(releases["review-queue"].$get(), AssignedReleaseListSchema),
  reminders: () => parse(releases.reminders.$get(), ReleaseReminderListSchema),
  progress: (id: string) => parse(releases[":id"].progress.$get({ param: { id } }), ReleaseProgressListSchema),
  linkEpisode: (id: string, episodeId: string) =>
    parse(
      releases[":id"]["link-episode"].$post({
        param: { id },
        json: { episodeId },
      }),
      AssignedReleaseListSchema.shape.items.element,
    ),
  submitReview: (id: string, contentRevision: number) =>
    parse(
      releases[":id"]["submit-review"].$post({
        param: { id },
        json: { contentRevision },
      }),
      EpisodeReviewRecordSchema,
    ),
  review: (
    id: string,
    input:
      | { decision: "APPROVE"; contentRevision: number; reviewNote?: string | null }
      | { decision: "REQUEST_CHANGES"; contentRevision: number; reviewNote: string },
  ) =>
    parse(
      releases[":id"].review.$post({ param: { id }, json: input }),
      EpisodeReviewRecordSchema,
    ),
};
