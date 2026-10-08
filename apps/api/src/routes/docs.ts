import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Su-Ky (Sử Ký) Auth & Core API",
    version: "1.0.0",
    description:
      "Hệ thống API Authentication & Core Service cho nền tảng Su-Ky (Sử Ký).",
  },
  servers: [
    { url: "http://localhost:3000", description: "Development server" },
  ],
  tags: [
    { name: "System", description: "Kiểm tra trạng thái & sức khỏe hệ thống" },
    {
      name: "Authentication",
      description: "Xác thực & phân quyền người dùng (Better Auth, Session, Admin Guards)",
    },
    {
      name: "Script Workflow",
      description: "Moderator tạo kịch bản podcast lịch sử bằng AI (7 bước, 3 cổng duyệt)",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Kiểm tra sức khỏe hệ thống",
        description: "Trả về runtime, phiên bản Bun, trạng thái DB PostgreSQL, hàng đợi (queue) và AI runtime, uptime.",
        responses: {
          "200": { description: "Hệ thống hoạt động bình thường" },
          "503": { description: "Database mất kết nối hoặc hàng đợi dừng" },
        },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["Authentication"],
        summary: "Kiểm tra phiên đăng nhập",
        description: "Lấy thông tin session hiện tại từ Better Auth.",
        responses: {
          "200": { description: "Thông tin session hoặc null nếu ẩn danh" },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng nhập bằng Email & Password",
        description: "Đăng nhập với email và mật khẩu qua Better Auth.",
        responses: {
          "200": { description: "Đăng nhập thành công, trả về session và cookie" },
          "400": { description: "Thông tin đăng nhập không hợp lệ" },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng ký tài khoản mới",
        description: "Tạo tài khoản người dùng mới với vai trò mặc định 'user'.",
        responses: {
          "200": { description: "Đăng ký thành công" },
          "400": { description: "Email đã tồn tại hoặc dữ liệu không hợp lệ" },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng xuất",
        description: "Hủy session hiện tại và xóa cookie xác thực.",
        responses: {
          "200": { description: "Đăng xuất thành công" },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Authentication"],
        summary: "Thông tin tài khoản hiện tại",
        description: "Yêu cầu đăng nhập. Trả về thông tin user và thời gian hết hạn session.",
        responses: {
          "200": { description: "Lấy thông tin user thành công" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
        },
      },
    },
    "/api/script-workflows": {
      get: {
        tags: ["Script Workflow"],
        summary: "Danh sách workflow của tôi",
        description: "Phân trang (page, limit). Chỉ trả các workflow do Moderator hiện tại tạo.",
        responses: {
          "200": { description: "Danh sách kèm meta.total" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
        },
      },
      post: {
        tags: ["Script Workflow"],
        summary: "Tạo workflow kịch bản",
        description: "Body: { topic } (3-10000 ký tự). Khởi chạy bước RESEARCHER ngay.",
        responses: {
          "201": { description: "Trả về { id }" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "503": { description: "AI runtime chưa sẵn sàng (SERVICE_UNAVAILABLE)" },
        },
      },
    },
    "/api/script-workflows/{id}": {
      get: {
        tags: ["Script Workflow"],
        summary: "Chi tiết workflow",
        description: "Đủ 7 bước theo thứ tự kèm các phiên bản (versions) và output.",
        responses: {
          "200": { description: "Chi tiết workflow" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
    },
    "/api/script-workflows/{id}/tree": {
      get: {
        tags: ["Script Workflow"],
        summary: "Cây lịch sử thực thi",
        description: "Mọi node bất biến của run và các bản xuất bản.",
        responses: {
          "200": { description: "Cây node + publications" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
    },
    "/api/script-workflows/{id}/step-decisions": {
      post: {
        tags: ["Script Workflow"],
        summary: "Quyết định của Moderator trên một node",
        description: "action = CONTINUE (duyệt, cần baseVersion), RERUN (fork, cần feedback) hoặc DIRECT_EDIT (sửa tay, cần baseVersion + editedOutputJson).",
        responses: {
          "200": { description: "Đã áp dụng quyết định" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
          "409": { description: "Xung đột phiên bản hoặc bước không ở trạng thái chờ duyệt (CONFLICT)" },
        },
      },
    },
    "/api/script-workflows/{id}/publications": {
      get: {
        tags: ["Script Workflow"],
        summary: "Danh sách bản xuất bản",
        description: "Kèm finalScript (3 tập văn nói) để Moderator đem sang ElevenLabs.",
        responses: {
          "200": { description: "Danh sách bản xuất bản" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
      post: {
        tags: ["Script Workflow"],
        summary: "Xuất bản tường minh một node đã duyệt",
        description: "Idempotent theo approvedVersionId.",
        responses: {
          "201": { description: "Trả về { publicationId }" },
          "400": { description: "Node không hợp lệ hoặc thiếu ORALIZER trên nhánh" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
    },
    "/api/script-workflows/{id}/events": {
      get: {
        tags: ["Script Workflow"],
        summary: "Nhật ký sự kiện",
        description: "Query: type (tiền tố), limit (<=200). Cũ -> mới.",
        responses: {
          "200": { description: "Danh sách sự kiện" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
    },
    "/api/script-workflows/{id}/events/stream": {
      get: {
        tags: ["Script Workflow"],
        summary: "Luồng sự kiện realtime (SSE)",
        description: "Server-Sent Events: workflow-event, ping, workflow-done. Dùng EventSource withCredentials: true; hỗ trợ Last-Event-ID / afterId.",
        responses: {
          "200": { description: "text/event-stream" },
          "400": { description: "Dữ liệu không hợp lệ (VALIDATION_ERROR)" },
          "401": { description: "Chưa đăng nhập (UNAUTHORIZED)" },
          "403": { description: "Không phải Moderator (FORBIDDEN)" },
          "404": { description: "Workflow không tồn tại hoặc không thuộc về Moderator này (NOT_FOUND)" },
        },
      },
    },
    "/api/admin": {
      get: {
        tags: ["Authentication"],
        summary: "Endpoint dành riêng cho Admin",
        description: "Yêu cầu quyền quản trị viên (role: admin).",
        responses: {
          "200": { description: "Truy cập quản trị thành công" },
          "401": { description: "Chưa đăng nhập" },
          "403": { description: "Không đủ quyền hạn (FORBIDDEN)" },
        },
      },
    },
  },
};

export const docsRoute = new Hono()
  .get("/openapi.json", (c) => c.json(openApiSpec))
  .get(
    "/docs",
    apiReference({
      theme: "saturn",
      pageTitle: "Su-Ky Auth API Documentation",
      spec: {
        content: openApiSpec,
      },
    })
  );
