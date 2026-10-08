import type { DbClient } from "@repo/db";
import type { Session } from "../../auth";
import { DomainError } from "../../../core/errors/domain-error";

export async function loadSeriesForRead(db: DbClient, session: Session, id: string) {
  const series = await db.series.findUnique({ where: { id } });
  if (!series || (session.user.role !== "admin" && series.ownerId !== session.user.id)) {
    throw new DomainError(404, "NOT_FOUND", "Series not found");
  }
  return series;
}

export async function loadEpisodeForRead(db: DbClient, session: Session, id: string) {
  const episode = await db.episode.findUnique({ where: { id }, include: { series: true } });
  if (!episode || (session.user.role !== "admin" && episode.series.ownerId !== session.user.id)) {
    throw new DomainError(404, "NOT_FOUND", "Episode not found");
  }
  return episode;
}

export function assertWritable(
  session: Session,
  series: { deletedAt: Date | null; adminLockedAt: Date | null },
  episode?: { deletedAt: Date | null; adminLockedAt: Date | null }
): void {
  if (series.deletedAt || episode?.deletedAt) throw new DomainError(409, "CONTENT_IN_TRASH", "Content is in trash");
  if (session.user.role !== "admin" && (series.adminLockedAt || episode?.adminLockedAt)) {
    throw new DomainError(403, "CONTENT_LOCKED", "Content is locked by an administrator");
  }
}

export async function assertBaseUpdatedAt(
  db: DbClient,
  model: "series" | "episode" | "narration",
  id: string,
  baseUpdatedAt?: Date
): Promise<void> {
  if (!baseUpdatedAt) return;
  const current =
    model === "series"
      ? await db.series.findUnique({ where: { id }, select: { updatedAt: true } })
      : model === "episode"
        ? await db.episode.findUnique({ where: { id }, select: { updatedAt: true } })
        : await db.episodeNarration.findUnique({ where: { id }, select: { updatedAt: true } });
  if (!current || current.updatedAt.getTime() !== baseUpdatedAt.getTime()) {
    throw new DomainError(409, "STALE_WRITE", "Content was updated by another request");
  }
}
