import { Prisma, prisma, type DbClient } from "@repo/db";
import { getSystemConfig } from "../../core/config/system-config";
import { DomainError } from "../../core/errors/domain-error";
import { audioMimeType } from "../media/application/mime";
import type { MediaStorageGateway } from "../media";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const VN_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

function publicNarrationWhere(id: string) {
  return { id, episode: { status: "PUBLISHED" as const, deletedAt: null, series: { status: "PUBLISHED" as const, deletedAt: null } }, audioAsset: { status: "READY" as const } };
}
function countBits(bytes: Uint8Array): number {
  let total = 0;
  for (const byte of bytes) { let value = byte; while (value) { total += value & 1; value >>>= 1; } }
  return total;
}
function mondayInVietnam(now: Date): Date {
  const local = new Date(now.getTime() + VN_TIMEZONE_OFFSET_MS);
  const day = local.getUTCDay() || DAYS_PER_WEEK;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day + 1));
}

export class ListeningService {
  constructor(private readonly storage: MediaStorageGateway) {}

  async playback(narrationId: string, userId: string) {
    const narration = await prisma.episodeNarration.findFirst({ where: publicNarrationWhere(narrationId), include: { audioAsset: true } });
    if (!narration?.audioAsset?.durationMs) throw new DomainError(404, "CONTENT_UNAVAILABLE", "Narration audio is not available");
    const saved = await prisma.listeningProgress.findUnique({ where: { userId_narrationId: { userId, narrationId } } });
    const progress = saved ? { assetId: narration.audioAsset.id, positionMs: saved.audioAssetId === narration.audioAsset.id ? saved.positionMs : 0, playedBitmap: saved.audioAssetId === narration.audioAsset.id ? Buffer.from(saved.playedBitmap).toString("base64") : "", playedSeconds: saved.audioAssetId === narration.audioAsset.id ? saved.playedSeconds : 0, percent: saved.audioAssetId === narration.audioAsset.id ? Math.min(100, saved.playedSeconds / Math.ceil(narration.audioAsset.durationMs / 1000) * 100) : 0, completedAt: saved.completedAt } : null;
    return { narrationId, episodeId: narration.episodeId, audio: { assetId: narration.audioAsset.id, url: this.storage.deliveryUrl(narration.audioAsset), mimeType: audioMimeType(narration.audioAsset.format), durationMs: narration.audioAsset.durationMs }, progress, sync: { intervalMs: await getSystemConfig("listening.sync_interval_ms"), completionThreshold: await getSystemConfig("listening.completion_ratio") } };
  }

  async getProgress(narrationId: string, userId: string) {
    const progress = await prisma.listeningProgress.findUnique({ where: { userId_narrationId: { userId, narrationId } }, include: { audioAsset: true } });
    if (!progress) throw new DomainError(404, "NOT_FOUND", "Listening progress not found");
    return { assetId: progress.audioAssetId, positionMs: progress.positionMs, playedBitmap: Buffer.from(progress.playedBitmap).toString("base64"), playedSeconds: progress.playedSeconds, percent: Math.min(100, progress.playedSeconds / Math.ceil((progress.audioAsset.durationMs ?? 1) / 1000) * 100), completedAt: progress.completedAt };
  }

  async updateProgress(narrationId: string, userId: string, input: { assetId: string; positionMs: number; playedBitmap: string }) {
    const narration = await prisma.episodeNarration.findFirst({ where: publicNarrationWhere(narrationId), include: { audioAsset: true, episode: true } });
    if (!narration?.audioAsset?.durationMs) throw new DomainError(404, "CONTENT_UNAVAILABLE", "Narration audio is not available");
    if (input.assetId !== narration.audioAsset.id) throw new DomainError(409, "AUDIO_CHANGED", "Episode audio changed; reload playback");
    if (input.positionMs > narration.audioAsset.durationMs) throw new DomainError(422, "PROGRESS_INVALID", "Position exceeds audio duration");
    if (!BASE64_PATTERN.test(input.playedBitmap)) throw new DomainError(422, "PROGRESS_INVALID", "Played bitmap is not valid base64");
    const requested = Buffer.from(input.playedBitmap, "base64");
    const totalSeconds = Math.ceil(narration.audioAsset.durationMs / 1000);
    const expectedBytes = Math.ceil(totalSeconds / 8);
    if (requested.length > expectedBytes) throw new DomainError(422, "PROGRESS_INVALID", "Played bitmap exceeds audio duration");
    const padded = new Uint8Array(expectedBytes);
    padded.set(requested);
    const unusedBits = expectedBytes * 8 - totalSeconds;
    if (unusedBits > 0) padded[expectedBytes - 1] &= (1 << (8 - unusedBits)) - 1;
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.listeningProgress.createMany({ data: [{ userId, narrationId, episodeId: narration.episodeId, audioAssetId: narration.audioAsset!.id, playedBitmap: new Uint8Array(expectedBytes), lastListenedAt: now }], skipDuplicates: true });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM listening_progress WHERE user_id = ${userId} AND narration_id = ${narrationId} FOR UPDATE`);
      const current = await tx.listeningProgress.findUniqueOrThrow({ where: { userId_narrationId: { userId, narrationId } } });
      const stored = current.audioAssetId === narration.audioAsset!.id ? new Uint8Array(current.playedBitmap) : new Uint8Array(expectedBytes);
      const syncInterval = await getSystemConfig("listening.sync_interval_ms");
      const maxRate = await getSystemConfig("listening.max_playback_rate");
      const tolerance = await getSystemConfig("listening.tolerance_intervals");
      const elapsedSeconds = current.audioAssetId === narration.audioAsset!.id ? Math.max(0, (now.getTime() - current.lastListenedAt.getTime()) / 1000) : 0;
      let allowed = Math.ceil(elapsedSeconds * maxRate) + Math.ceil((syncInterval / 1000) * maxRate * tolerance);
      for (let bit = 0; bit < totalSeconds; bit += 1) {
        const byte = Math.floor(bit / 8);
        const mask = 1 << (bit % 8);
        if ((padded[byte]! & mask) !== 0 && (stored[byte]! & mask) === 0 && allowed-- > 0) stored[byte] |= mask;
      }
      const playedSeconds = countBits(stored);
      const completionRatio = await getSystemConfig("listening.completion_ratio");
      const completedNow = !current.completedAt && playedSeconds >= Math.ceil(totalSeconds * completionRatio);
      const completedAt = current.completedAt ?? (completedNow ? now : null);
      await tx.listeningProgress.update({ where: { id: current.id }, data: { audioAssetId: narration.audioAsset!.id, positionMs: input.positionMs, playedBitmap: stored, playedSeconds, completedAt, lastListenedAt: now } });
      const completion = completedNow ? await this.awardCompletion(tx, userId, narration.episodeId, now) : null;
      return { narrationId, positionMs: input.positionMs, playedSeconds, percent: Math.min(100, playedSeconds / totalSeconds * 100), completedAt, completion };
    });
  }

  private async awardCompletion(db: DbClient, userId: string, episodeId: string, now: Date) {
    const xp = await getSystemConfig("xp.episode_completion");
    const created = await db.xpAward.createMany({ data: [{ userId, sourceType: "EPISODE_COMPLETION", sourceId: episodeId, xpAmount: xp }], skipDuplicates: true });
    if (created.count) await db.user.update({ where: { id: userId }, data: { totalXp: { increment: xp } } });
    const missions = await db.weeklyMission.findMany({ where: { activityType: "COMPLETE_EPISODE", weekStartDate: mondayInVietnam(now), activatedAt: { lte: now } } });
    const updates = [];
    for (const mission of missions) {
      const userMission = await db.userWeeklyMission.upsert({ where: { weeklyMissionId_userId: { weeklyMissionId: mission.id, userId } }, create: { weeklyMissionId: mission.id, userId }, update: {} });
      const item = await db.userWeeklyMissionItem.createMany({ data: [{ userWeeklyMissionId: userMission.id, contentId: episodeId }], skipDuplicates: true });
      if (!item.count) continue;
      const progress = await db.userWeeklyMission.update({ where: { id: userMission.id }, data: { progressCount: { increment: 1 } } });
      let missionXp = 0; let completedMissionNow = false;
      if (!progress.completedAt && progress.progressCount >= mission.targetCount) {
        await db.userWeeklyMission.update({ where: { id: progress.id }, data: { completedAt: now } });
        const award = await db.xpAward.createMany({ data: [{ userId, sourceType: "WEEKLY_MISSION", sourceId: mission.id, xpAmount: mission.xpReward }], skipDuplicates: true });
        if (award.count) { missionXp = mission.xpReward; completedMissionNow = true; await db.user.update({ where: { id: userId }, data: { totalXp: { increment: mission.xpReward } } }); }
      }
      updates.push({ id: mission.id, title: mission.title, progress: progress.progressCount, target: mission.targetCount, completedNow: completedMissionNow, xpAwarded: missionXp });
    }
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totalXp: true } });
    return { xpAwarded: created.count ? xp : 0, totalXp: user.totalXp, missions: updates };
  }
}
