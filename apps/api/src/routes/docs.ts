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
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Kiểm tra sức khỏe hệ thống",
        description: "Trả về runtime, phiên bản Bun, trạng thái DB PostgreSQL và uptime.",
        responses: {
          "200": { description: "Hệ thống hoạt động bình thường" },
          "503": { description: "Database mất kết nối hoặc suy giảm hiệu năng" },
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
