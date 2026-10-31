import { beforeAll, afterAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import {
  HistoricalPeriodDetailSchema,
  HistoricalPhaseDetailSchema,
  paginatedSchema,
} from "@repo/shared";
import { app } from "../src/app";
import {
  RUN_INTEGRATION,
  assertTestDatabase,
  createModerator,
  removeFixtures,
} from "./support/integration";
describe.skipIf(!RUN_INTEGRATION)("historical catalog HTTP", () => {
  const a = crypto.randomUUID(),
    b = crypto.randomUUID(),
    user = crypto.randomUUID(),
    admin = crypto.randomUUID();
  const tokens = new Map<string, string>();
  beforeAll(async () => {
    assertTestDatabase();
    for (const id of [a, b, user, admin]) {
      await createModerator(id);
      const token = crypto.randomUUID();
      tokens.set(id, token);
      await prisma.session.create({
        data: {
          id: crypto.randomUUID(),
          userId: id,
          token,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
    }
    await prisma.user.update({ where: { id: user }, data: { role: "user" } });
    await prisma.user.update({ where: { id: admin }, data: { role: "admin" } });
  });
  afterAll(async () => {
    for (const id of [a, b, user, admin]) await removeFixtures(id);
  });
  const headers = (id: string) => ({
    Authorization: `Bearer ${tokens.get(id)}`,
    "Content-Type": "application/json",
  });
  it("enforces mounted roles, persists idempotent CRUD and rejects stale/foreign writes", async () => {
    const listing = await app.request(
      "/api/studio/historical-periods?includePhases=false",
      { headers: headers(a) },
    );
    expect(listing.status).toBe(200);
    const badSource = await app.request("/api/studio/sources", {
      method: "POST",
      headers: { ...headers(a), "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        title: "Năm vượt INT",
        tier: "TIER_3_KHOA_HOC",
        url: "https://example.org/book",
        publicationYear: 2147483648,
      }),
    });
    expect(badSource.status).toBe(400);
    expect(
      paginatedSchema(HistoricalPeriodDetailSchema).parse(await listing.json())
        .page,
    ).toBe(1);
    expect((await app.request("/api/studio/historical-periods")).status).toBe(
      401,
    );
    expect(
      (
        await app.request("/api/studio/historical-periods", {
          headers: headers(user),
        })
      ).status,
    ).toBe(403);
    const key = crypto.randomUUID(),
      body = JSON.stringify({
        name: "HTTP BCE " + a,
        summary: "Lưu từ HTTP",
        time: {
          kind: "RANGE",
          start: { year: -700, precision: "YEAR", approximate: false },
          end: { year: -179, precision: "YEAR", approximate: false },
          endState: "KNOWN",
        },
      });
    const create = () =>
      app.request("/api/studio/historical-periods", {
        method: "POST",
        headers: { ...headers(admin), "Idempotency-Key": key },
        body,
      });
    const first = await create();
    expect(first.status).toBe(201);
    const period = HistoricalPeriodDetailSchema.parse(await first.json());
    const repeated = await create();
    expect(repeated.status).toBe(201);
    expect(HistoricalPeriodDetailSchema.parse(await repeated.json()).id).toBe(
      period.id,
    );
    expect(
      (
        await prisma.historicalPeriod.findUniqueOrThrow({
          where: { id: period.id },
        })
      ).endYear,
    ).toBe(-178);
    expect(
      (
        await app.request(`/api/studio/historical-periods/${period.id}`, {
          method: "PATCH",
          headers: headers(b),
          body: JSON.stringify({ name: "Cấm sửa", baseVersion: 1 }),
        })
      ).status,
    ).toBe(403);
    const phaseRes = await app.request("/api/studio/historical-phases", {
      method: "POST",
      headers: { ...headers(a), "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        name: "Giai đoạn HTTP",
        periodId: period.id,
        time: period.time,
      }),
    });
    expect(phaseRes.status).toBe(201);
    const phase = HistoricalPhaseDetailSchema.parse(await phaseRes.json());
    const writes = await Promise.all(
      ["A", "B"].map((summary) =>
        app.request(`/api/studio/historical-phases/${phase.id}`, {
          method: "PATCH",
          headers: headers(a),
          body: JSON.stringify({ summary, baseVersion: 1 }),
        }),
      ),
    );
    expect(writes.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (
        await app.request(`/api/studio/historical-periods/${period.id}`, {
          method: "DELETE",
          headers: headers(admin),
          body: JSON.stringify({ baseVersion: 1 }),
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await app.request(`/api/studio/historical-phases/${phase.id}`, {
          method: "DELETE",
          headers: headers(a),
          body: JSON.stringify({ baseVersion: 2 }),
        })
      ).status,
    ).toBe(204);
  });
});
