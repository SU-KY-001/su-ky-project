import { randomBytes } from "node:crypto";
import { prisma } from "@repo/db";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin as adminPlugin, createAccessControl } from "better-auth/plugins";
import { defaultStatements } from "better-auth/plugins/admin/access";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : randomBytes(32).toString("base64url"));

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET must be set in production");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be configured");
}

const trustedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const accessControl = createAccessControl(defaultStatements);
const roles = {
  customer: accessControl.newRole({}),
  moderator: accessControl.newRole({}),
  admin: accessControl.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "delete",
      "set-password",
      "set-email",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
  }),
};

export const USER_ROLES = ["customer", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const authInstance = betterAuth({
  appName: "Su-Ky",
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`,
  secret,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  plugins: [
    adminPlugin({
      ac: accessControl,
      roles,
      defaultRole: "customer",
      adminRoles: ["admin"],
    }),
  ],
});

export type AuthSession = {
  session: {
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    role?: string | string[] | null;
  };
};

export const auth = {
  handler(request: Request): Promise<Response> {
    return authInstance.handler(request);
  },
  api: {
    async getSession({ headers }: { headers: Headers }): Promise<AuthSession | null> {
      const result = await authInstance.api.getSession({ headers });
      if (!result) return null;

      return {
        session: { expiresAt: result.session.expiresAt },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          image: result.user.image,
          role: result.user.role,
        },
      };
    },
  },
};
