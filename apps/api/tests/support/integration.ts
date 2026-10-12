import { prisma } from "@repo/db";
import type { UserRole } from "@repo/shared";
import type { Session } from "../../src/modules/auth";

/**
 * Database-backed suites are opt-in (`RUN_INTEGRATION=1`, see `.env.test.example`) and refuse to run
 * unless DATABASE_URL points at a database whose name contains "test": they create rows and
 * `cleanupDetachedMedia` soft-deletes every stale unattached asset it finds.
 */
export const RUN_INTEGRATION = process.env.RUN_INTEGRATION === "1";

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for integration tests");
  const databaseName = new URL(url).pathname.slice(1);
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to run integration tests against database "${databaseName}": its name must contain "test"`);
  }
}

export function makeSession(userId: string, role: UserRole): Session {
  const now = new Date();
  return {
    user: { id: userId, name: "Integration User", email: `${userId}@example.com`, emailVerified: true, image: null, role, banned: false, banReason: null, banExpires: null, createdAt: now, updatedAt: now },
    session: { id: `session-${userId}`, userId, token: `token-${userId}`, expiresAt: new Date(Date.now() + 60_000), createdAt: now, updatedAt: now },
  };
}

export function uniqueSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

export async function createModerator(userId: string) {
  return prisma.user.create({ data: { id: userId, name: "Integration Moderator", email: `${userId}@example.com`, emailVerified: true, role: "moderator" } });
}

/** Removes everything a suite created, children first (series/source FKs are RESTRICT). */
export async function removeFixtures(userId: string): Promise<void> {
  const series = await prisma.series.findMany({ where: { ownerId: userId }, select: { id: true } });
  const seriesIds = series.map((row) => row.id);
  const episodes = await prisma.episode.findMany({ where: { seriesId: { in: seriesIds } }, select: { id: true } });
  await prisma.episodeNarration.deleteMany({ where: { episodeId: { in: episodes.map((row) => row.id) } } });
  await prisma.episode.deleteMany({ where: { seriesId: { in: seriesIds } } });
  await prisma.series.deleteMany({ where: { id: { in: seriesIds } } });
  await prisma.source.deleteMany({ where: { createdById: userId } });
  await prisma.mediaAsset.deleteMany({ where: { uploadedById: userId } });
  await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
