import { Prisma, prisma } from "@repo/db";
import type { PlaylistDetailDto, PlaylistDto, PlaylistListDto, PlaylistPageQuery } from "@repo/shared";
import { DomainError } from "../../core/errors/domain-error";

type PlaylistRow = Prisma.PlaylistGetPayload<{ include: { _count: { select: { items: true } } } }>;
const includeCount = { _count: { select: { items: true } } } as const;
const readyAudio = { kind: "AUDIO", status: "READY", deletedAt: null, durationMs: { gt: 0 } } as const;
const publicEpisode = { status: "PUBLISHED", deletedAt: null, series: { status: "PUBLISHED", deletedAt: null } } as const;
function mapPlaylist(row: PlaylistRow): PlaylistDto {
  return { id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt, itemCount: row._count.items };
}
export function validatePlaylistOrder(existing: string[], requested: string[]): void {
  const ids = new Set(requested);
  if (ids.size !== requested.length || existing.length !== requested.length || existing.some((id) => !ids.has(id))) throw new DomainError(409, "CONFLICT", "Thứ tự phải chứa đúng mọi tập hiện tại của playlist, không trùng hoặc thiếu. Hãy tải lại playlist.");
}

export class PlaylistService {
  constructor(private readonly db = prisma) {}

  private async lock(tx: Prisma.TransactionClient, ownerId: string, id: string): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM playlists WHERE id = ${id}::uuid AND owner_id = ${ownerId} FOR UPDATE`);
    if (!rows.length) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy playlist của bạn.");
  }
  private async metadata(tx: Prisma.TransactionClient, id: string): Promise<PlaylistDto> {
    return mapPlaylist(await tx.playlist.findUniqueOrThrow({ where: { id }, include: includeCount }));
  }
  private async mutate<T>(ownerId: string, id: string, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => { await this.lock(tx, ownerId, id); return action(tx); });
  }

  async list(ownerId: string, { page, limit }: PlaylistPageQuery): Promise<PlaylistListDto> {
    return this.db.$transaction(async (tx) => {
      const where = { ownerId };
      const total = await tx.playlist.count({ where });
      const rows = await tx.playlist.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit, include: includeCount });
      return { page, limit, total, items: rows.map(mapPlaylist) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async create(ownerId: string, name: string): Promise<PlaylistDto> {
    return mapPlaylist(await this.db.playlist.create({ data: { ownerId, name }, include: includeCount }));
  }
  async get(ownerId: string, id: string, { page, limit }: PlaylistPageQuery): Promise<PlaylistDetailDto> {
    return this.db.$transaction(async (tx) => {
      const playlist = await tx.playlist.findFirst({ where: { id, ownerId }, include: includeCount });
      if (!playlist) throw new DomainError(404, "NOT_FOUND", "Không tìm thấy playlist của bạn.");
      const rows = await tx.playlistItem.findMany({ where: { playlistId: id }, skip: (page - 1) * limit, take: limit, orderBy: [{ position: "asc" }, { episodeId: "asc" }], include: { episode: { include: { series: true, narrations: { where: { audioAsset: readyAudio }, include: { audioAsset: true }, orderBy: { id: "asc" } } } } } });
      return { playlist: mapPlaylist(playlist), page, limit, total: playlist._count.items, items: rows.map(({ episode, position }) => {
        const available = episode.status === "PUBLISHED" && !episode.deletedAt && episode.series.status === "PUBLISHED" && !episode.series.deletedAt && episode.narrations.length > 0;
        return { episodeId: episode.id, position, episodeSlug: episode.slug, title: episode.title, seriesTitle: episode.series.title, seriesSlug: episode.series.slug, available, narrations: available ? episode.narrations.map((n) => ({ id: n.id, type: n.narrationType, durationMs: n.audioAsset!.durationMs! })) : [] };
      }) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async rename(ownerId: string, id: string, name: string): Promise<PlaylistDto> {
    return this.mutate(ownerId, id, async (tx) => mapPlaylist(await tx.playlist.update({ where: { id }, data: { name }, include: includeCount })));
  }
  async delete(ownerId: string, id: string): Promise<void> {
    await this.mutate(ownerId, id, async (tx) => { await tx.playlist.delete({ where: { id } }); });
  }
  async add(ownerId: string, id: string, episodeId: string): Promise<PlaylistDto> {
    return this.mutate(ownerId, id, async (tx) => {
      const existing = await tx.playlistItem.findUnique({ where: { playlistId_episodeId: { playlistId: id, episodeId } } });
      if (existing) return this.metadata(tx, id);
      if (await tx.playlistItem.count({ where: { playlistId: id } }) >= 500) throw new DomainError(409, "CONFLICT", "Playlist tối đa500 tập.");
      const episode = await tx.episode.findFirst({ where: { id: episodeId, ...publicEpisode, narrations: { some: { audioAsset: readyAudio } } }, select: { id: true } });
      if (!episode) throw new DomainError(422, "VALIDATION_ERROR", "Tập không công khai hoặc chưa có audio khả dụng.");
      const last = await tx.playlistItem.aggregate({ where: { playlistId: id }, _max: { position: true } });
      await tx.playlistItem.create({ data: { playlistId: id, episodeId, position: (last._max.position ?? -1) + 1 } });
      await tx.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
      return this.metadata(tx, id);
    });
  }
  async remove(ownerId: string, id: string, episodeId: string): Promise<PlaylistDto> {
    return this.mutate(ownerId, id, async (tx) => {
      const result = await tx.playlistItem.deleteMany({ where: { playlistId: id, episodeId } });
      if (result.count) await tx.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
      return this.metadata(tx, id);
    });
  }
  async reorder(ownerId: string, id: string, episodeIds: string[]): Promise<PlaylistDto> {
    return this.mutate(ownerId, id, async (tx) => {
      const items = await tx.playlistItem.findMany({ where: { playlistId: id }, select: { episodeId: true } });
      validatePlaylistOrder(items.map((item) => item.episodeId), episodeIds);
      if (episodeIds.length) {
        const positions = Prisma.join(episodeIds.map((episodeId, position) => Prisma.sql`(${episodeId}::uuid, ${position}::int)`));
        await tx.$executeRaw(Prisma.sql`UPDATE playlist_items AS item SET position = ordered.position
          FROM (VALUES ${positions}) AS ordered(episode_id, position)
          WHERE item.playlist_id = ${id}::uuid AND item.episode_id = ordered.episode_id`);
      }
      await tx.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
      return this.metadata(tx, id);
    });
  }
}
