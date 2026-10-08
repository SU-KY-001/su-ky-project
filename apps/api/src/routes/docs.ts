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
    { url: "http://localhost:3005", description: "Development server" },
  ],
  tags: [
    { name: "System", description: "Kiểm tra trạng thái hệ thống" },
    { name: "Authentication", description: "Better Auth, session và phân quyền" },
    { name: "Script Workflow", description: "Moderator tạo và nhập kịch bản AI" },
    { name: "Catalog", description: "Danh mục chủ đề, giai đoạn, nguồn và thực thể lịch sử" },
    { name: "Studio", description: "Biên tập Series, tập và bản kể" },
    { name: "Media", description: "Upload và xác minh media Cloudinary" },
    { name: "Listening", description: "Duyệt nội dung, phát audio và đồng bộ tiến trình" },
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
    "/api/topics": {
      get: { tags: ["Catalog"], summary: "Danh sách chủ đề", responses: { "200": { description: "Danh sách chủ đề đang hoạt động" } } },
    },
    "/api/historical-periods": {
      get: { tags: ["Catalog"], summary: "Danh sách giai đoạn lịch sử", responses: { "200": { description: "Danh sách giai đoạn đang hoạt động" } } },
    },
    "/api/studio/sources": {
      get: { tags: ["Catalog"], summary: "Tìm nguồn", responses: { "200": { description: "Danh sách phân trang" } } },
      post: { tags: ["Catalog"], summary: "Tạo nguồn", responses: { "201": { description: "Nguồn đã tạo" }, "409": { description: "ISBN đã tồn tại" } } },
    },
    "/api/studio/sources/{id}": {
      get: { tags: ["Catalog"], summary: "Chi tiết nguồn", responses: { "200": { description: "Nguồn" }, "404": { description: "Không tìm thấy" } } },
      patch: { tags: ["Catalog"], summary: "Sửa nguồn", responses: { "200": { description: "Nguồn đã sửa" } } },
    },
    "/api/studio/sources/similar": {
      get: { tags: ["Catalog"], summary: "Tìm nguồn gần giống", responses: { "200": { description: "Ứng viên gần giống" } } },
    },
    "/api/studio/historical-entities": {
      get: { tags: ["Catalog"], summary: "Tìm thực thể lịch sử", responses: { "200": { description: "Danh sách phân trang" } } },
      post: { tags: ["Catalog"], summary: "Tạo thực thể lịch sử", responses: { "201": { description: "Thực thể đã tạo" } } },
    },
    "/api/studio/historical-entities/{id}": {
      get: { tags: ["Catalog"], summary: "Chi tiết thực thể", responses: { "200": { description: "Thực thể" } } },
      patch: { tags: ["Catalog"], summary: "Sửa thực thể", responses: { "200": { description: "Thực thể đã sửa" } } },
    },
    "/api/studio/series": {
      get: { tags: ["Studio"], summary: "Danh sách Series", responses: { "200": { description: "Danh sách phân trang" } } },
      post: { tags: ["Studio"], summary: "Tạo Series nháp", responses: { "201": { description: "Series đã tạo" } } },
    },
    "/api/studio/series/{id}": {
      get: { tags: ["Studio"], summary: "Chi tiết Series", responses: { "200": { description: "Series và checklist" } } },
      patch: { tags: ["Studio"], summary: "Sửa Series", responses: { "200": { description: "Series đã sửa" }, "409": { description: "Ghi đè cũ hoặc slug bị khóa" } } },
      delete: { tags: ["Studio"], summary: "Đưa Series vào thùng rác", responses: { "204": { description: "Đã chuyển" } } },
    },
    "/api/studio/series/{id}/publish": {
      post: { tags: ["Studio"], summary: "Xuất bản Series", responses: { "200": { description: "Series đã xuất bản" }, "422": { description: "Checklist chưa đạt" } } },
    },
    "/api/studio/series/{id}/hide": {
      post: { tags: ["Studio"], summary: "Ẩn Series", responses: { "200": { description: "Series đã ẩn" } } },
    },
    "/api/studio/series/{id}/restore": {
      post: { tags: ["Studio"], summary: "Khôi phục Series", responses: { "200": { description: "Series đã khôi phục" } } },
    },
    "/api/studio/series/{id}/episode-order": {
      put: { tags: ["Studio"], summary: "Sắp xếp tập", responses: { "200": { description: "Danh sách tập đã sắp xếp" }, "422": { description: "Danh sách không khớp" } } },
    },
    "/api/studio/sources/{id}/archive": {
      post: { tags: ["Catalog"], summary: "Lưu trữ nguồn", responses: { "200": { description: "Nguồn đã lưu trữ" } } },
    },
    "/api/studio/sources/{id}/unarchive": {
      post: { tags: ["Catalog"], summary: "Bỏ lưu trữ nguồn", responses: { "200": { description: "Nguồn đã khôi phục" } } },
    },
    "/api/studio/historical-entities/similar": {
      get: { tags: ["Catalog"], summary: "Tìm thực thể gần giống", responses: { "200": { description: "Ứng viên gần giống" } } },
    },
    "/api/studio/episodes/{id}/hide": {
      post: { tags: ["Studio"], summary: "Ẩn tập", responses: { "200": { description: "Tập đã ẩn" } } },
    },
    "/api/studio/episodes/{id}/restore": {
      post: { tags: ["Studio"], summary: "Khôi phục tập", responses: { "200": { description: "Tập đã khôi phục" } } },
    },
    "/api/studio/episodes/{id}/narrations/{type}/ai-original": {
      get: { tags: ["Studio"], summary: "Đọc kịch bản AI gốc", responses: { "200": { description: "Kịch bản AI" }, "404": { description: "Bản viết tay" } } },
    },
    "/api/studio/episodes/{id}/sources/{episodeSourceId}": {
      patch: { tags: ["Studio"], summary: "Sửa trích dẫn", responses: { "200": { description: "Trích dẫn đã sửa" } } },
      delete: { tags: ["Studio"], summary: "Gỡ trích dẫn", responses: { "204": { description: "Đã gỡ" } } },
    },
    "/api/studio/episodes/{id}/sources/order": {
      put: { tags: ["Studio"], summary: "Sắp xếp nguồn", responses: { "200": { description: "Danh sách đã sắp xếp" } } },
    },
    "/api/studio/episodes/{id}/entity-tags/{tagId}": {
      patch: { tags: ["Studio"], summary: "Duyệt hoặc từ chối thẻ", responses: { "200": { description: "Thẻ đã sửa" } } },
      delete: { tags: ["Studio"], summary: "Gỡ thẻ", responses: { "204": { description: "Đã gỡ" } } },
    },
    "/api/studio/series/{seriesId}/episodes": {
      post: { tags: ["Studio"], summary: "Tạo tập nháp", responses: { "201": { description: "Tập đã tạo" } } },
    },
    "/api/studio/episodes/{id}": {
      get: { tags: ["Studio"], summary: "Workspace tập", responses: { "200": { description: "Tập, bản kể, nguồn và thẻ" } } },
      patch: { tags: ["Studio"], summary: "Sửa tập", responses: { "200": { description: "Tập đã sửa" } } },
      delete: { tags: ["Studio"], summary: "Đưa tập vào thùng rác", responses: { "204": { description: "Đã chuyển" } } },
    },
    "/api/studio/episodes/{id}/publish": {
      post: { tags: ["Studio"], summary: "Xuất bản tập", responses: { "200": { description: "Tập đã xuất bản" }, "422": { description: "Checklist chưa đạt" } } },
    },
    "/api/studio/episodes/{id}/narrations/{type}": {
      get: { tags: ["Studio"], summary: "Đọc bản kể", responses: { "200": { description: "Bản kể" } } },
      put: { tags: ["Studio"], summary: "Lưu kịch bản bản kể", responses: { "200": { description: "Bản kể đã lưu" } } },
      delete: { tags: ["Studio"], summary: "Gỡ bản kể ngôi thứ nhất", responses: { "204": { description: "Đã gỡ" } } },
    },
    "/api/studio/episodes/{id}/narrations/{type}/audio": {
      put: { tags: ["Studio"], summary: "Gắn hoặc thay audio", responses: { "200": { description: "Bản kể đã cập nhật" } } },
      delete: { tags: ["Studio"], summary: "Gỡ audio", responses: { "204": { description: "Đã gỡ" } } },
    },
    "/api/studio/episodes/{id}/sources": {
      get: { tags: ["Studio"], summary: "Nguồn của tập", responses: { "200": { description: "Danh sách nguồn" } } },
      post: { tags: ["Studio"], summary: "Gắn nguồn vào tập", responses: { "201": { description: "Nguồn đã gắn" } } },
    },
    "/api/studio/episodes/{id}/entity-tags": {
      get: { tags: ["Studio"], summary: "Thẻ thực thể của tập", responses: { "200": { description: "Danh sách thẻ" } } },
      post: { tags: ["Studio"], summary: "Gắn thẻ thực thể", responses: { "200": { description: "Thẻ đã gắn" } } },
    },
    "/api/studio/media-assets": {
      post: { tags: ["Media"], summary: "Xin chữ ký upload", responses: { "201": { description: "Upload ticket" }, "503": { description: "Cloudinary không khả dụng" } } },
    },
    "/api/studio/media-assets/{id}": {
      get: { tags: ["Media"], summary: "Trạng thái media", responses: { "200": { description: "Media asset" } } },
    },
    "/api/studio/media-assets/{id}/verify": {
      post: { tags: ["Media"], summary: "Xác minh media đã upload", responses: { "200": { description: "Media READY" }, "422": { description: "Media không hợp lệ" } } },
    },
    "/api/script-workflows/{id}/import-preview": {
      get: { tags: ["Script Workflow"], summary: "Xem trước nhập Gate 2", responses: { "200": { description: "Dữ liệu đối chiếu" } } },
    },
    "/api/script-workflows/{id}/import": {
      get: { tags: ["Script Workflow"], summary: "Kết quả nhập", responses: { "200": { description: "Kết quả đã lưu" }, "404": { description: "Chưa nhập" } } },
      post: { tags: ["Script Workflow"], summary: "Duyệt và nhập vào CMS", responses: { "201": { description: "Đã nhập" }, "409": { description: "Nhánh đã thay đổi" } } },
    },
    "/api/series": {
      get: { tags: ["Listening"], summary: "Duyệt Series công khai", responses: { "200": { description: "Danh sách phân trang" } } },
    },
    "/api/series/{slug}": {
      get: { tags: ["Listening"], summary: "Chi tiết Series công khai", responses: { "200": { description: "Series và các tập" }, "404": { description: "Không công khai" } } },
    },
    "/api/episodes/{slug}": {
      get: { tags: ["Listening"], summary: "Chi tiết tập công khai", responses: { "200": { description: "Tập, nguồn và bản kể" }, "404": { description: "Không công khai" } } },
    },
    "/api/narrations/{narrationId}/playback": {
      get: { tags: ["Listening"], summary: "URL phát audio", responses: { "200": { description: "Audio và tiến trình" }, "401": { description: "Cần đăng nhập" } } },
    },
    "/api/me/listening-progress/{narrationId}": {
      get: { tags: ["Listening"], summary: "Đọc tiến trình", responses: { "200": { description: "Tiến trình" } } },
      put: { tags: ["Listening"], summary: "Đồng bộ tiến trình", responses: { "200": { description: "Tiến trình và thưởng mới" }, "409": { description: "Audio đã đổi" } } },
    },
    "/api/me/listening-history": {
      get: { tags: ["Listening"], summary: "Lịch sử nghe", responses: { "200": { description: "Lịch sử phân trang" } } },
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
