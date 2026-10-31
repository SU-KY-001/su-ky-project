import type { UserRole } from "@repo/shared";
import type { AuthRedirectLocation } from "../types/auth";

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

const isUnder = (pathname: string, base: string): boolean => pathname === base || pathname.startsWith(`${base}/`);

/** Landing after login: the deep link saved by ProtectedRoute when this role may open it, else the role home. */
export function getPostLoginPath(role: string | null | undefined, from?: AuthRedirectLocation): string {
  const home = getRoleHomePath(role);
  if (!from) return home;
  const { pathname, search = "", hash = "" } = from;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return home;
  if (isUnder(pathname, APP_PATHS.login)) return home;
  const target = `${pathname}${search}${hash}`;
  if (isUnder(pathname, APP_PATHS.admin)) return hasAnyRole(role, ["admin"]) ? target : home;
  if (isUnder(pathname, APP_PATHS.moderator)) return hasAnyRole(role, ["moderator"]) ? target : home;
  // Staff opening a public page while logged out still land on their workspace.
  return home === APP_PATHS.home ? target : home;
}
