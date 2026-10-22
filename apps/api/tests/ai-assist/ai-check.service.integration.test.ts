import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { DomainError } from "../../src/core/errors/domain-error";
import { AiDisabledError, AiUnavailableError } from "../../src/modules/ai-engine";
import { assertTestDatabase, createModerator, makeSession, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "../support/integration";
import { block, buildService, createEpisodeWithSources, createInput, deferred, fakeAgent, waitForFinish } from "./support";

const TEXT = "Năm 1100, vua Lý Thái Tổ dời đô ra Thăng Long.";
const NO_ITEMS = fakeAgent(async () => ({ items: [] }));

async function expectDomainError(promise: Promise<unknown>, status: DomainError["status"], code: DomainError["code"]) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(DomainError);
  expect({ status: (error as DomainError).status, code: (error as DomainError).code }).toEqual({ status, code });
}

describe.skipIf(!RUN_INTEGRATION)("ai check service rules (database)", () => {
  const runId = uniqueSuffix();
  const ownerId = `it-ai-svc-${runId}`;
  const strangerId = `it-ai-other-${runId}`;
  const owner = makeSession(ownerId, "moderator");
  const stranger = makeSession(strangerId, "moderator");

  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(ownerId);
    await createModerator(strangerId);
  });
  afterAll(async () => {
    await removeFixtures(ownerId);
    await removeFixtures(strangerId);
  });

  it("hides the episode from a moderator who does not own it (404)", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "perm", [{ kind: "url" }]);
    const { service } = buildService({ agent: NO_ITEMS });
    await expectDomainError(service.create(stranger, fx.episodeId, createInput([block("b0", TEXT)])), 404, "NOT_FOUND");
  });

  it("returns 422 NO_READABLE_SOURCE for no source, an unverified source, or a PDF without loaded pages", async () => {
    const { service } = buildService({ agent: NO_ITEMS });
    for (const [tag, sources] of [
      ["none", []],
      ["pending", [{ kind: "url" as const, verified: false }]],
      ["nopages", [{ kind: "pdf" as const }]],
    ] as const) {
      const fx = await createEpisodeWithSources(ownerId, runId, tag, [...sources]);
      await expectDomainError(service.create(owner, fx.episodeId, createInput([block("b0", TEXT)])), 422, "NO_READABLE_SOURCE");
    }
  });

  it("returns 422 when the script is over script.max_chars", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "big", [{ kind: "url" }]);
    const { service } = buildService({ agent: NO_ITEMS });
    await expectDomainError(service.create(owner, fx.episodeId, createInput([block("b0", "x".repeat(60_001))])), 422, "VALIDATION_ERROR");
  });

  it("maps engine readiness failures to 503 AI_DISABLED / AI_UNAVAILABLE", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "ready", [{ kind: "url" }]);
    const input = createInput([block("b0", TEXT)]);
    const disabled = buildService({ agent: NO_ITEMS, assertReady: async () => { throw new AiDisabledError(); } });
    await expectDomainError(disabled.service.create(owner, fx.episodeId, input), 503, "AI_DISABLED");
    const unavailable = buildService({ agent: NO_ITEMS, assertReady: async () => { throw new AiUnavailableError(); } });
    await expectDomainError(unavailable.service.create(owner, fx.episodeId, input), 503, "AI_UNAVAILABLE");
  });

  it("rejects checks over the per-user limit (429) and frees the slot when the check ends", async () => {
    const a = await createEpisodeWithSources(ownerId, runId, "lim-a", [{ kind: "url" }]);
    const b = await createEpisodeWithSources(ownerId, runId, "lim-b", [{ kind: "url" }]);
    const hold = deferred();
    const { service, repo } = buildService({
      config: { maxConcurrentPerUser: 1 },
      agent: fakeAgent(async () => {
        await hold.promise;
        return { items: [] };
      }),
    });
    const input = createInput([block("b0", TEXT)]);
    const first = await service.create(owner, a.episodeId, input);
    // Per-user limit is checked first, so with a limit of 1 the same-episode retry is a 429 too.
    await expectDomainError(service.create(owner, a.episodeId, input), 429, "AI_CONCURRENCY_LIMIT");
    await expectDomainError(service.create(owner, b.episodeId, input), 429, "AI_CONCURRENCY_LIMIT");
    hold.resolve();
    await waitForFinish(repo, first.id);
    // Slot is free again once the check is final.
    const again = await service.create(owner, b.episodeId, input);
    await waitForFinish(repo, again.id);
  });

  it("lets only one of two simultaneous POSTs through", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "race", [{ kind: "url" }]);
    const hold = deferred();
    const { service, repo } = buildService({ agent: fakeAgent(async () => { await hold.promise; return { items: [] }; }) });
    const input = createInput([block("b0", TEXT)]);
    const results = await Promise.allSettled([service.create(owner, fx.episodeId, input), service.create(owner, fx.episodeId, input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as DomainError).code).toBe("AI_CHECK_ALREADY_RUNNING");
    hold.resolve();
    const winner = results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>;
    await waitForFinish(repo, winner.value.id);
  });

  it("PATCH is idempotent, applied sets appliedAt once, and items outside the check/episode are 404", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "patch", [{ kind: "url" }]);
    const other = await createEpisodeWithSources(ownerId, runId, "patch2", [{ kind: "url" }]);
    const { service, repo } = buildService({
      agent: fakeAgent(async () => ({
        items: [{ blockRef: "b0", kind: "FACT_DOUBT", severity: "LOW", basis: "NOT_FOUND", message: "Chưa thấy nguồn nói về chi tiết này.", suggestion: "", evidence: [] }],
      })),
    });
    const { id } = await service.create(owner, fx.episodeId, createInput([block("b0", TEXT)]));
    await waitForFinish(repo, id);
    const [item] = (await service.get(owner, fx.episodeId, id)).items;

    const reviewed = await service.patchItem(owner, fx.episodeId, id, item!.id, { status: "REVIEWED" });
    expect(reviewed.status).toBe("REVIEWED");
    expect((await service.patchItem(owner, fx.episodeId, id, item!.id, { status: "REVIEWED" })).status).toBe("REVIEWED");

    const applied = await service.patchItem(owner, fx.episodeId, id, item!.id, { applied: true });
    expect(applied.appliedAt).toBeInstanceOf(Date);
    const appliedAgain = await service.patchItem(owner, fx.episodeId, id, item!.id, { applied: true });
    expect(appliedAgain.appliedAt?.getTime()).toBe(applied.appliedAt!.getTime());
    expect(appliedAgain.status).toBe("REVIEWED");

    await expectDomainError(service.patchItem(owner, other.episodeId, id, item!.id, { status: "REVIEWED" }), 404, "NOT_FOUND");
    await expectDomainError(service.patchItem(owner, fx.episodeId, id, crypto.randomUUID(), { status: "REVIEWED" }), 404, "NOT_FOUND");
    expect((await service.get(owner, fx.episodeId, id)).check.itemCounts).toEqual({ open: 0, reviewed: 1 });
  });

  it("reaper closes only RUNNING checks whose heartbeat is stale", async () => {
    const fx = await createEpisodeWithSources(ownerId, runId, "reap", [{ kind: "url" }]);
    const { repo } = buildService({ agent: NO_ITEMS });
    const base = { userId: ownerId, episodeId: fx.episodeId, kind: "SCRIPT_REVIEW" as const, status: "RUNNING" as const, config: {}, totalBlocks: 1 };
    const stale = await prisma.aiCheck.create({ data: { ...base, heartbeatAt: new Date(Date.now() - 10 * 60_000) } });
    const fresh = await prisma.aiCheck.create({ data: { ...base, heartbeatAt: new Date() } });
    const done = await prisma.aiCheck.create({ data: { ...base, status: "SUCCEEDED", heartbeatAt: new Date(Date.now() - 10 * 60_000) } });

    expect(await repo.reapStale(new Date(Date.now() - 60_000))).toBeGreaterThanOrEqual(1);
    expect(await prisma.aiCheck.findUniqueOrThrow({ where: { id: stale.id } })).toMatchObject({ status: "FAILED", errorCode: "INTERRUPTED" });
    expect((await prisma.aiCheck.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe("RUNNING");
    expect((await prisma.aiCheck.findUniqueOrThrow({ where: { id: done.id } })).status).toBe("SUCCEEDED");
  });
});
