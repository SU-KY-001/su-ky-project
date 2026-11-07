export {};

/**
 * Seeds sample sources, series and episodes through the public HTTP API as an
 * EXISTING moderator account. It never creates accounts or touches roles/passwords.
 *
 * Convergent: every run reads current state and creates only what is missing
 * (series, each episode by title, each narration), so a run that failed half way
 * is completed by the next one.
 *
 * Required env: SEED_MOD_EMAIL, SEED_MOD_PASSWORD, SEED_SOURCE_URL_BASE
 * Optional env: SEED_API_URL (defaults to BETTER_AUTH_URL), CORS_ORIGIN (first origin is sent as Origin)
 */
const REQUEST_TIMEOUT_MS = 15_000;
const LIST_PAGE_SIZE = 50;
const EPISODES_PER_SERIES = 3;
const HTTP_NOT_FOUND = 404;

type Json = Record<string, unknown>;
interface IdItem {
  id: string;
  title: string;
}

class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

const apiUrl = (process.env.SEED_API_URL || requireEnv("BETTER_AUTH_URL")).replace(/\/$/, "");
const origin = (process.env.CORS_ORIGIN ?? "").split(",")[0]?.trim() || apiUrl;

let token = "";

async function request<T>(method: string, path: string, body?: Json): Promise<{ data: T; headers: Headers }> {
  const response = await fetch(apiUrl + path, {
    method,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "GET" ? {} : { "Idempotency-Key": crypto.randomUUID() }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new ApiRequestError(response.status, `${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return { data: (text ? JSON.parse(text) : null) as T, headers: response.headers };
}

async function signIn(): Promise<void> {
  const { headers } = await request("POST", "/api/auth/sign-in/email", {
    email: requireEnv("SEED_MOD_EMAIL"),
    password: requireEnv("SEED_MOD_PASSWORD"),
  });
  const bearer = headers.get("set-auth-token");
  if (!bearer) throw new Error("Sign-in succeeded but the API returned no set-auth-token header");
  token = bearer;
  const { data } = await request<{ user: { email: string; role: string } }>("GET", "/api/me");
  if (data.user.role !== "moderator" && data.user.role !== "admin") {
    throw new Error(`Account ${data.user.email} has role "${data.user.role}"; a moderator or admin account is required`);
  }
}

const SOURCES = [
  { slug: "dai-viet-su-ky-toan-thu", tier: "TIER_1_CHINH_SU", title: "Đại Việt sử ký toàn thư", author: "Ngô Sĩ Liên", publisher: "Nhà xuất bản Khoa học xã hội", publicationYear: 1993 },
  { slug: "khao-co-hoc-viet-nam-1", tier: "TIER_2_KHAO_CO", title: "Khảo cổ học Việt Nam tập 1", author: "Hà Văn Tấn", publisher: "Nhà xuất bản Khoa học xã hội", publicationYear: 1998 },
  { slug: "lich-su-viet-nam-nguon-goc", tier: "TIER_3_KHOA_HOC", title: "Lịch sử Việt Nam từ nguồn gốc đến thế kỷ X", author: "Trần Quốc Vượng", publisher: "Nhà xuất bản Giáo dục", publicationYear: 2012 },
  { slug: "viet-nam-su-luoc", tier: "TIER_4_DA_SU", title: "Việt Nam sử lược", author: "Trần Trọng Kim", publisher: "Nhà xuất bản Văn hóa Thông tin", publicationYear: 2005 },
];

const SERIES = [
  { title: "Hùng Vương dựng nước", description: "Hành trình từ các vua Hùng đến nhà nước Văn Lang.", startYear: -2879, endYear: -258 },
  { title: "Hai Bà Trưng khởi nghĩa", description: "Cuộc khởi nghĩa chống ách đô hộ nhà Hán năm 40.", startYear: 40, endYear: 43 },
  { title: "Ngô Quyền và Bạch Đằng", description: "Chiến thắng Bạch Đằng năm 938 mở ra kỷ nguyên độc lập.", startYear: 938, endYear: 944 },
  { title: "Nhà Lý dời đô", description: "Lý Công Uẩn dời đô ra Thăng Long năm 1010.", startYear: 1009, endYear: 1054 },
];

async function listItems(path: string): Promise<IdItem[]> {
  const items: IdItem[] = [];
  for (let page = 1; ; page++) {
    const { data } = await request<{ items: IdItem[]; total: number }>("GET", `${path}?page=${page}&limit=${LIST_PAGE_SIZE}`);
    items.push(...data.items);
    if (page * LIST_PAGE_SIZE >= data.total) return items;
  }
}

async function hasNarration(episodeId: string): Promise<boolean> {
  try {
    const { data } = await request<{ scriptContent?: string | null }>("GET", `/api/studio/episodes/${episodeId}/narrations/THIRD_PERSON`);
    return Boolean(data?.scriptContent);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === HTTP_NOT_FOUND) return false;
    throw error;
  }
}

async function main(): Promise<void> {
  await signIn();
  const sourceUrlBase = requireEnv("SEED_SOURCE_URL_BASE").replace(/\/$/, "");

  const [{ data: topics }, { data: periods }] = await Promise.all([
    request<{ items: IdItem[] }>("GET", "/api/topics"),
    request<{ items: { phases: IdItem[] }[] }>("GET", "/api/historical-periods"),
  ]);
  const topicId = topics.items[0]?.id;
  const phases = periods.items.flatMap((period) => period.phases);
  if (!topicId || phases.length === 0) throw new Error("Catalog has no topic or historical phase; run `bun run db:seed` first");

  const sourceTitles = new Set((await listItems("/api/studio/sources")).map((source) => source.title));
  let createdSources = 0;
  for (const { slug, ...source } of SOURCES) {
    if (sourceTitles.has(source.title)) continue;
    await request("POST", "/api/studio/sources", { ...source, url: `${sourceUrlBase}/${slug}` });
    createdSources++;
  }

  const seriesIdByTitle = new Map((await listItems("/api/studio/series")).map((series) => [series.title, series.id]));
  let createdSeries = 0;
  let createdEpisodes = 0;
  let createdNarrations = 0;
  for (const [index, series] of SERIES.entries()) {
    let seriesId = seriesIdByTitle.get(series.title);
    if (!seriesId) {
      const { data } = await request<{ id: string }>("POST", "/api/studio/series", {
        ...series,
        topicId,
        historicalPhaseId: phases[index % phases.length]!.id,
      });
      seriesId = data.id;
      createdSeries++;
    }

    const { data: detail } = await request<{ episodes?: IdItem[] }>("GET", `/api/studio/series/${seriesId}`);
    const episodeIdByTitle = new Map((detail.episodes ?? []).map((episode) => [episode.title, episode.id]));
    for (let n = 1; n <= EPISODES_PER_SERIES; n++) {
      const title = `${series.title} - Tập ${n}`;
      let episodeId = episodeIdByTitle.get(title);
      if (!episodeId) {
        const { data } = await request<{ id: string }>("POST", `/api/studio/series/${seriesId}/episodes`, { title });
        episodeId = data.id;
        await request("PATCH", `/api/studio/episodes/${episodeId}`, { description: `Tập ${n} của series ${series.title}.` });
        createdEpisodes++;
      }
      if (!(await hasNarration(episodeId))) {
        await request("PUT", `/api/studio/episodes/${episodeId}/narrations/THIRD_PERSON`, {
          scriptContent: `${title}\n\nNội dung mẫu để xem giao diện.`,
        });
        createdNarrations++;
      }
    }
  }

  console.log(
    `Seeded as ${requireEnv("SEED_MOD_EMAIL")}: created ${createdSources} sources, ${createdSeries} series, ${createdEpisodes} episodes, ${createdNarrations} narrations; everything else already present.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
