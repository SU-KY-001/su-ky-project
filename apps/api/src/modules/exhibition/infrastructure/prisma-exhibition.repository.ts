import { prisma, Prisma, type Exhibition as DbExhibition } from "@repo/db";
import { ExhibitionDocumentSchema, type ExhibitionDocument, type ExhibitionSummary, type ResolvedExhibition, type ExhibitionPodcastQuery, type ExhibitionPodcastOption } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { validateReferences } from "../domain/exhibition-references";
import type { ExhibitionRecord, ExhibitionRepository } from "../domain/exhibition.repository";
import type { MediaStorageGateway } from "../../media";

function toRecord(row: DbExhibition): ExhibitionRecord {
  return {
    id: row.id, ownerId: row.ownerId, slug: row.slug, revision: row.draftRevision,
    document: ExhibitionDocumentSchema.parse(row.draftDocument),
    publishedDocument: row.publishedDocument === null ? null : ExhibitionDocumentSchema.parse(row.publishedDocument),
    publishedRevision: row.publishedRevision, updatedAt: row.updatedAt,
  };
}

async function checkReferences(tx: Prisma.TransactionClient, document: ExhibitionDocument, ownerId: string): Promise<void> {
  const ids = [...new Set(document.items.map(item => item.imageAssetId).concat(document.metadata.coverAssetId ? [document.metadata.coverAssetId] : []))];
  const narrationIds = [...new Set(document.items.flatMap(item => item.narrationId ? [item.narrationId] : []))];
  const [images, narrations] = await Promise.all([
    tx.mediaAsset.findMany({ where: { id: { in: ids } } }),
    tx.episodeNarration.findMany({ where: { id: { in: narrationIds }, audioAsset: { status: "READY", kind: "AUDIO", deletedAt: null }, episode: { status: "PUBLISHED", deletedAt: null, series: { status: "PUBLISHED", deletedAt: null } } }, select: { id: true } }),
  ]);
  validateReferences(document, ownerId, images, narrations.map(value => value.id));
}

export class PrismaExhibitionRepository implements ExhibitionRepository {
  constructor(private readonly storage: Pick<MediaStorageGateway, "deliveryUrl">) {}

  async findPublished(slug: string): Promise<ExhibitionDocument | null> {
    const row = await prisma.exhibition.findFirst({ where: { slug, publishedRevision: { not: null } }, select: { publishedDocument: true } });
    return row?.publishedDocument ? ExhibitionDocumentSchema.parse(row.publishedDocument) : null;
  }

  async publish(id: string, ownerId: string, revision: number): Promise<ExhibitionRecord | null> {
    try {
      return await prisma.$transaction(async tx => {
        const row = await tx.exhibition.findFirst({ where: { id, ownerId, draftRevision: revision } });
        if (!row) return null;
        const document = ExhibitionDocumentSchema.parse(row.draftDocument);
        if (!document.items.length || document.items.some(item => !item.credit || !item.sourceUrl || !item.rights)) throw new DomainError(400, "VALIDATION_ERROR", "Cần ít nhất một điểm trưng bày có nguồn và quyền sử dụng đầy đủ");
        await checkReferences(tx, document, ownerId);
        const changed = await tx.exhibition.updateMany({ where: { id, ownerId, draftRevision: revision }, data: { publishedDocument: document, publishedRevision: revision, publishedAt: new Date() } });
        if (!changed.count) return null;
        return toRecord(await tx.exhibition.findUniqueOrThrow({ where: { id } }));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new DomainError(409, "EXHIBITION_REVISION_CONFLICT", "Bản nháp đã thay đổi ở nơi khác");
      throw error;
    }
  }

  async podcastOptions(query: ExhibitionPodcastQuery): Promise<{ items: ExhibitionPodcastOption[]; page: number; limit: number; total: number }> {
    const where: Prisma.EpisodeNarrationWhereInput = { audioAsset: { status: "READY", kind: "AUDIO", deletedAt: null }, episode: { status: "PUBLISHED", deletedAt: null, ...(query.seriesId ? { seriesId: query.seriesId } : {}), ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}), series: { status: "PUBLISHED", deletedAt: null } } };
    const [rows, total] = await Promise.all([
      prisma.episodeNarration.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], include: { episode: { include: { series: true } }, narratorEntity: true } }),
      prisma.episodeNarration.count({ where }),
    ]);
    return { items: rows.map(row => ({ id: row.id, episodeId: row.episode.id, episodeTitle: row.episode.title, seriesId: row.episode.series.id, seriesTitle: row.episode.series.title, narrationLabel: row.narratorEntity?.name ?? "Người dẫn chuyện" })), page: query.page, limit: query.limit, total };
  }

  async resolve(document: ExhibitionDocument): Promise<ResolvedExhibition> {
    const [images, narrations] = await Promise.all([
      prisma.mediaAsset.findMany({ where: { id: { in: document.items.map(item => item.imageAssetId) }, kind: "IMAGE", status: "READY", deletedAt: null } }),
      prisma.episodeNarration.findMany({ where: { id: { in: document.items.flatMap(item => item.narrationId ? [item.narrationId] : []) } }, include: { episode: { include: { series: true } }, narratorEntity: true, audioAsset: true } }),
    ]);
    const items = document.items.map(item => {
      const image = images.find(value => value.id === item.imageAssetId);
      if (!image?.widthPx || !image.heightPx) throw new DomainError(400, "VALIDATION_ERROR", `Ảnh của ${item.title} không khả dụng`);
      const narration = narrations.find(value => value.id === item.narrationId);
      const available = !!narration && narration.episode.status === "PUBLISHED" && !narration.episode.deletedAt && narration.episode.series.status === "PUBLISHED" && !narration.episode.series.deletedAt && narration.audioAsset?.status === "READY" && !narration.audioAsset.deletedAt;
      return { ...item, image: { url: this.storage.deliveryUrl(image), width: image.widthPx, height: image.heightPx }, narration: narration ? { id: narration.id, episodeTitle: narration.episode.title, seriesTitle: narration.episode.series.title, narrationLabel: narration.narratorEntity?.name ?? "Người dẫn chuyện", available } : item.narrationId ? { id: item.narrationId, episodeTitle: "Podcast không khả dụng", seriesTitle: "", narrationLabel: "", available: false } : null };
    });
    return { metadata: document.metadata, chapters: document.chapters, items };
  }
  async list(ownerId: string, query: { q: string; status: "all" | "published" | "unpublished"; page: number; limit: number }): Promise<{ items: ExhibitionSummary[]; page: number; limit: number; total: number }> {
    const where: Prisma.ExhibitionWhereInput = {
      ownerId,
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.status === "published" ? { publishedRevision: { not: null } } : query.status === "unpublished" ? { publishedRevision: null } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.exhibition.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] }),
      prisma.exhibition.count({ where }),
    ]);
    return { items: rows.map(row => {
      const document = ExhibitionDocumentSchema.parse(row.draftDocument);
      return { id: row.id, title: row.title, slug: row.slug, chapterCount: document.chapters.length, itemCount: document.items.length, podcastCount: document.items.filter(item => item.narrationId !== null).length, publicationStatus: row.publishedRevision === null ? "UNPUBLISHED" : "PUBLISHED", revision: row.draftRevision, updatedAt: row.updatedAt.toISOString() };
    }), page: query.page, limit: query.limit, total };
  }

  async create(ownerId: string, document: ExhibitionDocument): Promise<ExhibitionRecord> {
    return prisma.$transaction(async tx => {
      await checkReferences(tx, document, ownerId);
      const id = crypto.randomUUID();
      return toRecord(await tx.exhibition.create({ data: { id, ownerId, slug: id, title: document.metadata.title, draftDocument: document } }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async find(id: string, ownerId: string): Promise<ExhibitionRecord | null> {
    const row = await prisma.exhibition.findFirst({ where: { id, ownerId } });
    return row ? toRecord(row) : null;
  }

  async save(id: string, ownerId: string, revision: number, document: ExhibitionDocument): Promise<ExhibitionRecord | null> {
    try {
      return await prisma.$transaction(async tx => {
      await checkReferences(tx, document, ownerId);
      const result = await tx.exhibition.updateMany({ where: { id, ownerId, draftRevision: revision }, data: { draftDocument: document, draftRevision: { increment: 1 }, title: document.metadata.title } });
      if (!result.count) return null;
      return toRecord(await tx.exhibition.findUniqueOrThrow({ where: { id } }));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new DomainError(409, "EXHIBITION_REVISION_CONFLICT", "Bản nháp đã thay đổi ở nơi khác");
      }
      throw error;
    }
  }
}
