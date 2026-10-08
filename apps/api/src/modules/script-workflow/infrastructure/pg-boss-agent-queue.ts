import { PgBoss } from "pg-boss";
import { STEP_TYPES, type StepType } from "@repo/shared";
import { logger } from "../../../core/logger";
import type {
  AgentJobDelivery,
  AgentJobPayload,
  AgentJobQueue,
  NarrativeSelectionPayload,
} from "../domain/agent-job-queue";
import { MAX_QUEUE_RETRY_COUNT, WORKFLOW_QUEUES } from "../script-workflow.constants";

const log = logger.child({ scope: "agent-queue" });

function parseNarrativeSelection(value: unknown): NarrativeSelectionPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const titles = raw.episodeTitles;
  if (
    typeof raw.selectedFocusType !== "string" ||
    typeof raw.seriesTitle !== "string" ||
    !Array.isArray(titles) ||
    titles.length !== 3 ||
    !titles.every((title) => typeof title === "string")
  ) {
    return undefined;
  }
  return {
    selectedFocusType: raw.selectedFocusType,
    seriesTitle: raw.seriesTitle,
    episodeTitles: [titles[0] as string, titles[1] as string, titles[2] as string],
    editorialNotes: typeof raw.editorialNotes === "string" ? raw.editorialNotes : undefined,
  };
}

/** Guards the untyped pg-boss payload at the queue boundary. */
export function parseAgentPayload(data: unknown, expectedStep: StepType): AgentJobPayload | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;

  if (typeof record.workflowRunId !== "number") return null;
  if (record.stepType !== expectedStep) return null;
  if (record.parentVersionId !== null && typeof record.parentVersionId !== "number") return null;

  return {
    workflowRunId: record.workflowRunId,
    stepType: expectedStep,
    parentVersionId: record.parentVersionId as number | null,
    guidance: typeof record.guidance === "string" ? record.guidance : undefined,
    narrativeSelection: parseNarrativeSelection(record.narrativeSelection),
  };
}

/**
 * pg-boss on the main Postgres (it manages its own `pgboss` schema).
 * Nothing connects at import time, so tests that import the app never touch the DB.
 */
export class PgBossAgentJobQueue implements AgentJobQueue {
  private boss: PgBoss | null = null;

  isRunning(): boolean {
    return this.boss !== null;
  }

  async start(connectionString: string): Promise<void> {
    const boss = new PgBoss({ connectionString });
    // Without an error listener an EventEmitter 'error' would crash the process.
    boss.on("error", (err) => log.error({ err }, "pg-boss error"));
    await boss.start();
    for (const stepType of STEP_TYPES) {
      const queueName = WORKFLOW_QUEUES[stepType];
      if (!(await boss.getQueue(queueName))) {
        await boss.createQueue(queueName);
      }
    }
    this.boss = boss;
    log.info({ queues: STEP_TYPES.map((s) => WORKFLOW_QUEUES[s]) }, "pg-boss started");
  }

  async registerWorker(
    handler: (payload: AgentJobPayload, delivery: AgentJobDelivery) => Promise<void>
  ): Promise<void> {
    const boss = this.requireBoss();
    for (const stepType of STEP_TYPES) {
      const queueName = WORKFLOW_QUEUES[stepType];
      await boss.work(queueName, { includeMetadata: true }, async (jobs) => {
        const job = jobs[0];
        const payload = parseAgentPayload(job?.data, stepType);
        if (!job || !payload) {
          throw new Error(`Invalid ${stepType} job payload: workflowRunId + stepType required`);
        }
        await handler(payload, { isFinalAttempt: job.retryCount >= job.retryLimit });
      });
      log.info({ queue: queueName }, "Agent worker registered");
    }
  }

  async enqueue(payload: AgentJobPayload): Promise<void> {
    await this.requireBoss().send(WORKFLOW_QUEUES[payload.stepType], payload, {
      retryLimit: MAX_QUEUE_RETRY_COUNT,
      retryBackoff: true,
    });
  }

  async stop(): Promise<void> {
    const boss = this.boss;
    this.boss = null;
    await boss?.stop();
  }

  private requireBoss(): PgBoss {
    if (!this.boss) throw new Error("Agent job queue is not started");
    return this.boss;
  }
}
