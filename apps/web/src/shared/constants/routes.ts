import type { UserRole } from "@repo/shared";

export const APP_PATHS = {
  home: "/",
  login: "/login",
  docs: "/docs",
  moderator: "/moderator",
  admin: "/admin",
  unauthorized: "/unauthorized",
} as const;

export function hasAnyRole(currentRole: string | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!currentRole) return false;
  const roles = currentRole.split(",").map((role) => role.trim());
  return allowedRoles.some((role) => roles.includes(role));
}

export function getRoleHomePath(role: string | null | undefined): string {
  if (hasAnyRole(role, ["admin"])) return APP_PATHS.admin;
  if (hasAnyRole(role, ["moderator"])) return APP_PATHS.moderator;
  return APP_PATHS.home;
}
