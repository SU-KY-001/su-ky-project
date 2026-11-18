import { experienceDay, experienceResetAt } from "../../membership/application/experience-access";
import { PrismaListeningRepository } from "../infrastructure/prisma-listening.repository";

// Module-level instance: the exported API is a function consumed cross-module and stubbed by
// module path in tests, so there is no injection point to hang a constructor dependency on.
const repo = new PrismaListeningRepository();

export interface DailyPlayReservation {
  /** `allowed` = first play today, `already` = same episode already counted today, `limit` = quota spent. */
  outcome: "allowed" | "already" | "limit";
}

/** UTC midnight of the Vietnam calendar day containing `now`, matching the `DATE` column. */
export function playDate(now = new Date()): Date {
  return experienceDay(now);
}

/** Next Vietnam midnight — when today's plays stop counting. */
export function nextResetAt(now = new Date()): Date {
  return experienceResetAt(now);
}

/**
 * Claims one play for `episodeId` today. The per-user/day advisory lock serialises the
 * check-then-insert so two concurrent episodes cannot both pass the last free slot.
 */
export async function reserveDailyPlay(
  userId: string,
  episodeId: string,
  now = new Date(),
): Promise<DailyPlayReservation> {
  return { outcome: await repo.reserveDailyPlay(userId, episodeId, playDate(now)) };
}

export async function checkDailyPlay(userId: string, episodeId: string, now = new Date()): Promise<DailyPlayReservation> {
  return { outcome: await repo.reserveDailyPlay(userId, episodeId, playDate(now), false) };
}

