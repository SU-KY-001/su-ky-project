import type { DbClient } from "@repo/db";
import { insertWithUniqueSlug } from "../../../core/slug";

export async function createSeriesDraft(
  db: DbClient,
  input: { ownerId: string; title: string; slug?: string; description?: string | null; topicId?: string | null; historicalPeriodId?: string | null; startYear?: number | null; endYear?: number | null; coverImageAssetId?: string | null }
) {
  let createdId = "";
  await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
    const rows = await db.series.createMany({ data: [{ ...input, slug, status: "DRAFT" }], skipDuplicates: true });
    if (rows.count === 0) return false;
    createdId = (await db.series.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
    return true;
  });
  return db.series.findUniqueOrThrow({ where: { id: createdId } });
}

export async function appendEpisodes(
  db: DbClient,
  seriesId: string,
  episodes: Array<{ title: string; slug?: string; thirdPersonScript?: { content: string; scriptPublicationId: number; episodeNo: number } }>
) {
  const aggregate = await db.episode.aggregate({ where: { seriesId, deletedAt: null }, _max: { sortOrder: true } });
  const created = [];
  for (const [index, input] of episodes.entries()) {
    let episodeId = "";
    await insertWithUniqueSlug(input.slug ?? input.title, async (slug) => {
      const rows = await db.episode.createMany({ data: [{ seriesId, title: input.title, slug, sortOrder: (aggregate._max.sortOrder ?? 0) + index + 1 }], skipDuplicates: true });
      if (rows.count === 0) return false;
      episodeId = (await db.episode.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id;
      return true;
    });
    const narration = await db.episodeNarration.create({ data: {
      episodeId, narrationType: "THIRD_PERSON", scriptContent: input.thirdPersonScript?.content,
      scriptPublicationId: input.thirdPersonScript?.scriptPublicationId, scriptPublicationEpisodeNo: input.thirdPersonScript?.episodeNo,
      scriptUpdatedAt: input.thirdPersonScript ? new Date() : null,
    } });
    created.push({ episodeId, narrationId: narration.id, title: input.title });
  }
  return created;
}
