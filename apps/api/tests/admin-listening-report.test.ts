import { expect, test } from "bun:test";
import { Hono } from "hono";
import { AdminListeningReportQuerySchema, type AdminListeningReport } from "@repo/shared";
import type { AppEnv } from "../src/types";
import { createAuthGuards } from "../src/modules/auth/auth.middleware";
import { errorHandler } from "../src/core/middleware";
import { makeSession } from "./support/integration";
import { ListeningReportService } from "../src/modules/admin/listening-report/listening-report.service";
import { createListeningReportRoute } from "../src/modules/admin/listening-report/listening-report.routes";
import { PrismaListeningReportRepository } from "../src/modules/admin/listening-report/prisma-listening-report.repository";

const empty = { summary: { uniqueListeners: 0, validListens: 0, listeningMs: 0, completedEpisodes: 0 }, daily: [], topEpisodes: [] };
const period = { from: "2026-11-01", to: "2026-11-02" };

test("report rejects invalid dates, reversed windows, excess range and unexpected owner filters", () => {
  for (const query of [{ from: "2026-02-30", to: "2026-03-01" }, { from: "2026-11-02", to: "2026-11-01" }, { from: "2025-01-01", to: "2026-01-02" }, { ...period, userId: "someone" }]) {
    expect(AdminListeningReportQuerySchema.safeParse(query).success).toBe(false);
  }
  expect(AdminListeningReportQuerySchema.safeParse({ from: "2026-01-01", to: "2027-01-01" }).success).toBe(true);
});

test("report includes the whole last day in Vietnam and fills missing days without summing daily unique listeners", async () => {
  const now = new Date("2026-11-02T23:00:00Z");
  const service = new ListeningReportService({ read: async (window) => {
    expect(window.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-11-02T17:00:00.000Z");
    expect(window.now).toEqual(now);
    return { ...empty, summary: { ...empty.summary, uniqueListeners: 1 }, daily: [{ date: "2026-11-01", uniqueListeners: 1, validListens: 1, listeningMs: 30_000 }] };
  } }, () => now);
  const report = await service.report(period);
  expect(report.daily).toHaveLength(2);
  expect(report.daily[1]).toEqual({ date: "2026-11-02", uniqueListeners: 0, validListens: 0, listeningMs: 0 });
  expect(report.summary.uniqueListeners).toBe(1);
});

test("repository uses a consistent snapshot, qualified sessions, distinct completions and deterministic top five", async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = { $transaction: async (run: (tx: unknown) => Promise<unknown>, options: { isolationLevel: string }) => {
    expect(options.isolationLevel).toBe("RepeatableRead");
    return run({ $queryRaw: async (query: { sql: string; values: unknown[] }) => {
      queries.push(query);
      if (queries.length === 1) return [{ uniqueListeners: 2n, validListens: 3n, listeningMs: 90_000n, completedEpisodes: 1n }];
      if (queries.length === 2) return [{ date: "2026-11-01", uniqueListeners: 2n, validListens: 3n, listeningMs: 90_000n }];
      if (queries.length === 4) return [{ period: "week", date: "2026-10-26", uniqueListeners: 2n, validListens: 3n, listeningMs: 90_000n }];
      return [{ episodeId: crypto.randomUUID(), title: "Tập thật", seriesTitle: "Series", uniqueListeners: 2n, validListens: 3n, listeningMs: 90_000n }];
    } });
  } } as unknown as NonNullable<ConstructorParameters<typeof PrismaListeningReportRepository>[0]>;
  const report = await new PrismaListeningReportRepository(db).read({ start: new Date("2026-10-31T17:00Z"), end: new Date("2026-11-02T17:00Z"), now: new Date("2026-11-03T00:00Z") });
  expect(report.summary).toEqual({ uniqueListeners: 2, validListens: 3, listeningMs: 90_000, completedEpisodes: 1 });
  expect(queries[0]?.sql).toContain("COUNT(DISTINCT (p.user_id, p.episode_id))");
  expect(queries[0]?.sql).toContain("ls.played_ms > 0");
  expect(queries[0]?.sql).toContain("ls.started_at <");
  expect(queries[1]?.sql).toContain("Asia/Ho_Chi_Minh");
  expect(queries[2]?.sql).toContain('ORDER BY "validListens" DESC, "uniqueListeners" DESC, "listeningMs" DESC, e.id ASC LIMIT 5');
  expect(JSON.stringify(report)).not.toContain("userId");
  expect(report.weekly?.[0]?.uniqueListeners).toBe(2);
  expect(queries[3]?.sql).toContain("COUNT(DISTINCT ls.user_id)");
  expect(queries[3]?.sql).toContain("DATE_TRUNC");
});

for (const role of [null, "user", "moderator", "admin"] as const) {
  test(`listening report admin access: ${role ?? "anonymous"}`, async () => {
    let calls = 0;
    const guard = createAuthGuards(async () => role ? makeSession("self", role) : null).requireAdmin;
    const app = new Hono<AppEnv>().onError(errorHandler).route("/reports", createListeningReportRoute({ report: async (query): Promise<AdminListeningReport> => {
      calls++;
      return { ...empty, ...query, timezone: "Asia/Ho_Chi_Minh", generatedAt: new Date().toISOString() };
    } }, guard));
    const response = await app.request("/reports/listening?from=2026-11-01&to=2026-11-02");
    expect(response.status).toBe(role === "admin" ? 200 : role ? 403 : 401);
    expect(calls).toBe(role === "admin" ? 1 : 0);
    if (role === "admin") {
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect((await app.request("/reports/listening?from=2026-11-02&to=2026-11-01")).status).toBe(400);
    }
  });
}
