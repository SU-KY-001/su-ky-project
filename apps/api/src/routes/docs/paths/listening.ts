import { z } from "zod";
import {
  ListeningHistoryQuerySchema,
  PublicSeriesListQuerySchema,
  UpdateListeningProgressRequestSchema,
  paginatedSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  HistoryResponseSchema,
  ListeningProgressDocSchema,
  ListeningProgressUpdateDocSchema,
  PlaybackDocSchema,
  PublicEpisodeDetailDocSchema,
  PublicSeriesDetailDocSchema,
  PublicSeriesListItemDocSchema,
} from "../schemas";

const TAG = "Listening";
const SlugParamSchema = z.object({ slug: z.string().min(1) });
const NarrationIdParamSchema = z.object({ narrationId: z.string().uuid() });

const slugParams = { pathParams: SlugParamSchema, pathParamDocs: { slug: "Slug công khai" } } as const;
const narrationParams = {
  pathParams: NarrationIdParamSchema,
  pathParamDocs: { narrationId: "ID bản kể (lấy từ chi tiết tập)" },
} as const;

const UNAVAILABLE = "`CONTENT_UNAVAILABLE`: bản kể chưa có audio hoặc không còn công khai";

export const listeningPaths: Paths = {
  "/api/series": {
    get: operation({
      id: "listPublicSeries",
      tag: TAG,
      summary: "Duyệt Series công khai",
      description: "Chỉ Series đã xuất bản. Lọc theo chủ đề, Thời kỳ, Giai đoạn hoặc khoảng năm (năm trước Công nguyên là số âm).",
      access: "optional",
      query: PublicSeriesListQuerySchema,
      queryDocs: {
        topicId: "Lọc theo chủ đề (UUID, lấy từ `GET /api/topics`)",
        historicalPhaseId: "Lọc theo Giai đoạn (UUID, lấy từ `phases[].id` của `GET /api/historical-periods`)",
        periodId: "Lọc theo Thời kỳ (UUID): trả Series thuộc mọi Giai đoạn con của Thời kỳ",
        fromYear: "Series có khoảng năm giao với `[fromYear, toYear]`",
        toYear: "Xem `fromYear`",
        q: "Từ khoá tiêu đề",
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
      },
      ok: {
        status: 200,
        description: "Danh sách phân trang",
        schema: { name: "PublicSeriesList", schema: paginatedSchema(PublicSeriesListItemDocSchema) },
      },
    }),
  },
  "/api/series/{slug}": {
    get: operation({
      id: "getPublicSeries",
      tag: TAG,
      summary: "Chi tiết Series công khai",
      description: "Kèm danh sách tập đã xuất bản. Nếu đã đăng nhập, mỗi tập có thêm tiến độ nghe của bạn.",
      access: "optional",
      ...slugParams,
      ok: {
        status: 200,
        description: "Series và các tập",
        schema: { name: "PublicSeriesDetail", schema: PublicSeriesDetailDocSchema },
      },
      errors: { 404: "`NOT_FOUND`: Series không tồn tại hoặc không công khai" },
    }),
  },
  "/api/episodes/{slug}": {
    get: operation({
      id: "getPublicEpisode",
      tag: TAG,
      summary: "Chi tiết tập công khai",
      description:
        "Gồm bản kể (`narrations[].id` dùng cho `GET /api/narrations/{narrationId}/playback`), nguồn trích dẫn và tập kế bên trong Series. Nếu đã đăng nhập, kèm tiến độ nghe.",
      access: "optional",
      ...slugParams,
      ok: {
        status: 200,
        description: "Tập, nguồn và bản kể",
        schema: { name: "PublicEpisodeDetail", schema: PublicEpisodeDetailDocSchema },
      },
      errors: { 404: "`NOT_FOUND`: tập không tồn tại hoặc không công khai" },
    }),
  },
  "/api/narrations/{narrationId}/playback": {
    get: operation({
      id: "getNarrationPlayback",
      tag: TAG,
      summary: "Lấy URL phát audio",
      description:
        "Trả URL audio, thời lượng và tiến độ đã lưu (nếu có). `sync.intervalMs` là chu kỳ gọi `PUT /api/me/listening-progress/{narrationId}`; `sync.completionThreshold` là ngưỡng được tính là nghe xong. Response `Cache-Control: private, no-store`.",
      access: "user",
      ...narrationParams,
      ok: { status: 200, description: "Audio và tiến độ", schema: { name: "Playback", schema: PlaybackDocSchema } },
      errors: { 404: UNAVAILABLE },
    }),
  },
  "/api/me/listening-progress/{narrationId}": {
    get: operation({
      id: "getListeningProgress",
      tag: TAG,
      summary: "Đọc tiến độ nghe",
      description: "Cặp đọc lại của `PUT`. `playedBitmap` là bitmap base64, mỗi bit là một giây đã nghe.",
      access: "user",
      ...narrationParams,
      ok: {
        status: 200,
        description: "Tiến độ",
        schema: { name: "ListeningProgress", schema: ListeningProgressDocSchema },
      },
      errors: { 404: "`NOT_FOUND`: chưa có tiến độ cho bản kể này" },
    }),
    put: operation({
      id: "updateListeningProgress",
      tag: TAG,
      summary: "Đồng bộ tiến độ nghe",
      description:
        "Gộp `playedBitmap` gửi lên vào bitmap đã lưu: chỉ thêm giây đã nghe, và số giây được cộng bị giới hạn theo thời gian thực đã trôi qua kể từ lần đồng bộ trước (chống tua). Lần đồng bộ khiến tập đạt ngưỡng hoàn thành trả `completion` kèm XP và tiến độ nhiệm vụ tuần; các lần khác `completion = null`.",
      access: "user",
      ...narrationParams,
      body: {
        name: "UpdateListeningProgressRequest",
        schema: UpdateListeningProgressRequestSchema,
        example: { assetId: "3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10", positionMs: 125000, playedBitmap: "//8=" },
      },
      ok: {
        status: 200,
        description: "Tiến độ sau khi gộp",
        schema: { name: "ListeningProgressUpdateResult", schema: ListeningProgressUpdateDocSchema },
      },
      rate: "listening_progress",
      errors: {
        404: UNAVAILABLE,
        409: "`AUDIO_CHANGED`: audio của tập đã đổi, hãy tải lại playback",
        422: "`PROGRESS_INVALID`: `positionMs` vượt thời lượng, bitmap không phải base64 hoặc dài hơn thời lượng audio",
      },
    }),
  },
  "/api/me/listening-history": {
    get: operation({
      id: "listListeningHistory",
      tag: TAG,
      summary: "Lịch sử nghe",
      description: "Mỗi tập xuất hiện một lần, lần nghe gần nhất trước. `episode.available = false` khi tập hoặc Series đã bị ẩn hay xoá.",
      access: "user",
      query: ListeningHistoryQuerySchema,
      queryDocs: {
        status: "`all`, `in_progress` (chưa nghe xong) hoặc `completed`",
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
      },
      ok: {
        status: 200,
        description: "Lịch sử phân trang",
        schema: { name: "ListeningHistory", schema: HistoryResponseSchema },
      },
    }),
  },
};
