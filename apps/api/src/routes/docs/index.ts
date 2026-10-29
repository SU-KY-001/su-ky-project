import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { env } from "../../core/env";
import { API_VERSION } from "../../core/config/app-info";
import { COMMON_RESPONSES, parameters, securitySchemes } from "./components";
import { betterAuthPaths, betterAuthSchemas } from "./better-auth-schema";
import { registeredSchemas } from "./registry";
import { aiAssistPaths } from "./paths/ai-assist";
import type { Paths } from "./operation";
import { catalogPaths } from "./paths/catalog";
import {historicalCatalogPaths} from "./paths/historical-catalog";
import { listeningPaths } from "./paths/listening";
import { mediaPaths } from "./paths/media";
import { studioPaths } from "./paths/studio";
import { systemAuthPaths } from "./paths/system-auth";
import { releasePaths } from "./paths/releases";
import { adminPaths } from "./paths/admin";
import { gamificationPaths } from "./paths/gamification";
import { showcasePaths } from "./paths/showcase";

const SCALAR_THEME = "saturn";

const DESCRIPTION = `
API của nền tảng podcast lịch sử Sử Ký: Moderator biên tập Series, tập và bản kể (kể cả kịch bản do AI Studio sinh ra); người nghe duyệt, phát audio và đồng bộ tiến độ.

## Xác thực
Đăng nhập bằng \`POST /api/auth/sign-in/email\`. Session đi theo **cookie** \`better-auth.session_token\` (client web cần \`credentials: "include"\`) hoặc header \`Authorization: Bearer <token>\` với token lấy từ header \`set-auth-token\` của response đăng nhập.

| Vai trò | Quyền |
|---|---|
| \`user\` | Nghe, đồng bộ tiến độ, xem lịch sử |
| \`moderator\` | Studio: Series, tập, bản kể, nguồn, media |
| \`admin\` | Studio trên mọi nội dung, kể cả nội dung bị khoá, và endpoint quản trị |

Mỗi operation ghi rõ quyền cần có ở cuối mô tả và trong \`x-required-roles\`.

## Định dạng lỗi
Mọi lỗi có cùng một dạng, kèm HTTP status đúng nghĩa (không bao giờ trả \`200\` cho lỗi):

\`\`\`json
{ "error_code": "STALE_WRITE", "message": "Content was updated by another request" }
\`\`\`

Lỗi \`VALIDATION_ERROR\` (400) kèm \`details: [{ path, code }]\` (tối đa 20 mục): \`path\` là trường sai, \`code\` là mã lỗi zod (\`too_small\`, \`invalid_type\`...), không phải câu hiển thị. Không bao giờ chứa giá trị client đã gửi.

Client (web, mobile) xử lý theo \`error_code\`, không dựa vào \`message\` hay chỉ dựa vào status. Mỗi \`error_code\` chỉ có một status. Lỗi **có thể thử lại cùng \`Idempotency-Key\`**: \`SLUG_CONFLICT\`, \`WRITE_CONFLICT\`, \`RATE_LIMITED\`, \`MEDIA_PROVIDER_UNAVAILABLE\`, \`NO_READABLE_SOURCE\`, \`AI_UNAVAILABLE\`, \`AI_DISABLED\`, \`AI_CHECK_ALREADY_RUNNING\`, \`AI_CONCURRENCY_LIMIT\`, \`AI_TIMEOUT\`; mọi lỗi 5xx cũng vậy. Còn lại không nên tự động thử lại.

| Status | Ý nghĩa |
|---|---|
| 400 | Sai cú pháp hoặc schema request |
| 401 | Chưa đăng nhập hoặc phiên hết hạn |
| 403 | Đã đăng nhập nhưng không có quyền với tài nguyên đó (tài nguyên có tồn tại) |
| 404 | Tài nguyên không tồn tại |
| 409 | Xung đột với trạng thái hiện tại: bản ghi đã đổi, trùng, sai bước chuyển trạng thái |
| 422 | Request đúng cú pháp nhưng chưa đủ điều kiện nghiệp vụ |
| 429 | Vượt hạn mức (kèm \`Retry-After\`) |
| 502 / 503 / 504 | Dịch vụ phụ thuộc trả lỗi / chưa sẵn sàng / hết giờ |

Lỗi lưu trong DB của lượt rà AI (\`ai_checks.error_code\`: \`INTERRUPTED\`, \`ALL_BLOCKS_FAILED\`...) là bộ mã riêng, không nằm trong \`error_code\` của response.

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
  { name: "Release Coordination", description: "Điều phối, kiểm duyệt và tự động phát hành podcast" },
  { name: "Catalog", description: "Danh mục công khai: chủ đề và giai đoạn lịch sử" },
  { name: "Listening", description: "Duyệt nội dung, phát audio, đồng bộ tiến độ và lịch sử nghe" },
  { name: "Quiz", description: "Moderator biên tập quiz; người nghe làm và nhận XP" },
  { name: "Missions", description: "Nhiệm vụ tuần và tiến độ game hóa của người nghe" },
  { name: "Studio Series", description: "Moderator biên tập Series: tạo, sửa, xuất bản, ẩn, thùng rác, sắp xếp tập, nguồn tham khảo của Series" },
  { name: "Studio Episodes", description: "Moderator biên tập tập: bản kể (kịch bản text, audio upload), thẻ thực thể" },
  { name: "Studio Catalog", description: "Kho nguồn tham khảo và thực thể lịch sử dùng chung" },
  { name: "Studio Media", description: "Upload và xác minh audio, ảnh, PDF qua Cloudinary" },
  { name: "Studio AI", description: "Trợ lý AI cho moderator: rà kịch bản đối chiếu nguồn đã xác minh (cảnh báo mềm, không tự sửa)" },
] as const;

const TAG_GROUPS = [
  { name: "Hệ thống và tài khoản", tags: ["System", "Authentication", "Admin", "Release Coordination"] },
  { name: "Người nghe", tags: ["Catalog", "Listening", "Quiz", "Missions"] },
  { name: "Studio (Moderator)", tags: ["Studio Series", "Studio Episodes", "Studio Catalog", "Studio Media", "Studio AI"] },
] as const;

// Hand-written auth entries come last so their curated docs override the generated ones.
const allPaths: Paths = {
  ...betterAuthPaths,
  ...systemAuthPaths,
  ...adminPaths,
  ...gamificationPaths,
  ...showcasePaths,
  ...catalogPaths,
  ...historicalCatalogPaths,
  ...listeningPaths,
  ...studioPaths,
  ...releasePaths,
  ...mediaPaths,
  ...aiAssistPaths,
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
    schemas: { ...betterAuthSchemas, ...registeredSchemas() },
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
