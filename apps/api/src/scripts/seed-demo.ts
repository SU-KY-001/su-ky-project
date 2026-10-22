import { prisma, type ContentStatus, type EpisodeReviewStatus, type ReleaseScheduleStatus } from "@repo/db";
import { v2 as cloudinary } from "cloudinary";

/**
 * Seeds demo data straight into the database for UI testing: covers (portrait + landscape),
 * audio, sources, series/episodes in every status, release schedules, assignments, reviews
 * and a pending reassignment ticket.
 *
 * Remote images/audio are ingested by Cloudinary from their public URLs, so every MediaAsset
 * is a real READY asset and the API builds working delivery URLs for it.
 * Idempotent: rows are found by slug/title/publicId and only missing ones are created.
 * Assignments go to existing moderator accounts; placeholder moderators (no login) are
 * added only when fewer than MIN_MODERATORS exist. Accounts, roles and passwords are never touched.
 *
 * Required env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Optional env: CLOUDINARY_FOLDER, SEED_PORTRAIT_URL_BASE, SEED_LANDSCAPE_URL_BASE, SEED_AUDIO_URL
 */
const DAY_MS = 86_400_000;
const MIN_MODERATORS = 2;
const UPLOAD_TIMEOUT_MS = 120_000;
const PORTRAIT_SIZE = "600/900";
const LANDSCAPE_SIZE = "1280/720";

const folder = process.env.CLOUDINARY_FOLDER || "su-ky";
const portraitBase = process.env.SEED_PORTRAIT_URL_BASE || "https://picsum.photos/seed";
const landscapeBase = process.env.SEED_LANDSCAPE_URL_BASE || "https://picsum.photos/seed";
const audioUrl = process.env.SEED_AUDIO_URL || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

type Kind = "AUDIO" | "IMAGE";

export interface IngestedAsset {
  version: number;
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
}

/** Fetches the remote file into storage and describes it; injected so tests never touch Cloudinary. */
export type Ingest = (kind: Kind, publicId: string, sourceUrl: string) => Promise<IngestedAsset>;

export const ingestWithCloudinary: Ingest = async (kind, publicId, sourceUrl) => {
  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
    timeout: UPLOAD_TIMEOUT_MS,
  });
  const isAudio = kind === "AUDIO";
  return cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    resource_type: isAudio ? "video" : "image",
    type: isAudio ? "authenticated" : "upload",
    overwrite: true,
    invalidate: true,
  });
};

async function ensureAsset(ingest: Ingest, kind: Kind, key: string, sourceUrl: string, uploadedById: string) {
  const publicId = `${folder}/seed/${key}`;
  const existing = await prisma.mediaAsset.findUnique({ where: { publicId } });
  if (existing?.status === "READY") return existing;
  const result = await ingest(kind, publicId, sourceUrl);
  const isAudio = kind === "AUDIO";
  const data = {
    kind,
    publicId,
    status: "READY" as const,
    version: BigInt(result.version),
    format: result.format,
    sizeBytes: BigInt(result.bytes),
    durationMs: typeof result.duration === "number" ? Math.round(result.duration * 1000) : null,
    widthPx: isAudio ? null : (result.width ?? null),
    heightPx: isAudio ? null : (result.height ?? null),
    uploadedById,
    verifiedAt: new Date(),
  };
  return prisma.mediaAsset.upsert({ where: { publicId }, create: data, update: data });
}

const SOURCES = [
  { tier: "TIER_1_CHINH_SU", title: "Đại Việt sử ký toàn thư", author: "Ngô Sĩ Liên", publisher: "Nhà xuất bản Khoa học xã hội", publicationYear: 1993, url: "https://vi.wikipedia.org/wiki/%C4%90%E1%BA%A1i_Vi%E1%BB%87t_s%E1%BB%AD_k%C3%BD_to%C3%A0n_th%C6%B0" },
  { tier: "TIER_2_KHAO_CO", title: "Khảo cổ học Việt Nam tập 1", author: "Hà Văn Tấn", publisher: "Nhà xuất bản Khoa học xã hội", publicationYear: 1998, url: "https://vi.wikipedia.org/wiki/Kh%E1%BA%A3o_c%E1%BB%95_h%E1%BB%8Dc_Vi%E1%BB%87t_Nam" },
  { tier: "TIER_3_KHOA_HOC", title: "Lịch sử Việt Nam từ nguồn gốc đến thế kỷ X", author: "Trần Quốc Vượng", publisher: "Nhà xuất bản Giáo dục", publicationYear: 2012, url: "https://vi.wikipedia.org/wiki/L%E1%BB%8Bch_s%E1%BB%AD_Vi%E1%BB%87t_Nam" },
  { tier: "TIER_4_DA_SU", title: "Việt Nam sử lược", author: "Trần Trọng Kim", publisher: "Nhà xuất bản Văn hóa Thông tin", publicationYear: 2005, url: "https://vi.wikipedia.org/wiki/Vi%E1%BB%87t_Nam_s%E1%BB%AD_l%C6%B0%E1%BB%A3c" },
  { tier: "TIER_1_CHINH_SU", title: "Khâm định Việt sử Thông giám cương mục", author: "Quốc sử quán triều Nguyễn", publisher: "Nhà xuất bản Giáo dục", publicationYear: 1998, url: "https://vi.wikipedia.org/wiki/Kh%C3%A2m_%C4%91%E1%BB%8Bnh_Vi%E1%BB%87t_s%E1%BB%AD_Th%C3%B4ng_gi%C3%A1m_c%C6%B0%C6%A1ng_m%E1%BB%A5c" },
  { tier: "TIER_3_KHOA_HOC", title: "Thăng Long - Hà Nội: mười thế kỷ đô thị hóa", author: "Nguyễn Văn Huy", publisher: "Nhà xuất bản Hà Nội", publicationYear: 2010, url: "https://vi.wikipedia.org/wiki/Th%C4%83ng_Long" },
] as const;

interface SeriesSeed {
  title: string;
  slug: string;
  description: string;
  startYear: number;
  endYear: number;
  status: ContentStatus;
  episodes: number;
}

// Published series get audio on every published episode; the last episode stays a draft.
export const SERIES: SeriesSeed[] = [
  { title: "Hùng Vương dựng nước", slug: "hung-vuong-dung-nuoc", description: "Hành trình từ các vua Hùng đến nhà nước Văn Lang.", startYear: -2879, endYear: -258, status: "PUBLISHED", episodes: 3 },
  { title: "Hai Bà Trưng khởi nghĩa", slug: "hai-ba-trung-khoi-nghia", description: "Cuộc khởi nghĩa chống ách đô hộ nhà Hán năm 40.", startYear: 40, endYear: 43, status: "PUBLISHED", episodes: 3 },
  { title: "Ngô Quyền và Bạch Đằng", slug: "ngo-quyen-va-bach-dang", description: "Chiến thắng Bạch Đằng năm 938 mở ra kỷ nguyên độc lập.", startYear: 938, endYear: 944, status: "PUBLISHED", episodes: 3 },
  { title: "Nhà Lý dời đô", slug: "nha-ly-doi-do", description: "Lý Công Uẩn dời đô ra Thăng Long năm 1010.", startYear: 1009, endYear: 1054, status: "DRAFT", episodes: 4 },
  { title: "Ba lần kháng chiến chống Mông - Nguyên", slug: "ba-lan-khang-chien-chong-mong-nguyen", description: "Trần Hưng Đạo và ba cuộc kháng chiến thế kỷ XIII.", startYear: 1258, endYear: 1288, status: "DRAFT", episodes: 4 },
  { title: "Khởi nghĩa Lam Sơn", slug: "khoi-nghia-lam-son", description: "Lê Lợi, Nguyễn Trãi và mười năm kháng Minh.", startYear: 1418, endYear: 1428, status: "DRAFT", episodes: 3 },
  { title: "Nhà Tây Sơn", slug: "nha-tay-son", description: "Từ Tây Sơn khởi binh đến chiến thắng Ngọc Hồi - Đống Đa.", startYear: 1771, endYear: 1802, status: "HIDDEN", episodes: 2 },
];

const scriptFor = (series: SeriesSeed, n: number): string =>
  [
    `${series.title} - Tập ${n}`,
    `Xin chào quý thính giả. Hôm nay chúng ta cùng tìm hiểu phần ${n} của câu chuyện "${series.title}".`,
    `${series.description} Đây là nội dung mẫu để kiểm tra giao diện soạn kịch bản và nghe thử.`,
    "Hẹn gặp lại các bạn trong tập tiếp theo.",
  ].join("\n\n");

interface Scenario {
  seriesIndex: number;
  episodeNumber: number;
  status: ReleaseScheduleStatus;
  dayOffset: number;
  assignee: number;
  review?: EpisodeReviewStatus;
  ticket?: boolean;
}

// Episode numbers refer to the draft episodes above; RELEASED/CANCELLED reuse any episode.
export const SCENARIOS: Scenario[] = [
  { seriesIndex: 3, episodeNumber: 1, status: "SCHEDULED", dayOffset: 3, assignee: 0 },
  { seriesIndex: 3, episodeNumber: 2, status: "READY_TO_PUBLISH", dayOffset: 1, assignee: 0, review: "APPROVED" },
  { seriesIndex: 4, episodeNumber: 1, status: "BLOCKED", dayOffset: 2, assignee: 1, review: "CHANGES_REQUESTED" },
  { seriesIndex: 4, episodeNumber: 2, status: "SCHEDULED", dayOffset: 5, assignee: 0, review: "IN_REVIEW", ticket: true },
  { seriesIndex: 5, episodeNumber: 1, status: "SCHEDULED", dayOffset: 7, assignee: 1 },
  { seriesIndex: 5, episodeNumber: 2, status: "CANCELLED", dayOffset: 4, assignee: 0 },
  { seriesIndex: 0, episodeNumber: 1, status: "RELEASED", dayOffset: -6, assignee: 1, review: "APPROVED" },
];

async function pickActors() {
  const real = await prisma.user.findMany({ where: { role: { in: ["moderator", "admin"] } }, orderBy: { createdAt: "asc" } });
  if (real.length === 0) throw new Error("No moderator/admin account found; sign up and promote one first");
  const moderators = real.filter((user) => user.role === "moderator");
  for (let n = moderators.length + 1; moderators.length < MIN_MODERATORS; n++) {
    const demo = await prisma.user.upsert({
      where: { email: `demo-mod-${n}@suky.local` },
      create: { id: `demo-mod-${n}`, name: `Moderator mẫu ${n}`, email: `demo-mod-${n}@suky.local`, emailVerified: true, role: "moderator" },
      update: {},
    });
    moderators.push(demo);
  }
  return { owner: moderators[0]!, creator: real.find((user) => user.role === "admin") ?? moderators[0]!, moderators };
}

async function seedSources(createdById: string) {
  const sources = [];
  for (const { url, ...source } of SOURCES) {
    const existing = await prisma.source.findFirst({ where: { title: source.title } });
    sources.push(
      existing ??
        (await prisma.source.create({
          data: { ...source, url, createdById, verificationStatus: "VERIFIED", verifiedVersion: 1, verifiedAt: new Date(), verifiedById: createdById },
        })),
    );
  }
  return sources;
}

export async function seedDemo(ingest: Ingest) {
  const { owner, creator, moderators } = await pickActors();
  const topic = await prisma.topic.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const phases = await prisma.historicalPhase.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } });
  if (!topic || phases.length === 0) throw new Error("Catalog has no topic or historical phase; run `bun run db:seed` first");

  const sources = await seedSources(owner.id);
  const counts = { series: 0, episodes: 0, assets: 0, schedules: 0 };
  const draftEpisodes = new Map<string, { id: string; title: string; published: boolean }>();

  for (const [index, seed] of SERIES.entries()) {
    const slugKey = seed.slug;
    const portrait = await ensureAsset(ingest, "IMAGE", `${slugKey}-portrait`, `${portraitBase}/${slugKey}/${PORTRAIT_SIZE}`, owner.id);
    const landscape = await ensureAsset(ingest, "IMAGE", `${slugKey}-landscape`, `${landscapeBase}/${slugKey}-wide/${LANDSCAPE_SIZE}`, owner.id);
    counts.assets += 2;

    // Slug is the identity: earlier seed-content runs left same-titled series with random slugs that we must not adopt.
    const existing = await prisma.series.findUnique({ where: { slug: seed.slug } });
    const isPublished = seed.status === "PUBLISHED";
    const series =
      existing ??
      (await prisma.series.create({
        data: {
          ownerId: owner.id,
          topicId: topic.id,
          historicalPhaseId: phases[index % phases.length]!.id,
          title: seed.title,
          slug: seed.slug,
          description: seed.description,
          startYear: seed.startYear,
          endYear: seed.endYear,
          status: seed.status,
          publishedAt: isPublished ? new Date(Date.now() - (index + 1) * DAY_MS) : null,
        },
      }));
    if (!existing) counts.series++;
    const publishedAt = isPublished ? (existing?.publishedAt ?? new Date(Date.now() - (index + 1) * DAY_MS)) : null;
    await prisma.series.update({
      where: { id: series.id },
      data: {
        status: seed.status,
        publishedAt,
        coverImageAssetId: series.coverImageAssetId ?? portrait.id,
        coverLandscapeAssetId: series.coverLandscapeAssetId ?? landscape.id,
      },
    });
    for (const [order, source] of [sources[index % sources.length]!, sources[(index + 1) % sources.length]!].entries()) {
      await prisma.seriesSource.upsert({
        where: { seriesId_sourceId_locator: { seriesId: series.id, sourceId: source.id, locator: "" } },
        create: { seriesId: series.id, sourceId: source.id, sortOrder: order + 1 },
        update: {},
      });
    }

    for (let n = 1; n <= seed.episodes; n++) {
      const title = `${seed.title} - Tập ${n}`;
      const episodePublished = isPublished && n < seed.episodes;
      const episodeStatus: ContentStatus = episodePublished ? "PUBLISHED" : seed.status === "HIDDEN" ? "HIDDEN" : "DRAFT";
      const found = await prisma.episode.findFirst({ where: { seriesId: series.id, title } });
      const episodeData = { status: episodeStatus, publishedAt: episodePublished ? (found?.publishedAt ?? publishedAt) : null };
      const episode = found
        ? await prisma.episode.update({ where: { id: found.id }, data: episodeData })
        : await prisma.episode.create({
            data: { seriesId: series.id, title, slug: `${series.slug}-tap-${n}`, description: `Tập ${n} của series ${seed.title}.`, sortOrder: n, ...episodeData },
          });
      if (!found) counts.episodes++;
      draftEpisodes.set(`${index}:${n}`, { id: episode.id, title, published: episodePublished });

      const narration = await prisma.episodeNarration.findUnique({
        where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } },
      });
      const audio = episodePublished && !narration?.audioAssetId ? await ensureAsset(ingest, "AUDIO", `${slugKey}-tap-${n}`, audioUrl, owner.id) : null;
      if (audio) counts.assets++;
      if (!narration || audio) {
        await prisma.episodeNarration.upsert({
          where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } },
          create: { episodeId: episode.id, narrationType: "THIRD_PERSON", scriptContent: scriptFor(seed, n), scriptUpdatedAt: new Date(), audioAssetId: audio?.id, audioAttachedAt: audio ? new Date() : null },
          update: { audioAssetId: audio?.id, audioAttachedAt: new Date() },
        });
      }
    }
  }

  for (const scenario of SCENARIOS) {
    const episode = draftEpisodes.get(`${scenario.seriesIndex}:${scenario.episodeNumber}`);
    if (!episode) throw new Error(`Scenario refers to a missing episode ${scenario.seriesIndex}:${scenario.episodeNumber}`);
    const title = `Phát hành: ${episode.title}`;
    const scheduledAt = new Date(Date.now() + scenario.dayOffset * DAY_MS);
    // A schedule allows one active assignee (partial unique index), so each scenario has exactly one.
    const assignee = moderators[scenario.assignee % moderators.length]!;
    let schedule = await prisma.releaseSchedule.findFirst({ where: { title } });
    if (!schedule) {
      schedule = await prisma.releaseSchedule.create({
        data: {
          episodeId: episode.id,
          title,
          scheduledAt,
          productionDeadline: new Date(scheduledAt.getTime() - DAY_MS),
          status: scenario.status,
          createdById: creator.id,
          publishedAt: scenario.status === "RELEASED" ? scheduledAt : null,
          cancelledAt: scenario.status === "CANCELLED" ? new Date() : null,
        },
      });
      counts.schedules++;
    }
    if (!(await prisma.productionAssignment.findFirst({ where: { scheduleId: schedule.id, removedAt: null } }))) {
      await prisma.productionAssignment.create({ data: { scheduleId: schedule.id, moderatorId: assignee.id, assignedById: creator.id } });
    }
    if (scenario.review && !(await prisma.episodeReview.findFirst({ where: { episodeId: episode.id, revision: 1 } }))) {
      const reviewed = scenario.review !== "IN_REVIEW";
      await prisma.episodeReview.create({
        data: {
          scheduleId: schedule.id,
          episodeId: episode.id,
          revision: 1,
          status: scenario.review,
          submittedById: assignee.id,
          reviewedById: reviewed ? creator.id : null,
          reviewedAt: reviewed ? new Date() : null,
          reviewNote: scenario.review === "CHANGES_REQUESTED" ? "Cần chỉnh lại phần mở đầu và bổ sung nguồn." : null,
        },
      });
    }
    if (scenario.ticket && !(await prisma.releaseReassignmentTicket.findFirst({ where: { scheduleId: schedule.id, status: "PENDING" } }))) {
      await prisma.releaseReassignmentTicket.create({
        data: {
          scheduleId: schedule.id,
          requestedById: assignee.id,
          reason: "Trùng lịch với đợt thu âm khác, đề nghị chuyển người phụ trách.",
          replacementModeratorId: moderators[(scenario.assignee + 1) % moderators.length]!.id,
        },
      });
    }
  }

  return counts;
}

if (import.meta.main) {
  try {
    const counts = await seedDemo(ingestWithCloudinary);
    console.log(`Demo seed done: ${counts.series} series, ${counts.episodes} episodes, ${counts.schedules} release schedules created; ${counts.assets} asset checks (existing READY assets are reused).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
