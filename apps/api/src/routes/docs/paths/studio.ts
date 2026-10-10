import { z } from "zod";
import {
  AttachAudioSchema,
  CreateEntityTagSchema,
  CreateEpisodeSchema,
  CreateSeriesSchema,
  CreateSeriesSourceSchema,
  EpisodeOrderSchema,
  NarrationTypeSchema,
  PatchEntityTagSchema,
  PatchEpisodeSchema,
  PatchSeriesSchema,
  PatchSeriesSourceSchema,
  PutNarrationSchema,
  SeriesQuerySchema,
  SeriesSourceOrderSchema,
  SeriesSourceSchema,
  UuidParamSchema,
} from "@repo/shared";
import { operation, type Paths } from "../operation";
import {
  EntityTagSchema,
  EpisodeWorkspaceSchema,
  ItemsOf,
  NarrationSchema,
  PagedOf,
  SeriesDetailSchema,
  SeriesEpisodeListSchema,
  SeriesListItemSchema,
} from "../schemas";

const SERIES_TAG = "Studio Series";
const EPISODE_TAG = "Studio Episodes";
const SERIES = "/api/studio/series";
const EPISODES = "/api/studio/episodes";

const SeriesIdParamSchema = z.object({ seriesId: z.string().uuid() });
const NarrationParamSchema = z.object({ id: z.string().uuid(), type: NarrationTypeSchema });
const ChildParamSchema = z.object({ id: z.string().uuid(), childId: z.string().uuid() });

const LOCKED = "`CONTENT_LOCKED`: Admin đã khoá nội dung, chỉ Admin sửa được";
const IN_TRASH = "`CONTENT_IN_TRASH`: nội dung đang ở thùng rác";
const STALE = "`STALE_WRITE`: `baseUpdatedAt` cũ, nội dung đã được người khác sửa";

/** Reads answer 404 for content owned by someone else so that IDs are not leaked; Admin sees everything. */
const notFound = (what: string) =>
  `\`NOT_FOUND\`: ${what} không tồn tại hoặc không thuộc Moderator này (Admin xem được mọi nội dung)`;

interface WriteErrorExtras {
  409?: string;
  422?: string;
}

/** Every content mutation passes `assertWritable`: 403 when locked, 409 when in trash. */
const writeErrors = (what: string, extras: WriteErrorExtras = {}): Record<number, string> => {
  const errors: Record<number, string> = {
    403: LOCKED,
    404: notFound(what),
    409: [IN_TRASH, extras[409]].filter(Boolean).join("; "),
  };
  if (extras[422]) errors[422] = extras[422];
  return errors;
};

const seriesParams = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID Series (UUID)" } } as const;
const episodeParams = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID tập (UUID)" } } as const;
const narrationParams = {
  pathParams: NarrationParamSchema,
  pathParamDocs: { id: "ID tập (UUID)", type: "`THIRD_PERSON` (ngôi thứ ba) hoặc `FIRST_PERSON` (ngôi thứ nhất)" },
} as const;
const childParams = {
  pathParams: ChildParamSchema,
  pathParamDocs: { id: "ID tập (UUID)", childId: "ID bản ghi con (UUID)" },
} as const;
const seriesChildParams = {
  pathParams: ChildParamSchema,
  pathParamDocs: { id: "ID Series (UUID)", childId: "ID trích dẫn của Series (UUID)" },
} as const;

const seriesDetail = { name: "SeriesDetail", schema: SeriesDetailSchema } as const;
const workspace = { name: "EpisodeWorkspace", schema: EpisodeWorkspaceSchema } as const;
const narration = { name: "Narration", schema: NarrationSchema } as const;
const seriesSource = { name: "SeriesSource", schema: SeriesSourceSchema } as const;
const seriesSourceList = { name: "SeriesSourceList", schema: ItemsOf(SeriesSourceSchema) } as const;
const entityTag = { name: "EntityTag", schema: EntityTagSchema } as const;

const NO_CONTENT = { status: 204, description: "Đã xử lý, không có nội dung trả về" } as const;

const seriesAction = (
  id: string,
  summary: string,
  description: string,
  errors: Record<number, string>
): Record<string, unknown> =>
  operation({
    id,
    tag: SERIES_TAG,
    summary,
    description,
    access: "studio",
    ...seriesParams,
    ok: { status: 200, description: "Series sau khi đổi trạng thái", schema: seriesDetail },
    rate: "write",
    errors,
  });

const episodeAction = (
  id: string,
  summary: string,
  description: string,
  errors: Record<number, string>
): Record<string, unknown> =>
  operation({
    id,
    tag: EPISODE_TAG,
    summary,
    description,
    access: "studio",
    ...episodeParams,
    ok: { status: 200, description: "Workspace tập sau khi đổi trạng thái", schema: workspace },
    rate: "write",
    errors,
  });

export const studioPaths: Paths = {
  [SERIES]: {
    get: operation({
      id: "listStudioSeries",
      tag: SERIES_TAG,
      summary: "Danh sách Series",
      description: "Moderator thấy Series của mình; Admin thấy tất cả. `status=TRASH` liệt kê thùng rác.",
      access: "studio",
      query: SeriesQuerySchema,
      queryDocs: {
        status: "`DRAFT`, `PUBLISHED`, `HIDDEN` hoặc `TRASH`",
        q: "Từ khoá tiêu đề",
        ownerId: "Lọc theo chủ sở hữu (chỉ Admin; Moderator luôn bị giới hạn ở Series của mình)",
        page: "Trang, bắt đầu từ 1",
        limit: "Số dòng mỗi trang (tối đa 50)",
      },
      ok: {
        status: 200,
        description: "Danh sách phân trang",
        schema: { name: "SeriesList", schema: PagedOf(SeriesListItemSchema) },
      },
    }),
    post: operation({
      id: "createSeries",
      tag: SERIES_TAG,
      summary: "Tạo Series nháp",
      description: "Slug tự sinh từ tiêu đề nếu không truyền. Chủ sở hữu là người gọi.",
      access: "studio",
      body: {
        name: "CreateSeries",
        schema: CreateSeriesSchema,
        example: { title: "Nhà Trần chống Nguyên Mông", startYear: 1225, endYear: 1400 },
      },
      ok: { status: 201, description: "Series đã tạo", schema: seriesDetail, location: `${SERIES}/{id}` },
      idempotent: true,
      rate: "write",
      errors: {
        409: "`SLUG_CONFLICT`: không cấp được slug duy nhất (có thể thử lại)",
        422: "`VALIDATION_ERROR`: ảnh bìa không tồn tại, chưa `READY`, không phải ảnh hoặc không do bạn upload; `historicalPhaseId` không tồn tại",
      },
    }),
  },
  [`${SERIES}/{id}`]: {
    get: operation({
      id: "getStudioSeries",
      tag: SERIES_TAG,
      summary: "Chi tiết Series",
      description: "Kèm danh sách tập, nguồn (`sources`), Giai đoạn kèm Thời kỳ (`historicalPhase`) và `publishChecklist` (điều kiện xuất bản: chủ đề, Giai đoạn, khoảng năm, ít nhất một nguồn, ít nhất một tập đã xuất bản).",
      access: "studio",
      ...seriesParams,
      ok: { status: 200, description: "Series", schema: seriesDetail },
      errors: { 404: notFound("Series") },
    }),
    patch: operation({
      id: "updateSeries",
      tag: SERIES_TAG,
      summary: "Sửa Series",
      description:
        "Gửi các trường cần đổi. Gửi kèm `baseUpdatedAt` (lấy từ `updatedAt` của lần đọc gần nhất) để phát hiện ghi đè; bỏ qua thì không kiểm tra.",
      access: "studio",
      ...seriesParams,
      body: {
        name: "PatchSeries",
        schema: PatchSeriesSchema,
        example: { description: "Ba lần kháng chiến", baseUpdatedAt: "2026-10-08T10:00:00.000Z" },
      },
      ok: { status: 200, description: "Series đã sửa", schema: seriesDetail },
      rate: "write",
      errors: writeErrors("Series", {
        409: `${STALE}; \`SLUG_LOCKED\`: chỉ Series \`DRAFT\` mới đổi được slug; \`SLUG_CONFLICT\`: không cấp được slug duy nhất`,
        422: "`VALIDATION_ERROR`: ảnh bìa không dùng được hoặc `historicalPhaseId` không tồn tại",
      }),
    }),
    delete: operation({
      id: "deleteSeries",
      tag: SERIES_TAG,
      summary: "Đưa Series vào thùng rác",
      description: "Xoá mềm, ghi nhớ trạng thái trước đó. Gọi lại trên Series đã ở thùng rác vẫn trả 204. Khôi phục bằng `POST .../restore`.",
      access: "studio",
      ...seriesParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("Series"),
    }),
  },
  [`${SERIES}/{id}/publish`]: {
    post: seriesAction(
      "publishSeries",
      "Xuất bản Series",
      "Chỉ thành công khi `publishChecklist.ready = true`. Gọi lại trên Series đã xuất bản không đổi gì.",
      writeErrors("Series", {
        422: "`SERIES_NOT_PUBLISHABLE`: checklist chưa đạt (xem `publishChecklist` của Series)",
      })
    ),
  },
  [`${SERIES}/{id}/hide`]: {
    post: seriesAction(
      "hideSeries",
      "Ẩn Series",
      "Người nghe không còn thấy Series. Gọi lại trên Series đã ẩn không đổi gì.",
      writeErrors("Series", { 409: "`INVALID_STATE_TRANSITION`: Series còn `DRAFT` thì không ẩn được" })
    ),
  },
  [`${SERIES}/{id}/restore`]: {
    post: seriesAction(
      "restoreSeries",
      "Khôi phục Series từ thùng rác",
      "Khôi phục về trạng thái trước khi xoá. Series không ở thùng rác thì trả về nguyên trạng.",
      { 403: LOCKED, 404: notFound("Series") }
    ),
  },
  [`${SERIES}/{id}/episode-order`]: {
    put: operation({
      id: "reorderSeriesEpisodes",
      tag: SERIES_TAG,
      summary: "Sắp xếp thứ tự tập",
      description: "`episodeIds` phải gồm đủ mọi tập đang hoạt động, mỗi tập đúng một lần.",
      access: "studio",
      ...seriesParams,
      body: {
        name: "EpisodeOrder",
        schema: EpisodeOrderSchema,
        example: {
          episodeIds: ["3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10"],
          baseUpdatedAt: "2026-10-08T10:00:00.000Z",
        },
      },
      ok: {
        status: 200,
        description: "Danh sách tập theo thứ tự mới (cùng kiểu với `episodes` của Series)",
        schema: { name: "SeriesEpisodeList", schema: SeriesEpisodeListSchema },
      },
      rate: "write",
      errors: writeErrors("Series", {
        409: STALE,
        422: "`EPISODE_ORDER_MISMATCH`: danh sách thiếu, thừa hoặc lặp tập",
      }),
    }),
  },
  [`${SERIES}/{seriesId}/episodes`]: {
    post: operation({
      id: "createEpisode",
      tag: EPISODE_TAG,
      summary: "Tạo tập nháp",
      description: "Thêm vào cuối Series. Slug tự sinh từ tiêu đề nếu không truyền.",
      access: "studio",
      pathParams: SeriesIdParamSchema,
      pathParamDocs: { seriesId: "ID Series chứa tập (UUID)" },
      body: { name: "CreateEpisode", schema: CreateEpisodeSchema, example: { title: "Tập 1: Hội nghị Bình Than" } },
      ok: { status: 201, description: "Workspace tập vừa tạo", schema: workspace, location: `${EPISODES}/{id}` },
      idempotent: true,
      rate: "write",
      errors: writeErrors("Series"),
    }),
  },

  [`${EPISODES}/{id}`]: {
    get: operation({
      id: "getEpisodeWorkspace",
      tag: EPISODE_TAG,
      summary: "Workspace tập",
      description: "Mọi thứ cần để biên tập một tập: bản kể, thẻ thực thể và `publishChecklist`. Nguồn thuộc Series, xem `GET /api/studio/series/{id}/sources`.",
      access: "studio",
      ...episodeParams,
      ok: { status: 200, description: "Workspace tập", schema: workspace },
      errors: { 404: notFound("tập") },
    }),
    patch: operation({
      id: "updateEpisode",
      tag: EPISODE_TAG,
      summary: "Sửa thông tin tập",
      description: "Gửi `baseUpdatedAt` (từ `updatedAt` của lần đọc gần nhất) để phát hiện ghi đè.",
      access: "studio",
      ...episodeParams,
      body: {
        name: "PatchEpisode",
        schema: PatchEpisodeSchema,
        example: { title: "Tập 1: Hội nghị Diên Hồng", baseUpdatedAt: "2026-10-08T10:00:00.000Z" },
      },
      ok: { status: 200, description: "Workspace sau khi sửa", schema: workspace },
      rate: "write",
      errors: writeErrors("tập", {
        409: `${STALE}; \`SLUG_LOCKED\`: chỉ tập \`DRAFT\` mới đổi được slug; \`SLUG_CONFLICT\`: không cấp được slug duy nhất`,
      }),
    }),
    delete: operation({
      id: "deleteEpisode",
      tag: EPISODE_TAG,
      summary: "Đưa tập vào thùng rác",
      description: "Xoá mềm. Gọi lại trên tập đã ở thùng rác vẫn trả 204. Khôi phục bằng `POST .../restore`.",
      access: "studio",
      ...episodeParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("tập"),
    }),
  },
  [`${EPISODES}/{id}/publish`]: {
    post: episodeAction(
      "publishEpisode",
      "Xuất bản tập",
      "Chỉ thành công khi `publishChecklist.ready = true`. Gọi lại trên tập đã xuất bản không đổi gì.",
      writeErrors("tập", {
        422: "`EPISODE_NOT_PUBLISHABLE`: thiếu thông tin cơ bản, kịch bản hoặc audio ngôi thứ ba",
      })
    ),
  },
  [`${EPISODES}/{id}/hide`]: {
    post: episodeAction(
      "hideEpisode",
      "Ẩn tập",
      "Gọi lại trên tập đã ẩn không đổi gì.",
      writeErrors("tập", { 409: "`INVALID_STATE_TRANSITION`: tập còn `DRAFT` thì không ẩn được" })
    ),
  },
  [`${EPISODES}/{id}/restore`]: {
    post: episodeAction(
      "restoreEpisode",
      "Khôi phục tập từ thùng rác",
      "Series cha không được ở thùng rác.",
      {
        403: LOCKED,
        404: notFound("tập"),
        409: "`PARENT_IN_TRASH`: khôi phục Series cha trước",
      }
    ),
  },

  [`${EPISODES}/{id}/narrations/{type}`]: {
    get: operation({
      id: "getNarration",
      tag: EPISODE_TAG,
      summary: "Đọc bản kể",
      description: "Gồm kịch bản, audio đang gắn, thời lượng ước tính và cảnh báo (kịch bản sửa sau audio, lệch thời lượng).",
      access: "studio",
      ...narrationParams,
      ok: { status: 200, description: "Bản kể", schema: narration },
      errors: { 404: `${notFound("tập")}; hoặc tập chưa có bản kể loại này` },
    }),
    put: operation({
      id: "putNarration",
      tag: EPISODE_TAG,
      summary: "Lưu kịch bản bản kể",
      description:
        "Tạo hoặc thay kịch bản. Kịch bản là văn bản thuần (không HTML), tối đa theo cấu hình `script.max_chars`. Bản `FIRST_PERSON` bắt buộc có `narratorEntityId` là nhân vật lịch sử (`FIGURE`).",
      access: "studio",
      ...narrationParams,
      body: {
        name: "PutNarration",
        schema: PutNarrationSchema,
        example: { scriptContent: "Năm 1288, quân Nguyên kéo vào sông Bạch Đằng...", baseUpdatedAt: "2026-10-08T10:00:00.000Z" },
      },
      ok: { status: 200, description: "Bản kể đã lưu", schema: narration },
      rate: "write",
      errors: writeErrors("tập", {
        409: `${STALE}; \`REQUIRED_FOR_PUBLISHED\`: không được để trống kịch bản ngôi thứ ba của tập đã xuất bản`,
        422: "`VALIDATION_ERROR`: kịch bản chứa HTML hoặc quá dài; bản ngôi thứ nhất thiếu `narratorEntityId` hoặc nhân vật dẫn không phải `FIGURE`",
      }),
    }),
  },
  [`${EPISODES}/{id}/narrations/FIRST_PERSON`]: {
    delete: operation({
      id: "deleteFirstPersonNarration",
      tag: EPISODE_TAG,
      summary: "Gỡ bản kể ngôi thứ nhất",
      description: "Chỉ bản `FIRST_PERSON` gỡ được (đường dẫn cố định); bản ngôi thứ ba là bắt buộc. Trả 204 kể cả khi tập chưa có bản này.",
      access: "studio",
      ...episodeParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("tập"),
    }),
  },
  [`${EPISODES}/{id}/narrations/{type}/audio`]: {
    put: operation({
      id: "attachNarrationAudio",
      tag: EPISODE_TAG,
      summary: "Gắn hoặc thay audio",
      description:
        "Gắn media `AUDIO` đã `READY` (xem `POST /api/studio/media-assets/{id}/verify`). Thay audio của tập đang xuất bản cần `confirmReplacePublished = true`.",
      access: "studio",
      ...narrationParams,
      body: {
        name: "AttachAudio",
        schema: AttachAudioSchema,
        example: { assetId: "3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10" },
      },
      ok: { status: 200, description: "Bản kể với audio mới", schema: narration },
      rate: "write",
      errors: writeErrors("tập", {
        409: "`ASSET_IN_USE`: audio đang gắn vào bản kể khác; `REPLACE_CONFIRMATION_REQUIRED`: cần `confirmReplacePublished` khi thay audio của tập đã xuất bản",
        422: "`VALIDATION_ERROR`: audio không tồn tại, chưa `READY`, không phải audio hoặc không do bạn upload",
      }),
    }),
    delete: operation({
      id: "detachNarrationAudio",
      tag: EPISODE_TAG,
      summary: "Gỡ audio",
      access: "studio",
      ...narrationParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("tập", {
        409: "`REQUIRED_FOR_PUBLISHED`: tập đã xuất bản bắt buộc có audio ngôi thứ ba",
      }),
    }),
  },

  [`${SERIES}/{id}/sources`]: {
    get: operation({
      id: "listSeriesSources",
      tag: SERIES_TAG,
      summary: "Nguồn của Series",
      description: "Trích dẫn thuộc Series, dùng chung cho mọi tập. Mỗi nguồn kèm `fileUrl` nếu có PDF đã upload.",
      access: "studio",
      ...seriesParams,
      ok: { status: 200, description: "Danh sách trích dẫn theo thứ tự", schema: seriesSourceList },
      errors: { 404: notFound("Series") },
    }),
    post: operation({
      id: "addSeriesSource",
      tag: SERIES_TAG,
      summary: "Gắn nguồn vào Series",
      description: "`locator` là vị trí trích (trang, chương). Cùng nguồn có thể trích nhiều lần ở các `locator` khác nhau. Một nguồn gắn được cho nhiều Series.",
      access: "studio",
      ...seriesParams,
      body: {
        name: "CreateSeriesSource",
        schema: CreateSeriesSourceSchema,
        example: { sourceId: "3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10", locator: "Quyển V, tr. 120" },
      },
      ok: { status: 201, description: "Trích dẫn đã gắn", schema: seriesSource, location: `${SERIES}/{id}/sources/{childId}` },
      idempotent: true,
      rate: "write",
      errors: writeErrors("Series", { 409: "`SERIES_SOURCE_DUPLICATE`: nguồn đã gắn ở cùng `locator`" }),
    }),
  },
  [`${SERIES}/{id}/sources/order`]: {
    put: operation({
      id: "reorderSeriesSources",
      tag: SERIES_TAG,
      summary: "Sắp xếp thứ tự nguồn",
      description: "`seriesSourceIds` phải gồm đủ mọi trích dẫn của Series, mỗi trích dẫn đúng một lần. Đường dẫn cố định `order`, không phải `{childId}`.",
      access: "studio",
      ...seriesParams,
      body: {
        name: "SeriesSourceOrder",
        schema: SeriesSourceOrderSchema,
        example: { seriesSourceIds: ["3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10"] },
      },
      ok: { status: 200, description: "Danh sách theo thứ tự mới", schema: seriesSourceList },
      rate: "write",
      errors: writeErrors("Series", {
        422: "`SERIES_SOURCE_ORDER_MISMATCH`: danh sách thiếu, thừa hoặc lặp trích dẫn",
      }),
    }),
  },
  [`${SERIES}/{id}/sources/{childId}`]: {
    patch: operation({
      id: "updateSeriesSource",
      tag: SERIES_TAG,
      summary: "Sửa trích dẫn",
      access: "studio",
      ...seriesChildParams,
      body: { name: "PatchSeriesSource", schema: PatchSeriesSourceSchema, example: { locator: "Quyển V, tr. 121" } },
      ok: { status: 200, description: "Trích dẫn đã sửa", schema: seriesSource },
      rate: "write",
      errors: writeErrors("Series hoặc trích dẫn"),
    }),
    delete: operation({
      id: "deleteSeriesSource",
      tag: SERIES_TAG,
      summary: "Gỡ trích dẫn",
      access: "studio",
      ...seriesChildParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("Series", {
        409: "`REQUIRED_FOR_PUBLISHED`: Series đã xuất bản phải còn ít nhất một nguồn",
      }),
    }),
  },

  [`${EPISODES}/{id}/entity-tags`]: {
    get: operation({
      id: "listEpisodeEntityTags",
      tag: EPISODE_TAG,
      summary: "Thẻ thực thể của tập",
      description: "Gồm thẻ AI gợi ý (`SUGGESTED`) chờ Moderator duyệt.",
      access: "studio",
      ...episodeParams,
      ok: { status: 200, description: "Danh sách thẻ", schema: { name: "EntityTagList", schema: ItemsOf(EntityTagSchema) } },
      errors: { 404: notFound("tập") },
    }),
    post: operation({
      id: "addEpisodeEntityTag",
      tag: EPISODE_TAG,
      summary: "Gắn thẻ thực thể",
      description: "Thêm hoặc cập nhật thẻ cho một thực thể. Luôn trả `200`, kể cả khi thẻ được tạo mới.",
      access: "studio",
      ...episodeParams,
      body: {
        name: "CreateEntityTag",
        schema: CreateEntityTagSchema,
        example: { entityId: "3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10" },
      },
      ok: { status: 200, description: "Thẻ đã gắn", schema: entityTag },
      idempotent: true,
      rate: "write",
      errors: writeErrors("tập"),
    }),
  },
  [`${EPISODES}/{id}/entity-tags/{childId}`]: {
    patch: operation({
      id: "reviewEpisodeEntityTag",
      tag: EPISODE_TAG,
      summary: "Duyệt hoặc từ chối thẻ",
      description: "Đổi `status` sang `CONFIRMED` hoặc `REJECTED`.",
      access: "studio",
      ...childParams,
      body: { name: "PatchEntityTag", schema: PatchEntityTagSchema, example: { status: "CONFIRMED" } },
      ok: { status: 200, description: "Thẻ đã cập nhật", schema: entityTag },
      rate: "write",
      errors: writeErrors("tập hoặc thẻ"),
    }),
    delete: operation({
      id: "deleteEpisodeEntityTag",
      tag: EPISODE_TAG,
      summary: "Gỡ thẻ",
      access: "studio",
      ...childParams,
      ok: NO_CONTENT,
      rate: "write",
      errors: writeErrors("tập"),
    }),
  },
};

