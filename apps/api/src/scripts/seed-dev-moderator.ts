import { prisma } from "@repo/db";
import { UserRoleEnum } from "@repo/shared";
import { DEV_MODERATOR } from "@repo/shared/dev-moderator";
import { auth } from "../modules/auth/auth";

const MODERATOR_ROLE = UserRoleEnum.enum.moderator;

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed:mod refuses to run when NODE_ENV=production");
  }

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(DEV_MODERATOR.email);

  // The admin plugin types `role` as "user" | "admin" only, so the moderator
  // role is applied through the adapter for both new and existing accounts.
  const userId = existing
    ? existing.user.id
    : (await auth.api.createUser({ body: { ...DEV_MODERATOR } })).user.id;

  // Reset role and password so the dev login button always matches DEV_MODERATOR.
  const passwordHash = await ctx.password.hash(DEV_MODERATOR.password);
  await ctx.internalAdapter.updateUser(userId, { role: MODERATOR_ROLE });
  await ctx.internalAdapter.updatePassword(userId, passwordHash);
  console.log(`${existing ? "Reset" : "Created"} moderator ${DEV_MODERATOR.email}`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
