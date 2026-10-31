import { CreateExhibitionSchema, ExhibitionListQuerySchema, ExhibitionPodcastQuerySchema, ExhibitionPodcastOptionSchema, ExhibitionSummarySchema, ExhibitionWorkspaceSchema, PublishExhibitionSchema, ResolvedExhibitionSchema, SaveExhibitionDraftSchema, UuidParamSchema, paginatedSchema } from "@repo/shared";
import { z } from "zod";
import { PublicExhibitionListSchema } from "@repo/shared";
import { operation, type Paths } from "../operation";

const tag = "Studio Exhibitions";
const workspace = { name: "ExhibitionWorkspace", schema: ExhibitionWorkspaceSchema };
const list = paginatedSchema(ExhibitionSummarySchema);
const podcastOptions = paginatedSchema(ExhibitionPodcastOptionSchema);
const params = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID triển lãm" } };
export const exhibitionPaths: Paths = {
  "/api/exhibitions": { get: operation({ id: "listPublicExhibitions", tag, summary: "Danh sách triển lãm đã công khai", description: "Chỉ trả slug, tiêu đề và mô tả ngắn từ snapshot đã xuất bản; không trả thông tin bản nháp.", access: "public", ok: { status: 200, description: "Danh sách công khai, có thể rỗng", schema: { name: "PublicExhibitionList", schema: PublicExhibitionListSchema } } }) },
  "/api/studio/exhibition-templates": { get: operation({ id: "listExhibitionTemplates", tag, summary: "Danh sách mẫu phòng", access: "moderator", ok: { status: 200, description: "Mẫu triển lãm" } }) },
  "/api/studio/exhibition-podcast-options": { get: operation({ id: "listExhibitionPodcastOptions", tag, summary: "Chọn bản kể đã phát hành", access: "moderator", query: ExhibitionPodcastQuerySchema, ok: { status: 200, description: "Bản kể", schema: { name: "ExhibitionPodcastOptions", schema: podcastOptions } } }) },
  "/api/studio/exhibitions": {
    get: operation({ id: "listExhibitions", tag, summary: "Danh sách triển lãm", access: "moderator", query: ExhibitionListQuerySchema, ok: { status: 200, description: "Danh sách", schema: { name: "ExhibitionList", schema: list } } }),
    post: operation({ id: "createExhibition", tag, summary: "Tạo bản nháp", access: "moderator", body: { name: "CreateExhibition", schema: CreateExhibitionSchema }, ok: { status: 201, description: "Bản nháp", schema: workspace, location: "/api/studio/exhibitions/{id}" }, idempotent: true, rate: "write" }),
  },
  "/api/studio/exhibitions/{id}": { get: operation({ id: "getExhibition", tag, summary: "Mở bản nháp", access: "moderator", ...params, ok: { status: 200, description: "Bản nháp", schema: workspace }, errors: { 404: "Không tìm thấy triển lãm" } }) },
  "/api/studio/exhibitions/{id}/draft": { put: operation({ id: "saveExhibitionDraft", tag, summary: "Lưu bản nháp", access: "moderator", ...params, body: { name: "SaveExhibitionDraft", schema: SaveExhibitionDraftSchema }, ok: { status: 200, description: "Bản nháp đã lưu", schema: workspace }, rate: "write", errors: { 404: "Không tìm thấy triển lãm", 409: "EXHIBITION_REVISION_CONFLICT: bản nháp đã thay đổi" } }) },
  "/api/studio/exhibitions/{id}/publish": { post: operation({ id: "publishExhibition", tag, summary: "Công khai bản nháp đã lưu", access: "moderator", ...params, body: { name: "PublishExhibition", schema: PublishExhibitionSchema }, ok: { status: 200, description: "Triển lãm đã công khai", schema: workspace }, rate: "write", errors: { 404: "Không tìm thấy triển lãm", 409: "EXHIBITION_REVISION_CONFLICT: bản nháp đã thay đổi" } }) },
  "/api/exhibitions/{slug}": { get: operation({ id: "getPublicExhibition", tag, summary: "Triển lãm công khai", access: "public", pathParams: z.object({ slug: z.string().min(1).max(280) }), pathParamDocs: { slug: "Đường dẫn triển lãm" }, ok: { status: 200, description: "Bản công khai", schema: { name: "ResolvedExhibition", schema: ResolvedExhibitionSchema } }, errors: { 404: "Không tìm thấy triển lãm công khai" } }) },
};
