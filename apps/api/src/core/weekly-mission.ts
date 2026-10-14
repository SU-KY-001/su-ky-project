import type { Prisma } from "@repo/db";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type MissionActivityType = "COMPLETE_EPISODE" | "PASS_QUIZ";

export interface MissionProgressSummary {
  id: string;
  title: string;
  progress: number;
  target: number;
  completedNow: boolean;
  xpAwarded: number;
}

export function mondayInVietnam(now: Date): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  // Stored as PostgreSQL DATE; UTC midnight represents the Vietnam calendar date.
  return new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() - daysSinceMonday,
    ),
  );
}

/**
 * Counts one distinct content item towards every active mission of `activityType` in the
 * current Vietnam week and pays out mission XP once, on the call that reaches the target.
 * Must run inside the caller's transaction so progress and XP commit together.
 */
export async function recordMissionActivity(
  db: Prisma.TransactionClient,
  params: {
    userId: string;
    activityType: MissionActivityType;
    contentId: string;
    now: Date;
  },
): Promise<MissionProgressSummary[]> {
  const { userId, activityType, contentId, now } = params;
  const missions = await db.weeklyMission.findMany({
    where: {
      activityType,
      weekStartDate: mondayInVietnam(now),
      activatedAt: { lte: now },
    },
  });
  const updates: MissionProgressSummary[] = [];
  for (const mission of missions) {
    const userMission = await db.userWeeklyMission.upsert({
      where: {
        weeklyMissionId_userId: { weeklyMissionId: mission.id, userId },
      },
      create: { weeklyMissionId: mission.id, userId },
      update: {},
    });
    const counted = await db.userWeeklyMissionItem.createMany({
      data: [{ userWeeklyMissionId: userMission.id, contentId }],
      skipDuplicates: true,
    });
    if (!counted.count) continue;
    const progress = await db.userWeeklyMission.update({
      where: { id: userMission.id },
      data: { progressCount: { increment: 1 } },
    });
    let xpAwarded = 0;
    let completedNow = false;
    if (
      !progress.completedAt &&
      progress.progressCount >= mission.targetCount
    ) {
      await db.userWeeklyMission.update({
        where: { id: progress.id },
        data: { completedAt: now },
      });
      const award = await db.xpAward.createMany({
        data: [
          {
            userId,
            sourceType: "WEEKLY_MISSION",
            sourceId: mission.id,
            xpAmount: mission.xpReward,
          },
        ],
        skipDuplicates: true,
      });
      if (award.count) {
        xpAwarded = mission.xpReward;
        completedNow = true;
        await db.user.update({
          where: { id: userId },
          data: { totalXp: { increment: mission.xpReward } },
        });
      }
    }
    updates.push({
      id: mission.id,
      title: mission.title,
      progress: progress.progressCount,
      target: mission.targetCount,
      completedNow,
      xpAwarded,
    });
  }
  return updates;
}
