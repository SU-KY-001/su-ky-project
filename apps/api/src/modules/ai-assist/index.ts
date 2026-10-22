import { getSystemConfig } from "../../core/config/system-config";
import { aiEngine, assertAiReady, runStructuredAgent } from "../ai-engine";
import { contentService } from "../content";
import { readAiAssistConfig } from "./ai-assist.config";
import { AiCheckService } from "./application/ai-check.service";
import { CheckHub } from "./application/check-hub";
import { ModelGate } from "./application/model-gate";
import { createScriptReviewRunner } from "./application/script-review.runner";
import { PrismaAiCheckRepository } from "./infrastructure/prisma-ai-check.repository";
import { createAiCheckRoute } from "./presentation/ai-check.routes";
import { createPostgresSourcePageStore } from "./sources/postgres-source-page-store";

const config = readAiAssistConfig();
const repo = new PrismaAiCheckRepository();
const hub = new CheckHub();
const store = createPostgresSourcePageStore();
const runner = createScriptReviewRunner({ repo, hub, store, gate: new ModelGate(config.globalModelConcurrency), config, runAgent: runStructuredAgent });

const service = new AiCheckService({
  repo,
  content: contentService,
  store,
  runner,
  config,
  scriptMaxChars: () => getSystemConfig("script.max_chars"),
  assertReady: assertAiReady,
  modelId: aiEngine.modelId,
});

export function createStudioAiAssistRoute() {
  return createAiCheckRoute(service, { repo, hub, heartbeatMs: config.heartbeatMs });
}

/** Closes RUNNING checks whose heartbeat is stale (crash, restart); called by the maintenance job. */
export async function reapStaleAiChecks(): Promise<number> {
  return repo.reapStale(new Date(Date.now() - config.staleAfterMs));
}

export { hub as aiCheckHub };
