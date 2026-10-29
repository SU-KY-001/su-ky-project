import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { prisma } from "@repo/db";
import { VIETNAM_PODCAST_SEED } from "./vietnam-podcast-seed-data";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const audioPath = resolve(repositoryRoot, process.env.SEED_AUDIO_FILE ?? "data-seed/podcast_bb6ad694-ca94-4fdb-99e3-a2347af19d12.mp3");
const checkOnly = process.argv.includes("--check");
const resourceSchema = z.object({ public_id: z.string(), version: z.number().int().positive(), bytes: z.number().int().positive(), format: z.literal("mp3"), duration: z.number().positive() });

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Thiếu ${key}. Cấu hình Cloudinary trong .env trước khi seed audio.`);
  return value;
}

async function audioResource(publicId: string, expectedBytes: number): Promise<z.infer<typeof resourceSchema>> {
  let resource: unknown;
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: "video", type: "authenticated", media_metadata: true, timeout: 30000 });
  } catch (error) {
    const failure = typeof error === "object" && error && "error" in error ? error.error : error;
    if (!(typeof failure === "object" && failure && "http_code" in failure && failure.http_code === 404)) throw new Error("Không đọc được kho audio. Kiểm tra kết nối và cấu hình Cloudinary, rồi chạy lại seed.");
    try {
      resource = await cloudinary.uploader.upload(audioPath, { resource_type: "video", type: "authenticated", public_id: publicId, overwrite: false, unique_filename: false, timeout: 120000 });
    } catch {
      throw new Error("Không upload được MP3 lên Cloudinary. Kiểm tra kết nối và cấu hình, rồi chạy lại seed để tiếp tục.");
    }
  }
  const parsed = resourceSchema.safeParse(resource);
  if (!parsed.success || parsed.data.public_id !== publicId || parsed.data.bytes !== expectedBytes) throw new Error("Audio trên kho không khớp tệp MP3 hoặc thiếu thông tin thời lượng. Không gắn bản thu này vào tập.");
  return parsed.data;
}

async function main(): Promise<void> {
  const file = await stat(audioPath).catch(() => null);
  if (!file?.isFile() || file.size === 0 || !audioPath.toLowerCase().endsWith(".mp3")) throw new Error("Không tìm thấy MP3 hợp lệ. Kiểm tra file trong data-seed hoặc đặt SEED_AUDIO_FILE.");
  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || process.env.SEED_MOD_EMAIL?.trim();
  const moderators = await prisma.user.findMany({ where: { role: { in: ["admin", "moderator"] }, banned: false, ...(ownerEmail ? { email: ownerEmail } : {}) }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  if (moderators.length !== 1) throw new Error("Cần xác định một moderator đang hoạt động. Đặt SEED_OWNER_EMAIL để chọn chủ sở hữu; seed không tạo hoặc thay đổi tài khoản.");
  const owner = moderators[0]!;
  const topic = await prisma.topic.findFirst({ where: { slug: "lich-su-dan-toc", isActive: true }, select: { id: true } });
  if (!topic) throw new Error("Chưa có chủ đề Lịch sử dân tộc. Chạy db:seed trước rồi chạy lại seed này.");
  const maxConfig = await prisma.systemConfig.findUnique({ where: { key: "media.audio.max_bytes" }, select: { value: true } });
  const maxBytes = typeof maxConfig?.value === "number" ? maxConfig.value : 52428800;
  if (file.size > maxBytes) throw new Error(`MP3 vượt giới hạn audio (${maxBytes} byte). Chọn file nhỏ hơn hoặc điều chỉnh cấu hình hệ thống.`);

  // Read all collisions before creating rows or uploading anything.
  for (const series of VIETNAM_PODCAST_SEED) {
    const existing = await prisma.series.findUnique({ where: { slug: series.slug } });
    if (existing && (existing.ownerId !== owner.id || existing.title !== series.title || existing.deletedAt)) throw new Error(`Slug series đã được sử dụng hoặc nằm trong thùng rác: ${series.slug}. Seed dừng để không ghi đè.`);
    for (const episode of series.episodes) {
      const existingEpisode = await prisma.episode.findUnique({ where: { slug: episode.slug }, include: { series: { select: { ownerId: true, title: true } } } });
      if (existingEpisode && (existingEpisode.title !== episode.title || existingEpisode.series.title !== series.title || existingEpisode.series.ownerId !== owner.id || existingEpisode.deletedAt)) throw new Error(`Slug tập đã được sử dụng hoặc nằm trong thùng rác: ${episode.slug}. Seed dừng để không ghi đè.`);
    }
  }

  console.log(`Moderator: ${owner.name}. MP3: ${file.size.toLocaleString("vi-VN")} byte. ${checkOnly ? "Kiểm tra, không thay đổi dữ liệu." : "Seed bản nháp; giữ nguyên nội dung đã có."}`);
  if (checkOnly) {
    for (const series of VIETNAM_PODCAST_SEED) console.log(`${series.title}: ${series.episodes.map((episode) => episode.title).join(" | ")}`);
    return;
  }
  cloudinary.config({ cloud_name: requiredEnv("CLOUDINARY_CLOUD_NAME"), api_key: requiredEnv("CLOUDINARY_API_KEY"), api_secret: requiredEnv("CLOUDINARY_API_SECRET"), secure: true });
  const checksum = createHash("sha256").update(await readFile(audioPath)).digest("hex").slice(0, 16);
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || "su-ky";
  let createdSeries = 0, createdEpisodes = 0, attachedAudio = 0, keptAudio = 0;

  for (const entry of VIETNAM_PODCAST_SEED) {
    let series = await prisma.series.findFirst({ where: { title: entry.title, ownerId: owner.id, deletedAt: null } });
    if (!series) {
      series = await prisma.series.create({ data: { ownerId: owner.id, topicId: topic.id, title: entry.title, slug: entry.slug, description: `Các tập podcast trong series ${entry.title}.`, status: "DRAFT" } });
      createdSeries++;
    }
    if (series.adminLockedAt) throw new Error(`Series “${entry.title}” đang bị khóa; seed không chỉnh sửa nội dung bị khóa.`);
    for (const item of entry.episodes) {
      let episode = await prisma.episode.findFirst({ where: { seriesId: series.id, title: item.title, deletedAt: null } });
      if (!episode) {
        const highest = await prisma.episode.aggregate({ where: { seriesId: series.id }, _max: { sortOrder: true } });
        episode = await prisma.episode.create({ data: { seriesId: series.id, title: item.title, slug: item.slug, sortOrder: (highest._max.sortOrder ?? 0) + 1, status: "DRAFT", description: `Podcast về ${item.title}. Bản thu mẫu dùng chung để kiểm tra phát audio.` } });
        createdEpisodes++;
      }
      if (episode.adminLockedAt) throw new Error(`Tập “${item.title}” đang bị khóa; seed không chỉnh sửa nội dung bị khóa.`);
      const existingNarration = await prisma.episodeNarration.findUnique({ where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } } });
      if (episode.status !== "DRAFT" && !existingNarration?.audioAssetId) throw new Error(`Tập “${item.title}” không còn là bản nháp; seed không bổ sung bản thu vào nội dung đã phát hành hoặc ẩn.`);
      const narration = await prisma.episodeNarration.upsert({ where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } }, create: { episodeId: episode.id, narrationType: "THIRD_PERSON" }, update: {}, include: { audioAsset: true } });
      if (narration.audioAssetId) {
        if (narration.audioAsset?.status !== "READY" || !narration.audioAsset.durationMs || narration.audioAsset.deletedAt) throw new Error(`Tập “${item.title}” đã có audio chưa sẵn sàng. Seed không thay thế bản thu hiện hữu; kiểm tra tập rồi chạy lại.`);
        keptAudio++;
        console.log(`Giữ audio: ${item.title}`);
        continue;
      }
      // Each narration owns a distinct MediaAsset; deterministic public IDs recover interrupted uploads.
      const publicId = `${folder}/audio/seed-vietnam/${episode.slug}-${checksum}`;
      const resource = await audioResource(publicId, file.size);
      const changed = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM episode_narrations WHERE id=${narration.id}::uuid FOR UPDATE`;
        const current = await tx.episodeNarration.findUniqueOrThrow({ where: { id: narration.id } });
        if (current.audioAssetId) return false;
        let asset = await tx.mediaAsset.findUnique({ where: { publicId } });
        if (asset && (asset.uploadedById !== owner.id || asset.status !== "READY" || asset.deletedAt)) throw new Error("Media seed hiện hữu không hợp lệ; không ghi đè media này.");
        if (!asset) asset = await tx.mediaAsset.create({ data: { kind: "AUDIO", publicId, status: "READY", uploadedById: owner.id, format: "mp3", version: BigInt(resource.version), sizeBytes: BigInt(resource.bytes), durationMs: Math.round(resource.duration * 1000), verifiedAt: new Date() } });
        const used = await tx.episodeNarration.findUnique({ where: { audioAssetId: asset.id } });
        if (used) throw new Error("Media seed đã thuộc một bản kể khác; không tái sử dụng quan hệ audio.");
        await tx.episodeNarration.update({ where: { id: narration.id }, data: { audioAssetId: asset.id, audioAttachedAt: new Date() } });
        await tx.mediaAsset.update({ where: { id: asset.id }, data: { detachedAt: null } });
        return true;
      });
      if (changed) attachedAudio++; else keptAudio++;
      console.log(`Đã gắn MP3 mẫu: ${item.title}`);
    }
  }
  console.log(JSON.stringify({ createdSeries, createdEpisodes, attachedAudio, keptAudio, expectedSeries: 4, expectedEpisodes: 9 }));
}

try { await main(); }
catch (error) { console.error(error instanceof Error ? error.message : "Không hoàn tất seed. Chạy lại để tiếp tục phần còn thiếu."); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
