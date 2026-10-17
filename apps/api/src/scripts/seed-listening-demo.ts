import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { prisma } from "@repo/db";

const AUDIO_PUBLIC_ID = "su-ky/demo/radio-vietnam-1974";
const AUDIO_SOURCE_URL = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Radio_Vietnam_(Ti%E1%BA%BFng_n%C3%B3i_n%C6%B0%E1%BB%9Bc_Vi%E1%BB%87t_Nam)_from_Saigon,_Republic_of_Vietnam_(VNCH)_circa_1974.ogg";
const SERIES_SLUG = "am-thanh-tu-lieu-radio-viet-nam-1974";
const EPISODE_SLUG = "tin-hieu-phat-thanh-sai-gon-1974";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function ensureCloudinaryAudio(): Promise<UploadApiResponse> {
  cloudinary.config({
    cloud_name: required("CLOUDINARY_CLOUD_NAME"),
    api_key: required("CLOUDINARY_API_KEY"),
    api_secret: required("CLOUDINARY_API_SECRET"),
    secure: true,
  });

  try {
    return await cloudinary.api.resource(AUDIO_PUBLIC_ID, {
      resource_type: "video",
      type: "authenticated",
      media_metadata: true,
    }) as UploadApiResponse;
  } catch (error: unknown) {
    const directStatus = typeof error === "object" && error && "http_code" in error ? error.http_code : undefined;
    const nested = typeof error === "object" && error && "error" in error ? error.error : undefined;
    const nestedStatus = typeof nested === "object" && nested && "http_code" in nested ? nested.http_code : undefined;
    if (directStatus !== 404 && nestedStatus !== 404) throw error;
  }

  return cloudinary.uploader.upload(AUDIO_SOURCE_URL, {
    public_id: AUDIO_PUBLIC_ID,
    resource_type: "video",
    type: "authenticated",
    overwrite: false,
  });
}

async function main(): Promise<void> {
  const [admin, topic, phase, storedAudio] = await Promise.all([
    prisma.user.findFirst({ where: { role: { contains: "admin" }, banned: false }, orderBy: { createdAt: "asc" } }),
    prisma.topic.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.historicalPhase.findFirst({ orderBy: { startYear: "desc" } }),
    ensureCloudinaryAudio(),
  ]);
  if (!admin) throw new Error("No active admin account found; run `bun run db:seed` first");
  if (!topic || !phase) throw new Error("Historical catalog is empty; run `bun run db:seed` first");

  const durationMs = Math.max(1_000, Math.round((storedAudio.duration ?? 85) * 1_000));
  const audioAsset = await prisma.mediaAsset.upsert({
    where: { publicId: AUDIO_PUBLIC_ID },
    create: {
      kind: "AUDIO",
      publicId: AUDIO_PUBLIC_ID,
      status: "READY",
      version: BigInt(storedAudio.version),
      format: storedAudio.format ?? "ogg",
      sizeBytes: BigInt(storedAudio.bytes),
      durationMs,
      uploadedById: admin.id,
      verifiedAt: new Date(),
    },
    update: {
      status: "READY",
      version: BigInt(storedAudio.version),
      format: storedAudio.format ?? "ogg",
      sizeBytes: BigInt(storedAudio.bytes),
      durationMs,
      verifiedAt: new Date(),
      deletedAt: null,
      detachedAt: null,
    },
  });

  const series = await prisma.series.upsert({
    where: { slug: SERIES_SLUG },
    create: {
      ownerId: admin.id,
      topicId: topic.id,
      historicalPhaseId: phase.id,
      title: "Âm thanh tư liệu: Radio Việt Nam 1974",
      slug: SERIES_SLUG,
      description: "Bản thu phát thanh lưu trữ năm 1974 dùng để trải nghiệm luồng nghe, lưu tiến trình và khảo hạch của Sử Ký.",
      startYear: 1974,
      endYear: 1974,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: { status: "PUBLISHED", publishedAt: new Date(), deletedAt: null },
  });

  const episode = await prisma.episode.upsert({
    where: { slug: EPISODE_SLUG },
    create: {
      seriesId: series.id,
      title: "Tín hiệu phát thanh Sài Gòn năm 1974",
      slug: EPISODE_SLUG,
      description: "Tư liệu âm thanh lưu trữ của Radio Vietnam năm 1974. Audio mẫu thuộc phạm vi công cộng theo trang nguồn Wikimedia Commons.",
      sortOrder: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: { status: "PUBLISHED", publishedAt: new Date(), deletedAt: null },
  });

  await prisma.episodeNarration.upsert({
    where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } },
    create: {
      episodeId: episode.id,
      narrationType: "THIRD_PERSON",
      scriptContent: "Bản ghi âm tư liệu Radio Vietnam từ Sài Gòn năm 1974.",
      audioAssetId: audioAsset.id,
      scriptUpdatedAt: new Date(),
      audioAttachedAt: new Date(),
    },
    update: { audioAssetId: audioAsset.id, audioAttachedAt: new Date() },
  });

  let source = await prisma.source.findFirst({ where: { url: AUDIO_SOURCE_URL } });
  source ??= await prisma.source.create({
    data: {
      tier: "TIER_1_CHINH_SU",
      title: "Radio Vietnam (Tiếng nói nước Việt Nam) from Saigon, circa 1974",
      author: "Radio Vietnam; bản ghi của Rudy van Dalen",
      url: AUDIO_SOURCE_URL,
      createdById: admin.id,
      verificationStatus: "VERIFIED",
      verifiedVersion: 1,
      verifiedById: admin.id,
      verifiedAt: new Date(),
    },
  });
  await prisma.seriesSource.upsert({
    where: { seriesId_sourceId_locator: { seriesId: series.id, sourceId: source.id, locator: "Bản ghi âm 1 phút 25 giây" } },
    create: { seriesId: series.id, sourceId: source.id, locator: "Bản ghi âm 1 phút 25 giây", sortOrder: 1 },
    update: {},
  });

  const quiz = await prisma.quiz.upsert({
    where: { episodeId: episode.id },
    create: { episodeId: episode.id, passScorePercent: 50 },
    update: {},
  });
  if (await prisma.quizQuestion.count({ where: { quizId: quiz.id } }) === 0) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionText: "Bản ghi tư liệu trong tập được phát vào thập niên nào?",
        explanation: "Tư liệu được ghi vào năm 1974.",
        sortOrder: 1,
        options: {
          create: [
            { optionLabel: "A", optionText: "Thập niên 1950", isCorrect: false },
            { optionLabel: "B", optionText: "Thập niên 1970", isCorrect: true },
            { optionLabel: "C", optionText: "Thập niên 1990", isCorrect: false },
            { optionLabel: "D", optionText: "Thập niên 2010", isCorrect: false },
          ],
        },
      },
    });
  }
  const demoQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: quiz.id },
    orderBy: { sortOrder: "asc" },
  });
  if (demoQuestion) {
    await prisma.quizOption.upsert({
      where: {
        questionId_optionLabel: {
          questionId: demoQuestion.id,
          optionLabel: "D",
        },
      },
      create: {
        questionId: demoQuestion.id,
        optionLabel: "D",
        optionText: "Thập niên 2010",
        isCorrect: false,
      },
      update: {
        optionText: "Thập niên 2010",
        isCorrect: false,
      },
    });
  }

  console.log(JSON.stringify({ series: series.slug, episode: episode.slug, durationMs, audioPublicId: AUDIO_PUBLIC_ID }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
