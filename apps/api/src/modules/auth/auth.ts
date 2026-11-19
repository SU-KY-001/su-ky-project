import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, bearer, openAPI } from "better-auth/plugins";
import { prisma } from "@repo/db";
import type { UserRole } from "@repo/shared";
import { trustedAuthOrigins } from "../../core/config/allowed-origins";
import { env } from "../../core/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedAuthOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    // Cloudflare in front of Traefik makes x-forwarded-for multi-hop, which Better
    // Auth refuses to parse: every client then shares one 3-per-10s sign-in bucket
    // and gets 429. cf-connecting-ip is the single trusted hop.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    // Web runs on another site than the API in production; Lax cookies are not sent on cross-site fetches.
    ...(env.NODE_ENV === "production" && {
      defaultCookieAttributes: { sameSite: "none", secure: true },
    }),
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    bearer(),
    // Only used to generate the schema merged into /openapi.json; /docs is the single reference UI.
    openAPI({ disableDefaultReference: true }),
  ],
});

export type Session = typeof auth.$Infer.Session & {
  user: {
    role?: UserRole | string | null;
  };
};
