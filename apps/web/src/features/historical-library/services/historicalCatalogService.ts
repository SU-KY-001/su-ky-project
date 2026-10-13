import { z } from "zod";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";
import {
  HistoricalPeriodDetailSchema,
  HistoricalPhaseDetailSchema,
  HistoricalEntityDetailSchema,
  HistoricalCitationSchema,
  CatalogSourceSchema,
  CatalogSummarySchema,
  paginatedSchema,
  CreateSourceSchema,
  PatchSourceSchema,
  HistoricalEntityReviewSchema,
  SourceReviewSchema,
  PublicHistoricalEventSchema,
  type HistoricalTimeDto,
  type CatalogSourceDto,
} from "@repo/shared";

export type HistoricalKind = "period" | "phase" | "entity";
export interface HistoricalDraft {
  kind: HistoricalKind;
  name: string;
  summary: string;
  time: HistoricalTimeDto;
  periodId?: string;
  historicalPhaseId?: string;
}
export interface CatalogFilter {
  q?: string;
  page?: number;
  periodId?: string;
  historicalPhaseId?: string;
  reviewStatus?: "DRAFT" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED";
  includeDeleted?: boolean;
}
const periodPage = paginatedSchema(HistoricalPeriodDetailSchema),
  phasePage = paginatedSchema(HistoricalPhaseDetailSchema),
  entityPage = paginatedSchema(HistoricalEntityDetailSchema),
  sourcePage = paginatedSchema(CatalogSourceSchema);
const studio = client.api.studio;
async function parse<S extends z.ZodTypeAny>(
  request: Promise<Pick<Response, "ok" | "json" | "status" | "headers">>,
  schema: S,
): Promise<z.infer<S>> {
  const res = await request;
  if (!res.ok) throw await ApiError.fromResponse(res);
  return schema.parse(res.status === 204 ? undefined : await res.json());
}
const headers = (key: string) => ({ headers: { "Idempotency-Key": key } });
const query = (f: CatalogFilter) => ({
  q: f.q,
  page: String(f.page ?? 1),
  limit: "20",
  periodId: f.periodId,
  historicalPhaseId: f.historicalPhaseId,
  reviewStatus: f.reviewStatus,
  includeDeleted: String(f.includeDeleted ?? false),
  includePhases: "false",
  type: "EVENT" as const,
});
function ownerClient(kind: HistoricalKind) {
  return kind === "period"
    ? studio["historical-periods"]
    : kind === "phase"
      ? studio["historical-phases"]
      : studio["historical-entities"];
}
export const historicalCatalogService = {
  periods: (f: CatalogFilter = {}) =>
    parse(studio["historical-periods"].$get({ query: query(f) }), periodPage),
  phases: (f: CatalogFilter) =>
    parse(studio["historical-phases"].$get({ query: query(f) }), phasePage),
  events: (f: CatalogFilter = {}) =>
    parse(studio["historical-entities"].$get({ query: query(f) }), entityPage),
  summary: () =>
    parse(studio["historical-summary"].$get(), CatalogSummarySchema),
  async detail(kind: HistoricalKind, id: string) {
    const req = ownerClient(kind)[":id"].$get({ param: { id } });
    if (kind === "period") return parse(req, HistoricalPeriodDetailSchema);
    if (kind === "phase") return parse(req, HistoricalPhaseDetailSchema);
    return parse(req, HistoricalEntityDetailSchema);
  },
  event: (id: string) =>
    parse(
      studio["historical-entities"][":id"].$get({ param: { id } }),
      HistoricalEntityDetailSchema,
    ),
  async create(d: HistoricalDraft, key: string) {
    const json = { name: d.name, summary: d.summary, time: d.time };
    if (d.kind === "period")
      return parse(
        studio["historical-periods"].$post({ json }, headers(key)),
        HistoricalPeriodDetailSchema,
      );
    if (d.kind === "phase") {
      if (!d.periodId) throw new Error("Vui lòng chọn thời kỳ cha.");
      return parse(
        studio["historical-phases"].$post(
          { json: { ...json, periodId: d.periodId } },
          headers(key),
        ),
        HistoricalPhaseDetailSchema,
      );
    }
    if (!d.historicalPhaseId) throw new Error("Vui lòng chọn giai đoạn cha.");
    return parse(
      studio["historical-entities"].$post(
        {
          json: {
            ...json,
            entityType: "EVENT",
            historicalPhaseId: d.historicalPhaseId,
            aliases: [],
          },
        },
        headers(key),
      ),
      HistoricalEntityDetailSchema,
    );
  },
  async patch(
    kind: HistoricalKind,
    id: string,
    d: Omit<HistoricalDraft, "kind">,
    baseVersion: number,
  ) {
    const json = {
      name: d.name,
      summary: d.summary,
      time: d.time,
      baseVersion,
    };
    if (kind === "period")
      return parse(
        studio["historical-periods"][":id"].$patch({ param: { id }, json }),
        HistoricalPeriodDetailSchema,
      );
    if (kind === "phase")
      return parse(
        studio["historical-phases"][":id"].$patch({
          param: { id },
          json: { ...json, periodId: d.periodId },
        }),
        HistoricalPhaseDetailSchema,
      );
    return parse(
      studio["historical-entities"][":id"].$patch({
        param: { id },
        json: { ...json, historicalPhaseId: d.historicalPhaseId },
      }),
      HistoricalEntityDetailSchema,
    );
  },
  remove: (kind: HistoricalKind, id: string, baseVersion: number) =>
    parse(
      ownerClient(kind)[":id"].$delete({
        param: { id },
        json: { baseVersion },
      }),
      z.void(),
    ),
  async restore(kind: HistoricalKind, id: string, baseVersion: number) {
    const req = ownerClient(kind)[":id"].restore.$post({
      param: { id },
      json: { baseVersion },
    });
    return parse(
      req,
      kind === "period"
        ? HistoricalPeriodDetailSchema
        : kind === "phase"
          ? HistoricalPhaseDetailSchema
          : HistoricalEntityDetailSchema,
    );
  },
  citations: (kind: HistoricalKind, id: string) =>
    parse(
      ownerClient(kind)[":id"].sources.$get({ param: { id } }),
      z.object({ items: z.array(HistoricalCitationSchema) }),
    ),
  addCitation: (
    kind: HistoricalKind,
    id: string,
    json: {
      sourceId: string;
      locator: string;
      excerpt?: string;
      note?: string;
      baseVersion: number;
    },
    key: string,
  ) =>
    parse(
      ownerClient(kind)[":id"].sources.$post(
        { param: { id }, json },
        headers(key),
      ),
      HistoricalCitationSchema,
    ),
  patchCitation: (
    kind: HistoricalKind,
    id: string,
    citationId: string,
    json: {
      sourceId?: string;
      locator?: string;
      excerpt?: string;
      note?: string;
      baseVersion: number;
    },
  ) =>
    parse(
      ownerClient(kind)[":id"].sources[":citationId"].$patch({
        param: { id, citationId },
        json,
      }),
      HistoricalCitationSchema,
    ),
  deleteCitation: (
    kind: HistoricalKind,
    id: string,
    citationId: string,
    baseVersion: number,
  ) =>
    parse(
      ownerClient(kind)[":id"].sources[":citationId"].$delete({
        param: { id, citationId },
        json: { baseVersion },
      }),
      z.void(),
    ),
  sources: (q = "", page = 1, includeArchived = false) =>
    parse(
      studio.sources.$get({
        query: {
          q,
          page: String(page),
          limit: "20",
          includeArchived: String(includeArchived),
        },
      }),
      sourcePage,
    ),
  source: (id: string) =>
    parse(studio.sources[":id"].$get({ param: { id } }), CatalogSourceSchema),
  createSource: (json: z.input<typeof CreateSourceSchema>, key: string) =>
    parse(studio.sources.$post({ json }, headers(key)), CatalogSourceSchema),
  patchSource: (id: string, json: z.input<typeof PatchSourceSchema>) =>
    parse(
      studio.sources[":id"].$patch({ param: { id }, json }),
      CatalogSourceSchema,
    ),
  sourceRevisions: (id: string) =>
    parse(
      studio.sources[":id"].revisions.$get({ param: { id } }),
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            version: z.number(),
            snapshot: z.unknown(),
            createdAt: z.coerce.date(),
          }),
        ),
      }),
    ),
  archiveSource: (id: string, baseVersion: number, restore = false) =>
    parse(
      restore
        ? studio.sources[":id"].unarchive.$post({
            param: { id },
            json: { baseVersion },
          })
        : studio.sources[":id"].archive.$post({
            param: { id },
            json: { baseVersion },
          }),
      CatalogSourceSchema,
    ),
  reviewSource: (id: string, json: z.input<typeof SourceReviewSchema>) =>
    parse(
      studio.sources[":id"].review.$post({ param: { id }, json }),
      CatalogSourceSchema,
    ),
  submit: (
    id: string,
    baseVersion: number,
    expectedStatus: "DRAFT" | "CHANGES_REQUESTED",
  ) =>
    parse(
      studio["historical-entities"][":id"]["submit-review"].$post({
        param: { id },
        json: { baseVersion, expectedStatus },
      }),
      HistoricalEntityDetailSchema,
    ),
  reviewEvent: (
    id: string,
    json: z.input<typeof HistoricalEntityReviewSchema>,
  ) =>
    parse(
      studio["historical-entities"][":id"].review.$post({
        param: { id },
        json,
      }),
      HistoricalEntityDetailSchema,
    ),
  revisions: (id: string) =>
    parse(
      studio["historical-entities"][":id"].revisions.$get({ param: { id } }),
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            version: z.number(),
            snapshot: z.unknown(),
            createdAt: z.coerce.date(),
          }),
        ),
      }),
    ),
  publicEvent: (slug: string) =>
    parse(
      client.api["historical-events"][":slug"].$get({ param: { slug } }),
      PublicHistoricalEventSchema,
    ),
};
export type { CatalogSourceDto };
