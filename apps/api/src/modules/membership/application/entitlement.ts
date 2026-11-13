import { prisma } from "@repo/db";

/** True when the user has a non-revoked membership covering `now`. */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  const now = new Date();
  const row = await prisma.membership.findFirst({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  return Boolean(row);
}
