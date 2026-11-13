import { DeleteProfileSchema, UpdateProfileSchema, SignInSchema, SignUpSchema } from "@repo/shared";
import { component } from "../registry";
import { operation, type Paths } from "../operation";
import {
  AuthSessionResultSchema,
  CurrentUserResponseSchema,
  GetSessionResponseSchema,
  HealthResponseSchema,
  TimelineResponseSchema,
} from "../schemas";

const SYSTEM = "System";
const AUTH = "Authentication";
const ProfileMutationResponseSchema = CurrentUserResponseSchema.pick({ user: true });

const AUTH_NOTE =
  "Endpoint do Better Auth quản lý (`/api/auth/*`); đây chỉ là phần thường dùng. Danh sách đầy đủ do thư viện cung cấp.";

const healthOperation = operation({
  id: "getHealth",
  tag: SYSTEM,
  summary: "Kiểm tra sức khỏe hệ thống",
  description:
    "Trả về runtime, phiên bản Bun, trạng thái PostgreSQL, hàng đợi bảo trì (pg-boss), worker nhắc hạn sản xuất (trường releaseWorker được giữ để tương thích) và uptime. Worker không tự động phát hành podcast.",
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
    patch: operation({
      id: "updateMyProfile", tag: AUTH, summary: "Cập nhật hồ sơ của mình", access: "user", rate: "write",
      description: "Mọi vai trò user/moderator/admin được sửa tên hoặc gỡ avatar (image: null) của chính mình. Không chấp nhận role, email, userId hoặc URL ảnh tùy ý. Upload ảnh qua POST /api/me/avatar. Cookie-auth writes cần Origin/Referer tin cậy; native Bearer không cần Origin. Gỡ ảnh dọn tài nguyên Cloudinary cũ sau cập nhật; lỗi provider được ghi log.",
      errors: { 403: "`FORBIDDEN`: Origin/Referer không tin cậy" },
      body: { name: "UpdateProfile", schema: UpdateProfileSchema },
      ok: { status: 200, description: "Hồ sơ mới", schema: { name: "ProfileMutationResponse", schema: ProfileMutationResponseSchema } },
    }),
    delete: operation({
      id: "deleteMyAccount", tag: AUTH, summary: "Xóa tài khoản của mình", access: "user", rate: "write",
      description: "Mọi role dùng được. Bắt buộc mật khẩu hiện tại và confirm=true. Xóa user, sessions, accounts, tiến độ nghe, quiz attempts, XP và nhiệm vụ cá nhân qua cascade trong transaction. Nội dung chung không bị xóa; FK liên kết nội dung/phân công chặn thao tác. Không xóa admin hoạt động cuối cùng. Avatar trên Cloudinary được dọn sau commit; lỗi provider được ghi log để xử lý.",
      body: { name: "DeleteProfile", schema: DeleteProfileSchema },
      ok: { status: 200, description: "Đã xóa tài khoản và thu hồi toàn bộ phiên", example: { success: true } },
      errors: { 400: "`BAD_REQUEST`: sai mật khẩu hoặc tài khoản chưa có mật khẩu", 403: "`FORBIDDEN`: Origin/Referer không tin cậy", 409: "`CONFLICT`: cần bàn giao media/nội dung/phân công, admin cuối cùng hoặc xung đột đồng thời" },
    }),
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
  "/api/me/avatar": {
    post: {
      ...operation({
        id: "uploadMyAvatar", tag: AUTH, summary: "Upload ảnh đại diện của mình", access: "user", rate: "media_upload",
        description: "Mọi role user/moderator/admin được upload JPEG/PNG/WebP tối đa 5 MiB bằng multipart field file. Kiểm tra MIME và chữ ký file; Cloudinary giải mã và thu nhỏ tối đa 512×512. Trả hồ sơ đã cập nhật. Không mở quyền upload nội dung Studio cho user.",
        ok: { status: 200, description: "Avatar đã lưu", schema: { name: "ProfileMutationResponse", schema: ProfileMutationResponseSchema } },
        errors: { 400: "`VALIDATION_ERROR`: thiếu file", 403: "`FORBIDDEN`: Origin/Referer không tin cậy", 422: "`MEDIA_TOO_LARGE` hoặc `MEDIA_TYPE_NOT_ALLOWED`: ảnh sai định dạng/dung lượng", 503: "`MEDIA_PROVIDER_UNAVAILABLE`: upload Cloudinary thất bại" },
      }),
      requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } } },
    },
  },
};
