import {
  CreateReleaseScheduleSchema,
  ApproveReleaseReassignmentTicketSchema,
  AssignableEpisodeListSchema,
  CreateReleaseReassignmentTicketSchema,
  LinkReleaseEpisodeSchema,
  RejectReleaseReassignmentTicketSchema,
  ReleaseReminderListSchema,
  ReleaseReassignmentTicketQuerySchema,
  ReleaseReassignmentTicketSchema,
  ReleaseScheduleQuerySchema,
  ReplaceReleaseAssigneeSchema,
  ReviewContentSchema,
  ReviewEpisodeSchema,
  SubmitEpisodeReviewSchema,
  UpdateReleaseScheduleSchema,
  UpdateReleaseReassignmentTicketSchema,
  UuidParamSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  EpisodeReviewDocSchema,
  ItemsOf,
  PagedOf,
  ReleaseActionResultDocSchema,
  ReleaseDashboardDocSchema,
  ReleaseModeratorWorkloadDocSchema,
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
const reviewContent = { name: "EpisodeReleaseReviewContent", schema: ReviewContentSchema } as const;
const progress = {
  name: "ReleaseProgressList",
  schema: ItemsOf(ReleaseProgressDocSchema),
} as const;
const ticket = {
  name: "ReleaseReassignmentTicket",
  schema: ReleaseReassignmentTicketSchema,
} as const;

export const releasePaths: Paths = {
  [`${ADMIN}/{id}/review`]: {
    post: operation({
      id: "adminReviewEpisodeRelease",
      tag: TAG,
      summary: "Admin kiểm duyệt podcast",
      description: "Duyệt hoặc yêu cầu chỉnh sửa đúng `reviewId` và phiên bản đã gửi. Thu hồi và duyệt cùng lúc chỉ có một thao tác thành công. APPROVE ghi assessment và approval cho revision; yêu cầu chỉnh sửa phải có nhận xét. Kèm snapshot readiness tại thời điểm quyết định (`readinessSnapshot`).",
      access: "admin",
      ...idParams,
      body: { name: "ReviewEpisodeRelease", schema: ReviewEpisodeSchema },
      ok: { status: 200, description: "Kết quả kiểm duyệt", schema: review },
      rate: "write",
      errors: {
        403: "`SELF_REVIEW_FORBIDDEN`: người sản xuất không được tự duyệt",
        404: "`NOT_FOUND`: lịch không tồn tại",
        409: "`INVALID_REVIEW_STATE` (đã có quyết định hoặc không còn chờ duyệt) hoặc `STALE_WRITE`",
        422: "`CHECKLIST_INCOMPLETE`, `RIGHTS_EXPIRED`, `AI_DISCLOSURE_REQUIRED`, `WARNING_ACCEPTANCE_REQUIRED`; `CONTENT_NOT_READY`: lịch chưa liên kết tập podcast; `VALIDATION_ERROR`: APPROVE thiếu kết luận phát hành",
      },
    }),
  },
  [`${ADMIN}/{id}/review-content`]: {
    get: operation({
      id: "adminGetEpisodeReleaseReviewContent",
      tag: TAG,
      summary: "Nội dung tập cho người duyệt (Admin)",
      description: "Cùng dữ liệu với route Moderator: tập, `readiness` và `aiSummary`. Chỉ khi lịch có phiên bản đang chờ duyệt.",
      access: "admin",
      ...idParams,
      ok: { status: 200, description: "Nội dung chờ duyệt", schema: reviewContent },
      errors: { 404: "`NOT_FOUND`: lịch không tồn tại hoặc không có phiên bản đang chờ duyệt" },
    }),
  },
  [ADMIN]: {
    get: operation({
      id: "listReleaseSchedules",
      tag: TAG,
      summary: "Danh sách lịch phát hành",
      description: "Lọc lịch theo trạng thái, nhóm trạng thái và khoảng thời gian phát hành.",
      queryDocs: { statusGroup: "IN_PROGRESS: đã lên lịch, sẵn sàng hoặc đang phát hành; NEEDS_ATTENTION: bị chặn hoặc thất bại; RELEASED: đã phát hành; CANCELLED: đã hủy." },
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
      description: "Tạo lịch và phân công đúng một Moderator. Thời gian phát hành là mốc kế hoạch; Admin chủ động phát hành bằng thao tác Phát hành ngay.",
      access: "admin",
      body: { name: "CreateReleaseSchedule", schema: CreateReleaseScheduleSchema },
      ok: {
        status: 201,
        description: "Lịch đã tạo",
        schema: schedule,
        location: `${ADMIN}/{id}`,
      },
      rate: "write",
      errors: {
        404: "`NOT_FOUND`: `episodeId` không tồn tại",
        409: "`CONTENT_IN_TRASH`: tập hoặc series của `episodeId` đã vào thùng rác",
      },
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
  [`${ADMIN}/workload`]: {
    get: operation({
      id: "getReleaseModeratorWorkload",
      tag: TAG,
      summary: "Khối lượng điều phối theo Moderator",
      description:
        "Đếm lịch đang mở và lịch có hạn sản xuất trong 24 giờ tới theo từng Moderator.",
      access: "admin",
      ok: {
        status: 200,
        description: "Khối lượng sản xuất đang mở",
        schema: {
          name: "ReleaseModeratorWorkloadList",
          schema: ItemsOf(ReleaseModeratorWorkloadDocSchema),
        },
      },
    }),
  },
  [`${ADMIN}/reassignment-tickets`]: {
    get: operation({
      id: "listReleaseReassignmentTickets",
      tag: TAG,
      summary: "Danh sách ticket",
      description: "Lọc ticket của Moderator theo trạng thái để Admin xử lý.",
      access: "admin",
      query: ReleaseReassignmentTicketQuerySchema,
      ok: {
        status: 200,
        description: "Danh sách ticket phân trang",
        schema: { name: "ReleaseReassignmentTicketPage", schema: PagedOf(ReleaseReassignmentTicketSchema) },
      },
    }),
  },
  [`${ADMIN}/reassignment-tickets/{id}/approve`]: {
    post: operation({
      id: "approveReleaseReassignmentTicket",
      tag: TAG,
      summary: "Duyệt ticket và chuyển người phụ trách",
      access: "admin",
      ...idParams,
      body: { name: "ApproveReleaseReassignmentTicket", schema: ApproveReleaseReassignmentTicketSchema },
      ok: { status: 200, description: "Ticket đã duyệt", schema: ticket },
      rate: "write",
      errors: { 404: "`NOT_FOUND`: ticket không tồn tại", 409: "`INVALID_STATE_TRANSITION`: ticket không còn chờ duyệt", 422: "`VALIDATION_ERROR`: người thay thế trùng Moderator hiện tại hoặc không còn hoạt động" },
    }),
  },
  [`${ADMIN}/reassignment-tickets/{id}/reject`]: {
    post: operation({
      id: "rejectReleaseReassignmentTicket",
      tag: TAG,
      summary: "Từ chối ticket",
      description: "Lý do từ chối là bắt buộc và assignment hiện tại được giữ nguyên.",
      access: "admin",
      ...idParams,
      body: { name: "RejectReleaseReassignmentTicket", schema: RejectReleaseReassignmentTicketSchema },
      ok: { status: 200, description: "Ticket đã bị từ chối", schema: ticket },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: ticket không còn chờ duyệt" },
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
      errors: {
        404: "`NOT_FOUND`: `episodeId` không tồn tại",
        409: "`STALE_WRITE`: lịch đã được cập nhật bởi request khác; `INVALID_REVIEW_STATE`: đang có lượt duyệt chờ nên không đổi podcast; `CONTENT_IN_TRASH`: tập hoặc series mới đã vào thùng rác",
      },
    }),
  },
  [`${ADMIN}/{id}/assignees`]: {
    put: operation({
      id: "replaceReleaseAssignee",
      tag: TAG,
      summary: "Thay người phụ trách",
      access: "admin",
      ...idParams,
      body: { name: "ReplaceReleaseAssignee", schema: ReplaceReleaseAssigneeSchema },
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
        409: "`INVALID_STATE_TRANSITION`",
        422: "`CONTENT_NOT_READY`: podcast chưa được duyệt ở phiên bản hiện tại hoặc chưa đạt checklist xuất bản",
      },
    }),
  },
  [`${ADMIN}/{id}/publish-now`]: {
    post: operation({
      id: "publishReleaseNow",
      tag: TAG,
      summary: "Phát hành ngay",
      description: "Admin chủ động phát hành sau khi kiểm tra phiên bản duyệt và checklist. Không chờ worker hoặc thời gian đã lên lịch. Lỗi kỹ thuật trả FAILED, không tự động thử lại.",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Kết quả phát hành",
        schema: { name: "ReleaseActionResult", schema: ReleaseActionResultDocSchema },
      },
      rate: "write",
      errors: { 404: "`NOT_FOUND`: lịch không tồn tại" },
    }),
  },
  [`${ADMIN}/{id}/retry`]: {
    post: operation({
      id: "retryReleaseSchedule",
      tag: TAG,
      summary: "Thử lại phát hành",
      description: "Đưa lịch FAILED về READY_TO_PUBLISH để Admin bấm Phát hành ngay. Không tạo job hoặc tự động phát hành.",
      access: "admin",
      ...idParams,
      ok: {
        status: 200,
        description: "Lịch đã sẵn sàng cho thao tác phát hành thủ công",
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
  [`${STUDIO}/schedules`]: {
    get: operation({
      id: "listMyReleaseSchedules",
      tag: TAG,
      summary: "Danh sách lịch phát hành được phân công",
      description: "Chỉ trả lịch đang phân công cho Moderator với trạng thái đã lên lịch, đủ điều kiện, đã phát hành hoặc đã hủy.",
      access: "moderator",
      ok: { status: 200, description: "Lịch phát hành được phân công", schema: { name: "ModeratorReleaseScheduleList", schema: ItemsOf(ReleaseScheduleDocSchema) } },
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
  [`${STUDIO}/reassignment-tickets`]: {
    get: operation({
      id: "listMyReleaseReassignmentTickets",
      tag: TAG,
      summary: "Ticket của tôi",
      access: "moderator",
      query: ReleaseReassignmentTicketQuerySchema,
      ok: {
        status: 200,
        description: "Danh sách ticket của Moderator",
        schema: { name: "MyReleaseReassignmentTicketPage", schema: PagedOf(ReleaseReassignmentTicketSchema) },
      },
    }),
  },
  [`${STUDIO}/reassignment-tickets/{id}`]: {
    patch: operation({
      id: "updateMyReleaseReassignmentTicket",
      tag: TAG,
      summary: "Cập nhật lý do ticket",
      access: "moderator",
      ...idParams,
      body: { name: "UpdateReleaseReassignmentTicket", schema: UpdateReleaseReassignmentTicketSchema },
      ok: { status: 200, description: "Ticket đã cập nhật", schema: ticket },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: ticket không còn chờ hoặc không thuộc người dùng" },
    }),
  },
  [`${STUDIO}/reassignment-tickets/{id}/cancel`]: {
    post: operation({
      id: "cancelMyReleaseReassignmentTicket",
      tag: TAG,
      summary: "Tự hủy ticket đang chờ",
      access: "moderator",
      ...idParams,
      ok: { status: 200, description: "Ticket đã hủy", schema: ticket },
      rate: "write",
      errors: { 409: "`INVALID_STATE_TRANSITION`: ticket không còn chờ hoặc không thuộc người dùng" },
    }),
  },
  [`${STUDIO}/{id}/reassignment-tickets`]: {
    post: operation({
      id: "createReleaseReassignmentTicket",
      tag: TAG,
      summary: "Báo không thể tiếp tục nhiệm vụ",
      description: "Tạo ticket báo không thể tiếp tục lịch đang được Moderator phụ trách.",
      access: "moderator",
      ...idParams,
      body: { name: "CreateReleaseReassignmentTicket", schema: CreateReleaseReassignmentTicketSchema },
      ok: { status: 201, description: "Ticket đang chờ duyệt", schema: ticket },
      rate: "write",
      errors: { 403: "`FORBIDDEN`: không được phân công", 404: "`NOT_FOUND`: lịch không tồn tại", 409: "`CONFLICT` (đã có ticket chờ duyệt) hoặc `INVALID_STATE_TRANSITION` (lịch đã phát hành, hủy hoặc đang phát hành)" },
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
        404: "`NOT_FOUND`: lịch không tồn tại",
        409: "`STALE_WRITE` (nội dung đã đổi), `INVALID_STATE_TRANSITION` (lịch đã phát hành, hủy hoặc đang phát hành) hoặc `INVALID_REVIEW_STATE` (phiên bản này đã gửi duyệt)",
        422: "`CHECKLIST_INCOMPLETE`: tập thiếu tên tập, kịch bản hoặc âm thanh ngôi thứ ba; `CONTENT_NOT_READY`: lịch chưa liên kết tập podcast",
      },
    }),
  },
  [`${STUDIO}/{id}/reviews/{reviewId}/withdraw`]: {
    post: operation({
      id: "withdrawEpisodeReleaseReview",
      tag: TAG,
      summary: "Thu hồi bản gửi kiểm duyệt",
      description: "Moderator đang được phân công có thể thu hồi lượt duyệt còn IN_REVIEW. Podcast được gỡ khỏi lịch, lịch trở về SCHEDULED; lượt cũ được giữ trong lịch sử. Moderator phải gắn lại podcast trước khi gửi duyệt.",
      access: "moderator",
      pathParams: UuidParamSchema.extend({ reviewId: UuidParamSchema.shape.id }),
      pathParamDocs: { id: "ID lịch phát hành", reviewId: "ID lượt gửi duyệt" },
      ok: { status: 200, description: "Lượt duyệt đã được thu hồi", schema: review },
      rate: "write",
      errors: { 403: "`FORBIDDEN`: không được phân công", 404: "`NOT_FOUND`: lịch không tồn tại", 409: "`INVALID_REVIEW_STATE`: lượt duyệt không còn chờ hoặc không còn thuộc podcast đang gắn" },
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
        404: "`NOT_FOUND`: tập podcast không tồn tại",
        409: "`INVALID_REVIEW_STATE` (đang có lượt duyệt chờ, hãy thu hồi trước) hoặc `CONTENT_IN_TRASH` (tập hoặc series đã vào thùng rác)",
        422: "`CONTENT_NOT_READY`: podcast không thuộc Moderator hoặc không còn là bản nháp",
      },
    }),
  },
  [`${STUDIO}/{id}/review`]: {
    post: operation({
      id: "reviewEpisodeRelease",
      tag: TAG,
      summary: "Kiểm duyệt podcast",
      description: "Gửi `reviewId` của lượt chờ duyệt và phiên bản tương ứng; lượt đã thu hồi không thể được duyệt.",
      access: "moderator",
      ...idParams,
      body: { name: "ReviewEpisodeRelease", schema: ReviewEpisodeSchema },
      ok: { status: 200, description: "Kết quả kiểm duyệt", schema: review },
      rate: "write",
      errors: {
        403: "`SELF_REVIEW_FORBIDDEN`: người sản xuất không được tự duyệt",
        404: "`NOT_FOUND`: lịch không tồn tại",
        409: "`INVALID_REVIEW_STATE` (đã có quyết định hoặc không còn chờ duyệt) hoặc `STALE_WRITE`",
        422: "`CHECKLIST_INCOMPLETE`, `RIGHTS_EXPIRED`, `AI_DISCLOSURE_REQUIRED`, `WARNING_ACCEPTANCE_REQUIRED`; `CONTENT_NOT_READY`: lịch chưa liên kết tập podcast; `VALIDATION_ERROR`: APPROVE thiếu kết luận phát hành",
      },
    }),
  },
  [`${STUDIO}/{id}/review-content`]: {
    get: operation({
      id: "getEpisodeReleaseReviewContent",
      tag: TAG,
      summary: "Nội dung tập cho người duyệt (Moderator)",
      description: "Toàn bộ tập, mục \"Tình trạng tập\" (`readiness`, hệ thống tự tính) và số liệu AI (`aiSummary`, chỉ đếm điều hệ thống ghi nhận, không phải xác nhận). Chỉ khi lịch có phiên bản đang chờ duyệt.",
      access: "moderator",
      ...idParams,
      ok: { status: 200, description: "Nội dung chờ duyệt", schema: reviewContent },
      errors: {
        403: "`SELF_REVIEW_FORBIDDEN`: người sản xuất không được xem ở vai trò người duyệt",
        404: "`NOT_FOUND`: lịch không tồn tại hoặc không có phiên bản đang chờ duyệt",
      },
    }),
  },
};
