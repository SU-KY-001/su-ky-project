import { prisma } from "@repo/db";
import type { CreateAiCheckInput } from "@repo/shared";
import { hashBlockText } from "@repo/shared";
import type { AiAssistConfig } from "../../src/modules/ai-assist/ai-assist.config";
import { AiCheckService } from "../../src/modules/ai-assist/application/ai-check.service";
import { CheckHub } from "../../src/modules/ai-assist/application/check-hub";
import { ModelGate } from "../../src/modules/ai-assist/application/model-gate";
import { createScriptReviewRunner, type AgentRunner } from "../../src/modules/ai-assist/application/script-review.runner";
import { PrismaAiCheckRepository } from "../../src/modules/ai-assist/infrastructure/prisma-ai-check.repository";
import { createPostgresSourcePageStore } from "../../src/modules/ai-assist/sources/postgres-source-page-store";
import type { ScriptReviewOutput } from "../../src/modules/ai-assist/schemas/script-review.schema";
import type { StructuredAgentRequest } from "../../src/modules/ai-engine";
import { contentService } from "../../src/modules/content";

export const TEST_CONFIG: AiAssistConfig = {
  checkTimeoutMs: 20_000,
  blockConcurrency: 2,
  maxConcurrentPerUser: 5,
  globalModelConcurrency: 4,
  batchBlocks: 1,
  batchMaxChars: 4000,
  maxToolCalls: 12,
  runHeartbeatMs: 60_000,
  staleAfterMs: 60_000,
};

export const SOURCE_URL = "https://example.org/dai-viet";
export const SOURCE_TEXT = "Mùa thu năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư ra thành Đại La.";

export type AgentScript = (request: StructuredAgentRequest<unknown>) => Promise<ScriptReviewOutput>;

/** Replays a scripted tool chain + model output; never calls a model. */
export function fakeAgent(script: AgentScript): AgentRunner {
  const run = async (request: StructuredAgentRequest<unknown>) => ({
    data: await script(request),
    usage: { input: 10, output: 5, total: 15 },
    model: "fake-model",
    durationMs: 1,
    attempts: 1,
  });
  return run as unknown as AgentRunner;
}

export function block(ref: string, text: string, prev = "") {
  return { ref, text, hash: hashBlockText(text), prev, dup: 1 };
}

export function createInput(blocks: ReturnType<typeof block>[]): CreateAiCheckInput {
  return { kind: "SCRIPT_REVIEW", scope: "ALL", blocks };
}

export interface ServiceOptions {
  agent: AgentRunner;
  config?: Partial<AiAssistConfig>;
  assertReady?: () => Promise<void>;
}

export function buildService({ agent, config, assertReady }: ServiceOptions) {
  const cfg = { ...TEST_CONFIG, ...config };
  const repo = new PrismaAiCheckRepository();
  const hub = new CheckHub();
  const store = createPostgresSourcePageStore();
  const runner = createScriptReviewRunner({ repo, hub, store, gate: new ModelGate(cfg.globalModelConcurrency), config: cfg, runAgent: agent });
  const service = new AiCheckService({
    repo,
    content: contentService,
    store,
    runner,
    config: cfg,
    scriptMaxChars: async () => 60_000,
    assertReady: assertReady ?? (async () => undefined),
    modelId: () => "fake-model",
  });
  return { service, repo, hub };
}

export interface FixtureSource {
  kind: "url" | "pdf";
  /** Default true. */
  verified?: boolean;
  /** PDF only: page texts to load into source_pages (page = index + 1). */
  pages?: string[];
}

export async function createEpisodeWithSources(ownerId: string, runId: string, tag: string, sources: FixtureSource[]) {
  const series = await prisma.series.create({
    data: { ownerId, title: `ai-${tag}-${runId}`, slug: `ai-series-${tag}-${runId}`, status: "DRAFT" },
  });
  const episode = await prisma.episode.create({
    data: { seriesId: series.id, title: `ai-ep-${tag}`, slug: `ai-ep-${tag}-${runId}`, sortOrder: 0, status: "DRAFT" },
  });
  const sourceIds: string[] = [];
  for (const [index, spec] of sources.entries()) {
    const file = spec.kind === "pdf"
      ? await prisma.mediaAsset.create({ data: { kind: "DOCUMENT", publicId: `ai-${tag}-${runId}-${index}`, uploadedById: ownerId, status: "READY" } })
      : null;
    const source = await prisma.source.create({
      data: {
        tier: "TIER_1_CHINH_SU",
        title: `Nguồn ${index + 1} ${tag}`,
        createdById: ownerId,
        url: spec.kind === "url" ? `${SOURCE_URL}-${tag}-${index}` : null,
        fileAssetId: file?.id ?? null,
        verificationStatus: spec.verified === false ? "PENDING" : "VERIFIED",
        verifiedVersion: spec.verified === false ? null : 1,
      },
    });
    await prisma.seriesSource.create({ data: { seriesId: series.id, sourceId: source.id, locator: "", sortOrder: index } });
    if (spec.pages?.length) {
      await prisma.sourcePage.createMany({ data: spec.pages.map((text, i) => ({ sourceId: source.id, version: 1, page: i + 1, text })) });
    }
    sourceIds.push(source.id);
  }
  return { seriesId: series.id, episodeId: episode.id, sourceIds, urlOf: (i: number) => `${SOURCE_URL}-${tag}-${i}` };
}

/** Polls the DB until the check leaves RUNNING; the run is a detached background promise. */
export async function waitForFinish(repo: PrismaAiCheckRepository, checkId: string, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const check = await repo.findCheckById(checkId);
    if (check && check.status !== "RUNNING") return check;
    if (Date.now() > deadline) throw new Error(`check ${checkId} still RUNNING after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
