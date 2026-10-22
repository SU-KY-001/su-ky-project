import {
  AgentAbortedError,
  AgentProviderError,
  AgentTimeoutError,
  createRunGuard,
  runStructuredAgent,
} from "../../ai-engine";
import { logger } from "../../../core/logger";
import type { CheckBlock, ReviewSource } from "../ai-assist.types";
import type { AiAssistConfig } from "../ai-assist.config";
import type { AiCheckFinalStatus, AiCheckRepository } from "../domain/ai-check.repository";
import { batchBlocks } from "../input/batcher";
import { buildUserPrompt } from "../input/script-review.input";
import { SCRIPT_REVIEW_PROMPT } from "../prompts/script-review.prompt";
import { ScriptReviewOutputSchema } from "../schemas/script-review.schema";
import { buildSourceToolkit } from "../sources/source-tools";
import type { SourcePageStore } from "../ai-assist.types";
import { validateItems } from "../validators/items";
import { CheckWriter } from "./check-writer";
import type { CheckHub } from "./check-hub";
import type { ModelGate } from "./model-gate";

export type AgentRunner = typeof runStructuredAgent;

export interface RunCheckInput {
  checkId: string;
  blocks: CheckBlock[];
  note: string | null;
  sources: ReviewSource[];
  /** Fires when the user cancels. */
  signal: AbortSignal;
}

const isFatalProviderKind = (kind: string): boolean => kind === "AUTH" || kind === "QUOTA";
const CODE_ALL_BLOCKS_FAILED = "ALL_BLOCKS_FAILED";
const CODE_CHECK_TIMEOUT = "CHECK_TIMEOUT";

export interface ScriptReviewRunnerDeps {
  repo: AiCheckRepository;
  hub: CheckHub;
  store: SourcePageStore;
  gate: ModelGate;
  config: AiAssistConfig;
  /** Injected so tests replay recorded tool chains instead of calling a model. */
  runAgent: AgentRunner;
}

export interface ScriptReviewRunner {
  /** Runs one check to a final state; per-batch failures are counted, not thrown. */
  run(input: RunCheckInput): Promise<void>;
}

export function createScriptReviewRunner(deps: ScriptReviewRunnerDeps): ScriptReviewRunner {
  const { repo, hub, store, gate, config, runAgent } = deps;

  async function run(input: RunCheckInput): Promise<void> {
    const { checkId, sources } = input;
    const log = logger.child({ scope: "ai-check", checkId });
    const writer = new CheckWriter(checkId, repo, hub);
    const guard = createRunGuard(input.signal, config.checkTimeoutMs);
    const fatal = new AbortController();
    const signal = AbortSignal.any([guard.signal, fatal.signal]);
    const labelToSource = new Map(sources.map((s) => [s.label, s]));
    const hasUrlSource = sources.some((s) => s.kind === "URL");
    const batches = batchBlocks(input.blocks, { maxBlocks: config.batchBlocks, maxChars: config.batchMaxChars });
    let fatalCode: string | null = null;
    let failedBlocks = 0;

    const heartbeat = setInterval(() => {
      repo.touchHeartbeat(checkId).catch((err: unknown) => log.warn({ err }, "heartbeat failed"));
    }, config.runHeartbeatMs);

    async function processBatch(batch: CheckBlock[]): Promise<void> {
      const toolkit = buildSourceToolkit({ store, sources, maxToolCalls: config.maxToolCalls });
      try {
        const result = await gate.run(() =>
          runAgent({
            systemPrompt: SCRIPT_REVIEW_PROMPT,
            userPrompt: buildUserPrompt({ blocks: batch, note: input.note, sources }),
            schema: ScriptReviewOutputSchema,
            customTools: toolkit.customTools,
            tools: hasUrlSource ? "WEB" : "NONE",
            onToolResult: toolkit.onToolResult,
            thinking: "low",
            signal,
            redactContent: true,
            label: "ai-check:script",
          }),
        );
        const items = validateItems({ output: result.data, batch, labelToSource, openedText: toolkit.openedText });
        await writer.addBatchResult(items, {
          processedBlocks: batch.length,
          failedBlocks: 0,
          toolCalls: toolkit.stats().toolCalls,
          inputTokens: result.usage.input,
          outputTokens: result.usage.output,
        });
      } catch (err) {
        if (signal.aborted || err instanceof AgentAbortedError || err instanceof AgentTimeoutError) return;
        if (err instanceof AgentProviderError && isFatalProviderKind(err.kind)) {
          fatalCode = `AI_PROVIDER_${err.kind}`;
          fatal.abort();
          return;
        }
        log.warn({ err, blocks: batch.length }, "batch failed");
        failedBlocks += batch.length;
        await writer.addBatchResult([], {
          processedBlocks: batch.length,
          failedBlocks: batch.length,
          toolCalls: toolkit.stats().toolCalls,
          inputTokens: 0,
          outputTokens: 0,
        });
      }
    }

    const queue = [...batches];
    const worker = async () => {
      for (let batch = queue.shift(); batch && !signal.aborted; batch = queue.shift()) await processBatch(batch);
    };

    try {
      await Promise.all(Array.from({ length: Math.min(config.blockConcurrency, batches.length) }, worker));
      await writer.flush();
      const timedOut = guard.signal.aborted && !input.signal.aborted;
      let status: AiCheckFinalStatus = "SUCCEEDED";
      let errorCode: string | null = null;
      if (input.signal.aborted) {
        status = "CANCELLED";
      } else if (timedOut) {
        status = "FAILED";
        errorCode = CODE_CHECK_TIMEOUT;
      } else if (fatalCode) {
        status = "FAILED";
        errorCode = fatalCode;
      } else if (failedBlocks >= input.blocks.length) {
        status = "FAILED";
        errorCode = CODE_ALL_BLOCKS_FAILED;
      }

      const closed = await repo.finish(checkId, status, errorCode, sources.map((s) => s.sourceId));
      const final = closed ? await repo.findCheckById(checkId) : null;
      if (final && status !== "CANCELLED") hub.publish(checkId, { type: status === "SUCCEEDED" ? "done" : "failed", data: final });
    } finally {
      clearInterval(heartbeat);
      guard.dispose();
    }
  }

  return { run };
}


