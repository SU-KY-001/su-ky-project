import { PrismaMembershipRepository } from "../infrastructure/prisma-membership.repository";

// Module-level instance: `hasActiveMembership` is a function consumed cross-module and stubbed by
// module path in tests, so the dependency cannot be passed in.
const repo = new PrismaMembershipRepository();

/** True when the user has a non-revoked membership covering `now`. */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  return Boolean(await repo.findActiveMembership(userId, new Date()));
}
