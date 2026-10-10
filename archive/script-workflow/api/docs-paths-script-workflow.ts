import {
  CreatePublicationRequestSchema,
  CreateScriptWorkflowRequestSchema,
  CreateScriptWorkflowResponseSchema,
  GetWorkflowEventsResponseSchema,
  GetWorkflowResponseSchema,
  ImportPreviewSchema,
  ImportRequestSchema,
  ImportResultSchema,
  ListScriptWorkflowsQuerySchema,
  ScriptWorkflowIdParamSchema,
  StepDecisionRequestSchema,
  WorkflowEventStreamQuerySchema,
  WorkflowEventsQuerySchema,
  WorkflowTreeResponseSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  CreatePublicationResponseSchema,
  PublicationsResponseSchema,
  StepDecisionResultSchema,
  WorkflowListResponseSchema,
} from "../schemas";

const TAG = "Script Workflow";
const BASE = "/api/script-workflows";
const ID_DOC = { id: "ID workflow (số nguyên)" };
const OWNED_NOT_FOUND = "`NOT_FOUND`: workflow không tồn tại hoặc không thuộc Moderator này (không lộ ID của người khác)";

const idParams = { pathParams: ScriptWorkflowIdParamSchema, pathParamDocs: ID_DOC } as const;

const SSE_EVENTS_DOC = [
  "Server-Sent Events, đóng khi run kết thúc (`COMPLETED` hoặc `FAILED`).",
  "- `workflow-event`: `id` = ID sự kiện, `data` = JSON `WorkflowEvent`.",
  "- `ping`: heartbeat `keepalive`.",
  "- `workflow-done`: `data` = `{ workflowRunId, status }`, ngay trước khi đóng.",
  "",
  "Kết nối lại bằng `Last-Event-ID` (hoặc `?afterId=`) để chỉ nhận sự kiện mới. Dùng `new EventSource(url, { withCredentials: true })` vì xác thực bằng cookie.",
].join("\n");

export const scriptWorkflowPaths: Paths = {
  [BASE]: {
    post: operation({
      id: "createScriptWorkflow",
      tag: TAG,
      summary: "Tạo workflow kịch bản",
      description:
        "Khởi tạo một run và chạy ngay bước `RESEARCHER`. Nếu truyền `seriesId`, Moderator phải có quyền sửa Series đó.",
      access: "moderator",
      body: {
        name: "CreateScriptWorkflowRequest",
        schema: CreateScriptWorkflowRequestSchema,
        example: { topic: "Chiến thắng Bạch Đằng năm 1288", focusHint: "Tập trung vào kế hoạch cắm cọc" },
      },
      ok: {
        status: 201,
        description: "Run đã tạo, đang xếp hàng",
        schema: { name: "CreateScriptWorkflowResponse", schema: CreateScriptWorkflowResponseSchema },
        location: `${BASE}/{id}`,
        example: { id: 42 },
      },
      idempotent: true,
      rate: "write",
      errors: {
        403: "`FORBIDDEN`: không phải Moderator; `CONTENT_LOCKED`: Series gắn kèm bị Admin khoá",
        404: "`NOT_FOUND`: `seriesId` không tồn tại hoặc không thuộc Moderator này",
        409: "`CONTENT_IN_TRASH`: Series gắn kèm đang ở thùng rác",
        503: "`SERVICE_UNAVAILABLE`: AI runtime chưa sẵn sàng",
      },
    }),
    get: operation({
      id: "listScriptWorkflows",
      tag: TAG,
      summary: "Danh sách workflow của tôi",
      description: "Chỉ trả các run do Moderator hiện tại tạo, mới nhất trước.",
      access: "moderator",
      query: ListScriptWorkflowsQuerySchema,
      queryDocs: {
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
        seriesId: "Chỉ lấy run gắn với Series này",
      },
      ok: {
        status: 200,
        description: "Danh sách phân trang",
        schema: { name: "WorkflowList", schema: WorkflowListResponseSchema },
      },
    }),
  },
  [`${BASE}/{id}`]: {
    get: operation({
      id: "getScriptWorkflow",
      tag: TAG,
      summary: "Chi tiết workflow",
      description: "Đủ 7 bước theo thứ tự, mỗi bước kèm các phiên bản (`versions`) và output.",
      access: "moderator",
      ...idParams,
      ok: {
        status: 200,
        description: "Chi tiết workflow",
        schema: { name: "GetWorkflowResponse", schema: GetWorkflowResponseSchema },
      },
      errors: { 404: OWNED_NOT_FOUND },
    }),
  },
  [`${BASE}/{id}/tree`]: {
    get: operation({
      id: "getScriptWorkflowTree",
      tag: TAG,
      summary: "Cây lịch sử thực thi",
      description: "Mọi node bất biến của run (mỗi lần chạy lại tạo nhánh mới) cùng các bản xuất bản.",
      access: "moderator",
      ...idParams,
      ok: {
        status: 200,
        description: "Cây node và publications",
        schema: { name: "WorkflowTreeResponse", schema: WorkflowTreeResponseSchema },
      },
      errors: { 404: OWNED_NOT_FOUND },
    }),
  },
  [`${BASE}/{id}/step-decisions`]: {
    post: operation({
      id: "decideScriptWorkflowStep",
      tag: TAG,
      summary: "Quyết định của Moderator trên một node",
      description: [
        "Một endpoint, ba hành động phân biệt bằng `action`:",
        "- `CONTINUE`: duyệt node, cần `baseVersion`. Gate 0 có thể kèm `narrativeSelection`.",
        "- `RERUN`: fork nhánh mới từ node cha, cần `feedback`, không cần `baseVersion`.",
        "- `DIRECT_EDIT`: sửa tay output, cần `baseVersion` và `editedOutputJson`.",
      ].join("\n"),
      access: "moderator",
      ...idParams,
      body: {
        name: "StepDecisionRequest",
        schema: StepDecisionRequestSchema,
        example: { action: "CONTINUE", stepType: "RESEARCHER", baseVersion: 1 },
      },
      ok: {
        status: 200,
        description: "Đã áp dụng quyết định",
        schema: { name: "StepDecisionResult", schema: StepDecisionResultSchema },
      },
      rate: "write",
      errors: {
        404: OWNED_NOT_FOUND,
        409: "`STALE_WRITE`: `baseVersion` đã cũ hoặc bước không ở trạng thái chờ duyệt",
      },
    }),
  },
  [`${BASE}/{id}/publications`]: {
    get: operation({
      id: "listScriptPublications",
      tag: TAG,
      summary: "Danh sách bản xuất bản",
      description: "Mỗi bản kèm `finalScript` (kịch bản văn nói của các tập) để đem sang công cụ TTS.",
      access: "moderator",
      ...idParams,
      ok: {
        status: 200,
        description: "Danh sách bản xuất bản",
        schema: { name: "PublicationsResponse", schema: PublicationsResponseSchema },
      },
      errors: { 404: OWNED_NOT_FOUND },
    }),
    post: operation({
      id: "createScriptPublication",
      tag: TAG,
      summary: "Xuất bản tường minh một node đã duyệt",
      description: "Idempotent theo `approvedVersionId`: xuất bản lại cùng node trả cùng bản ghi.",
      access: "moderator",
      ...idParams,
      body: {
        name: "CreatePublicationRequest",
        schema: CreatePublicationRequestSchema,
        example: { approvedVersionId: 17 },
      },
      ok: {
        status: 201,
        description: "Bản xuất bản",
        schema: { name: "CreatePublicationResponse", schema: CreatePublicationResponseSchema },
        location: `${BASE}/{id}/publications`,
      },
      rate: "write",
      errors: {
        400: "`BAD_REQUEST`: node không hợp lệ hoặc thiếu bước `ORALIZER` trên nhánh",
        404: OWNED_NOT_FOUND,
      },
    }),
  },
  [`${BASE}/{id}/events`]: {
    get: operation({
      id: "listScriptWorkflowEvents",
      tag: TAG,
      summary: "Nhật ký sự kiện",
      description: "Sắp xếp cũ đến mới. Dùng để dựng timeline khi mở lại trang.",
      access: "moderator",
      ...idParams,
      query: WorkflowEventsQuerySchema,
      queryDocs: { type: "Lọc theo tiền tố loại sự kiện", limit: "Số sự kiện tối đa (1–200)" },
      ok: {
        status: 200,
        description: "Danh sách sự kiện",
        schema: { name: "GetWorkflowEventsResponse", schema: GetWorkflowEventsResponseSchema },
      },
      errors: { 404: OWNED_NOT_FOUND },
    }),
  },
  [`${BASE}/{id}/events/stream`]: {
    get: operation({
      id: "streamScriptWorkflowEvents",
      tag: TAG,
      summary: "Luồng sự kiện realtime (SSE)",
      description: SSE_EVENTS_DOC,
      access: "moderator",
      ...idParams,
      query: WorkflowEventStreamQuerySchema,
      queryDocs: { afterId: "Chỉ gửi sự kiện có ID lớn hơn giá trị này (ưu tiên hơn `Last-Event-ID`)" },
      ok: {
        status: 200,
        description: "Luồng `text/event-stream`",
        contentType: "text/event-stream",
        contentSchema: { type: "string" },
        example: 'event: workflow-event\nid: 12\ndata: {"id":12,"type":"step.started","message":"RESEARCHER started","metadataJson":null,"createdAt":"2026-10-08T10:00:00.000Z"}\n\n',
      },
      errors: { 404: OWNED_NOT_FOUND },
    }),
  },
  [`${BASE}/{id}/import-preview`]: {
    get: operation({
      id: "getScriptImportPreview",
      tag: TAG,
      summary: "Xem trước nhập Gate 2",
      description:
        "Chỉ dùng được sau khi Gate 2 đã được duyệt (`CONTINUE` trên `FACT_CHECKER`); trước đó trả `409 IMPORT_NOT_AVAILABLE`. Đối chiếu kết quả FACT_CHECKER đã duyệt với catalog hiện có (nguồn, thực thể trùng) để Moderator quyết định trước khi nhập vào CMS. `basis.factCheckerVersionId` phải gửi lại ở bước nhập.",
      access: "moderator",
      ...idParams,
      ok: {
        status: 200,
        description: "Dữ liệu đối chiếu",
        schema: { name: "ImportPreview", schema: ImportPreviewSchema },
      },
      errors: {
        404: OWNED_NOT_FOUND,
        409: "`IMPORT_NOT_AVAILABLE`: Gate 2 chưa được duyệt, hoặc lineage không đầy đủ",
      },
    }),
  },
  [`${BASE}/{id}/import`]: {
    get: operation({
      id: "getScriptImport",
      tag: TAG,
      summary: "Kết quả nhập đã lưu",
      description: "Cặp đọc lại của `POST import`: trả đúng kiểu `ImportResult`.",
      access: "moderator",
      ...idParams,
      ok: {
        status: 200,
        description: "Kết quả nhập",
        schema: { name: "ImportResult", schema: ImportResultSchema },
      },
      errors: { 404: "`NOT_IMPORTED`: workflow chưa được nhập, hoặc `NOT_FOUND` nếu không thuộc Moderator này" },
    }),
    post: operation({
      id: "importScriptWorkflow",
      tag: TAG,
      summary: "Duyệt và nhập vào CMS",
      description:
        "Chỉ dùng được sau khi Gate 2 đã được duyệt qua `step-decisions` (`CONTINUE` trên `FACT_CHECKER`); endpoint này không tự duyệt Gate 2. Tạo (hoặc dùng lại) Series, các tập nháp, bản kể, nguồn và thẻ thực thể từ kết quả AI theo quyết định của Moderator. Trả `201` khi tạo mới, `200` khi là kết quả lặp lại.",
      access: "moderator",
      ...idParams,
      body: {
        name: "ImportRequest",
        schema: ImportRequestSchema,
        example: {
          basis: { factCheckerVersionId: 21 },
          approvalNote: "Đã đối chiếu nguồn",
          sourceDecisions: [{ itemId: "src-1", action: "CREATE" }],
          entityDecisions: [],
        },
      },
      ok: {
        status: 201,
        description: "Đã nhập (200 nếu replay)",
        schema: { name: "ImportResult", schema: ImportResultSchema },
        location: "/api/studio/series/{seriesId}",
      },
      idempotent: true,
      rate: "ai_import",
      errors: {
        404: OWNED_NOT_FOUND,
        409: "`STALE_WRITE`: nhánh đã thay đổi so với `basis`; `IMPORT_NOT_AVAILABLE`: Gate 2 chưa được duyệt (bước FACT_CHECKER chưa có phiên bản đã duyệt)",
        422: "`IMPORT_DECISIONS_INCOMPLETE`: còn nguồn trong danh mục AI chưa có quyết định",
      },
    }),
  },
};
