import { afterEach, describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { getPostLoginPath } from "@/shared/constants/routes";
import { refreshAuthenticatedUser, signOutSession } from "./sessionLifecycle";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("authentication transitions", () => {
  it("loads the new account's role instead of reusing the cached guest", async () => {
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, null);
    const user = { id: "new-user", name: "Admin", email: "admin@example.com", emailVerified: true, role: "admin" };
    globalThis.fetch = Object.assign(async () => Response.json({ user, session: { expiresAt: "2026-12-01T00:00:00.000Z" } }), { preconnect: originalFetch.preconnect });
    expect((await refreshAuthenticatedUser(client)).role).toBe("admin");
    expect(client.getQueryData<typeof user>(currentUserQueryKey)?.id).toBe("new-user");
    client.clear();
  });

  it("clears authenticated and private data after the backend confirms logout", async () => {
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, { id: "old-user", role: "moderator" });
    client.setQueryData(["auth", "session"], { name: "Old user", role: "moderator" });
    client.setQueryData(["private", "episodes"], ["private-content"]);
    let requestedPath = "";
    let credentials: RequestCredentials | undefined;
    let method: string | undefined;
    globalThis.fetch = Object.assign(async (input: URL | RequestInfo, init?: RequestInit) => {
      requestedPath = String(input);
      credentials = init?.credentials;
      method = init?.method;
      return Response.json({ success: true });
    }, { preconnect: originalFetch.preconnect });
    await signOutSession(client);
    expect(requestedPath.endsWith("/api/auth/sign-out")).toBe(true);
    expect(credentials).toBe("include");
    expect(method).toBe("POST");
    expect(client.getQueryData(currentUserQueryKey)).toBeNull();
    expect(client.getQueryData(["auth", "session"])).toBeUndefined();
    expect(client.getQueryData(["private", "episodes"])).toBeUndefined();
    client.clear();
  });

  it("preserves the session and private data when logout fails", async () => {
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, { id: "old-user", role: "admin" });
    client.setQueryData(["private", "episodes"], ["private-content"]);
    globalThis.fetch = Object.assign(async () => Response.json({ message: "Unavailable" }, { status: 503 }), { preconnect: originalFetch.preconnect });
    await expect(signOutSession(client)).rejects.toThrow();
    expect(client.getQueryData<{ id: string; role: string }>(currentUserQueryKey)).toEqual({ id: "old-user", role: "admin" });
    expect(client.getQueryData<string[]>(["private", "episodes"])).toEqual(["private-content"]);
    client.clear();
  });

  it("preserves local authentication if the server has not confirmed logout", async () => {
    const client = new QueryClient();
    client.setQueryData(currentUserQueryKey, { id: "old-user" });
    globalThis.fetch = Object.assign(async () => Response.json({ success: false }), { preconnect: originalFetch.preconnect });
    await expect(signOutSession(client)).rejects.toThrow("Máy chủ chưa xác nhận đăng xuất");
    expect(client.getQueryData<{ id: string }>(currentUserQueryKey)?.id).toBe("old-user");
    client.clear();
  });

  it("prevents an in-flight session read from restoring the user after logout", async () => {
    const client = new QueryClient();
    let finishSessionRead: (value: { id: string }) => void = () => undefined;
    const read = client.fetchQuery({ queryKey: currentUserQueryKey, queryFn: () => new Promise<{ id: string }>((resolve) => { finishSessionRead = resolve; }) }).catch(() => undefined);
    globalThis.fetch = Object.assign(async () => Response.json({ success: true }), { preconnect: originalFetch.preconnect });
    await signOutSession(client);
    finishSessionRead({ id: "old-user" });
    await read;
    expect(client.getQueryData(currentUserQueryKey)).toBeNull();
    client.clear();
  });
});

describe("post-login navigation", () => {
  it("returns each role to its home when there is no return path", () => {
    expect(getPostLoginPath("user")).toBe("/");
    expect(getPostLoginPath("moderator")).toBe("/moderator");
    expect(getPostLoginPath("admin")).toBe("/admin");
  });

  it("keeps authorized return paths and permits the public homepage", () => {
    expect(getPostLoginPath("moderator", { pathname: "/moderator/podcast", search: "?page=2", hash: "#episodes" })).toBe("/moderator");
    expect(getPostLoginPath("admin", { pathname: "/" })).toBe("/");
  });

  it("rejects login, external, and unauthorized return paths", () => {
    expect(getPostLoginPath("user", { pathname: "/admin" })).toBe("/");
    expect(getPostLoginPath("admin", { pathname: "/moderator/timeline" })).toBe("/admin");
    expect(getPostLoginPath("moderator", { pathname: "/login" })).toBe("/moderator");
    expect(getPostLoginPath("user", { pathname: "//example.com" })).toBe("/");
    expect(getPostLoginPath("user", { pathname: "/\\example.com" })).toBe("/");
  });
});
