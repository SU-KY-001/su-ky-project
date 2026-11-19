import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { adminUserService } from "./adminUserService";

const originalFetch = globalThis.fetch;
const requests: Array<{ url: string; method: string; body: unknown }> = [];
let responseBody: unknown;

beforeEach(() => {
  requests.length = 0;
  responseBody = {};
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requests.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("admin user service", () => {
  it("accepts the first Better Auth page when offset is omitted", async () => {
    responseBody = {
      users: [],
      total: 0,
      limit: 10,
    };

    const result = await adminUserService.list({ page: 1, limit: 10 });

    expect(result).toEqual({ items: [], page: 1, limit: 10, total: 0 });
  });

  it("maps Better Auth pagination, search and role filtering", async () => {
    responseBody = {
      users: [{
        id: "user-1",
        name: "Nguyễn Minh Anh",
        email: "minhanh@example.org",
        emailVerified: true,
        image: null,
        role: "moderator",
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: "2026-10-10T08:00:00.000Z",
        updatedAt: "2026-10-11T08:00:00.000Z",
      }],
      total: 21,
      limit: 10,
      offset: 10,
    };

    const result = await adminUserService.list({
      page: 2,
      limit: 10,
      searchValue: "Minh Anh",
      searchField: "name",
      role: "moderator",
    });

    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/api/auth/admin/list-users");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "10",
      offset: "10",
      sortBy: "createdAt",
      sortDirection: "desc",
      searchValue: "Minh Anh",
      searchField: "name",
      searchOperator: "contains",
      filterField: "role",
      filterValue: "moderator",
      filterOperator: "eq",
    });
    expect(result.page).toBe(2);
    expect(result.total).toBe(21);
    expect(result.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("maps create, update, role, lock and delete operations to Better Auth", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Minh Anh",
      email: "minhanh@example.org",
      emailVerified: false,
      image: null,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: "2026-10-10T08:00:00.000Z",
      updatedAt: "2026-10-10T08:00:00.000Z",
    };

    responseBody = { user };
    await adminUserService.create({ name: user.name, email: user.email, password: "password123", role: "user" });
    responseBody = user;
    await adminUserService.update("user-1", { name: "Nguyễn Minh Anh Trần", email: user.email });
    responseBody = { user: { ...user, role: "moderator" } };
    await adminUserService.setRole("user-1", "moderator");
    responseBody = { user: { ...user, banned: true } };
    await adminUserService.ban("user-1", "Tạm khóa bởi quản trị viên");
    responseBody = { user };
    await adminUserService.unban("user-1");
    responseBody = { success: true };
    await adminUserService.remove("user-1");

    expect(requests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/api/auth/admin/create-user",
      "/api/auth/admin/update-user",
      "/api/auth/admin/set-role",
      "/api/auth/admin/ban-user",
      "/api/auth/admin/unban-user",
      "/api/auth/admin/remove-user",
    ]);
    expect(requests[1]?.body).toEqual({ userId: "user-1", data: { name: "Nguyễn Minh Anh Trần", email: user.email } });
    expect(requests[2]?.body).toEqual({ userId: "user-1", role: "moderator" });
  });
});
