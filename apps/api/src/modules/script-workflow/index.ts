import { AgentStepHandler } from "./application/agent-step.handler";
import { LineageService } from "./application/lineage.service";
import { PublicationService } from "./application/publication.service";
import { WorkflowCommandService } from "./application/workflow-command.service";
import { WorkflowQueryService } from "./application/workflow-query.service";
import { PgBossAgentJobQueue } from "./infrastructure/pg-boss-agent-queue";
import { piRuntime } from "./infrastructure/pi/pi-runtime";
import { PiStepAgent } from "./infrastructure/pi/pi-step-agent";
import { PrismaScriptWorkflowRepository } from "./infrastructure/prisma-script-workflow.repository";
import { createScriptWorkflowRoute } from "./presentation/script-workflow.routes";

export interface ScriptWorkflowRuntimeStatus {
  queue: "running" | "stopped";
  ai: "ready" | "unavailable";
}

const repository = new PrismaScriptWorkflowRepository();
const queue = new PgBossAgentJobQueue();
const lineage = new LineageService(repository);
const publication = new PublicationService(repository, lineage);
const commands = new WorkflowCommandService(repository, queue, lineage, publication);
const queries = new WorkflowQueryService(repository);
const agent = new PiStepAgent(repository.logEvent.bind(repository));
const stepHandler = new AgentStepHandler(repository, queue, lineage, agent);

export const scriptWorkflowRoute = createScriptWorkflowRoute({
  commands,
  queries,
  isAiReady: () => piRuntime.isReady,
});

/** Starts pg-boss + workers (fatal on failure) and the Pi runtime (init swallows its own errors: create answers 503 without it). */
export async function startScriptWorkflowRuntime(databaseUrl: string): Promise<void> {
  await queue.start(databaseUrl);
  await queue.registerWorker((payload) => stepHandler.handle(payload));
  await piRuntime.init();
}

export async function stopScriptWorkflowRuntime(): Promise<void> {
  await queue.stop();
}

export function getScriptWorkflowRuntimeStatus(): ScriptWorkflowRuntimeStatus {
  return {
    queue: queue.isRunning() ? "running" : "stopped",
    ai: piRuntime.isReady ? "ready" : "unavailable",
  };
}
