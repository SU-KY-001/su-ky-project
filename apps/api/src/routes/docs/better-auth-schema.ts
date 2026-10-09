import type { BetterAuthOptions } from "better-auth";
import { auth } from "../../modules/auth/auth";
import type { Paths } from "./operation";

const AUTH_BASE_PATH = "/api/auth";
const AUTH_TAG = "Authentication";
const ADMIN_TAG = "Admin";
const ADMIN_PATH_PREFIX = "/admin/";

// No social provider is configured, so these routes only return errors; `/ok` and `/error` are internal.
const ALWAYS_HIDDEN_PATHS: Record<string, true> = {
  "/sign-in/social": true,
  "/callback/{id}": true,
  "/link-social": true,
  "/unlink-account": true,
  "/refresh-token": true,
  "/get-access-token": true,
  "/account-info": true,
  "/ok": true,
  "/error": true,
};

// Better Auth registers these routes unconditionally but their handlers fail with *_DISABLED until the mail sender exists.
const RESET_PASSWORD_PATHS = ["/request-password-reset", "/reset-password", "/reset-password/{token}"];
const EMAIL_VERIFICATION_PATHS = ["/send-verification-email", "/verify-email"];

function hiddenPaths(): Record<string, true> {
  // `auth.options` is inferred as the literal config; widen it so unset mail senders type-check.
  const options: BetterAuthOptions = auth.options;
  const hidden = { ...ALWAYS_HIDDEN_PATHS };
  const hide = (paths: string[]) => {
    for (const path of paths) hidden[path] = true;
  };
  if (!options.emailAndPassword?.sendResetPassword) hide(RESET_PASSWORD_PATHS);
  if (!options.emailVerification?.sendVerificationEmail) hide(EMAIL_VERIFICATION_PATHS);
  return hidden;
}

const HIDDEN_PATHS = hiddenPaths();

const AUTH_DESCRIPTION_NOTE =
  "Endpoint do Better Auth sinh tự động từ cấu hình hiện tại. Response là JSON thô của thư viện, không bọc theo envelope lỗi `error_code` của API này.";

interface GeneratedSchema {
  paths: Paths;
  components?: { schemas?: Record<string, unknown> };
}

// Generated once at startup: the auth config is static, and the spec is imported synchronously by the docs route and tests.
const generated = (await auth.api.generateOpenAPISchema()) as unknown as GeneratedSchema;

function retag(item: Paths[string], tag: string): Paths[string] {
  return Object.fromEntries(
    Object.entries(item).map(([method, op]) => {
      const description = typeof op.description === "string" ? `${op.description}\n\n${AUTH_DESCRIPTION_NOTE}` : AUTH_DESCRIPTION_NOTE;
      return [method, { ...op, tags: [tag], description }];
    })
  );
}

/** Better Auth paths, prefixed with the mount point and tagged for the docs UI. */
export const betterAuthPaths: Paths = Object.fromEntries(
  Object.entries(generated.paths)
    .filter(([path]) => !HIDDEN_PATHS[path])
    .map(([path, item]) => [
      `${AUTH_BASE_PATH}${path}`,
      retag(item, path.startsWith(ADMIN_PATH_PREFIX) ? ADMIN_TAG : AUTH_TAG),
    ])
);

export const betterAuthSchemas: Record<string, unknown> = generated.components?.schemas ?? {};
