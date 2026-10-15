import {
  ReleaseDashboardSchema,
  ReleaseModeratorListSchema,
  ReleaseProgressListSchema,
  ReleaseSchedulePageSchema,
  ReleaseScheduleRecordSchema,
  type ReleaseScheduleStatus,
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
  moderatorIds: string[];
}

export interface ReleaseScheduleFilter {
  status?: ReleaseScheduleStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const admin = client.api.admin.releases;

export const adminReleaseService = {
  dashboard: () => parse(admin.dashboard.$get(), ReleaseDashboardSchema),
  moderators: () => parse(admin.moderators.$get(), ReleaseModeratorListSchema),
  list: (filter: ReleaseScheduleFilter = {}) =>
    parse(
      admin.$get({
        query: {
          status: filter.status,
          from: filter.from,
          to: filter.to,
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
    patch: Partial<Omit<ReleaseScheduleDraft, "moderatorIds">> & {
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
  replaceAssignees: (id: string, moderatorIds: string[]) =>
    parse(
      admin[":id"].assignees.$put({ param: { id }, json: { moderatorIds } }),
      ReleaseScheduleRecordSchema,
    ),
  progress: (id: string) =>
    parse(admin[":id"].progress.$get({ param: { id } }), ReleaseProgressListSchema),
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
