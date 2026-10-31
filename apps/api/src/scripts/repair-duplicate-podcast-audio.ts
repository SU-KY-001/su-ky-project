import { prisma } from "@repo/db";

const targetEpisodeSlug = process.env.SEED_AUDIO_EPISODE_SLUG?.trim() || "chien-thang-bach-dang-938";
const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const targetNarration = await prisma.episodeNarration.findFirst({
    where: {
      episode: { slug: targetEpisodeSlug },
      audioAsset: { publicId: { startsWith: "su-ky/audio/seed-vietnam/" } },
    },
    include: { audioAsset: true },
  });

  if (!targetNarration?.audioAsset) {
    throw new Error(`Không tìm thấy audio seed của tập ${targetEpisodeSlug}.`);
  }

  const checksum = targetNarration.audioAsset.publicId.split("-").at(-1);
  if (!checksum) throw new Error("Public ID của audio seed không có checksum.");

  const duplicates = await prisma.episodeNarration.findMany({
    where: {
      episode: { slug: { not: targetEpisodeSlug } },
      audioAsset: {
        publicId: { startsWith: "su-ky/audio/seed-vietnam/", endsWith: `-${checksum}` },
        sizeBytes: targetNarration.audioAsset.sizeBytes,
        durationMs: targetNarration.audioAsset.durationMs,
      },
    },
    select: {
      id: true,
      audioAssetId: true,
      episode: { select: { slug: true, title: true } },
      audioAsset: { select: { publicId: true } },
    },
  });

  console.log(JSON.stringify({
    mode: apply ? "apply" : "check",
    keptFor: targetEpisodeSlug,
    duplicateCount: duplicates.length,
    duplicates: duplicates.map((item) => ({ episode: item.episode.slug, title: item.episode.title, publicId: item.audioAsset?.publicId })),
  }, null, 2));

  if (!apply || duplicates.length === 0) return;

  const detachedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const duplicate of duplicates) {
      if (!duplicate.audioAssetId) continue;
      await tx.episodeNarration.update({
        where: { id: duplicate.id },
        data: { audioAssetId: null, audioAttachedAt: null },
      });
      await tx.mediaAsset.update({
        where: { id: duplicate.audioAssetId },
        data: { detachedAt },
      });
    }
  });

  console.log(`Đã tháo ${duplicates.length} liên kết audio trùng. File media vẫn được giữ nguyên để có thể khôi phục.`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Không thể kiểm tra audio podcast trùng.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
