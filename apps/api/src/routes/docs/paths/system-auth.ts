import { SignInSchema, SignUpSchema } from "@repo/shared";
import { component } from "../registry";
import { operation, type Paths } from "../operation";
import {
  AuthSessionResultSchema,
  CurrentUserResponseSchema,
  GetSessionResponseSchema,
  HealthResponseSchema,
  MessageResponseSchema,
  TimelineResponseSchema,
} from "../schemas";

const SYSTEM = "System";
const AUTH = "Authentication";
const ADMIN = "Admin";

const AUTH_NOTE =
  "Endpoint do Better Auth quản lý (`/api/auth/*`); đây chỉ là phần thường dùng. Danh sách đầy đủ do thư viện cung cấp.";

const healthOperation = operation({
  id: "getHealth",
  tag: SYSTEM,
  summary: "Kiểm tra sức khỏe hệ thống",
  description:
    "Trả về runtime, phiên bản Bun, trạng thái PostgreSQL, hàng đợi bảo trì (pg-boss) và uptime.",
  access: "public",
  ok: {
    status: 200,
    description: "Database kết nối và hàng đợi đang chạy",
    schema: { name: "HealthResponse", schema: HealthResponseSchema },
  },
  // Unlike every other 503, the health check answers with its own body, not an error envelope.
  responseOverrides: {
    "503": {
      description: "Database mất kết nối hoặc hàng đợi dừng; `status = degraded`",
      content: { "application/json": { schema: component("HealthResponse", HealthResponseSchema) } },
    },
  },
});

const timelineOperation = operation({
  id: "listTimelinePeriods",
  tag: SYSTEM,
  summary: "Dòng thời gian (tạm thời)",
  description: "Stub tương thích ngược cho frontend, hiện luôn trả danh sách rỗng. Dùng `GET /api/historical-periods` thay thế.",
  access: "public",
  ok: { status: 200, description: "Danh sách (hiện rỗng)", schema: { name: "TimelineResponse", schema: TimelineResponseSchema } },
});

export const systemAuthPaths: Paths = {
  "/health": { get: healthOperation },
  "/api/auth/sign-up/email": {
    post: operation({
      id: "signUpWithEmail",
      tag: AUTH,
      summary: "Đăng ký tài khoản mới",
      description: `Tạo tài khoản với vai trò mặc định \`user\` và đăng nhập luôn. ${AUTH_NOTE}`,
      access: "public",
      body: {
        name: "SignUpRequest",
        schema: SignUpSchema,
        example: { name: "Nguyễn Văn A", email: "a@example.com", password: "matkhau-du-dai" },
      },
      ok: {
        status: 200,
        description: "Đăng ký thành công; cookie session được đặt qua `Set-Cookie`",
        schema: { name: "AuthSessionResult", schema: AuthSessionResultSchema },
      },
      errors: { 400: "Email đã tồn tại hoặc mật khẩu ngoài 8–128 ký tự" },
    }),
  },
  "/api/auth/sign-in/email": {
    post: operation({
      id: "signInWithEmail",
      tag: AUTH,
      summary: "Đăng nhập bằng email và mật khẩu",
      description: `${AUTH_NOTE} Response có cookie \`better-auth.session_token\` và header \`set-auth-token\` (dùng làm Bearer).`,
      access: "public",
      body: {
        name: "SignInRequest",
        schema: SignInSchema,
        example: { email: "a@example.com", password: "matkhau-du-dai" },
      },
      ok: {
        status: 200,
        description: "Đăng nhập thành công",
        schema: { name: "AuthSessionResult", schema: AuthSessionResultSchema },
      },
      errors: { 401: "Sai email hoặc mật khẩu" },
    }),
  },
  "/api/auth/get-session": {
    get: operation({
      id: "getSession",
      tag: AUTH,
      summary: "Đọc phiên đăng nhập hiện tại",
      description: `Trả \`null\` khi chưa đăng nhập. ${AUTH_NOTE}`,
      access: "optional",
      ok: {
        status: 200,
        description: "Session và user, hoặc `null` nếu ẩn danh",
        schema: { name: "GetSessionResponse", schema: GetSessionResponseSchema },
      },
    }),
  },
  "/api/auth/sign-out": {
    post: operation({
      id: "signOut",
      tag: AUTH,
      summary: "Đăng xuất",
      description: `Huỷ session hiện tại và xoá cookie. ${AUTH_NOTE}`,
      access: "user",
      ok: { status: 200, description: "Đăng xuất thành công", example: { success: true } },
    }),
  },
  "/api/me": {
    get: operation({
      id: "getCurrentUser",
      tag: AUTH,
      summary: "Thông tin tài khoản hiện tại",
      description: "Trả user và thời điểm hết hạn session. Dùng để client biết `role` mà ẩn/hiện màn Studio.",
      access: "user",
      ok: {
        status: 200,
        description: "Thông tin user",
        schema: { name: "CurrentUserResponse", schema: CurrentUserResponseSchema },
      },
    }),
  },
  "/api/timeline": {
    get: { ...timelineOperation, deprecated: true },
  },
  "/api/admin": {
    get: operation({
      id: "getAdminAccess",
      tag: ADMIN,
      summary: "Kiểm tra quyền Admin",
      description: "Endpoint chỉ để xác nhận quyền quản trị.",
      access: "admin",
      ok: {
        status: 200,
        description: "Có quyền Admin",
        schema: { name: "MessageResponse", schema: MessageResponseSchema },
        example: { message: "Admin access granted" },
      },
    }),
  },
};
