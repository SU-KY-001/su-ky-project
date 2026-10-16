import {
  ReleaseDashboardSchema,
  ReleaseModeratorListSchema,
  ReleaseModeratorWorkloadListSchema,
  ReleaseProgressListSchema,
  ReleaseSchedulePageSchema,
  ReleaseScheduleRecordSchema,
  SystemHealthSchema,
  EpisodeWorkspaceSchema,
  EpisodeReviewRecordSchema,
  type ReviewEpisodeInput,
  type ReleaseScheduleStatus,
  type ReleaseScheduleScope,
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

export interface ReleaseScheduleDraft {
  title: string;
  episodeId?: string | null;
  productionDeadline: string;
  scheduledAt: string;
  moderatorId: string;
}

export interface ReleaseScheduleFilter {
  status?: ReleaseScheduleStatus;
  scope?: ReleaseScheduleScope;
  from?: string;
  to?: string;
  q?: string;
  moderatorId?: string;
  page?: number;
  limit?: number;
}

const admin = client.api.admin.releases;

export const adminReleaseService = {
  health: async () => {
    const response = await client.health.$get();
    // A degraded healthcheck intentionally returns 503 with a valid health body.
    if (!response.ok && response.status !== 503) throw await ApiError.fromResponse(response);
    return SystemHealthSchema.parse(await response.json());
  },
  get: (id: string) => parse(admin[":id"].$get({ param: { id } }), ReleaseScheduleRecordSchema),
  content: (episodeId: string) => parse(
    client.api.studio.episodes[":id"].$get({ param: { id: episodeId } }), EpisodeWorkspaceSchema,
  ),
  review: (id: string, input: ReviewEpisodeInput) => parse(
    admin[":id"].review.$post({ param: { id }, json: input }), EpisodeReviewRecordSchema,
  ),
  dashboard: () => parse(admin.dashboard.$get(), ReleaseDashboardSchema),
  moderators: () => parse(admin.moderators.$get(), ReleaseModeratorListSchema),
  list: (filter: ReleaseScheduleFilter = {}) =>
    parse(
      admin.$get({
        query: {
          status: filter.status,
          scope: filter.scope,
          from: filter.from,
          to: filter.to,
          q: filter.q,
          moderatorId: filter.moderatorId,
          page: String(filter.page ?? 1),
          limit: String(filter.limit ?? 50),
        },
      }),
      ReleaseSchedulePageSchema,
    ),
  create: (draft: ReleaseScheduleDraft) =>
    parse(
      admin.$post({
        json: {
          ...draft,
          productionDeadline: new Date(draft.productionDeadline),
          scheduledAt: new Date(draft.scheduledAt),
        },
      }),
      ReleaseScheduleRecordSchema,
    ),
  update: (
    id: string,
    patch: Partial<Omit<ReleaseScheduleDraft, "moderatorId">> & {
      baseUpdatedAt: Date;
    },
  ) =>
    parse(
      admin[":id"].$patch({
        param: { id },
        json: {
          ...patch,
          productionDeadline: patch.productionDeadline
            ? new Date(patch.productionDeadline)
            : undefined,
          scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt) : undefined,
        },
      }),
      ReleaseScheduleRecordSchema,
    ),
  replaceAssignee: (id: string, moderatorId: string) =>
    parse(
      admin[":id"].assignees.$put({ param: { id }, json: { moderatorId } }),
      ReleaseScheduleRecordSchema,
    ),
  progress: (id: string) =>
    parse(admin[":id"].progress.$get({ param: { id } }), ReleaseProgressListSchema),
  workload: () =>
    parse(admin.workload.$get(), ReleaseModeratorWorkloadListSchema),
  checkReadiness: (id: string) =>
    parse(
      admin[":id"]["check-readiness"].$post({ param: { id } }),
      ReleaseScheduleRecordSchema,
    ),
  publishNow: async (id: string) => {
    const response = await admin[":id"]["publish-now"].$post({ param: { id } });
    if (!response.ok) throw await ApiError.fromResponse(response);
    return response.json();
  },
  retry: async (id: string) => {
    const response = await admin[":id"].retry.$post({ param: { id } });
    if (!response.ok) throw await ApiError.fromResponse(response);
    return response.json();
  },
  cancel: async (id: string) => {
    const response = await admin[":id"].cancel.$post({ param: { id } });
    if (!response.ok) throw await ApiError.fromResponse(response);
    return response.json();
  },
};
