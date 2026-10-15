import {
  CreateReleaseScheduleSchema,
  AssignableEpisodeListSchema,
  LinkReleaseEpisodeSchema,
  ReleaseReminderListSchema,
  ReleaseScheduleQuerySchema,
  ReplaceReleaseAssigneesSchema,
  ReviewEpisodeSchema,
  SubmitEpisodeReviewSchema,
  UpdateReleaseScheduleSchema,
  UuidParamSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  EpisodeReviewDocSchema,
  ItemsOf,
  PagedOf,
  ReleaseActionResultDocSchema,
  ReleaseDashboardDocSchema,
  ReleaseProgressDocSchema,
  ReleaseScheduleDocSchema,
  ReleaseStatusResultDocSchema,
} from "../schemas";
import { ReleaseModeratorListSchema } from "@repo/shared";

const TAG = "Release Coordination";
const ADMIN = "/api/admin/releases";
const STUDIO = "/api/studio/releases";
const idParams = {
  pathParams: UuidParamSchema,
  pathParamDocs: { id: "ID lịch phát hành (UUID)" },
} as const;
const schedule = { name: "ReleaseSchedule", schema: ReleaseScheduleDocSchema } as const;
const review = { name: "EpisodeReleaseReview", schema: EpisodeReviewDocSchema } as const;
const progress = {
  name: "ReleaseProgressList",
  schema: ItemsOf(ReleaseProgressDocSchema),
} as const;

export const releasePaths: Paths = {
  [ADMIN]: {
    get: operation({
      id: "listReleaseSchedules",
      tag: TAG,
      summary: "Danh sách lịch phát hành",
      description: "Lọc lịch theo trạng thái và khoảng thời gian phát hành.",
      access: "admin",
      query: ReleaseScheduleQuerySchema,
      ok: {
        status: 200,
        description: "Danh sách lịch phân trang",
        schema: { name: "ReleaseSchedulePage", schema: PagedOf(ReleaseScheduleDocSchema) },
      },
    }),
    post: operation({
      id: "createReleaseSchedule",
      tag: TAG,
      summary: "Tạo lịch và phân công sản xuất",
      description: "Tạo lịch tự động phát hành và phân công một hoặc nhiều Moderator.",
      access: "admin",
      body: { name: "CreateReleaseSchedule", schema: CreateReleaseScheduleSchema },
      ok: {
        status: 201,
        description: "Lịch đã tạo",
        schema: schedule,
        location: `${ADMIN}/{id}`,
      },
      rate: "write",
      errors: { 422: "Hạn sản xuất phải trước thời gian phát hành" },
    }),
  },
  [`${ADMIN}/dashboard`]: {
    get: operation({
      id: "getReleaseDashboard",
      tag: TAG,
      summary: "Theo dõi phát hành",
      description: "Số liệu tổng hợp sắp phát hành, sẵn sàng, có nguy cơ trễ và cần xử lý.",
      access: "admin",
      ok: {
        status: 200,
        description: "Số liệu điều phối",
        schema: { name: "ReleaseDashboard", schema: ReleaseDashboardDocSchema },
      },
    }),
  },
  [`${ADMIN}/moderators`]: {
    get: operation({
      id: "listReleaseModerators",
      tag: TAG,
      summary: "Danh sách Moderator để phân công",
      access: "admin",
      ok: {
        status: 200,
        description: "Moderator đang hoạt động",
        schema: { name: "ReleaseModeratorList", schema: ReleaseModeratorListSchema },
      },
    }),
  },
  [`${ADMIN}/{id}`]: {
    get: operation({
      id: "getReleaseSchedule",
      tag: TAG,
      summary: "Chi tiết lịch phát hành",
      access: "admin",
      ...idParams,
      ok: { status: 200, description: "Lịch phát hành", schema: schedule },
      errors: { 404: "`NOT_FOUND`: lịch không tồn tại" },
    }),
    patch: operation({
      id: "updateReleaseSchedule",
      tag: TAG,
      summary: "Cập nhật hoặc đổi lịch",
      description: "Đổi thời gian làm tăng version để job cũ tự vô hiệu hóa.",
      access: "admin",
      ...idParams,
      body: { name: "UpdateReleaseSchedule", schema: UpdateReleaseScheduleSchema },
      ok: { status: 200, description: "Lịch sau cập nhật", schema: schedule },
      rate: "write",
      errors: { 409: "`STALE_WRITE`: lịch đã được cập nhật bởi request khác" },
    }),
  },
  [`${ADMIN}/{id}/assignees`]: {
    put: operation({
      id: "replaceReleaseAssignees",
      tag: TAG,
      summary: "Thay người phụ trách",
      access: "admin",
      ...idParams,
      body: { name: "ReplaceReleaseAssignees", schema: ReplaceReleaseAssigneesSchema },
      ok: { status: 200, description: "Lịch với phân công mới", schema: schedule },
      rate: "write",
      errors: { 404: "`NOT_FOUND`: lịch không tồn tại" },
    }),
  },
  [`${ADMIN}/{id}/progress`]: {
    get: operation({
      id: "getAdminReleaseProgress",
      tag: TAG,
      summary: "Tiến độ phát hành",
      description: "Timeline nghiệp vụ bất biến của một lịch.",
      access: "admin",
      ...idParams,
      ok: { status: 200, description: "Các mốc tiến độ", schema: progress },
      errors: { 404: "`NOT_FOUND`: lịch không tồn tại" },
    }),
  },
  [`${ADMIN}/{id}/check-readiness`]: {
    post: operation({
      id: "checkReleaseReadiness",
      tag: TAG,
      summary: "Xác nhận sẵn sàng phát hành",
      description:
        "Kiểm tra bản duyệt hiện tại và checklist xuất bản trước khi chuyển lịch sang trạng thái sẵn sàng.",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Lịch đã sẵn sàng phát hành",
        schema: schedule,
      },
      rate: "write",
      errors: {
        403: "`FORBIDDEN`: chỉ Admin được điều phối lịch",
        404: "`NOT_FOUND`: lịch không tồn tại",
        409: "`CONTENT_NOT_READY` hoặc `INVALID_STATE_TRANSITION`",
      },
    }),
  },
  [`${ADMIN}/{id}/publish-now`]: {
    post: operation({
      id: "publishReleaseNow",
      tag: TAG,
      summary: "Phát hành ngay",
      description: "Thao tác cứu hộ; dùng cùng publication use case với worker.",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Kết quả phát hành",
        schema: { name: "ReleaseActionResult", schema: ReleaseActionResultDocSchema },
      },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: trạng thái không cho phép" },
    }),
  },
  [`${ADMIN}/{id}/retry`]: {
    post: operation({
      id: "retryReleaseSchedule",
      tag: TAG,
      summary: "Thử lại phát hành",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Lịch được đưa lại vào hàng chờ",
        schema: { name: "ReleaseStatusResult", schema: ReleaseStatusResultDocSchema },
      },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: lịch không ở trạng thái FAILED" },
    }),
  },
  [`${ADMIN}/{id}/cancel`]: {
    post: operation({
      id: "cancelReleaseSchedule",
      tag: TAG,
      summary: "Hủy lịch phát hành",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Lịch đã hủy",
        schema: { name: "ReleaseCancelResult", schema: ReleaseStatusResultDocSchema },
      },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: trạng thái không thể hủy" },
    }),
  },
  [`${STUDIO}/assignments`]: {
    get: operation({
      id: "listMyReleaseAssignments",
      tag: TAG,
      summary: "Nhiệm vụ của tôi",
      access: "moderator",
      ok: {
        status: 200,
        description: "Các lịch Moderator đang được phân công",
        schema: { name: "AssignedReleaseList", schema: ItemsOf(ReleaseScheduleDocSchema) },
      },
    }),
  },
  [`${STUDIO}/assignable-episodes`]: {
    get: operation({
      id: "listAssignableReleaseEpisodes",
      tag: TAG,
      summary: "Podcast nháp có thể gắn vào nhiệm vụ",
      access: "moderator",
      ok: {
        status: 200,
        description: "Podcast nháp thuộc nội dung của Moderator",
        schema: { name: "AssignableEpisodeList", schema: AssignableEpisodeListSchema },
      },
    }),
  },
  [`${STUDIO}/review-queue`]: {
    get: operation({
      id: "listEpisodeReleaseReviewQueue",
      tag: TAG,
      summary: "Hàng chờ kiểm duyệt độc lập",
      description: "Loại trừ podcast mà Moderator hiện tại được phân công sản xuất.",
      access: "moderator",
      ok: {
        status: 200,
        description: "Podcast đang chờ kiểm duyệt",
        schema: { name: "ReleaseReviewQueue", schema: ItemsOf(ReleaseScheduleDocSchema) },
      },
    }),
  },
  [`${STUDIO}/reminders`]: {
    get: operation({
      id: "listMyProductionReminders",
      tag: TAG,
      summary: "Nhắc việc sản xuất trước hạn",
      access: "moderator",
      ok: {
        status: 200,
        description: "Tối đa 20 nhắc việc gần nhất",
        schema: { name: "ReleaseReminderList", schema: ReleaseReminderListSchema },
      },
    }),
  },
  [`${STUDIO}/{id}/progress`]: {
    get: operation({
      id: "getModeratorReleaseProgress",
      tag: TAG,
      summary: "Xem tiến độ nhiệm vụ",
      access: "moderator",
      ...idParams,
      ok: { status: 200, description: "Các mốc tiến độ", schema: progress },
      errors: { 403: "`FORBIDDEN`: không được phân công", 404: "`NOT_FOUND`: lịch không tồn tại" },
    }),
  },
  [`${STUDIO}/{id}/submit-review`]: {
    post: operation({
      id: "submitEpisodeReleaseReview",
      tag: TAG,
      summary: "Gửi podcast để duyệt",
      access: "moderator",
      ...idParams,
      body: { name: "SubmitEpisodeReleaseReview", schema: SubmitEpisodeReviewSchema },
      ok: { status: 200, description: "Phiên bản đang chờ duyệt", schema: review },
      rate: "write",
      errors: {
        403: "`FORBIDDEN`: không được phân công",
        409: "`STALE_WRITE` hoặc `CONTENT_NOT_READY`",
      },
    }),
  },
  [`${STUDIO}/{id}/link-episode`]: {
    post: operation({
      id: "linkEpisodeToReleaseSchedule",
      tag: TAG,
      summary: "Gắn podcast nháp vào nhiệm vụ",
      access: "moderator",
      ...idParams,
      body: { name: "LinkReleaseEpisode", schema: LinkReleaseEpisodeSchema },
      ok: { status: 200, description: "Lịch đã liên kết podcast", schema: schedule },
      rate: "write",
      errors: {
        403: "`FORBIDDEN`: không được phân công",
        409: "`CONTENT_NOT_READY`: podcast không thuộc Moderator hoặc không còn là bản nháp",
      },
    }),
  },
  [`${STUDIO}/{id}/review`]: {
    post: operation({
      id: "reviewEpisodeRelease",
      tag: TAG,
      summary: "Kiểm duyệt podcast",
      access: "moderator",
      ...idParams,
      body: { name: "ReviewEpisodeRelease", schema: ReviewEpisodeSchema },
      ok: { status: 200, description: "Kết quả kiểm duyệt", schema: review },
      rate: "write",
      errors: {
        403: "`SELF_REVIEW_FORBIDDEN`: người sản xuất không được tự duyệt",
        409: "`INVALID_REVIEW_STATE` hoặc `STALE_WRITE`",
      },
    }),
  },
};
