import { z } from "zod";
import {
  ListeningHistoryQuerySchema,
  PodcastRankingQuerySchema, PodcastRankingResponseSchema,
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
  "/api/me/top-podcasts": {
    get: operation({ id: "listTopPodcasts", tag: TAG, summary: "Podcast nghe nhiều theo tuần/tháng", access: "user",
      description: "Mọi role đăng nhập. scope=personal lấy user từ session; scope=system gộp toàn hệ thống, không trả định danh người nghe. Đếm ListeningSession có qualifiedAt; lọc startedAt trong tuần hiện tại (thứ Hai00:00) hoặc tháng lịch hiện tại tại Asia/Ho_Chi_Minh, khoảng [start,end). Hai bản kể cùng tập được gộp theo episode. Sort lượt DESC, title ASC, episode ID ASC; chỉ tập/series công khai, không xóa mềm và có audio READY phát được. Không backfill từ ListeningProgress. Trả window cùng pagination để client biết kỳ đang xem.",
      query: PodcastRankingQuerySchema,
      ok: { status: 200, description: "Ranking có phân trang, không có dữ liệu người nghe", schema: { name: "PodcastRanking", schema: PodcastRankingResponseSchema } },
    }),
  },
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
      description: "Kèm tên người tạo (creator.name), ngày xuất bản series/từng tập, toàn bộ tập đã xuất bản, mô tả, poster và thời lượng từng góc kể. Nếu đã đăng nhập, mỗi tập có thêm tiến độ nghe của bạn.",
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
        "Không bắt buộc đăng nhập (`attachSession`). Trả URL audio, thời lượng và `sync.intervalMs`/`sync.completionThreshold`; `progress` chỉ có khi đã đăng nhập và từng lưu tiến độ, ngược lại là `null`. `sync.intervalMs` là chu kỳ gọi `PUT /api/me/listening-progress/{narrationId}`; `sync.completionThreshold` là ngưỡng được tính là nghe xong. Response `Cache-Control: private, no-store`.",
      access: "optional",
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
        "Gộp `playedBitmap` vào tiến độ cộng dồn, giữ chống tua/XP như cũ. Tương thích client cũ: không có sessionId/sessionPlayedBitmap thì không ghi phiên. Client mới gửi cùng cặp sessionId(UUID) và sessionPlayedBitmap(base64 bit/giây nghe riêng của phiên, KHÔNG dùng bitmap cộng dồn); sync ngay khi bắt đầu với bitmap rỗng. Server lấy startedAt từ sync đầu, không nhận thời gian client. Pause/resume/background/retry giữ cùng ID, mở player mới/đổi tập tạo ID mới; audio thay đổi phải đổi ID. Response bổ sung listeningSession với bitmap được chấp nhận/playedMs/qualifiedAt. Ngân sách phiên là thời gian từ startedAt nhân max_playback_rate, không cấp lại tolerance qua retry. Một phiên đủ điều kiện tại min(30000ms,ceil(durationMs*0.8)); bit cuối tính đúng phần duration còn lại. qualifiedAt chỉ đặt một lần, startedAt bất biến dùng cho ranking tương lai. Ghi phiên và progress trong cùng transaction, ID không được tái dùng với user/narration/asset khác. Worker dọn phiên cũ hơn13 tháng lịch; account deletion cascade. API chỉ ghi phiên, chưa có endpoint ranking trong nhóm này.",
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
        409: "`AUDIO_CHANGED`: audio của tập đã đổi; `CONFLICT`: sessionId thuộc account/narration/audio khác, cần tạo phiên mới",
        422: "`PROGRESS_INVALID`: `positionMs` vượt thời lượng, bitmap không phải base64 hoặc dài hơn thời lượng audio",
      },
    }),
  },
  "/api/me/listening-history": {
    get: operation({
      id: "listListeningHistory",
      tag: TAG,
      summary: "Lịch sử nghe",
      description: "Mỗi tập xuất hiện một lần, lần nghe gần nhất trước. Chỉ đưa bản kể vào lịch sử khi playedSeconds được backend chấp nhận đạt ít nhất5 giây; sync khởi tạo bitmap rỗng vẫn lưu progress/session nhưng chưa hiện lịch sử. `episode.available = false` khi tập hoặc Series đã bị ẩn hay xoá.",
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
