import { z } from "zod";
import { PublicQuizSchema, QuizAttemptResultSchema, SubmitQuizAttemptSchema, UpsertQuizSchema, UserWeeklyMissionSchema, WeeklyMissionQuerySchema } from "@repo/shared";
import { operation, type Paths } from "../operation";

const QUIZ_TAG = "Quiz";
const MISSION_TAG = "Missions";
const EpisodeIdParam = z.object({ episodeId: z.string().uuid() });
const QuizIdParam = z.object({ quizId: z.string().uuid() });
const SlugParam = z.object({ slug: z.string().min(1) });
const studioQuiz = PublicQuizSchema.extend({
  questions: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    explanation: z.string().nullable(),
    sortOrder: z.number().int(),
    options: z.array(z.object({ id: z.string().uuid(), label: z.string(), text: z.string(), isCorrect: z.boolean() })),
  })),
});

export const gamificationPaths: Paths = {
  "/api/studio/episodes/{episodeId}/quiz": {
    get: operation({
      id: "getStudioQuiz", tag: QUIZ_TAG, summary: "Đọc quiz để biên tập", access: "moderator",
      pathParams: EpisodeIdParam, pathParamDocs: { episodeId: "ID tập thuộc Moderator" },
      ok: { status: 200, description: "Quiz kèm đáp án đúng và giải thích", schema: { name: "StudioQuiz", schema: studioQuiz } },
      errors: { 404: "`NOT_FOUND`: tập không thuộc Moderator hoặc chưa có quiz" },
    }),
    put: operation({
      id: "upsertStudioQuiz", tag: QUIZ_TAG, summary: "Tạo hoặc thay nội dung quiz", description: "Thay toàn bộ câu hỏi. Không cho thay sau khi đã có lượt làm để bảo toàn lịch sử.", access: "moderator",
      pathParams: EpisodeIdParam, pathParamDocs: { episodeId: "ID tập thuộc Moderator" },
      body: { name: "UpsertQuiz", schema: UpsertQuizSchema }, rate: "write",
      ok: { status: 200, description: "Quiz đã lưu (không lộ đáp án đúng trong response này)", schema: { name: "PublicQuiz", schema: PublicQuizSchema } },
      errors: { 404: "`NOT_FOUND`: tập không thuộc Moderator", 409: "`CONFLICT`: quiz đã có lượt làm" },
    }),
    delete: operation({
      id: "deleteStudioQuiz", tag: QUIZ_TAG, summary: "Xóa quiz chưa có lượt làm", access: "moderator",
      pathParams: EpisodeIdParam, pathParamDocs: { episodeId: "ID tập thuộc Moderator" }, rate: "write",
      ok: { status: 204, description: "Đã xóa quiz" },
      errors: { 404: "`NOT_FOUND`: tập không thuộc Moderator hoặc chưa có quiz", 409: "`CONFLICT`: quiz đã có lượt làm" },
    }),
  },
  "/api/episodes/{slug}/quiz": {
    get: operation({
      id: "getPublishedQuiz", tag: QUIZ_TAG, summary: "Lấy quiz của tập công khai", description: "Không trả đáp án đúng hay giải thích trước khi nộp bài.", access: "optional",
      pathParams: SlugParam, pathParamDocs: { slug: "Slug tập công khai" },
      ok: { status: 200, description: "Quiz cho người nghe", schema: { name: "PublicQuiz", schema: PublicQuizSchema } },
      errors: { 404: "`NOT_FOUND`: tập/Series chưa xuất bản hoặc tập chưa có quiz" },
    }),
  },
  "/api/quizzes/{quizId}/attempts": {
    post: operation({
      id: "submitQuizAttempt", tag: QUIZ_TAG, summary: "Nộp bài quiz", description: "Chấm điểm theo ngưỡng của quiz. Lần đậu đầu tiên nhận XP và mỗi quiz chỉ được tính một lần vào từng nhiệm vụ tuần PASS_QUIZ.", access: "user",
      pathParams: QuizIdParam, pathParamDocs: { quizId: "ID quiz" },
      body: { name: "SubmitQuizAttempt", schema: SubmitQuizAttemptSchema }, idempotent: true, rate: "write",
      ok: { status: 201, description: "Kết quả, đáp án đúng, XP và thay đổi nhiệm vụ", schema: { name: "QuizAttemptResult", schema: QuizAttemptResultSchema } },
      errors: { 404: "`NOT_FOUND`: quiz không khả dụng", 422: "`VALIDATION_ERROR`: thiếu câu trả lời hoặc đáp án không thuộc câu hỏi" },
    }),
  },
  "/api/me/weekly-missions": {
    get: operation({
      id: "listMyWeeklyMissions", tag: MISSION_TAG, summary: "Danh sách nhiệm vụ tuần của tôi", description: "Mặc định là tuần hiện tại, tính từ thứ Hai 00:00 đến thứ Hai kế tiếp theo múi giờ Việt Nam.", access: "user",
      query: WeeklyMissionQuerySchema, queryDocs: { weekStartDate: "Một thời điểm bất kỳ trong tuần cần xem; server chuẩn hóa về thứ Hai 00:00 Asia/Ho_Chi_Minh" },
      ok: { status: 200, description: "XP hiện tại và tiến độ nhiệm vụ", schema: { name: "MyWeeklyMissions", schema: z.object({ weekStartDate: z.coerce.date(), weekEndDate: z.coerce.date(), totalXp: z.number().int().nonnegative(), items: z.array(UserWeeklyMissionSchema) }) } },
    }),
  },
};
