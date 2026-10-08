import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { env } from "../../core/env";
import { COMMON_RESPONSES, parameters, securitySchemes } from "./components";
import { registeredSchemas } from "./registry";
import type { Paths } from "./operation";
import { catalogPaths } from "./paths/catalog";
import { listeningPaths } from "./paths/listening";
import { mediaPaths } from "./paths/media";
import { scriptWorkflowPaths } from "./paths/script-workflow";
import { studioPaths } from "./paths/studio";
import { systemAuthPaths } from "./paths/system-auth";

const API_VERSION = "1.0.0";
const SCALAR_THEME = "saturn";

const DESCRIPTION = `
API của nền tảng podcast lịch sử Sử Ký: Moderator biên tập Series, tập và bản kể (kể cả kịch bản do AI Studio sinh ra); người nghe duyệt, phát audio và đồng bộ tiến độ.

## Xác thực
Đăng nhập bằng \`POST /api/auth/sign-in/email\`. Session đi theo **cookie** \`better-auth.session_token\` (client web cần \`credentials: "include"\`) hoặc header \`Authorization: Bearer <token>\` với token lấy từ header \`set-auth-token\` của response đăng nhập.

| Vai trò | Quyền |
|---|---|
| \`user\` | Nghe, đồng bộ tiến độ, xem lịch sử |
| \`moderator\` | Studio: Series, tập, bản kể, nguồn, media; AI Script Workflow (chỉ Moderator, Admin bị loại trừ) |
| \`admin\` | Studio trên mọi nội dung, kể cả nội dung bị khoá, và endpoint quản trị |

Mỗi operation ghi rõ quyền cần có ở cuối mô tả và trong \`x-required-roles\`.

## Định dạng lỗi
Mọi lỗi có cùng một dạng, kèm HTTP status đúng nghĩa (không bao giờ trả \`200\` cho lỗi):

\`\`\`json
{ "error_code": "STALE_WRITE", "message": "Content was updated by another request" }
\`\`\`

Client xử lý theo \`error_code\`, không dựa vào \`message\`. \`SLUG_CONFLICT\`, \`RATE_LIMITED\` và \`MEDIA_PROVIDER_UNAVAILABLE\` là lỗi **có thể thử lại**; còn lại không nên tự động thử lại.

## Quy ước chung
- **Phân trang**: query \`page\` (từ 1) và \`limit\` (tối đa 50); response \`{ items, page, limit, total }\`.
- **Idempotency**: các thao tác tạo mới yêu cầu header \`Idempotency-Key\` (UUID v4). Gửi lại cùng key và cùng body trả đúng kết quả cũ kèm header \`Idempotent-Replayed\`.
- **Khoá lạc quan**: nhiều PATCH/PUT nhận \`baseUpdatedAt\` (lấy từ \`updatedAt\` của lần đọc gần nhất). Nội dung đã bị sửa từ đó trả \`409 STALE_WRITE\`.
- **Giới hạn tốc độ**: vượt hạn mức trả \`429 RATE_LIMITED\` kèm \`Retry-After\` (giây).
- **Theo dõi**: mỗi response có header \`X-Request-Id\`; gửi lại khi báo lỗi để tra log.
- **Giới hạn body**: 10 MB (\`413 PAYLOAD_TOO_LARGE\`). Upload audio và ảnh đi thẳng lên Cloudinary, không qua API này.
- **Thời gian**: ISO 8601 (UTC). Năm lịch sử là số nguyên, năm trước Công nguyên là số âm.
`.trim();

const TAGS = [
  { name: "System", description: "Kiểm tra trạng thái hệ thống" },
  { name: "Authentication", description: "Better Auth, phiên đăng nhập và tài khoản hiện tại" },
  { name: "Admin", description: "Endpoint riêng cho Admin" },
  { name: "Catalog", description: "Danh mục công khai: chủ đề và giai đoạn lịch sử" },
  { name: "Listening", description: "Duyệt nội dung, phát audio, đồng bộ tiến độ và lịch sử nghe" },
  { name: "Studio Series", description: "Moderator biên tập Series: tạo, sửa, xuất bản, ẩn, thùng rác, sắp xếp tập" },
  { name: "Studio Episodes", description: "Moderator biên tập tập: bản kể, audio, nguồn trích dẫn, thẻ thực thể" },
  { name: "Studio Catalog", description: "Kho nguồn tham khảo và thực thể lịch sử dùng chung" },
  { name: "Studio Media", description: "Upload và xác minh audio, ảnh qua Cloudinary" },
  { name: "Script Workflow", description: "AI Studio: tạo kịch bản theo từng bước, duyệt từng node và nhập vào CMS" },
] as const;

const TAG_GROUPS = [
  { name: "Hệ thống và tài khoản", tags: ["System", "Authentication", "Admin"] },
  { name: "Người nghe", tags: ["Catalog", "Listening"] },
  { name: "Studio (Moderator)", tags: ["Studio Series", "Studio Episodes", "Studio Catalog", "Studio Media"] },
  { name: "AI Studio", tags: ["Script Workflow"] },
] as const;

const allPaths: Paths = {
  ...systemAuthPaths,
  ...catalogPaths,
  ...listeningPaths,
  ...studioPaths,
  ...mediaPaths,
  ...scriptWorkflowPaths,
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Su-Ky (Sử Ký) API",
    version: API_VERSION,
    description: DESCRIPTION,
  },
  servers: [{ url: env.BETTER_AUTH_URL, description: `API (${env.NODE_ENV})` }],
  tags: TAGS,
  "x-tagGroups": TAG_GROUPS,
  paths: allPaths,
  components: {
    securitySchemes,
    parameters,
    // Only the responses operations reference via $ref; every other error is inlined with its specific codes.
    responses: { Unauthorized: COMMON_RESPONSES.Unauthorized, InternalError: COMMON_RESPONSES.InternalError },
    schemas: registeredSchemas(),
  },
};

export const docsRoute = new Hono()
  .get("/openapi.json", (c) => c.json(openApiSpec))
  .get(
    "/docs",
    apiReference({
      theme: SCALAR_THEME,
      pageTitle: "Su-Ky API Documentation",
      spec: { content: openApiSpec },
    })
  );
