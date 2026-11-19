import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { AgentProviderError, AgentTimeoutError } from "../../src/modules/ai-engine";
import { assertTestDatabase, createModerator, makeSession, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "../support/integration";
import { block, buildService, createEpisodeWithSources, createInput, deferred, fakeAgent, SOURCE_TEXT, waitForFinish } from "./support";

const WRONG_YEAR_BLOCK = "Năm 1100, vua Lý Thái Tổ dời đô ra Thăng Long.";
const QUOTE = "Mùa thu năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La.";

function contradicted(blockRef: string, quote: string, page = 1) {
  return {
    items: [
      {
        blockRef,
        kind: "FACT_DOUBT" as const,
        severity: "HIGH" as const,
        basis: "CONTRADICTED" as const,
        message: "Nguồn ghi năm khác với kịch bản.",
        suggestion: "",
        evidence: [{ source: "S1", page, quote }],
      },
    ],
  };
}

describe.skipIf(!RUN_INTEGRATION)("script review runner (database, fake agent)", () => {
  const runId = uniqueSuffix();
  const userId = `it-ai-run-${runId}`;
  const session = makeSession(userId, "moderator");

  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(userId);
  });
  afterAll(async () => {
    await removeFixtures(userId);
  });

  it("keeps URL evidence only when the quote is in the fetched text of that source's URL, and records usage", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "url", [{ kind: "url" }]);
    const { service, repo } = buildService({
      agent: fakeAgent(async (request) => {
        request.onToolResult?.({ toolName: "fetch_content", toolCallId: "1", args: { url: fx.urlOf(0) }, text: SOURCE_TEXT, isError: false });
        return contradicted("b0", QUOTE);
      }),
    });
    const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK)]));
    const check = await waitForFinish(repo, id);
    const { items } = await service.get(session, fx.episodeId, id);

    expect(check).toMatchObject({ status: "SUCCEEDED", processedBlocks: 1, failedBlocks: 0, inputTokens: 10, outputTokens: 5, toolCalls: 1 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ seq: 0, basis: "CONTRADICTED", status: "OPEN" });
    expect(items[0]!.evidence).toEqual([{ sourceId: fx.sourceIds[0]!, page: 1, quote: QUOTE }]);
  });

  it("downgrades CONTRADICTED to NOT_FOUND when the quote is invented or came from another URL", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "fake", [{ kind: "url" }]);
    const invented = "Năm 1100 vua dời đô ra Thăng Long theo chiếu của triều đình.";
    for (const fetched of [{ url: fx.urlOf(0), text: SOURCE_TEXT, quote: invented }, { url: "https://other.example/x", text: invented, quote: invented }]) {
      const { service, repo } = buildService({
        agent: fakeAgent(async (request) => {
          request.onToolResult?.({ toolName: "fetch_content", toolCallId: "1", args: { url: fetched.url }, text: fetched.text, isError: false });
          return contradicted("b0", fetched.quote);
        }),
      });
      const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK)]));
      await waitForFinish(repo, id);
      const { items } = await service.get(session, fx.episodeId, id);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ basis: "NOT_FOUND", suggestion: null, evidence: [] });
    }
  });

  it("verifies PDF evidence against the exact (source, page) the agent opened", async () => {
    const pages = ["Trang một nói về nhà Đinh.", SOURCE_TEXT, "Trang ba chép về nhà Tiền Lê."];
    const fx = await createEpisodeWithSources(userId, runId, "pdf", [{ kind: "pdf", pages }]);
    const run = async (quotePage: number, quote: string) => {
      const { service, repo } = buildService({
        agent: fakeAgent(async (request) => {
          const read = request.customTools?.find((t) => t.name === "read_pages");
          await (read as unknown as { execute: (id: string, p: unknown) => Promise<unknown> }).execute("1", { source: "S1", from: 2, to: 2 });
          return contradicted("b0", quote, quotePage);
        }),
      });
      const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK)]));
      await waitForFinish(repo, id);
      return (await service.get(session, fx.episodeId, id)).items[0]!;
    };

    expect(await run(2, QUOTE)).toMatchObject({ basis: "CONTRADICTED", evidence: [{ sourceId: fx.sourceIds[0]!, page: 2, quote: QUOTE }] });
    // Page 3 was never opened, so a quote claimed from it cannot be evidence even if the text exists there.
    expect(await run(3, pages[2]!)).toMatchObject({ basis: "NOT_FOUND", evidence: [] });
  });

  it("gives gap-free seq in publish order even when batches finish in reverse order", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "order", [{ kind: "url" }]);
    const releaseFirst = deferred();
    const { service, repo, hub } = buildService({
      agent: fakeAgent(async (request) => {
        const ref = /ref="(b\d+)"/.exec(request.userPrompt)?.[1] ?? "b0";
        if (ref === "b0") await releaseFirst.promise;
        request.onToolResult?.({ toolName: "fetch_content", toolCallId: ref, args: { url: fx.urlOf(0) }, text: SOURCE_TEXT, isError: false });
        if (ref === "b1") setTimeout(releaseFirst.resolve, 20);
        return contradicted(ref, QUOTE);
      }),
    });
    const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK), block("b1", `${WRONG_YEAR_BLOCK} Lần hai.`)]));
    const published: number[] = [];
    hub.subscribe(id, (_event, seq) => {
      if (seq !== null) published.push(seq);
    });
    await waitForFinish(repo, id);
    const { items } = await service.get(session, fx.episodeId, id);

    expect(items.map((i) => i.seq)).toEqual([0, 1]);
    expect(items.map((i) => i.blockRef)).toEqual(["b1", "b0"]);
    expect(published).toEqual([0, 1]);
  });

  it("counts a failed batch and still succeeds; fails with ALL_BLOCKS_FAILED when every batch fails", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "fail", [{ kind: "url" }]);
    const blocks = [block("b0", WRONG_YEAR_BLOCK), block("b1", `${WRONG_YEAR_BLOCK} Hai.`)];
    const partial = buildService({
      agent: fakeAgent(async (request) => {
        if (request.userPrompt.includes('ref="b1"')) throw new Error("model exploded");
        return { items: [] };
      }),
    });
    const a = await partial.service.create(session, fx.episodeId, createInput(blocks));
    expect(await waitForFinish(partial.repo, a.id)).toMatchObject({ status: "SUCCEEDED", processedBlocks: 2, failedBlocks: 1, errorCode: null });

    const allFail = buildService({
      agent: fakeAgent(async () => {
        throw new Error("model exploded");
      }),
    });
    const b = await allFail.service.create(session, fx.episodeId, createInput(blocks));
    expect(await waitForFinish(allFail.repo, b.id)).toMatchObject({ status: "FAILED", errorCode: "ALL_BLOCKS_FAILED", failedBlocks: 2 });
  });

  it("counts a per-session timeout as a failed batch instead of silently skipping it", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "sess-timeout", [{ kind: "url" }]);
    const blocks = [block("b0", WRONG_YEAR_BLOCK), block("b1", `${WRONG_YEAR_BLOCK} Hai.`)];
    // The check-level signal is never aborted: only one session hits PI_RUN_TIMEOUT_MS.
    const partial = buildService({
      agent: fakeAgent(async (request) => {
        if (request.signal?.aborted) throw new Error("check signal must not be aborted");
        if (request.userPrompt.includes('ref="b1"')) throw new AgentTimeoutError(300_000);
        return { items: [] };
      }),
    });
    const a = await partial.service.create(session, fx.episodeId, createInput(blocks));
    expect(await waitForFinish(partial.repo, a.id)).toMatchObject({ status: "SUCCEEDED", processedBlocks: 2, failedBlocks: 1, errorCode: null });

    const allTimeout = buildService({
      agent: fakeAgent(async () => {
        throw new AgentTimeoutError(300_000);
      }),
    });
    const b = await allTimeout.service.create(session, fx.episodeId, createInput(blocks));
    expect(await waitForFinish(allTimeout.repo, b.id)).toMatchObject({ status: "FAILED", errorCode: "ALL_BLOCKS_FAILED", processedBlocks: 2, failedBlocks: 2 });
  });

  it("stops the whole check on a provider AUTH failure", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "auth", [{ kind: "url" }]);
    const { service, repo } = buildService({
      agent: fakeAgent(async () => {
        throw new AgentProviderError({ kind: "AUTH", status: 403, retryable: false, message: "forbidden" });
      }),
    });
    const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK), block("b1", `${WRONG_YEAR_BLOCK} Hai.`)]));
    expect(await waitForFinish(repo, id)).toMatchObject({ status: "FAILED", errorCode: "AI_PROVIDER_AUTH" });
  });

  it("cancels a running check and inserts nothing afterwards", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "cancel", [{ kind: "url" }]);
    const started = deferred();
    const { service, repo } = buildService({
      agent: fakeAgent((request) => {
        started.resolve();
        return new Promise((_, reject) => request.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
      }),
    });
    const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK)]));
    await started.promise;
    expect(await service.cancel(session, fx.episodeId, id)).toMatchObject({ status: "CANCELLED" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await repo.findCheckById(id)).toMatchObject({ status: "CANCELLED", failedBlocks: 0 });
    expect((await service.get(session, fx.episodeId, id)).items).toHaveLength(0);
  });

  it("records which sources were used on the check", async () => {
    const fx = await createEpisodeWithSources(userId, runId, "used", [{ kind: "pdf" }, { kind: "url" }]);
    const { service, repo } = buildService({ agent: fakeAgent(async () => ({ items: [] })) });
    const { id } = await service.create(session, fx.episodeId, createInput([block("b0", WRONG_YEAR_BLOCK)]));
    await waitForFinish(repo, id);
    const row = await prisma.aiCheck.findUniqueOrThrow({ where: { id } });
    expect(row.sourcesUsed).toEqual([fx.sourceIds[1]!]);
  });
});
