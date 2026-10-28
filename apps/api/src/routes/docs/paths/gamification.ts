import { z } from "zod";
import {
  MyWeeklyMissionsSchema,
  PublicQuizSchema,
  QuizAttemptResultSchema,
  StudioQuizSchema,
  SubmitQuizAttemptSchema,
  UpsertQuizSchema,
  WeeklyMissionQuerySchema,
  QuizWorkspaceSchema, QuizWorkspaceListSchema, SaveQuizDraftSchema, ActivateQuizDraftSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";

const QUIZ_TAG = "Quiz";
const MISSION_TAG = "Missions";
const LOCKED = "`CONTENT_LOCKED`: Admin đã khoá tập hoặc Series, chỉ Admin sửa được";
const IN_TRASH = "`CONTENT_IN_TRASH`: tập hoặc Series đang ở thùng rác";
const EpisodeIdParam = z.object({ episodeId: z.string().uuid() });
const QuizIdParam = z.object({ quizId: z.string().uuid() });
const SlugParam = z.object({ slug: z.string().min(1) });
const studioQuiz = PublicQuizSchema.extend({
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string(),
      explanation: z.string().nullable(),
      sortOrder: z.number().int(),
      options: z.array(
        z.object({
          id: z.string().uuid(),
          label: z.string(),
          text: z.string(),
          isCorrect: z.boolean(),
        }),
      ),
    }),
  ),
});

export const gamificationPaths: Paths = {
  "/api/studio/quiz-workspaces": {
    get: operation({ id: "listQuizWorkspaces", tag: QUIZ_TAG, summary: "Danh sách quiz thật thuộc Moderator", access: "moderator",
      ok: { status: 200, description: "Bản nháp và quiz đang dùng", schema: { name: "QuizWorkspaceList", schema: QuizWorkspaceListSchema } } }),
  },
  "/api/studio/episodes/{episodeId}/quiz-workspace": {
    get: operation({ id: "getQuizWorkspace", tag: QUIZ_TAG, summary: "Đọc bản nháp và kịch bản quiz độc lập", access: "moderator", pathParams: EpisodeIdParam,
      ok: { status: 200, description: "Nội dung referenceText là kịch bản riêng của quiz, không lấy từ podcast. Bản nháp cũ chưa có trường này dùng nội dung trống.", schema: { name: "QuizWorkspace", schema: QuizWorkspaceSchema } },
      errors: { 403: LOCKED, 404: "`NOT_FOUND`: tập không thuộc Moderator", 409: IN_TRASH } }),
    put: operation({ id: "saveQuizWorkspace", tag: QUIZ_TAG, summary: "Lưu câu hỏi và kịch bản quiz referenceText cùng bản nháp", access: "moderator", pathParams: EpisodeIdParam,
      body: { name: "SaveQuizDraft", schema: SaveQuizDraftSchema }, rate: "write",
      ok: { status: 200, description: "Bản nháp đã lưu với revision mới", schema: { name: "QuizWorkspace", schema: QuizWorkspaceSchema } },
      errors: { 403: LOCKED, 404: "`NOT_FOUND`: tập không thuộc Moderator", 409: `${IN_TRASH}; \`CONFLICT\`: revision đã thay đổi` } }),
  },
  "/api/studio/episodes/{episodeId}/quiz-workspace/activate": {
    post: operation({ id: "activateQuizWorkspace", tag: QUIZ_TAG, summary: "Đưa bản nháp đã rà soát vào sử dụng", access: "moderator", pathParams: EpisodeIdParam,
      body: { name: "ActivateQuizDraft", schema: ActivateQuizDraftSchema }, rate: "write",
      ok: { status: 200, description: "Quiz sẵn sàng cho tập công khai", schema: { name: "QuizWorkspace", schema: QuizWorkspaceSchema } },
      errors: { 403: LOCKED, 404: "`NOT_FOUND`: tập không thuộc Moderator", 409: `${IN_TRASH}; \`CONFLICT\`: đã có lượt làm hoặc revision thay đổi`, 422: "`VALIDATION_ERROR`: câu hỏi chưa hoàn chỉnh" } }),
  },
  "/api/studio/episodes/{episodeId}/quiz": {
    get: operation({
      id: "getStudioQuiz",
      tag: QUIZ_TAG,
      summary: "Đọc quiz để biên tập",
      access: "moderator",
      pathParams: EpisodeIdParam,
      pathParamDocs: { episodeId: "ID tập thuộc Moderator" },
      ok: {
        status: 200,
        description: "Quiz kèm đáp án đúng và giải thích",
        schema: { name: "StudioQuiz", schema: StudioQuizSchema },
      },
      errors: {
        403: LOCKED,
        404: "`NOT_FOUND`: tập không thuộc Moderator hoặc chưa có quiz",
        409: IN_TRASH,
      },
    }),
    put: operation({
      id: "upsertStudioQuiz",
      tag: QUIZ_TAG,
      summary: "Tạo hoặc thay nội dung quiz",
      description:
        "Thay toàn bộ câu hỏi. Không cho thay sau khi đã có lượt làm để bảo toàn lịch sử.",
      access: "moderator",
      pathParams: EpisodeIdParam,
      pathParamDocs: { episodeId: "ID tập thuộc Moderator" },
      body: { name: "UpsertQuiz", schema: UpsertQuizSchema },
      rate: "write",
      ok: {
        status: 200,
        description: "Quiz đã lưu (không lộ đáp án đúng trong response này)",
        schema: { name: "PublicQuiz", schema: PublicQuizSchema },
      },
      errors: {
        403: LOCKED,
        404: "`NOT_FOUND`: tập không thuộc Moderator",
        409: `${IN_TRASH}; hoặc \`CONFLICT\`: quiz đã có lượt làm`,
      },
    }),
    delete: operation({
      id: "deleteStudioQuiz",
      tag: QUIZ_TAG,
      summary: "Xóa quiz chưa có lượt làm",
      access: "moderator",
      pathParams: EpisodeIdParam,
      pathParamDocs: { episodeId: "ID tập thuộc Moderator" },
      rate: "write",
      ok: { status: 204, description: "Đã xóa quiz" },
      errors: {
        403: LOCKED,
        404: "`NOT_FOUND`: tập không thuộc Moderator hoặc chưa có quiz",
        409: `${IN_TRASH}; hoặc \`CONFLICT\`: quiz đã có lượt làm`,
      },
    }),
  },
  "/api/episodes/{slug}/quiz": {
    get: operation({
      id: "getPublishedQuiz",
      tag: QUIZ_TAG,
      summary: "Lấy quiz của tập công khai",
      description: "Không trả đáp án đúng hay giải thích trước khi nộp bài.",
      access: "optional",
      pathParams: SlugParam,
      pathParamDocs: { slug: "Slug tập công khai" },
      ok: {
        status: 200,
        description: "Quiz cho người nghe",
        schema: { name: "PublicQuiz", schema: PublicQuizSchema },
      },
      errors: {
        404: "`NOT_FOUND`: tập/Series chưa xuất bản hoặc tập chưa có quiz",
      },
    }),
  },
  "/api/quizzes/{quizId}/attempts": {
    post: operation({
      id: "submitQuizAttempt",
      tag: QUIZ_TAG,
      summary: "Nộp bài quiz",
      description:
        "Chấm điểm theo ngưỡng của quiz. Lần đậu đầu tiên nhận XP và mỗi quiz chỉ được tính một lần vào từng nhiệm vụ tuần PASS_QUIZ.",
      access: "user",
      pathParams: QuizIdParam,
      pathParamDocs: { quizId: "ID quiz" },
      body: { name: "SubmitQuizAttempt", schema: SubmitQuizAttemptSchema },
      idempotent: true,
      rate: "write",
      ok: {
        status: 201,
        description: "Kết quả, đáp án đúng, XP và thay đổi nhiệm vụ",
        schema: { name: "QuizAttemptResult", schema: QuizAttemptResultSchema },
      },
      errors: {
        404: "`NOT_FOUND`: quiz không khả dụng",
        422: "`VALIDATION_ERROR`: thiếu câu trả lời hoặc đáp án không thuộc câu hỏi",
      },
    }),
  },
  "/api/me/weekly-missions": {
    get: operation({
      id: "listMyWeeklyMissions",
      tag: MISSION_TAG,
      summary: "Danh sách nhiệm vụ tuần của tôi",
      description:
        "Mặc định là tuần hiện tại, tính từ thứ Hai 00:00 đến thứ Hai kế tiếp theo múi giờ Việt Nam. `weekStartDate` và `weekEndDate` trong response là thời điểm chính xác (ISO 8601 UTC) của cửa sổ tuần; `status` là `EXPIRED` khi nhiệm vụ chưa hoàn thành mà tuần đã kết thúc.",
      access: "user",
      query: WeeklyMissionQuerySchema,
      queryDocs: {
        weekStartDate:
          "Một thời điểm bất kỳ trong tuần cần xem; server chuẩn hóa về thứ Hai 00:00 Asia/Ho_Chi_Minh",
      },
      ok: {
        status: 200,
        description: "XP hiện tại và tiến độ nhiệm vụ",
        schema: { name: "MyWeeklyMissions", schema: MyWeeklyMissionsSchema },
      },
    }),
  },
};
