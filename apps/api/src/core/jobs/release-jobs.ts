import { PgBoss, type Job, type SendOptions } from "pg-boss";
import { z } from "zod";
import { logger } from "../logger";
import type { ReleaseService, PublishReleaseResult } from "../../modules/releases/application/release.service";
import type {
  PendingOutboxEvent,
  ReleaseRepository,
} from "../../modules/releases/domain/release.repository";

export const RELEASE_QUEUE = "podcast.release";
const OUTBOX_QUEUE = "release.outbox-dispatch";
const RECONCILIATION_QUEUE = "release.reconciliation";
const EVERY_MINUTE = "* * * * *";
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000] as const;
const STUCK_AFTER_MS = 10 * 60_000;

const ReleaseJobDataSchema = z.object({
  scheduleId: z.string().min(1),
  scheduleVersion: z.number().int().positive(),
  correlationId: z.string().min(1),
  attempt: z.number().int().min(1).max(4),
});

const OutboxPayloadSchema = z.object({
  scheduleId: z.string().min(1),
  scheduleVersion: z.number().int().positive(),
  scheduledAt: z.coerce.date(),
});

export type ReleaseJobData = z.infer<typeof ReleaseJobDataSchema>;

export interface ReleaseJobQueue {
  send(
    name: string,
    data: object,
    options?: SendOptions,
  ): Promise<string | null>;
}

type OutboxRepository = Pick<
  ReleaseRepository,
  "listPendingOutbox" | "markOutboxDispatched" | "markOutboxFailed"
>;

type ReconciliationRepository = Pick<
  ReleaseRepository,
  "issueDueReminders" | "listDueScheduleIds" | "listStuckPublishingIds" | "findSchedule" | "setStatus"
>;

type PublicationService = Pick<ReleaseService, "publishDueSchedule">;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function initialJobData(event: PendingOutboxEvent): ReleaseJobData {
  const payload = OutboxPayloadSchema.parse(event.payload);
  return {
    scheduleId: payload.scheduleId,
    scheduleVersion: payload.scheduleVersion,
    correlationId: event.id,
    attempt: 1,
  };
}

export async function dispatchReleaseOutbox(
  repository: OutboxRepository,
  queue: ReleaseJobQueue,
  now = new Date(),
): Promise<void> {
  const events = await repository.listPendingOutbox(100);
  for (const event of events) {
    try {
      const payload = OutboxPayloadSchema.parse(event.payload);
      const data = initialJobData(event);
      await queue.send(RELEASE_QUEUE, data, {
        singletonKey: `release:${data.scheduleId}:${data.scheduleVersion}`,
        startAfter: payload.scheduledAt > now ? payload.scheduledAt : now,
        expireInSeconds: 5 * 60,
      });
      await repository.markOutboxDispatched(event.id, now);
    } catch (error) {
      await repository.markOutboxFailed(event.id, errorMessage(error));
    }
  }
}

export async function handleReleaseJob(
  service: PublicationService,
  queue: ReleaseJobQueue,
  job: { id: string; data: unknown },
  now = new Date(),
): Promise<PublishReleaseResult> {
  const data = ReleaseJobDataSchema.parse(job.data);
  const result = await service.publishDueSchedule(
    data.scheduleId,
    data.scheduleVersion,
    data.correlationId,
    job.id,
    data.attempt,
  );
  if (result === "RETRY" && data.attempt <= RETRY_DELAYS_MS.length) {
    const delay = RETRY_DELAYS_MS[data.attempt - 1]!;
    const nextAttempt = data.attempt + 1;
    await queue.send(
      RELEASE_QUEUE,
      { ...data, attempt: nextAttempt },
      {
        singletonKey: `release:${data.scheduleId}:${data.scheduleVersion}:retry:${nextAttempt}`,
        startAfter: new Date(now.getTime() + delay),
        expireInSeconds: 5 * 60,
      },
    );
  }
  return result;
}

export async function reconcileReleaseSchedules(
  repository: ReconciliationRepository,
  queue: ReleaseJobQueue,
  now = new Date(),
): Promise<void> {
  await repository.issueDueReminders(
    now,
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
  );
  const due = await repository.listDueScheduleIds(now, 100);
  for (const schedule of due) {
    await queue.send(
      RELEASE_QUEUE,
      {
        scheduleId: schedule.id,
        scheduleVersion: schedule.version,
        correlationId: `reconcile:${schedule.id}:${now.toISOString()}`,
        attempt: 1,
      },
      {
        singletonKey: `reconcile:${schedule.id}:${schedule.version}`,
        startAfter: now,
        expireInSeconds: 5 * 60,
      },
    );
  }

  const stuck = await repository.listStuckPublishingIds(
    new Date(now.getTime() - STUCK_AFTER_MS),
    100,
  );
  for (const candidate of stuck) {
    const schedule = await repository.findSchedule(candidate.id);
    if (!schedule || schedule.version !== candidate.version) continue;
    const wasPublished = schedule.episode?.status === "PUBLISHED";
    await repository.setStatus({
      scheduleId: schedule.id,
      from: ["PUBLISHING"],
      to: wasPublished ? "RELEASED" : "FAILED",
      actorId: null,
      actorType: "SYSTEM",
      action: wasPublished ? "release.published" : "release.failed",
      correlationId: `reconcile:${schedule.id}:${now.toISOString()}`,
      failureCode: wasPublished ? null : "WORKER_STUCK",
      failureMessage: wasPublished
        ? null
        : "Worker không hoàn tất phát hành trong thời gian cho phép",
      publishedAt: wasPublished ? now : null,
    });
  }
}

let releaseBoss: PgBoss | null = null;

export async function startReleaseJobs(
  connectionString: string,
  service: ReleaseService,
  repository: ReleaseRepository,
): Promise<void> {
  if (releaseBoss) return;
  const boss = new PgBoss({ connectionString });
  boss.on("error", (error: Error) =>
    logger.error({ err: error }, "Release queue error"),
  );
  await boss.start();
  for (const queue of [RELEASE_QUEUE, OUTBOX_QUEUE, RECONCILIATION_QUEUE])
    await boss.createQueue(queue);
  await boss.schedule(OUTBOX_QUEUE, EVERY_MINUTE);
  await boss.schedule(RECONCILIATION_QUEUE, EVERY_MINUTE);

  const adapter: ReleaseJobQueue = {
    send: (name, data, options) => boss.send(name, data, options),
  };
  await boss.work<ReleaseJobData>(RELEASE_QUEUE, async (jobs) => {
    for (const job of jobs) await handleReleaseJob(service, adapter, job);
  });
  await boss.work(OUTBOX_QUEUE, async () => {
    await dispatchReleaseOutbox(repository, adapter);
  });
  await boss.work(RECONCILIATION_QUEUE, async () => {
    await reconcileReleaseSchedules(repository, adapter);
  });
  releaseBoss = boss;
}

export function isReleaseWorkerRunning(): boolean {
  return releaseBoss !== null;
}

export async function stopReleaseJobs(): Promise<void> {
  const boss = releaseBoss;
  releaseBoss = null;
  if (boss) await boss.stop({ graceful: true, timeout: 30_000 });
}
