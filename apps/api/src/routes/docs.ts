import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Su-Ky (Sử Ký) API",
    version: "1.0.0",
    description:
      "Hệ thống API backend cho nền tảng âm thanh và podcast lịch sử Việt Nam (Su-Ky).",
  },
  servers: [
    { url: "http://localhost:3000", description: "Development server" },
  ],
  tags: [
    { name: "System", description: "Kiểm tra trạng thái & sức khỏe hệ thống" },
    { name: "Authentication", description: "Xác thực & phân quyền người dùng (Better Auth)" },
    { name: "Podcast", description: "Quản lý series và tập podcast lịch sử" },
    { name: "Timeline", description: "Thời kỳ và sự kiện lịch sử theo dòng thời gian" },
    { name: "Figures", description: "Danh mục nhân vật lịch sử" },
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
    "/api/me": {
      get: {
        tags: ["Authentication"],
        summary: "Thông tin tài khoản hiện tại",
        description: "Yêu cầu đăng nhập. Trả về thông tin user và thời gian hết hạn session.",
        responses: {
          "200": { description: "Thành công" },
          "401": { description: "Chưa đăng nhập" },
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
          "403": { description: "Không đủ quyền hạn (Forbidden)" },
        },
      },
    },
    "/api/timeline": {
      get: {
        tags: ["Timeline"],
        summary: "Dòng thời gian các thời kỳ lịch sử",
        responses: {
          "200": { description: "Danh sách các thời kỳ và sự kiện lịch sử" },
        },
      },
    },
    "/api/series": {
      get: {
        tags: ["Podcast"],
        summary: "Danh sách series podcast",
        responses: {
          "200": { description: "Danh sách series podcast thành công" },
        },
      },
    },
    "/api/episodes": {
      get: {
        tags: ["Podcast"],
        summary: "Danh sách tập podcast với phân trang & lọc",
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Số trang hiện tại (mặc định: 1)",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 20, minimum: 1, maximum: 50 },
            description: "Số tập mỗi trang (tối đa: 50)",
          },
          {
            name: "category",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["ANCIENT", "MEDIEVAL", "MODERN", "CONTEMPORARY", "WAR_HISTORY", "CULTURE"],
            },
            description: "Lọc theo chủ đề lịch sử",
          },
        ],
        responses: {
          "200": { description: "Danh sách tập podcast phân trang" },
          "400": { description: "Tham số truy vấn không hợp lệ (VALIDATION_ERROR)" },
        },
      },
    },
    "/api/figures": {
      get: {
        tags: ["Figures"],
        summary: "Danh mục nhân vật lịch sử",
        responses: {
          "200": { description: "Danh mục nhân vật lịch sử" },
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
      pageTitle: "Su-Ky API Documentation",
      spec: {
        content: openApiSpec,
      },
    })
  );
