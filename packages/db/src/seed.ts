import { prisma } from "./client";

const DEFAULT_ADMIN_ID = "admin-default-id";
const DEFAULT_ADMIN_EMAIL = "admin@suky.vn";

const TOPICS = [
  { slug: "quan-su", name: "Quân sự & Chiến trận", sortOrder: 1 },
  { slug: "van-hoa", name: "Văn hóa & Tư tưởng", sortOrder: 2 },
  { slug: "nhan-vat", name: "Nhân vật & Giai thoại", sortOrder: 3 },
  { slug: "dung-nuoc", name: "Dựng nước & Nhà nước", sortOrder: 4 },
] as const;

const HISTORICAL_PERIODS = [
  ["van-lang-au-lac", "Văn Lang – Âu Lạc", -700, -179],
  ["bac-thuoc-lan-1", "Bắc thuộc lần thứ nhất", -179, 40],
  ["hai-ba-trung", "Khởi nghĩa Hai Bà Trưng", 40, 43],
  ["bac-thuoc-lan-2", "Bắc thuộc lần thứ hai", 43, 544],
  ["tien-ly-van-xuan", "Nhà Tiền Lý – Vạn Xuân", 544, 602],
  ["bac-thuoc-lan-3", "Bắc thuộc lần thứ ba", 602, 905],
  ["khuc-ngo", "Họ Khúc – Nhà Ngô", 905, 965],
  ["dinh-tien-le", "Nhà Đinh – Tiền Lê", 968, 1009],
  ["nha-ly", "Nhà Lý", 1009, 1225],
  ["nha-tran", "Nhà Trần", 1226, 1400],
  ["ho-thuoc-minh", "Nhà Hồ – Thuộc Minh", 1400, 1427],
  ["le-so", "Nhà Hậu Lê sơ", 1428, 1527],
  ["nam-bac-trieu-trinh-nguyen", "Nam – Bắc triều, Trịnh – Nguyễn", 1527, 1788],
  ["tay-son", "Nhà Tây Sơn", 1778, 1802],
  ["nha-nguyen", "Nhà Nguyễn độc lập", 1802, 1883],
  ["phap-thuoc", "Pháp thuộc", 1884, 1945],
] as const;

const SYSTEM_CONFIGS = [
  ["xp.episode_completion", 20, "XP awarded for completing an episode"],
  ["listening.completion_ratio", 0.9, "Played ratio required for completion"],
  ["listening.sync_interval_ms", 15000, "Client listening progress sync interval"],
  ["listening.max_playback_rate", 2, "Maximum credited playback rate"],
  ["listening.tolerance_intervals", 1, "Allowed progress sync tolerance"],
  ["media.audio.max_bytes", 52428800, "Maximum audio upload size"],
  ["media.audio.allowed_formats", ["mp3", "m4a", "ogg"], "Allowed audio formats"],
  ["media.audio.allowed_mime_types", ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"], "Allowed audio MIME types"],
  ["media.image.max_bytes", 5242880, "Maximum image upload size"],
  ["media.image.allowed_formats", ["jpg", "jpeg", "png", "webp"], "Allowed image formats"],
  ["media.image.allowed_mime_types", ["image/jpeg", "image/png", "image/webp"], "Allowed image MIME types"],
  ["media.upload_ticket_ttl_seconds", 3000, "Signed upload ticket lifetime"],
  ["media.cleanup_grace_hours", 24, "Unused media cleanup grace period"],
  ["media.cleanup_batch_size", 100, "Media cleanup batch size"],
  ["script.words_per_minute", 150, "Narration duration estimate rate"],
  ["narration.duration_mismatch_ratio", 0.3, "Script and audio duration warning threshold"],
  ["slug.max_length", 80, "Maximum generated slug length"],
  ["slug.max_attempts", 5, "Maximum unique slug attempts"],
  ["search.similar_candidate_limit", 5, "Maximum similar catalog candidates"],
  ["idempotency.ttl_hours", 24, "Idempotency response retention"],
  ["idempotency.lock_timeout_seconds", 60, "Abandoned request lock timeout"],
  ["rate_limit.write", { limit: 120, windowSeconds: 60 }, "General write rate limit"],
  ["rate_limit.media_upload", { limit: 30, windowSeconds: 3600 }, "Media upload rate limit"],
  ["rate_limit.listening_progress", { limit: 20, windowSeconds: 60 }, "Listening progress rate limit"],
  ["rate_limit.ai_import", { limit: 10, windowSeconds: 3600 }, "AI import rate limit"],
  ["import.transaction_timeout_ms", 15000, "AI import transaction timeout"],
] as const;

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      id: DEFAULT_ADMIN_ID,
      name: "Su-Ky Administrator",
      email: adminEmail,
      emailVerified: true,
      role: "admin",
      banned: false,
    },
    update: {},
  });

  for (const topic of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      create: topic,
      update: { name: topic.name, sortOrder: topic.sortOrder },
    });
  }

  for (const [slug, name, startYear, endYear] of HISTORICAL_PERIODS) {
    const sortOrder = HISTORICAL_PERIODS.findIndex(([candidate]) => candidate === slug) + 1;
    await prisma.historicalPeriod.upsert({
      where: { slug },
      create: { slug, name, startYear, endYear, sortOrder },
      update: { name, startYear, endYear, sortOrder },
    });
  }

  for (const [key, value, description] of SYSTEM_CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, description },
      update: {},
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
