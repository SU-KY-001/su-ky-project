import { env } from "../../core/env";
import { getSystemConfig } from "../../core/config/system-config";
import { aiEngine, assertAiReady, runStructuredAgent } from "../ai-engine";
import { contentService } from "../content";
import { readAiAssistConfig } from "./ai-assist.config";
import { AiCheckService } from "./application/ai-check.service";
import { CheckHub } from "./application/check-hub";
import { ModelGate } from "./application/model-gate";
import { createScriptReviewRunner } from "./application/script-review.runner";
import { ComposeService } from "./application/compose.service";
import { PrismaAiCheckRepository } from "./infrastructure/prisma-ai-check.repository";
import { createPrismaComposeContext } from "./infrastructure/compose-context";
import { readComposeConfig } from "./compose/compose.config";
import { AngleService } from "./angles/angle.service";
import { PrismaAngleRepository } from "./angles/angle.repository";
import { createAiCheckRoute } from "./presentation/ai-check.routes";
import { createAngleRoute } from "./presentation/angle.routes";
import { createComposeRoute } from "./presentation/compose.routes";
import { createPostgresSourcePageStore } from "./sources/postgres-source-page-store";

const config = readAiAssistConfig();
const repo = new PrismaAiCheckRepository();
const hub = new CheckHub();
const store = createPostgresSourcePageStore();
/** One bulkhead for background checks and synchronous compose calls. */
const gate = new ModelGate(config.globalModelConcurrency);
const runner = createScriptReviewRunner({ repo, hub, store, gate, config, runAgent: runStructuredAgent });

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

/** Shared with the compose routes: they load an angle by id on the server. */
export const angleService = new AngleService({ repo: new PrismaAngleRepository(), maxPerUser: env.AI_ANGLE_MAX_PER_USER });

const composeService = new ComposeService({
  content: contentService,
  angles: angleService,
  context: createPrismaComposeContext(),
  gate,
  config: readComposeConfig(),
  runAgent: runStructuredAgent,
  assertReady: assertAiReady,
  scriptMaxChars: () => getSystemConfig("script.max_chars"),
  modelId: aiEngine.modelId,
});

export function createStudioAiAssistRoute() {
  return createAiCheckRoute(service, { repo, hub, heartbeatMs: config.heartbeatMs })
    .route("/", createAngleRoute(angleService))
    .route("/", createComposeRoute(composeService));
}

/** Closes RUNNING checks whose heartbeat is stale (crash, restart); called by the maintenance job. */
export async function reapStaleAiChecks(): Promise<number> {
  return repo.reapStale(new Date(Date.now() - config.staleAfterMs));
}

export { hub as aiCheckHub };
