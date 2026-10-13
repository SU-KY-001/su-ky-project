import { z } from "zod";
import {
  BaseVersionSchema,
  HistoricalCatalogQuerySchema,
  CreateHistoricalPeriodSchema,
  PatchHistoricalPeriodSchema,
  CreateHistoricalPhaseSchema,
  PatchHistoricalPhaseSchema,
  HistoricalEntityInputSchema,
  PatchHistoricalEntitySchema,
  HistoricalPeriodDetailSchema,
  HistoricalPhaseDetailSchema,
  HistoricalEntityDetailSchema,
  HistoricalCitationSchema,
  HistoricalCitationInputSchema,
  PatchHistoricalCitationSchema,
  HistoricalEntityReviewSchema,
  SubmitHistoricalReviewSchema,
  SourceReviewSchema,
  CatalogSourceSchema,
  CatalogSummarySchema,
  paginatedSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import { PublicHistoricalEventSchema } from "@repo/shared";
const id = z.object({ id: z.string().uuid() });
const child = z.object({
  id: z.string().uuid(),
  citationId: z.string().uuid(),
});
export const historicalCatalogPaths: Paths = {};
const resources = [
  {
    path: "historical-periods",
    name: "HistoricalPeriodDetail",
    label: "Thời kỳ",
    schema: HistoricalPeriodDetailSchema,
    create: CreateHistoricalPeriodSchema,
    patch: PatchHistoricalPeriodSchema,
  },
  {
    path: "historical-phases",
    name: "HistoricalPhaseDetail",
    label: "Giai đoạn",
    schema: HistoricalPhaseDetailSchema,
    create: CreateHistoricalPhaseSchema,
    patch: PatchHistoricalPhaseSchema,
  },
  {
    path: "historical-entities",
    name: "HistoricalEntityDetail",
    label: "Thực thể lịch sử",
    schema: HistoricalEntityDetailSchema,
    create: HistoricalEntityInputSchema,
    patch: PatchHistoricalEntitySchema,
  },
] as const;
for (const r of resources) {
  const base = `/api/studio/${r.path}`;
  const schema = { name: r.name, schema: r.schema };
  const editingAccess = r.path === "historical-entities"
    ? "Người tạo hoặc admin được biên tập."
    : "Moderator được biên tập mục hệ thống chưa có tác giả; mục có tác giả chỉ người tạo hoặc admin được biên tập.";
  const paged = { name: r.name + "Paged", schema: paginatedSchema(r.schema) };
  historicalCatalogPaths[base] = {
    get: operation({
      id: `list${r.name}`,
      tag: "Studio Catalog",
      summary: `Danh sách ${r.label}`,
      access: "studio",
      query: HistoricalCatalogQuerySchema,
      ok: {
        status: 200,
        description:
          "Danh sách phân trang; bộ đếm không phụ thuộc trang hiện tại",
        schema: paged,
      },
    }),
    post: operation({
      id: `create${r.name}`,
      tag: "Studio Catalog",
      summary: `Tạo ${r.label}`,
      access: "studio",
      idempotent: true,
      rate: "write",
      body: { name: r.name + "Create", schema: r.create },
      ok: {
        status: 201,
        description: "Nội dung được lưu trong database",
        schema,
        location: base + "/{id}",
      },
      errors: { 422: "Cấp cha hoặc thời gian không hợp lệ" },
    }),
  };
  historicalCatalogPaths[base + "/{id}"] = {
    get: operation({
      id: `get${r.name}`,
      tag: "Studio Catalog",
      summary: `Chi tiết ${r.label}`,
      access: "studio",
      pathParams: id,
      ok: { status: 200, description: "Nội dung, nguồn và phiên bản", schema },
      errors: { 404: "Không tìm thấy nội dung" },
    }),
    patch: operation({
      id: `patch${r.name}`,
      tag: "Studio Catalog",
      summary: `Sửa ${r.label}`,
      description: editingAccess,
      access: "studio",
      pathParams: id,
      rate: "write",
      body: { name: r.name + "Patch", schema: r.patch },
      ok: { status: 200, description: "Nội dung sau chỉnh sửa", schema },
      errors: {
        404: "Không thuộc quyền sửa",
        409: "STALE_WRITE hoặc CONTENT_IN_TRASH",
        422: "VALIDATION_ERROR",
      },
    }),
    delete: operation({
      id: `delete${r.name}`,
      tag: "Studio Catalog",
      summary: `Xóa mềm ${r.label}`,
      description: editingAccess,
      access: "studio",
      pathParams: id,
      rate: "write",
      body: { name: "HistoricalBaseVersion", schema: BaseVersionSchema },
      ok: { status: 204, description: "Đã xóa mềm" },
      errors: { 409: "HAS_DEPENDENCIES hoặc STALE_WRITE" },
    }),
  };
  historicalCatalogPaths[base + "/{id}/restore"] = {
    post: operation({
      id: `restore${r.name}`,
      tag: "Studio Catalog",
      summary: `Khôi phục ${r.label}`,
      description: editingAccess,
      access: "studio",
      pathParams: id,
      rate: "write",
      body: { name: "HistoricalBaseVersion", schema: BaseVersionSchema },
      ok: { status: 200, description: "Nội dung đã khôi phục", schema },
      errors: { 409: "STALE_WRITE; cấp cha cần khôi phục trước" },
    }),
  };
  const citation = {
    name: "HistoricalCitation",
    schema: HistoricalCitationSchema,
  };
  const list = {
    name: "HistoricalCitationItems",
    schema: z.object({ items: z.array(HistoricalCitationSchema) }),
  };
  // A single schema instance is registered for the citation list below.
  historicalCatalogPaths[base + "/{id}/sources"] = {
    get: operation({
      id: `list${r.name}Citations`,
      tag: "Studio Catalog",
      summary: `Trích dẫn của ${r.label}`,
      access: "studio",
      pathParams: id,
      ok: {
        status: 200,
        description: "Nguồn ghim theo phiên bản",
        schema: { name: r.name + "CitationItems", schema: list.schema },
      },
    }),
    post: operation({
      id: `add${r.name}Citation`,
      tag: "Studio Catalog",
      summary: `Gắn nguồn vào ${r.label}`,
      access: "studio",
      pathParams: id,
      idempotent: true,
      rate: "write",
      body: {
        name: "HistoricalCitationInput",
        schema: HistoricalCitationInputSchema,
      },
      ok: { status: 201, description: "Trích dẫn đã gắn", schema: citation },
      errors: { 409: "CONFLICT hoặc STALE_WRITE" },
    }),
  };
  historicalCatalogPaths[base + "/{id}/sources/{citationId}"] = {
    patch: operation({
      id: `patch${r.name}Citation`,
      tag: "Studio Catalog",
      summary: "Sửa trích dẫn",
      access: "studio",
      pathParams: child,
      rate: "write",
      body: {
        name: "PatchHistoricalCitation",
        schema: PatchHistoricalCitationSchema,
      },
      ok: { status: 200, description: "Trích dẫn mới", schema: citation },
      errors: { 409: "STALE_WRITE hoặc CONFLICT" },
    }),
    delete: operation({
      id: `delete${r.name}Citation`,
      tag: "Studio Catalog",
      summary: "Gỡ trích dẫn",
      access: "studio",
      pathParams: child,
      rate: "write",
      body: { name: "HistoricalBaseVersion", schema: BaseVersionSchema },
      ok: { status: 204, description: "Đã gỡ trích dẫn" },
      errors: { 409: "HAS_DEPENDENCIES hoặc STALE_WRITE" },
    }),
  };
}
const entity = {
  name: "HistoricalEntityDetail",
  schema: HistoricalEntityDetailSchema,
};
historicalCatalogPaths["/api/studio/historical-summary"] = {
  get: operation({
    id: "historicalCatalogSummary",
    tag: "Studio Catalog",
    summary: "Tổng số nội dung lịch sử",
    access: "studio",
    ok: {
      status: 200,
      description: "Tổng toàn database",
      schema: { name: "CatalogSummary", schema: CatalogSummarySchema },
    },
  }),
};
historicalCatalogPaths["/api/studio/historical-entities/{id}/submit-review"] = {
  post: operation({
    id: "submitHistoricalEntityReview",
    tag: "Studio Catalog",
    summary: "Gửi sự kiện để kiểm duyệt",
    access: "studio",
    pathParams: id,
    rate: "write",
    body: {
      name: "SubmitHistoricalReview",
      schema: SubmitHistoricalReviewSchema,
    },
    ok: { status: 200, description: "Sự kiện đang chờ duyệt", schema: entity },
    errors: {
      409: "STALE_WRITE hoặc INVALID_REVIEW_STATE",
      422: "CONTENT_NOT_READY",
    },
  }),
};
historicalCatalogPaths["/api/studio/historical-entities/{id}/review"] = {
  post: operation({
    id: "reviewHistoricalEntity",
    tag: "Studio Catalog",
    summary: "Duyệt hoặc yêu cầu sửa sự kiện",
    access: "studio",
    pathParams: id,
    rate: "write",
    body: {
      name: "HistoricalEntityReview",
      schema: HistoricalEntityReviewSchema,
    },
    ok: { status: 200, description: "Kết quả duyệt phiên bản", schema: entity },
    errors: {
      403: "SELF_REVIEW_FORBIDDEN",
      409: "STALE_WRITE hoặc INVALID_REVIEW_STATE",
      422: "CONTENT_NOT_READY",
    },
  }),
};
historicalCatalogPaths["/api/studio/sources/{id}/review"] = {
  post: operation({
    id: "reviewHistoricalSource",
    tag: "Studio Catalog",
    summary: "Xác minh hoặc rút xác minh nguồn",
    access: "studio",
    pathParams: id,
    rate: "write",
    body: { name: "HistoricalSourceReview", schema: SourceReviewSchema },
    ok: {
      status: 200,
      description: "Kết quả xác minh",
      schema: { name: "CatalogSource", schema: CatalogSourceSchema },
    },
    errors: {
      403: "SELF_REVIEW_FORBIDDEN",
      409: "STALE_WRITE hoặc INVALID_REVIEW_STATE",
    },
  }),
};
const revision = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      version: z.number(),
      snapshot: z.unknown(),
      createdAt: z.coerce.date(),
    }),
  ),
});
for (const resource of ["sources", "historical-entities"]) {
  historicalCatalogPaths[`/api/studio/${resource}/{id}/revisions`] = {
    get: operation({
      id: `revisions${resource.replaceAll("-", "")}`,
      tag: "Studio Catalog",
      summary: "Lịch sử phiên bản",
      access: "studio",
      pathParams: id,
      ok: {
        status: 200,
        description: "Snapshot bất biến; nội dung chỉ dành studio",
        schema: { name: "CatalogRevisions", schema: revision },
      },
    }),
  };
}
historicalCatalogPaths["/api/historical-events"] = {
  get: operation({
    id: "publicHistoricalEvents",
    tag: "Catalog",
    summary: "Sự kiện đã kiểm duyệt",
    access: "public",
    query: HistoricalCatalogQuerySchema.extend({
      phaseId: z.string().uuid().optional(),
    }),
    ok: {
      status: 200,
      description: "Sự kiện sẵn sàng, lọc trước phân trang",
      schema: {
        name: "PublicHistoricalEventPaged",
        schema: paginatedSchema(PublicHistoricalEventSchema),
      },
    },
  }),
};
historicalCatalogPaths["/api/historical-events/{slug}"] = {
  get: operation({
    id: "publicHistoricalEvent",
    tag: "Catalog",
    summary: "Sự kiện và trích dẫn công khai",
    access: "public",
    pathParams: z.object({ slug: z.string().min(1) }),
    ok: {
      status: 200,
      description: "Không có ghi chú nội bộ hoặc email reviewer",
      schema: {
        name: "PublicHistoricalEvent",
        schema: PublicHistoricalEventSchema,
      },
    },
    errors: { 404: "Sự kiện chưa công khai hoặc nguồn không còn hợp lệ" },
  }),
};
