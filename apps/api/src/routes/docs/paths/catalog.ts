import { z } from "zod";
import {
  CreateSourceSchema,
  HistoricalEntityInputSchema,
  HistoricalEntityQuerySchema,
  HistoricalEntityTypeSchema,
  HistoricalPeriodSchema,
  PatchHistoricalEntitySchema,
  PatchSourceSchema,
  SourceQuerySchema,
  UuidParamSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  HistoricalEntityDocSchema,
  ItemsOf,
  PagedOf,
  SourceDocSchema,
  SourceWithUsageSchema,
  TopicSchema,
} from "../schemas";

const PUBLIC_TAG = "Catalog";
const TAG = "Studio Catalog";
const SOURCES = "/api/studio/sources";
const ENTITIES = "/api/studio/historical-entities";

// Mirrors the inline query schemas in catalog.routes.ts (they are not exported).
const SimilarSourceQuerySchema = z.object({
  title: z.string().trim().min(1),
  author: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
});
const SimilarEntityQuerySchema = z.object({
  name: z.string().trim().min(1),
  type: HistoricalEntityTypeSchema.optional(),
});

const sourceParams = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID nguồn (UUID)" } } as const;
const entityParams = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID thực thể lịch sử (UUID)" } } as const;
const periodList = { name: "HistoricalPeriodList", schema: ItemsOf(HistoricalPeriodSchema) } as const;
const PERIOD_TREE_DESCRIPTION =
  "Chỉ Thời kỳ/Giai đoạn đang hoạt động, sắp xếp theo thứ tự thời gian. Khoảng năm nửa kín `[startYear, endYear)`: `endYear` loại trừ (năm 43 thuộc Giai đoạn bắt đầu ở 43, không thuộc Giai đoạn kết thúc ở 43); `endYear = null` là còn tiếp diễn, `startYear = null` là không xác định. Năm trước Công nguyên là số âm, không có năm 0.";
const SOURCE_NOT_FOUND = "`NOT_FOUND`: nguồn không tồn tại";
const ENTITY_NOT_FOUND = "`NOT_FOUND`: thực thể không tồn tại";

export const catalogPaths: Paths = {
  "/api/topics": {
    get: operation({
      id: "listTopics",
      tag: PUBLIC_TAG,
      summary: "Danh sách chủ đề",
      description: "Chỉ các chủ đề đang hoạt động. Dùng làm bộ lọc duyệt Series và chọn chủ đề khi biên tập.",
      access: "public",
      ok: {
        status: 200,
        description: "Danh sách chủ đề",
        schema: { name: "TopicList", schema: ItemsOf(TopicSchema) },
      },
    }),
  },
  "/api/historical-periods": {
    get: operation({
      id: "listHistoricalPeriods",
      tag: PUBLIC_TAG,
      summary: "Cây Thời kỳ → Giai đoạn lịch sử",
      description: PERIOD_TREE_DESCRIPTION,
      access: "public",
      ok: {
        status: 200,
        description: "Danh sách Thời kỳ, mỗi Thời kỳ kèm các Giai đoạn",
        schema: periodList,
      },
    }),
  },
  "/api/studio/historical-periods": {
    get: operation({
      id: "listStudioHistoricalPeriods",
      tag: TAG,
      summary: "Cây Thời kỳ → Giai đoạn (studio)",
      description: PERIOD_TREE_DESCRIPTION,
      access: "studio",
      ok: {
        status: 200,
        description: "Danh sách Thời kỳ, mỗi Thời kỳ kèm các Giai đoạn",
        schema: periodList,
      },
    }),
  },

  [SOURCES]: {
    get: operation({
      id: "listSources",
      tag: TAG,
      summary: "Tìm và lọc nguồn",
      description: "Tìm chứa chuỗi (không phân biệt hoa thường) trong tiêu đề, tiêu đề gốc hoặc tác giả; hoặc khớp đúng ISBN (ISBN được chuẩn hoá trước). Sắp xếp theo tiêu đề. Mặc định ẩn nguồn đã lưu trữ.",
      access: "studio",
      query: SourceQuerySchema,
      queryDocs: {
        q: "Từ khoá: tiêu đề, tác giả hoặc ISBN",
        tier: "Lọc theo bậc độ tin cậy",
        includeArchived: "Gồm cả nguồn đã lưu trữ",
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
      },
      ok: {
        status: 200,
        description: "Danh sách phân trang",
        schema: { name: "SourceList", schema: PagedOf(SourceDocSchema) },
      },
    }),
    post: operation({
      id: "createSource",
      tag: TAG,
      summary: "Tạo nguồn",
      description:
        "Nên gọi `GET /api/studio/sources/similar` trước để tránh tạo nguồn trùng. Nguồn phải có `url` hoặc `fileAssetId` (PDF: tạo media asset `kind = DOCUMENT`, upload, `verify`, rồi truyền `assetId`). Một PDF chỉ gắn được cho một nguồn.",
      access: "studio",
      body: {
        name: "SourceInput",
        schema: CreateSourceSchema,
        example: {
          tier: "TIER_1_CHINH_SU",
          title: "Đại Việt sử ký toàn thư",
          author: "Ngô Sĩ Liên",
          publicationYear: 1479,
        },
      },
      ok: {
        status: 201,
        description: "Nguồn đã tạo",
        schema: { name: "Source", schema: SourceDocSchema },
        location: `${SOURCES}/{id}`,
      },
      idempotent: true,
      rate: "write",
      errors: {
        409: "`SOURCE_ISBN_TAKEN`: ISBN đã tồn tại; `ASSET_IN_USE`: PDF đã gắn cho nguồn khác; `CONFLICT`: không tạo được nguồn",
        422: "`VALIDATION_ERROR`: thiếu cả `url` và `fileAssetId`, hoặc asset không phải PDF `READY` của bạn",
      },
    }),
  },
  [`${SOURCES}/similar`]: {
    get: operation({
      id: "findSimilarSources",
      tag: TAG,
      summary: "Tìm nguồn gần giống",
      description:
        "Gợi ý nguồn đã có theo tiêu đề, tác giả hoặc ISBN. Khai báo trước `/{id}` vì `similar` là đường dẫn cố định, không phải ID.",
      access: "studio",
      query: SimilarSourceQuerySchema,
      queryDocs: { title: "Tiêu đề cần đối chiếu", author: "Tác giả (tuỳ chọn)", isbn: "ISBN (tuỳ chọn)" },
      ok: {
        status: 200,
        description: "Ứng viên gần giống",
        schema: { name: "SourceItems", schema: ItemsOf(SourceDocSchema) },
      },
    }),
  },
  [`${SOURCES}/{id}`]: {
    get: operation({
      id: "getSource",
      tag: TAG,
      summary: "Chi tiết nguồn",
      description: "Kèm `usageCount`: số series đang trích dẫn nguồn này.",
      access: "studio",
      ...sourceParams,
      ok: {
        status: 200,
        description: "Nguồn",
        schema: { name: "SourceWithUsage", schema: SourceWithUsageSchema },
      },
      errors: { 404: SOURCE_NOT_FOUND },
    }),
    patch: operation({
      id: "updateSource",
      tag: TAG,
      summary: "Sửa nguồn",
      description: "Gửi các trường cần đổi; trường vắng mặt giữ nguyên.",
      access: "studio",
      ...sourceParams,
      body: { name: "PatchSource", schema: PatchSourceSchema, example: { publisher: "Nhà xuất bản Văn học" } },
      ok: { status: 200, description: "Nguồn đã sửa", schema: { name: "Source", schema: SourceDocSchema } },
      rate: "write",
      errors: { 404: SOURCE_NOT_FOUND, 409: "`SOURCE_ISBN_TAKEN`: ISBN trùng nguồn khác" },
    }),
  },
  [`${SOURCES}/{id}/archive`]: {
    post: operation({
      id: "archiveSource",
      tag: TAG,
      summary: "Lưu trữ nguồn",
      description: "Ẩn nguồn khỏi kết quả tìm kiếm mặc định và gợi ý nguồn gần giống. Bỏ ẩn bằng `unarchive`.",
      access: "studio",
      ...sourceParams,
      ok: { status: 200, description: "Nguồn đã lưu trữ", schema: { name: "Source", schema: SourceDocSchema } },
      rate: "write",
      errors: { 404: SOURCE_NOT_FOUND },
    }),
  },
  [`${SOURCES}/{id}/unarchive`]: {
    post: operation({
      id: "unarchiveSource",
      tag: TAG,
      summary: "Bỏ lưu trữ nguồn",
      access: "studio",
      ...sourceParams,
      ok: { status: 200, description: "Nguồn đã khôi phục", schema: { name: "Source", schema: SourceDocSchema } },
      rate: "write",
      errors: { 404: SOURCE_NOT_FOUND },
    }),
  },

  [ENTITIES]: {
    get: operation({
      id: "listHistoricalEntities",
      tag: TAG,
      summary: "Tìm thực thể lịch sử",
      description: "Nhân vật hoặc sự kiện lịch sử. Tìm chứa chuỗi trong tên hoặc khớp đúng một tên khác (`aliases`).",
      access: "studio",
      query: HistoricalEntityQuerySchema,
      queryDocs: {
        q: "Từ khoá trong tên, hoặc đúng một tên khác",
        type: "`FIGURE` (nhân vật) hoặc `EVENT` (sự kiện)",
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
      },
      ok: {
        status: 200,
        description: "Danh sách phân trang",
        schema: { name: "HistoricalEntityList", schema: PagedOf(HistoricalEntityDocSchema) },
      },
    }),
    post: operation({
      id: "createHistoricalEntity",
      tag: TAG,
      summary: "Tạo thực thể lịch sử",
      description: "Slug tự sinh từ tên. Nên gọi `similar` trước để tránh tạo trùng.",
      access: "studio",
      body: {
        name: "HistoricalEntityInput",
        schema: HistoricalEntityInputSchema,
        example: { entityType: "FIGURE", name: "Trần Hưng Đạo", aliases: ["Trần Quốc Tuấn"], startYear: 1228, endYear: 1300 },
      },
      ok: {
        status: 201,
        description: "Thực thể đã tạo",
        schema: { name: "HistoricalEntity", schema: HistoricalEntityDocSchema },
        location: `${ENTITIES}/{id}`,
      },
      idempotent: true,
      rate: "write",
    }),
  },
  [`${ENTITIES}/similar`]: {
    get: operation({
      id: "findSimilarHistoricalEntities",
      tag: TAG,
      summary: "Tìm thực thể gần giống",
      description: "Khai báo trước `/{id}` vì `similar` là đường dẫn cố định, không phải ID.",
      access: "studio",
      query: SimilarEntityQuerySchema,
      queryDocs: { name: "Tên cần đối chiếu", type: "`FIGURE` hoặc `EVENT` (tuỳ chọn)" },
      ok: {
        status: 200,
        description: "Ứng viên gần giống",
        schema: { name: "HistoricalEntityItems", schema: ItemsOf(HistoricalEntityDocSchema) },
      },
    }),
  },
  [`${ENTITIES}/{id}`]: {
    get: operation({
      id: "getHistoricalEntity",
      tag: TAG,
      summary: "Chi tiết thực thể",
      access: "studio",
      ...entityParams,
      ok: {
        status: 200,
        description: "Thực thể",
        schema: { name: "HistoricalEntity", schema: HistoricalEntityDocSchema },
      },
      errors: { 404: ENTITY_NOT_FOUND },
    }),
    patch: operation({
      id: "updateHistoricalEntity",
      tag: TAG,
      summary: "Sửa thực thể",
      access: "studio",
      ...entityParams,
      body: { name: "PatchHistoricalEntity", schema: PatchHistoricalEntitySchema, example: { summary: "Quốc công tiết chế" } },
      ok: {
        status: 200,
        description: "Thực thể đã sửa",
        schema: { name: "HistoricalEntity", schema: HistoricalEntityDocSchema },
      },
      rate: "write",
      errors: { 404: ENTITY_NOT_FOUND },
    }),
  },
};
