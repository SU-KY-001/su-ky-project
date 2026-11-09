import { expect, test } from "bun:test";
import { Hono } from "hono";
import { TopQuizzesQuerySchema } from "@repo/shared";
import { createTopQuizzesRoute } from "../src/modules/gamification/top-quizzes.routes";
import { createAuthGuards } from "../src/modules/auth/auth.middleware";
import { makeSession } from "./support/integration";
import { errorHandler } from "../src/core/middleware";
import type { AppEnv } from "../src/types";
import { TopQuizzesService } from "../src/modules/gamification/top-quizzes.service";

test("top quiz query defaults, pagination and ownership injection", () => {
  expect(TopQuizzesQuerySchema.parse({})).toEqual({ page: 1, limit: 4 });
  for (const input of [{ userId: "other" }, { page: 0 }, { limit: 51 }, { period: "week" }]) expect(TopQuizzesQuerySchema.safeParse(input).success).toBe(false);
});

for (const role of ["user", "moderator", "admin"] as const) {
  test(`top quizzes uses session owner for ${role}`, async () => {
    const calls: unknown[] = [];
    const guard = createAuthGuards(async () => makeSession("self", role)).requireAuth;
    const app = new Hono<AppEnv>().onError(errorHandler).route("/me", createTopQuizzesRoute({ list: async (userId, query) => {
      calls.push({ userId, ...query }); return { ...query, total: 0, items: [] };
    } }, guard));
    const response = await app.request("/me/top-quizzes?page=2&limit=5");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(calls).toEqual([{ userId: "self", page: 2, limit: 5 }]);
    expect((await app.request("/me/top-quizzes?userId=other")).status).toBe(400);
    expect(calls).toHaveLength(1);
  });
}
test("anonymous top quiz requests never reach data access", async () => {
  let called = false;
  const app = new Hono<AppEnv>().onError(errorHandler).route("/me", createTopQuizzesRoute({ list: async () => {
    called = true; throw new Error("Unexpected data access");
  } }, createAuthGuards(async () => null).requireAuth));
  expect((await app.request("/me/top-quizzes")).status).toBe(401);
  expect(called).toBe(false);
});
test("service binds owner and pagination, serializes count and preserves hidden history", async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>, options: { isolationLevel: string }) => {
    expect(options.isolationLevel).toBe("RepeatableRead");
    return fn({ $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      return queries.length === 1 ? [{ total: 8n }] : [{ quizId: "q", attemptCount: 3n, available: false }];
    } });
  } } as unknown as NonNullable<ConstructorParameters<typeof TopQuizzesService>[0]>;
  const result = await new TopQuizzesService(db).list("session-owner", { page: 2, limit: 5 });
  expect(result.page).toBe(2);
  expect(result.limit).toBe(5);
  expect(result.total).toBe(8);
  expect(result.items[0]?.quizId).toBe("q");
  expect(result.items[0]?.attemptCount).toBe(3);
  expect(result.items[0]?.available).toBe(false);
  expect(queries[0]?.values).toEqual(["session-owner"]);
  expect(queries[1]?.values).toEqual(["session-owner", 5, 5]);
  expect(queries[1]?.sql).toContain("COUNT(*)");
  expect(queries[1]?.sql).not.toContain("passed =");
});
