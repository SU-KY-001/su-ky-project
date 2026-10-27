import { env } from "../../core/env";
import { getSystemConfig } from "../../core/config/system-config";
import { aiEngine, assertAiReady, runStructuredAgent } from "../ai-engine";
import { contentService } from "../content";
import { readAiAssistConfig } from "./review/review.config";
import { AiCheckService } from "./review/application/ai-check.service";
import { CheckHub } from "./review/application/check-hub";
import { ModelGate } from "./model-gate";
import { createScriptReviewRunner } from "./review/application/script-review.runner";
import { ComposeService } from "./compose/application/compose.service";
import { PrismaAiCheckRepository } from "./review/infrastructure/prisma-ai-check.repository";
import { createPrismaComposeContext } from "./compose/infrastructure/compose-context";
import { readComposeConfig } from "./compose/compose.config";
import { AngleService } from "./angles/angle.service";
import { PrismaAngleRepository } from "./angles/angle.repository";
import { createAiCheckRoute } from "./review/presentation/ai-check.routes";
import { createAngleRoute } from "./angles/angle.routes";
import { createComposeRoute } from "./compose/presentation/compose.routes";
import { createVoiceRoute } from "./voice/voice.routes";
import { VoiceService } from "./voice/voice.service";
import { createPostgresSourcePageStore } from "./review/sources/postgres-source-page-store";
import { quizAuthoringService } from "../gamification/quiz-authoring.service";
import { QuizGenerationService } from "./quiz/quiz-generation.service";
import { createQuizGenerationRoute } from "./quiz/quiz-generation.routes";

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
    .route("/", createComposeRoute(composeService))
    .route("/", createVoiceRoute(new VoiceService(contentService)))
    .route("/", createQuizGenerationRoute(new QuizGenerationService({
      loadScript: (episodeId, userId) => quizAuthoringService.script(episodeId, userId),
      runAgent: runStructuredAgent, assertReady: assertAiReady, gate,
      timeoutMs: env.AI_ASSIST_CALL_TIMEOUT_MS, maxConcurrentPerUser: config.maxConcurrentPerUser,
    })));
}

/** Closes RUNNING checks whose heartbeat is stale (crash, restart); called by the maintenance job. */
export async function reapStaleAiChecks(): Promise<number> {
  return repo.reapStale(new Date(Date.now() - config.staleAfterMs));
}

export { hub as aiCheckHub };
