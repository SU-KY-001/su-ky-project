import { expect, test } from "bun:test";
import { Hono } from "hono";
import { PodcastRankingQuerySchema } from "@repo/shared";
import { PodcastRankingService } from "../src/modules/listening/application/podcast-ranking.service";
import { createPodcastRankingRoute } from "../src/modules/listening/presentation/podcast-ranking.routes";
import { createAuthGuards } from "../src/modules/auth/auth.middleware";
import { makeSession } from "./support/integration";
import { errorHandler } from "../src/core/middleware";
import type { AppEnv } from "../src/types";

test("ranking rejects arbitrary owner, period and unbounded page size", () => {
  for (const value of [{ userId: "other" }, { period: "day" }, { scope: "admin" }, { page: 0 }, { limit: 51 }]) expect(PodcastRankingQuerySchema.safeParse(value).success).toBe(false);
});
for (const scope of ["personal", "system"] as const) {
  test(`${scope} SQL is bounded to qualified start window and response contains no listener identity`, async () => {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      return queries.length === 1 ? [{ total: 1n }] : [{ episodeId: crypto.randomUUID(), episodeSlug: "a", title: "A", seriesSlug: "s", seriesTitle: "S", listenCount: 3n }];
    } }) } as unknown as NonNullable<ConstructorParameters<typeof PodcastRankingService>[0]>;
    const result = await new PodcastRankingService(db, () => new Date("2026-11-09T00:00:00Z")).list("self", { scope, period: "week", page: 2, limit: 5 });
    expect(result.items[0]?.rank).toBe(6); expect(result.items[0]?.listenCount).toBe(3);
    expect(Object.keys(result.items[0]!)).not.toContain("userId");
    expect(queries[1]?.sql).toContain("ls.qualified_at IS NOT NULL");
    expect(queries[1]?.sql).toContain("ls.started_at >=");
    expect(queries[1]?.sql).toContain("ORDER BY COUNT(*) DESC, e.title ASC, e.id ASC");
    expect(queries[1]?.values.includes("self")).toBe(scope === "personal");
    expect(queries[1]?.values.slice(-2)).toEqual([5, 5]);
  });
}
for (const role of ["user", "moderator", "admin"] as const) {
  test(`ranking any scope is authenticated/self scoped for ${role}`, async () => {
    const ids: string[] = [];
    const guard = createAuthGuards(async () => makeSession("self", role)).requireAuth;
    const app = new Hono<AppEnv>().onError(errorHandler).route("/me", createPodcastRankingRoute({ list: async (id, query) => {
      ids.push(id); return { ...query, window: { start: new Date(), end: new Date(), timezone: "Asia/Ho_Chi_Minh" }, items: [], total: 0 };
    } }, guard));
    expect((await app.request("/me/top-podcasts?scope=personal")).status).toBe(200);
    const system = await app.request("/me/top-podcasts?scope=system");
    expect(system.status).toBe(200); expect(system.headers.get("Cache-Control")).toBe("private, no-store");
    expect(ids).toEqual(["self", "self"]);
    expect((await app.request("/me/top-podcasts?userId=other")).status).toBe(400);
  });
}
test("ranking system scope still requires login", async () => {
  const app = new Hono<AppEnv>().onError(errorHandler).route("/me", createPodcastRankingRoute({ list: async () => { throw new Error("Should not call service"); } }, createAuthGuards(async () => null).requireAuth));
  expect((await app.request("/me/top-podcasts?scope=system")).status).toBe(401);
});
