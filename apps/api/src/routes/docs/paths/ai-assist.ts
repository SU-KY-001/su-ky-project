import {
  AiCheckItemSchema,
  AiCheckSchema,
  AngleListSchema,
  AngleSchema,
  CreateAiCheckSchema,
  CreateAngleSchema,
  CreateOutlineSchema,
  DraftSectionRequestSchema,
  DraftSectionResponseSchema,
  OutlineResponseSchema,
  PatchAiCheckItemSchema,
  RewriteRequestSchema,
  RewriteResponseSchema,
  UpdateAngleSchema,
  CreateVoiceJobSchema,
  VoiceJobSchema,
} from "@repo/shared";
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
const ANGLES = "/api/studio/ai/angles";
const COMPOSE = "/api/studio/episodes/{id}/ai";
const COMPOSE_ERRORS: Record<number, string> = {
  404: NOT_FOUND,
  422: "`VALIDATION_ERROR`: góc kể hoặc nhân vật kể không tồn tại; `SCRIPT_TOO_LONG`: số từ đích hoặc đoạn chọn vượt trần; `HASH_MISMATCH` (rewrite): `hash` không khớp `text`",
  429: "`RATE_LIMITED` (kèm `Retry-After`): hết hạn mức `rate_limit.ai_generate`; `AI_CONCURRENCY_LIMIT`: quá `AI_ASSIST_MAX_CONCURRENT_PER_USER` lời gọi đang chạy",
  502: "`AI_BAD_OUTPUT`: đầu ra hỏng sau một lần sửa schema hoặc không còn phần hợp lệ",
  503: "`AI_DISABLED`: tắt bằng `ai_assist.enabled`; `AI_UNAVAILABLE`: chưa cấu hình hoặc nhà cung cấp tạm lỗi; `AI_PROVIDER_AUTH` / `AI_PROVIDER_QUOTA`: nhà cung cấp từ chối",
  504: "`AI_TIMEOUT`: quá `AI_ASSIST_CALL_TIMEOUT_MS`",
};
const angleParams = { pathParams: z.object({ id: z.string().min(1) }), pathParamDocs: { id: "ID góc kể (UUID)" } } as const;
const ANGLE_NOT_FOUND = "`NOT_FOUND`: góc kể không tồn tại, là góc có sẵn, hoặc không thuộc bạn";
const voiceParams = {
  pathParams: z.object({ id: z.string().uuid(), jobId: z.string().uuid() }),
  pathParamDocs: { id: "ID tập (UUID)", jobId: "ID lượt tạo giọng (UUID)" },
} as const;

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
  [`${BASE}/{checkId}/events/stream`]: {
    get: operation({
      id: "streamAiCheckEvents",
      tag: TAG,
      summary: "Theo dõi lượt rà theo thời gian thực (SSE)",
      description: [
        "`text/event-stream`. Sự kiện `item` có `id` = `seq` và `data` là `AiCheckItem`; `progress` mang `{ processedBlocks, totalBlocks, failedBlocks }`; `done`/`failed` mang `AiCheck` rồi server đóng luồng.",
        "Nối lại bằng header `Last-Event-ID` (`EventSource` tự gửi): chỉ nhận mục có `seq` lớn hơn, không trùng. Lượt đã xong phát lại toàn bộ mục rồi đóng.",
        "Comment `: ping` định kỳ để proxy không cắt kết nối rảnh. Mỗi người dùng tối đa vài kết nối cùng lúc.",
      ].join("\n\n"),
      access: "studio",
      ...checkParams,
      ok: { status: 200, description: "Luồng sự kiện", contentType: "text/event-stream", contentSchema: { type: "string" } },
      errors: { 404: NOT_FOUND, 429: "`RATE_LIMITED`: quá nhiều kết nối theo dõi đang mở" },
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
  [ANGLES]: {
    get: operation({
      id: "listAiAngles",
      tag: TAG,
      summary: "Góc kể: có sẵn và của bạn",
      description: "Góc có sẵn (`builtin: true`, id `builtin:<slug>`) đứng trước, rồi góc của bạn theo thời điểm tạo.",
      access: "studio",
      ok: { status: 200, description: "Danh sách góc kể", schema: { name: "AiAngleList", schema: AngleListSchema } },
    }),
    post: operation({
      id: "createAiAngle",
      tag: TAG,
      summary: "Tạo góc kể",
      description: "`name` (1-60), `description` (tối đa 160), `guide` (tối đa 500) được chuẩn hóa NFC, bỏ ký tự điều khiển, cắt khoảng trắng đầu cuối.",
      access: "studio",
      body: { name: "CreateAiAngle", schema: CreateAngleSchema },
      ok: { status: 201, description: "Góc kể đã tạo", schema: { name: "AiAngle", schema: AngleSchema } },
      rate: "write",
      errors: {
        409: "`ANGLE_NAME_TAKEN`: trùng tên (không phân biệt hoa thường) với góc của bạn hoặc góc có sẵn",
        422: "`VALIDATION_ERROR`: trường sai; `ANGLE_LIMIT`: đã đủ số góc tối đa mỗi người (`AI_ANGLE_MAX_PER_USER`)",
      },
    }),
  },
  [`${ANGLES}/{id}`]: {
    patch: operation({
      id: "updateAiAngle",
      tag: TAG,
      summary: "Sửa góc kể",
      description: "Chỉ sửa được góc của bạn; góc có sẵn hoặc của người khác trả `404`.",
      access: "studio",
      ...angleParams,
      body: { name: "UpdateAiAngle", schema: UpdateAngleSchema },
      ok: { status: 200, description: "Góc kể sau khi sửa", schema: { name: "AiAngle", schema: AngleSchema } },
      rate: "write",
      errors: { 404: ANGLE_NOT_FOUND, 409: "`ANGLE_NAME_TAKEN`: trùng tên", 422: "`VALIDATION_ERROR`" },
    }),
    delete: operation({
      id: "deleteAiAngle",
      tag: TAG,
      summary: "Xóa góc kể",
      description: "Xóa thật. Dàn ý và kịch bản đã viết không tham chiếu góc kể nên không bị ảnh hưởng.",
      access: "studio",
      ...angleParams,
      ok: { status: 204, description: "Đã xóa" },
      rate: "write",
      errors: { 404: ANGLE_NOT_FOUND },
    }),
  },
  [`${COMPOSE}/outline`]: {
    post: operation({
      id: "createAiOutline",
      tag: TAG,
      summary: "AI lập dàn ý",
      description: [
        "Đồng bộ, không lưu DB. `targetWords` đo bằng số từ (`script.words_per_minute` quy ra phút). Server tự nạp góc kể theo `angleId`; `guide` không bao giờ lấy từ client.",
        "`sections[].targetWords` chia theo `weight`, tổng đúng bằng `targetWords`. `sources` cho biết đã dùng bao nhiêu nguồn của series. Hủy request thì hủy lời gọi model.",
      ].join("\n\n"),
      access: "studio",
      ...episodeParams,
      body: { name: "CreateAiOutline", schema: CreateOutlineSchema },
      ok: { status: 200, description: "Dàn ý đề xuất", schema: { name: "AiOutlineResponse", schema: OutlineResponseSchema } },
      rate: "ai_generate",
      errors: COMPOSE_ERRORS,
    }),
  },
  [`${COMPOSE}/draft-section`]: {
    post: operation({
      id: "createAiDraftSection",
      tag: TAG,
      summary: "AI viết một phần",
      description: [
        "Đồng bộ, không lưu DB. Viết phần `outline[index]`; phần i cần `previousText` của phần i-1 để nối mạch (client gọi tuần tự).",
        "`lengthStatus` (SHORT/LONG ngoài ±25% mục tiêu), `exceedsLimit` (vượt `remainingChars`) và `novelNumbers` (số không có trong đề bài, dàn ý, nguồn) chỉ là thông tin cho UI, không chặn.",
      ].join("\n\n"),
      access: "studio",
      ...episodeParams,
      body: { name: "CreateAiDraftSection", schema: DraftSectionRequestSchema },
      ok: { status: 200, description: "Lời kể của phần", schema: { name: "AiDraftSectionResponse", schema: DraftSectionResponseSchema } },
      rate: "ai_generate",
      errors: COMPOSE_ERRORS,
    }),
  },
  [`${COMPOSE}/rewrite`]: {
    post: operation({
      id: "createAiRewrite",
      tag: TAG,
      summary: "AI viết lại đoạn",
      description: [
        "Đồng bộ, không lưu DB. Server tính lại `hash` của từng block, lệch thì `422 HASH_MISMATCH`. `count` tối đa `AI_REWRITE_MAX_VARIANTS`.",
        "`returned < requested` khi bản trùng gốc, trùng nhau, rỗng hoặc quá khác độ dài bị loại; không còn bản nào thì `502 AI_NO_VARIANTS`. Bản có số lạ được giữ, kèm `novelNumbers`.",
      ].join("\n\n"),
      access: "studio",
      ...episodeParams,
      body: { name: "CreateAiRewrite", schema: RewriteRequestSchema },
      ok: { status: 200, description: "Các bản viết lại", schema: { name: "AiRewriteResponse", schema: RewriteResponseSchema } },
      rate: "ai_generate",
      errors: { ...COMPOSE_ERRORS, 502: `${COMPOSE_ERRORS[502]}; \`AI_NO_VARIANTS\`: không còn bản hợp lệ nào` },
    }),
  },
  [`${COMPOSE}/voice`]: {
    post: operation({
      id: "createVoiceJob", tag: TAG, summary: "Tạo giọng đọc AI", access: "studio",
      description: "Chạy nền với kịch bản đã lưu. Trả lại lượt RUNNING hiện có của cùng người dùng và tập. Job và MP3 tạm hết hạn theo TTS_JOB_TTL_MS; khởi động lại API sẽ mất job. Kết quả có voice, model, style, `scriptHash` (hash kịch bản đã chuẩn hóa lúc tạo) và `contentRevision`; khi gắn âm thanh vào tập, `origin.scriptHash` được server so với kịch bản hiện tại trong transaction và lệch thì bị từ chối (`HASH_MISMATCH`).",
      ...episodeParams,
      body: { name: "CreateVoiceJob", schema: CreateVoiceJobSchema },
      ok: { status: 202, description: "Lượt tạo giọng", schema: { name: "VoiceJob", schema: VoiceJobSchema } },
      rate: "ai_generate",
      errors: { 404: NOT_FOUND, 422: "Kịch bản đã lưu không có nội dung đọc" },
    }),
  },
  [`${COMPOSE}/voice/{jobId}`]: {
    get: operation({
      id: "getVoiceJob", tag: TAG, summary: "Xem tiến độ tạo giọng", access: "studio", ...voiceParams,
      ok: { status: 200, description: "Trạng thái và metadata giọng đọc", schema: { name: "VoiceJob", schema: VoiceJobSchema } },
      errors: { 404: "Job không tồn tại, hết hạn hoặc không thuộc người dùng (Admin được xem)" },
    }),
    delete: operation({
      id: "cancelVoiceJob", tag: TAG, summary: "Hủy tạo giọng", access: "studio", ...voiceParams,
      ok: { status: 204, description: "Đã yêu cầu hủy" },
      errors: { 404: "Job không tồn tại hoặc không thuộc người dùng" },
    }),
  },
  [`${COMPOSE}/voice/{jobId}/audio`]: {
    get: operation({
      id: "getVoiceAudio", tag: TAG, summary: "Tải MP3 đã tạo", access: "studio", ...voiceParams,
      ok: { status: 200, description: "File MP3, Cache-Control: no-store", contentType: "audio/mpeg", contentSchema: { type: "string", format: "binary" } },
      errors: { 404: "Job không tồn tại hoặc không thuộc người dùng", 409: "Job chưa DONE hoặc không có file" },
    }),
  },
};
