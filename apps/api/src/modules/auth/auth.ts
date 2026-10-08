import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, bearer } from "better-auth/plugins";
import { prisma } from "@repo/db";
import type { UserRole } from "@repo/shared";
import { env } from "../../core/env";

export const auth = betterAuth({
  trustedOrigins: [
    new URL(env.BETTER_AUTH_URL).origin,
    ...env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0 && !origin.includes("*")),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "su-ky-auth-secret-development-key",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRole: "admin",
    }),
    bearer(),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session & {
  user: {
    role?: UserRole | string | null;
  };
};
