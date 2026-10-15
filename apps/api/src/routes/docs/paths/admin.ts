import { z } from "zod";
import {
  ActivateWeeklyMissionSchema,
  AdminMissionTemplateSchema,
  AdminWeeklyMissionSchema,
  AdminAuditLogSchema,
  AdminAuditQuerySchema,
  AdminBanUserSchema,
  AdminCatalogQuerySchema,
  AdminConfigSchema,
  AdminConfigUpdateSchema,
  AdminContentActionSchema,
  AdminContentQuerySchema,
  AdminContentSeriesSchema,
  AdminCreateUserSchema,
  AdminDashboardSchema,
  AdminHistoricalPeriodInputSchema,
  AdminHistoricalPeriodPatchSchema,
  AdminHistoricalPeriodSchema,
  AdminTopicInputSchema,
  AdminTopicPatchSchema,
  AdminTopicSchema,
  AdminUpdateUserSchema,
  AdminUserQuerySchema,
  AdminUserSchema,
  MissionActivityTypeSchema,
  MissionTemplateInputSchema,
  MissionTemplatePatchSchema,
  paginatedSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";

const TAG = "Admin";
const stringId = z.object({ id: z.string() });
const configKey = z.object({ key: z.string() });
const params = {
  pathParams: stringId,
  pathParamDocs: { id: "ID đối tượng" },
} as const;
const user = { name: "AdminUser", schema: AdminUserSchema } as const;
const mission = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  activityType: MissionActivityTypeSchema,
  targetCount: z.number().int(),
  xpReward: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
const weekly = z
  .object({
    id: z.string().uuid(),
    missionTemplateId: z.string().uuid(),
    weekStartDate: z.coerce.date(),
    title: z.string(),
    activityType: MissionActivityTypeSchema,
    targetCount: z.number().int(),
    xpReward: z.number().int(),
    activatedAt: z.coerce.date(),
  })
  .passthrough();

export const adminPaths: Paths = {
  "/api/admin": {
    get: operation({
      id: "adminAccess",
      tag: TAG,
      summary: "Kiểm tra quyền Admin",
      access: "admin",
      ok: {
        status: 200,
        description: "Có quyền Admin",
        schema: {
          name: "AdminAccess",
          schema: z.object({ message: z.string() }),
        },
      },
    }),
  },
  "/api/admin/dashboard": {
    get: operation({
      id: "getAdminDashboard",
      tag: TAG,
      summary: "Thống kê toàn hệ thống",
      description: "Tổng hợp tài khoản, nội dung, lượt nghe và vận hành.",
      access: "admin",
      ok: {
        status: 200,
        description: "Số liệu dashboard",
        schema: { name: "AdminDashboard", schema: AdminDashboardSchema },
      },
    }),
  },
  "/api/admin/users": {
    get: operation({
      id: "listAdminUsers",
      tag: TAG,
      summary: "Danh sách tài khoản",
      access: "admin",
      query: AdminUserQuerySchema,
      ok: {
        status: 200,
        description: "Tài khoản phân trang",
        schema: {
          name: "AdminUserList",
          schema: paginatedSchema(AdminUserSchema),
        },
      },
    }),
    post: operation({
      id: "createAdminUser",
      tag: TAG,
      summary: "Tạo tài khoản",
      description: "Chỉ Admin tạo trực tiếp tài khoản Moderator hoặc Admin.",
      access: "admin",
      body: { name: "AdminCreateUser", schema: AdminCreateUserSchema },
      ok: { status: 201, description: "Tài khoản đã tạo", schema: user },
      errors: { 409: "`CONFLICT`: email đã tồn tại" },
    }),
  },
  "/api/admin/users/{id}": {
    patch: operation({
      id: "updateAdminUser",
      tag: TAG,
      summary: "Cập nhật tài khoản hoặc role",
      access: "admin",
      ...params,
      body: { name: "AdminUpdateUser", schema: AdminUpdateUserSchema },
      ok: { status: 200, description: "Tài khoản đã cập nhật", schema: user },
      errors: {
        404: "`NOT_FOUND`: tài khoản không tồn tại",
        409: "`CONFLICT`: Admin đang đăng nhập không thể tự hạ quyền",
      },
    }),
  },
  "/api/admin/users/{id}/ban": {
    post: operation({
      id: "banAdminUser",
      tag: TAG,
      summary: "Khóa tài khoản",
      description: "Thu hồi toàn bộ session hiện tại của tài khoản.",
      access: "admin",
      ...params,
      body: { name: "AdminBanUser", schema: AdminBanUserSchema },
      ok: { status: 200, description: "Tài khoản đã khóa", schema: user },
      errors: {
        404: "`NOT_FOUND`: tài khoản không tồn tại",
        409: "`CONFLICT`: không thể tự khóa",
      },
    }),
  },
  "/api/admin/users/{id}/unban": {
    post: operation({
      id: "unbanAdminUser",
      tag: TAG,
      summary: "Mở khóa tài khoản",
      access: "admin",
      ...params,
      ok: { status: 200, description: "Tài khoản đã mở khóa", schema: user },
      errors: { 404: "`NOT_FOUND`: tài khoản không tồn tại" },
    }),
  },
  "/api/admin/topics": {
    get: operation({
      id: "listAdminTopics",
      tag: TAG,
      summary: "Danh sách chủ đề",
      access: "admin",
      query: AdminCatalogQuerySchema,
      ok: {
        status: 200,
        description: "Chủ đề phân trang",
        schema: {
          name: "AdminTopicList",
          schema: paginatedSchema(AdminTopicSchema),
        },
      },
    }),
    post: operation({
      id: "createAdminTopic",
      tag: TAG,
      summary: "Tạo chủ đề",
      access: "admin",
      body: { name: "AdminTopicInput", schema: AdminTopicInputSchema },
      ok: {
        status: 201,
        description: "Chủ đề đã tạo",
        schema: { name: "AdminTopic", schema: AdminTopicSchema },
      },
    }),
  },
  "/api/admin/topics/{id}": {
    patch: operation({
      id: "patchAdminTopic",
      tag: TAG,
      summary: "Cập nhật chủ đề",
      access: "admin",
      ...params,
      body: { name: "AdminTopicPatch", schema: AdminTopicPatchSchema },
      ok: {
        status: 200,
        description: "Chủ đề đã cập nhật",
        schema: { name: "AdminTopic", schema: AdminTopicSchema },
      },
      errors: { 404: "`NOT_FOUND`: chủ đề không tồn tại" },
    }),
  },
  "/api/admin/historical-periods": {
    get: operation({
      id: "listAdminHistoricalPeriods",
      tag: TAG,
      summary: "Danh sách thời kỳ lịch sử",
      access: "admin",
      query: AdminCatalogQuerySchema,
      ok: {
        status: 200,
        description: "Thời kỳ phân trang",
        schema: {
          name: "AdminHistoricalPeriodList",
          schema: paginatedSchema(AdminHistoricalPeriodSchema),
        },
      },
    }),
    post: operation({
      id: "createAdminHistoricalPeriod",
      tag: TAG,
      summary: "Tạo thời kỳ lịch sử",
      access: "admin",
      body: {
        name: "AdminHistoricalPeriodInput",
        schema: AdminHistoricalPeriodInputSchema,
      },
      ok: {
        status: 201,
        description: "Thời kỳ đã tạo",
        schema: {
          name: "AdminHistoricalPeriod",
          schema: AdminHistoricalPeriodSchema,
        },
      },
    }),
  },
  "/api/admin/historical-periods/{id}": {
    patch: operation({
      id: "patchAdminHistoricalPeriod",
      tag: TAG,
      summary: "Cập nhật thời kỳ lịch sử",
      access: "admin",
      ...params,
      body: {
        name: "AdminHistoricalPeriodPatch",
        schema: AdminHistoricalPeriodPatchSchema,
      },
      ok: {
        status: 200,
        description: "Thời kỳ đã cập nhật",
        schema: {
          name: "AdminHistoricalPeriod",
          schema: AdminHistoricalPeriodSchema,
        },
      },
      errors: {
        404: "`NOT_FOUND`: thời kỳ không tồn tại",
        422: "`VALIDATION_ERROR`: khoảng năm không hợp lệ",
      },
    }),
  },
  "/api/admin/content": {
    get: operation({
      id: "listAdminContent",
      tag: TAG,
      summary: "Danh sách nội dung để kiểm soát",
      access: "admin",
      query: AdminContentQuerySchema,
      ok: {
        status: 200,
        description: "Series và episode phân trang",
        schema: {
          name: "AdminContentList",
          schema: paginatedSchema(AdminContentSeriesSchema),
        },
      },
    }),
  },
  "/api/admin/content/{kind}/{id}": {
    post: operation({
      id: "interveneAdminContent",
      tag: TAG,
      summary: "Ẩn, xóa mềm hoặc khôi phục nội dung",
      description:
        "Ẩn/xóa bởi Admin sẽ khóa nội dung để Moderator không thể tự thay đổi.",
      access: "admin",
      pathParams: z.object({
        kind: z.enum(["series", "episodes"]),
        id: z.string().uuid(),
      }),
      pathParamDocs: { kind: "Loại nội dung", id: "UUID nội dung" },
      body: { name: "AdminContentAction", schema: AdminContentActionSchema },
      ok: {
        status: 200,
        description: "Nội dung đã cập nhật",
        schema: { name: "AdminContentMutation", schema: z.unknown() },
      },
      errors: {
        404: "`NOT_FOUND`: nội dung không tồn tại",
        409: "`HAS_DEPENDENCIES`: còn nội dung phụ thuộc",
      },
    }),
  },
  "/api/admin/configs": {
    get: operation({
      id: "listAdminConfigs",
      tag: TAG,
      summary: "Danh sách cấu hình",
      description: "Chỉ trả các key nằm trong allowlist backend.",
      access: "admin",
      ok: {
        status: 200,
        description: "Cấu hình và giá trị mặc định",
        schema: {
          name: "AdminConfigList",
          schema: z.object({ items: z.array(AdminConfigSchema) }),
        },
      },
    }),
  },
  "/api/admin/configs/{key}": {
    patch: operation({
      id: "updateAdminConfig",
      tag: TAG,
      summary: "Cập nhật cấu hình",
      access: "admin",
      pathParams: configKey,
      pathParamDocs: { key: "Khóa cấu hình trong allowlist" },
      body: { name: "AdminConfigUpdate", schema: AdminConfigUpdateSchema },
      ok: {
        status: 200,
        description: "Cấu hình đã cập nhật",
        schema: { name: "AdminConfig", schema: AdminConfigSchema },
      },
      errors: {
        404: "`NOT_FOUND`: key không được phép",
        422: "`VALIDATION_ERROR`: giá trị sai kiểu hoặc ngoài giới hạn",
      },
    }),
  },
  "/api/admin/audit-logs": {
    get: operation({
      id: "listAdminAuditLogs",
      tag: TAG,
      summary: "Tra cứu audit log",
      access: "admin",
      query: AdminAuditQuerySchema,
      ok: {
        status: 200,
        description: "Nhật ký phân trang",
        schema: {
          name: "AdminAuditLogList",
          schema: paginatedSchema(AdminAuditLogSchema),
        },
      },
    }),
  },
  "/api/admin/mission-templates": {
    get: operation({
      id: "listMissionTemplates",
      tag: TAG,
      summary: "Danh sách mẫu nhiệm vụ",
      access: "admin",
      ok: {
        status: 200,
        description: "Mẫu nhiệm vụ",
        schema: {
          name: "MissionTemplateList",
          schema: z.object({ items: z.array(AdminMissionTemplateSchema) }),
        },
      },
    }),
    post: operation({
      id: "createMissionTemplate",
      tag: TAG,
      summary: "Tạo mẫu nhiệm vụ",
      access: "admin",
      body: {
        name: "MissionTemplateInput",
        schema: MissionTemplateInputSchema,
      },
      ok: {
        status: 201,
        description: "Mẫu đã tạo",
        schema: { name: "MissionTemplate", schema: AdminMissionTemplateSchema },
      },
    }),
  },
  "/api/admin/mission-templates/{id}": {
    patch: operation({
      id: "updateMissionTemplate",
      tag: TAG,
      summary: "Cập nhật mẫu nhiệm vụ",
      access: "admin",
      ...params,
      body: {
        name: "MissionTemplatePatch",
        schema: MissionTemplatePatchSchema,
      },
      ok: {
        status: 200,
        description: "Mẫu đã cập nhật",
        schema: { name: "MissionTemplate", schema: AdminMissionTemplateSchema },
      },
      errors: { 404: "`NOT_FOUND`: mẫu không tồn tại" },
    }),
  },
  "/api/admin/weekly-missions": {
    get: operation({
      id: "listWeeklyMissions",
      tag: TAG,
      summary: "Danh sách nhiệm vụ tuần",
      access: "admin",
      ok: {
        status: 200,
        description: "Nhiệm vụ đã kích hoạt",
        schema: {
          name: "WeeklyMissionList",
          schema: z.object({ items: z.array(AdminWeeklyMissionSchema) }),
        },
      },
    }),
    post: operation({
      id: "activateWeeklyMission",
      tag: TAG,
      summary: "Kích hoạt nhiệm vụ tuần",
      description:
        "Ngày bắt đầu phải là thứ Hai; snapshot thông tin từ mẫu tại thời điểm kích hoạt.",
      access: "admin",
      body: {
        name: "ActivateWeeklyMission",
        schema: ActivateWeeklyMissionSchema,
      },
      ok: {
        status: 201,
        description: "Nhiệm vụ tuần đã tạo",
        schema: { name: "WeeklyMission", schema: AdminWeeklyMissionSchema },
      },
      errors: {
        409: "`CONFLICT`: mẫu đã kích hoạt trong tuần",
        422: "`VALIDATION_ERROR`: mẫu không hoạt động hoặc ngày không phải thứ Hai",
      },
    }),
  },
};
