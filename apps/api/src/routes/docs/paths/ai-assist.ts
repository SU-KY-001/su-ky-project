import { AiCheckItemSchema, AiCheckSchema, CreateAiCheckSchema, PatchAiCheckItemSchema } from "@repo/shared";
import { z } from "zod";
import { operation, type Paths } from "../operation";

const TAG = "Studio AI";
const BASE = "/api/studio/episodes/{id}/ai-checks";
const episodeParams = { pathParams: z.object({ id: z.string().uuid() }), pathParamDocs: { id: "ID tập (UUID)" } } as const;
const checkParams = {
  pathParams: z.object({ id: z.string().uuid(), checkId: z.string().uuid() }),
  pathParamDocs: { id: "ID tập (UUID)", checkId: "ID lượt rà (UUID)" },
} as const;
const itemParams = {
  pathParams: z.object({ id: z.string().uuid(), checkId: z.string().uuid(), itemId: z.string().uuid() }),
  pathParamDocs: { id: "ID tập (UUID)", checkId: "ID lượt rà (UUID)", itemId: "ID mục cảnh báo (UUID)" },
} as const;
const NOT_FOUND = "`NOT_FOUND`: tập, lượt rà hoặc mục không tồn tại, hoặc tập không thuộc bạn (Admin xem được mọi tập)";

const CreatedCheckSchema = z.object({ id: z.string().uuid() });
const CheckListSchema = z.object({ items: z.array(AiCheckSchema) });
const CheckDetailSchema = z.object({ check: AiCheckSchema, items: z.array(AiCheckItemSchema) });

export const aiAssistPaths: Paths = {
  [BASE]: {
    post: operation({
      id: "createAiCheck",
      tag: TAG,
      summary: "Chạy AI rà kịch bản",
      description: [
        "Nhận các khối của kịch bản và chạy nền; trả `202` ngay, kết quả đọc bằng `GET`.",
        "AI chỉ nghi ngờ và đề xuất, không tự sửa kịch bản. Nguồn đối chiếu là các nguồn **đã xác minh** của series (PDF đã nạp trang, hoặc URL).",
        "Cảnh báo `CONTRADICTED` luôn kèm câu trích nguyên văn mà hệ thống đã kiểm trên nội dung nguồn đã mở; không có thì hạ thành `NOT_FOUND`.",
      ].join("\n\n"),
      access: "studio",
      ...episodeParams,
      body: { name: "CreateAiCheck", schema: CreateAiCheckSchema },
      ok: { status: 202, description: "Đã nhận, đang chạy nền", schema: { name: "CreatedAiCheck", schema: CreatedCheckSchema }, location: `${BASE}/{checkId}` },
      idempotent: true,
      rate: "ai_check",
      errors: {
        404: NOT_FOUND,
        409: "`AI_CHECK_ALREADY_RUNNING`: tập này đang có một lượt rà chạy",
        422: "`VALIDATION_ERROR`: kịch bản vượt số ký tự tối đa; `NO_READABLE_SOURCE`: series chưa có nguồn đã xác minh mà AI đọc được",
        429: "`AI_CONCURRENCY_LIMIT`: quá nhiều lượt rà chạy cùng lúc của bạn",
        503: "`AI_DISABLED`: trợ lý AI đang tắt; `AI_UNAVAILABLE`: chưa cấu hình model",
      },
    }),
    get: operation({
      id: "listAiChecks",
      tag: TAG,
      summary: "Các lượt rà gần đây của tập",
      access: "studio",
      ...episodeParams,
      ok: { status: 200, description: "Lượt rà mới nhất trước", schema: { name: "AiCheckList", schema: CheckListSchema } },
      errors: { 404: NOT_FOUND },
    }),
  },
  [`${BASE}/{checkId}`]: {
    get: operation({
      id: "getAiCheck",
      tag: TAG,
      summary: "Một lượt rà và các mục cảnh báo",
      description: "Mục sắp theo `seq` tăng dần. Lượt đang `RUNNING` có thể còn thêm mục.",
      access: "studio",
      ...checkParams,
      ok: { status: 200, description: "Lượt rà kèm mục", schema: { name: "AiCheckDetail", schema: CheckDetailSchema } },
      errors: { 404: NOT_FOUND },
    }),
  },
  [`${BASE}/{checkId}/cancel`]: {
    post: operation({
      id: "cancelAiCheck",
      tag: TAG,
      summary: "Hủy lượt rà",
      description: "Idempotent: lượt đã kết thúc thì trả nguyên trạng thái cuối.",
      access: "studio",
      ...checkParams,
      ok: { status: 200, description: "Lượt rà sau khi hủy", schema: { name: "AiCheck", schema: AiCheckSchema } },
      rate: "write",
      errors: { 404: NOT_FOUND },
    }),
  },
  [`${BASE}/{checkId}/items/{itemId}`]: {
    patch: operation({
      id: "patchAiCheckItem",
      tag: TAG,
      summary: "Đánh dấu mục đã xem hoặc đã áp dụng",
      description: "`status: REVIEWED` khi mod bấm Hoàn tất. `applied: true` do web báo sau khi tự thay đoạn trong editor; server chỉ ghi nhận, không xác minh. Cả hai idempotent.",
      access: "studio",
      ...itemParams,
      body: { name: "PatchAiCheckItem", schema: PatchAiCheckItemSchema },
      ok: { status: 200, description: "Mục sau khi cập nhật", schema: { name: "AiCheckItem", schema: AiCheckItemSchema } },
      rate: "write",
      errors: { 404: NOT_FOUND },
    }),
  },
};
